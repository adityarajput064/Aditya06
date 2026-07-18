require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const webPush = require('web-push');
const cors = require('cors');
const http = require('http');
const path = require('path');
const multer = require('multer');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cron = require('node-cron'); // NAYA — daily poll auto-post ke liye
// NAYA: nodemailer hata diya — Render free tier SMTP ports (465/587) block karta hai,
// isliye Gmail SMTP se email bhejna hang ho jaata tha. Ab Brevo ka HTTP API use karenge
// (HTTPS pe chalta hai, jo block nahi hai).

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// === AUTH MIDDLEWARE (JWT verify) ===
// NAYA: sabse upar move kiya gaya hai, taaki niche kisi bhi route mein
// (jaise /api/subscribe) use karne se pehle ye defined ho chuke
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, username }
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

// === NAYA: OPTIONAL AUTH (token ho to decode karo, na ho to bhi block mat karo) ===
// GET /api/users/:username jaisi public routes ke liye — taaki hum jaan sakein
// "viewer kaun hai" (agar logged in hai) taaki social links visibility filter ho sake,
// lekin logged-out/anonymous logon ko bhi profile dekhne se block na karein.
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
            const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
            req.user = decoded; // { id, username }
        } catch (err) { /* invalid/expired token — anonymous treat karo, error mat do */ }
    }
    next();
};

// === 🛑 NAYA WEB PUSH SETUP (VAPID Keys Configuration) ===
webPush.setVapidDetails(
  process.env.VAPID_MAILTO,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Frontend ko Public Key dene ke liye API endpoint
app.get('/api/vapid-public-key', (req, res) => {
  res.send(process.env.VAPID_PUBLIC_KEY);
});
// =========================================================

// === CLOUDINARY SETUP (web deployment ke liye) ===
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// === 🛑 UPDATED: EMAIL BHEJNE KA HELPER — EmailJS (free, no domain/DNS zaroori nahi) ===
// EmailJS ke dashboard mein Gmail service connect karo aur ek template banao jisme
// {{to_email}}, {{otp}}, aur {{purpose}} variables ho.
// Render Environment mein ye 4 set karne honge:
// EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY
const sendEmail = async (to, otp, purpose) => {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            service_id: process.env.EMAILJS_SERVICE_ID,
            template_id: process.env.EMAILJS_TEMPLATE_ID,
            user_id: process.env.EMAILJS_PUBLIC_KEY,
            accessToken: process.env.EMAILJS_PRIVATE_KEY, // server (non-browser) se call karne ke liye zaroori hai
            template_params: {
                email: to,
                otp,
                purpose,
            },
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`EmailJS failed: ${response.status} ${errText}`);
    }
    return response;
};

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// === DATABASE (ab .env se aa raha hai, hardcoded nahi) ===
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Database Connected Successfully!"))
  .catch((err) => console.log("❌ Database Connection Failed:", err.message));

// === SCHEMAS ===
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String, unique: true, sparse: true },
    password: { type: String, required: true },
    profilePic: { type: String, default: "" },
    bio: { type: String, default: "Hey there! I am using Campus Connect." },
    department: { type: String, default: "" },
    institute: { type: String, default: "" },
    enrollmentNumber: { type: String, default: "" },
    skills: { type: String, default: "" },
    followers: [{ type: String }],   // jo isko follow karte hain (usernames)
    following: [{ type: String }],   // jinko ye follow karta hai (usernames)
    // === NAYA: PRIVATE ACCOUNT + FOLLOW REQUESTS ===
    isPrivate: { type: Boolean, default: false },      // true ho to follow ke liye request+approve chahiye
    followRequests: [{ type: String }],                 // pending incoming follow requests (usernames)
    // === NAYA: SETTINGS — preferred language ===
    language: { type: String, default: "en" },          // e.g. "en", "hi", "gu", "mr"
    privacy: {
        showEmail: { type: Boolean, default: true },
        showMobile: { type: Boolean, default: false }
    },
    // === NAYA: SOCIAL LINKS (per-link visibility control) ===
    socialLinks: [{
        platform: { type: String, default: "website" },   // auto-detected key: instagram/facebook/...
        label: { type: String, default: "Website" },        // display name
        url: { type: String, required: true },
        visibility: { type: String, enum: ['public', 'private', 'custom'], default: 'public' },
        customMode: { type: String, enum: ['only', 'except'], default: 'only' }, // sirf 'custom' visibility ke liye
        customUsers: [{ type: String }],                    // 'only' = inhi ko dikhao, 'except' = inse chhupao
    }],
});
const User = mongoose.model('User', UserSchema);

// === 🛑 NAYA SUBSCRIBER SCHEMA (Push Notifications ke liye) ===
// NAYA: ab har subscription ek username se bhi linked hai, taaki
// push sirf uss specific user ko bheji ja sake (broadcast nahi)
const subscriberSchema = new mongoose.Schema({
  username: { type: String, required: true },
  endpoint: { type: String, required: true, unique: true },
  expirationTime: { type: Date, default: null },
  keys: {
    p256dh: String,
    auth: String
  }
});
const Subscriber = mongoose.model('Subscriber', subscriberSchema);
// ===============================================================

// === 🛑 NAYA NOTIFICATION SCHEMA (in-app bell + push history ke liye) ===
const NotificationSchema = new mongoose.Schema({
    toUsername: { type: String, required: true },     // kisko notification milegi
    fromUsername: { type: String, required: true },   // kisne trigger kiya
    type: { type: String, enum: ['follow', 'like', 'comment', 'post', 'follow_request', 'follow_accept'], required: true },
    text: { type: String, required: true },            // display text
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
    read: { type: Boolean, default: false },
}, { timestamps: true });
const Notification = mongoose.model('Notification', NotificationSchema);
// ===============================================================

// === 🛑 NAYA: OTP SCHEMA (email login ke liye) ===
// 5 minute (300 sec) baad khud expire ho jata hai — TTL index
const OtpSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 300 }
});
const Otp = mongoose.model('Otp', OtpSchema);
// ===============================================================


// === 🛑 NAYA SUBSCRIBE ROUTE & NOTICE HELPER FUNCTION ===
// Iske thik niche se tere baaki ke routes shuru honge

// Frontend se push subscription save karne ka route
// NAYA: ab authMiddleware lagi hai, taaki username subscription se linked ho sake
app.post('/api/subscribe', authMiddleware, async (req, res) => {
  try {
    await Subscriber.findOneAndUpdate(
      { endpoint: req.body.endpoint },
      { ...req.body, username: req.user.username },
      { upsert: true, new: true }
    );
    res.status(200).json({ success: true, message: "Subscription Saved!" });
  } catch (error) {
    console.error("Subscription Error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Admin/System se sabko notice bhejne ka helper function (jaisa tha waisa hi rakha hai)
async function sendNoticeToAll(title, message, url) {
  const allSubscribers = await Subscriber.find({});
  const payload = JSON.stringify({
    title: title,
    body: message,
    icon: "/icons/icon-192.png",
    data: { url: url || "https://campus-connect.vercel.app" }
  });

  allSubscribers.forEach(async (sub) => {
    try {
      await webPush.sendNotification(sub, payload);
      console.log("Push notice sent successfully!");
    } catch (error) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        await Subscriber.deleteOne({ _id: sub._id });
        console.log("Inactive subscriber removed from DB.");
      }
    }
  });
}

// === 🛑 NAYA: SIRF EK USER KO PUSH BHEJNE KA HELPER ===
async function sendPushToUser(username, text) {
  try {
    const subs = await Subscriber.find({ username });
    const payload = JSON.stringify({
      title: "Campus Connect",
      body: text,
      icon: "/icons/icon-192.png",
      data: { url: "https://campus-connect.vercel.app/dashboard" }
    });

    subs.forEach(async (sub) => {
      try {
        await webPush.sendNotification(sub, payload);
      } catch (error) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          await Subscriber.deleteOne({ _id: sub._id });
        }
      }
    });
  } catch (err) { console.error("Push to user failed:", err.message); }
}

// === 🛑 NAYA: NOTIFICATION BANANE + BHEJNE KA MAIN HELPER ===
// DB mein save karta hai, real-time socket se bell icon update karta hai,
// aur phone pe push bhi bhejta hai — teeno ek hi jagah se
async function notifyUser(toUsername, fromUsername, type, text, postId = null) {
  if (toUsername === fromUsername) return; // khud ko notification nahi
  try {
    const notif = await new Notification({ toUsername, fromUsername, type, text, postId }).save();
    io.to(toUsername).emit('new-notification', notif);
    await sendPushToUser(toUsername, text);
  } catch (err) { console.error("Notify failed:", err.message); }
}
// ===============================================================

// 👇 YAHAN SE NICHE TERE PEHLE WALE BAAKI KE ROUTES AUR CODE AYENGE
// (jaise app.post('/login', ...), app.get('/posts', ...), server.listen(...) wgairah)

const Post = mongoose.model('Post', new mongoose.Schema({
    username: String,
    profilePic: { type: String, default: "" }, // NAYA — post banane waale user ki profile photo
    content: String,
    type: {
        type: String,
        enum: ['general', 'image', 'pdf', 'notes', 'question', 'poll', 'lostfound', 'event', 'notice', 'meme'],
        default: 'general'
    },
    club: { type: String, default: null }, // e.g. "esports-club" — group page filtering ke liye (optional)
    imageUrl: String,           // "image" type ke liye
    fileUrl: String,            // "pdf"/"notes" type ke liye (base64 data URL)
    fileName: String,
    eventDate: String,          // "event" type ke liye
    mood: { type: String, default: "" },        // NAYA — jaise "😊 Happy"
    tags: [{ type: String }],                    // NAYA — tagged usernames (quick post feature)
    pollOptions: [{
        text: String,
        votes: [String]         // usernames jo isko vote kar chuke hain
    }],
    likes: { type: Number, default: 0 },
    likedBy: [String],          // toggle ke liye (dobara like = unlike)
    reactions: [{ username: String, emoji: String }], // NAYA — emoji reactions
    savedBy: [String],          // bookmark/save karne wale users
    shareCount: { type: Number, default: 0 },
    comments: [{ username: String, text: String }]
}, { timestamps: true }));

// === STUDY MATERIALS (naya) ===
// Posts se alag rakha hai jaan-boojh kar: materials real files hote hain (ab
// Cloudinary par store), feed posts (base64 fileUrl) se alag concern hai.
const MaterialSchema = new mongoose.Schema({
    title: { type: String, required: true },
    department: { type: String, default: "General" },
    fileUrl: { type: String, required: true },   // ab Cloudinary ka secure_url
    fileName: String,
    uploadedBy: String,   // server route se set hota hai (JWT se), client se trust nahi karte
}, { timestamps: true });
const Material = mongoose.model('Material', MaterialSchema);

// === NOTICES (naya) ===
const NoticeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    department: { type: String, default: "Admin Office" },
    postedBy: String,   // server route se set hota hai (JWT se)
}, { timestamps: true });
const Notice = mongoose.model('Notice', NoticeSchema);

// GROUP CHAT: 30 second baad MongoDB khud document delete kar dega (TTL index).
// Note: MongoDB ka TTL background job ~60 sec mein ek baar chalta hai, isliye
// database se delete hone mein 30-90 sec lag sakta hai. Frontend alag se
// exact 30 sec pe message UI se hata dega, isliye user ko exact 30 sec hi dikhega.
const GroupMessageSchema = new mongoose.Schema({
    username: String,
    text: String,
    createdAt: { type: Date, default: Date.now, expires: 30 }
});
const GroupMessage = mongoose.model('GroupMessage', GroupMessageSchema);

// PRIVATE CHAT: 6 ghante (21600 seconds) baad automatically delete ho jata hai
const PrivateMessageSchema = new mongoose.Schema({
    from: String,
    to: String,
    text: String,
    createdAt: { type: Date, default: Date.now, expires: 21600 } // 6 hours = 6 * 60 * 60
});
const PrivateMessage = mongoose.model('PrivateMessage', PrivateMessageSchema);

// Do usernames se hamesha same, consistent "room id" banane ke liye
// (taaki A->B aur B->A dono same room mein milein)
const getPrivateRoomId = (userA, userB) => [userA, userB].sort().join("__");

// === MULTER + CLOUDINARY (study material file uploads) ===
// Disk storage ki jagah ab seedha Cloudinary par upload hota hai.
const uploadStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'campus-connect-materials',
        resource_type: 'auto', // images, PDFs, docs — sab handle karega
        // Original filename (extension ke bina) ko public_id mein rakhte hain
        // taaki Cloudinary URL thoda readable rahe
        public_id: (req, file) => `${Date.now()}-${path.parse(file.originalname).name.replace(/\s+/g, '_')}`,
    },
});
const upload = multer({
    storage: uploadStorage,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB cap
});

// === 🛑 NAYA: ONLINE USERS TRACKING (Discussion Room ke liye) ===
// username -> Set of socket ids (ek user multiple tabs/devices se connected ho sakta hai)
const onlineUsers = new Map();

function broadcastOnlineUsers() {
    io.emit('online-users', Array.from(onlineUsers.keys()));
}

io.on('connection', (socket) => {
    socket.on('send-reply', (data) => { io.emit('receive-notification', data); });

    // === 🛑 NAYA: HAR USER APNE PERSONAL ROOM MEIN JOIN HOTA HAI ===
    // Isse notifyUser() sirf usi user ko real-time notification bhej payega
    socket.on('register-user', (username) => {
        if (username) {
            socket.join(username);
            socket.data.username = username; // NAYA — disconnect pe cleanup ke liye yaad rakhte hain

            // NAYA — online users list mein add karo aur sabko naya list bhej do
            if (!onlineUsers.has(username)) onlineUsers.set(username, new Set());
            onlineUsers.get(username).add(socket.id);
            broadcastOnlineUsers();
        }
    });

    // === 🛑 NAYA: GROUP CHAT TYPING INDICATOR ===
    socket.on('group-typing-start', (typingUsername) => {
        socket.broadcast.emit('group-typing-start', typingUsername);
    });
    socket.on('group-typing-stop', (typingUsername) => {
        socket.broadcast.emit('group-typing-stop', typingUsername);
    });

    // === 🛑 NAYA: PRIVATE CHAT TYPING INDICATOR ===
    // Sirf dusre user ke room mein bhejte hain, taaki sirf wahi dekhe
    socket.on('private-typing-start', ({ from, to }) => {
        const roomId = getPrivateRoomId(from, to);
        socket.to(roomId).emit('private-typing-start', { from });
    });
    socket.on('private-typing-stop', ({ from, to }) => {
        const roomId = getPrivateRoomId(from, to);
        socket.to(roomId).emit('private-typing-stop', { from });
    });

    // === GROUP CHAT (Discuss Room) ===
    socket.on('send-group-msg', async (data) => {
        try {
            const saved = await new GroupMessage({ username: data.username, text: data.text }).save();
            io.emit('receive-group-msg', {
                _id: saved._id,
                username: saved.username,
                text: saved.text,
                createdAt: saved.createdAt
            });
        } catch (err) { console.error("Group message save failed:", err.message); }
    });

    // === PRIVATE CHAT (1-on-1) ===
    // Dono users ko is common room mein join karwate hain taaki messages sirf unke beech rahein
    socket.on('join-private-room', ({ myUsername, otherUsername }) => {
        const roomId = getPrivateRoomId(myUsername, otherUsername);
        socket.join(roomId);
    });

    socket.on('send-private-msg', async ({ from, to, text }) => {
        try {
            const saved = await new PrivateMessage({ from, to, text }).save();
            const roomId = getPrivateRoomId(from, to);
            io.to(roomId).emit('receive-private-msg', {
                _id: saved._id,
                from: saved.from,
                to: saved.to,
                text: saved.text,
                createdAt: saved.createdAt
            });
        } catch (err) { console.error("Private message save failed:", err.message); }
    });

    // === 🛑 NAYA: DISCONNECT PE ONLINE USERS SE HATA DO ===
    socket.on('disconnect', () => {
        const disconnectedUsername = socket.data.username;
        if (disconnectedUsername && onlineUsers.has(disconnectedUsername)) {
            onlineUsers.get(disconnectedUsername).delete(socket.id);
            // Sirf tab remove karo jab uska koi aur tab/device connected na ho
            if (onlineUsers.get(disconnectedUsername).size === 0) {
                onlineUsers.delete(disconnectedUsername);
            }
            broadcastOnlineUsers();
        }
    });
});

// === 🛑 NAYA: DISPOSABLE / TEMP EMAIL BLOCKLIST ===
// Ye sab known temp-mail services hain — inse signup allow nahi karte
const DISPOSABLE_EMAIL_DOMAINS = new Set([
    "mailinator.com", "tempmail.com", "temp-mail.org", "10minutemail.com",
    "guerrillamail.com", "guerrillamail.info", "yopmail.com", "throwawaymail.com",
    "fakeinbox.com", "trashmail.com", "sharklasers.com", "discard.email",
    "dispostable.com", "maildrop.cc", "getnada.com", "moakt.com", "mintemail.com",
    "mohmal.com", "emailondeck.com", "33mail.com", "spamgourmet.com",
    "mailnesia.com", "mailcatch.com", "tempinbox.com", "burnermail.io",
    "getairmail.com", "tempr.email", "tmpmail.net", "tmpmail.org",
    "10minemail.com", "mail-temp.com", "emailtemporario.com.br", "fakemailgenerator.com",
]);

function isDisposableEmail(email) {
    const domain = email.split("@")[1]?.toLowerCase();
    return domain ? DISPOSABLE_EMAIL_DOMAINS.has(domain) : true; // domain hi na mile to bhi block
}

// === AUTH ROUTES ===

// === 🛑 NAYA: SIGNUP EMAIL VERIFICATION (OTP) ===
// Step 1 — signup form submit karne se pehle email pe OTP bhejo
app.post('/api/otp/send-signup', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email zaroori hai" });

        if (isDisposableEmail(email)) {
            return res.status(400).json({ message: "Temporary/disposable email allowed nahi hai. Apni real college/personal email use karo." });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: "Is email se pehle se account bana hua hai" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP

        await Otp.deleteMany({ email }); // purana OTP hata ke naya save karo
        await new Otp({ email, otp }).save();

        await sendEmail(email, otp, "verify your email for signup");

        res.json({ message: "OTP bhej diya gaya hai" });
    } catch (err) {
        console.error("Signup OTP send failed:", err.message);
        res.status(500).json({ message: "OTP bhejne mein error aaya, dobara try karo" });
    }
});

// Step 2 — OTP + baaki details ek saath bhejo, tabhi account banega
app.post('/api/signup', async (req, res) => {
    try {
        const { username, email, mobile, password, otp } = req.body;
        if (!username || !email || !password || !otp) {
            return res.status(400).json({ message: "Username, email, password, aur OTP — sab zaroori hain" });
        }

        if (isDisposableEmail(email)) {
            return res.status(400).json({ message: "Temporary/disposable email allowed nahi hai" });
        }

        const otpRecord = await Otp.findOne({ email, otp });
        if (!otpRecord) {
            return res.status(400).json({ message: "OTP galat hai ya expire ho gaya, dobara bhejo" });
        }

        const existing = await User.findOne({ $or: [{ username }, { email }] });
        if (existing) {
            return res.status(400).json({ message: "Username or email already in use" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, mobile, password: hashedPassword });
        await newUser.save();
        await Otp.deleteMany({ email }); // use ho gaya, ab hata do

        res.json({ message: "Signup Success" });
    } catch (err) {
        res.status(500).json({ message: "Signup failed", error: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        const user = await User.findOne({
            $or: [{ username: identifier }, { email: identifier }, { mobile: identifier }]
        });

        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "7d" });

        // Poori profile info bhi bhej rahe hain taaki frontend localStorage mein sab save kar sake
        res.json({
            token,
            username: user.username,
            email: user.email,
            mobile: user.mobile,
            profilePic: user.profilePic,
            bio: user.bio,
            department: user.department,
            institute: user.institute,
            enrollmentNumber: user.enrollmentNumber,
            skills: user.skills
        });
    } catch (err) {
        res.status(500).json({ message: "Login failed", error: err.message });
    }
});

// === 🛑 NAYA: FORGOT PASSWORD (OTP-based reset) ===
// Step 1 — email daalo, agar account exist karta hai to OTP bhejo
// (signup wale OTP se ulta — yahan user ka pehle se hona zaroori hai)
app.post('/api/otp/send-reset', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email zaroori hai" });

        const user = await User.findOne({ email });
        // NOTE: jaanbujh kar "user nahi mila" wala alag error nahi de rahe —
        // isse koi ye pata nahi laga sakta ki konsi email registered hai ya nahi.
        if (!user) {
            return res.json({ message: "Agar ye email registered hai, to OTP bhej diya gaya hai" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await Otp.deleteMany({ email });
        await new Otp({ email, otp }).save();

        await sendEmail(email, otp, "reset your password");

        res.json({ message: "Agar ye email registered hai, to OTP bhej diya gaya hai" });
    } catch (err) {
        console.error("Reset OTP send failed:", err.message);
        res.status(500).json({ message: "OTP bhejne mein error aaya, dobara try karo" });
    }
});

// Step 2 — OTP + naya password bhejo, verify ho ke password update ho jayega
app.post('/api/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: "Email, OTP, aur naya password — sab zaroori hain" });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password kam se kam 6 characters ka hona chahiye" });
        }

        const otpRecord = await Otp.findOne({ email, otp });
        if (!otpRecord) {
            return res.status(400).json({ message: "OTP galat hai ya expire ho gaya, dobara bhejo" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Account nahi mila" });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        await Otp.deleteMany({ email }); // use ho gaya, ab hata do

        res.json({ message: "Password reset ho gaya, ab naye password se login karo" });
    } catch (err) {
        res.status(500).json({ message: "Password reset failed", error: err.message });
    }
});



// === PROFILE ROUTES (ab protected, JWT chahiye) ===
app.get('/api/users/:username', optionalAuth, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username }).select("-password");
        if (!user) return res.status(404).json({ message: "Not found" });

        const viewer = req.user?.username || null;
        const isOwner = viewer === user.username;
        const userObj = user.toObject();

        // NAYA — social links ko viewer ke hisaab se filter karo (owner hamesha sab dekhta hai, editing ke liye)
        userObj.socialLinks = (userObj.socialLinks || []).filter((link) => {
            if (isOwner) return true;
            if (link.visibility === 'public') return true;
            if (link.visibility === 'private') return false;
            if (link.visibility === 'custom') {
                if (!viewer) return false; // anonymous logo ko custom links nahi dikhte
                if (link.customMode === 'only') return link.customUsers?.includes(viewer);
                if (link.customMode === 'except') return !link.customUsers?.includes(viewer);
            }
            return false;
        });

        // === NAYA: PRIVATE ACCOUNT — viewer ka relationship status batao (profile card + follow button ke liye) ===
        const isFollowing = viewer ? user.followers.includes(viewer) : false;
        const hasRequested = viewer ? (user.followRequests || []).includes(viewer) : false;
        userObj.relationship = isOwner ? 'owner' : isFollowing ? 'following' : hasRequested ? 'requested' : 'none';
        userObj.followersCount = user.followers.length;
        userObj.followingCount = user.following.length;
        // private account + viewer follower nahi hai + owner nahi hai => posts/details lock rahenge
        userObj.isLocked = !!(user.isPrivate && !isOwner && !isFollowing);
        if (!isOwner) delete userObj.followRequests; // sirf owner ko apni pending requests list dikhe

        res.json(userObj);
    } catch (err) { res.status(500).json(err); }
});

// === NAYA: SOCIAL LINKS SAVE (sirf apni khud ki profile ke liye) ===
app.put('/api/users/:username/social-links', authMiddleware, async (req, res) => {
    try {
        if (req.user.username !== req.params.username) {
            return res.status(403).json({ message: "You can only edit your own social links" });
        }
        const { socialLinks } = req.body;
        if (!Array.isArray(socialLinks)) {
            return res.status(400).json({ message: "socialLinks array chahiye" });
        }
        // Basic sanitize — sirf allowed fields hi save karo
        const cleaned = socialLinks.map((l) => ({
            platform: l.platform || "website",
            label: l.label || "Website",
            url: l.url,
            visibility: ['public', 'private', 'custom'].includes(l.visibility) ? l.visibility : 'public',
            customMode: ['only', 'except'].includes(l.customMode) ? l.customMode : 'only',
            customUsers: Array.isArray(l.customUsers) ? l.customUsers : [],
        })).filter((l) => l.url && l.url.trim());

        const updatedUser = await User.findOneAndUpdate(
            { username: req.params.username },
            { $set: { socialLinks: cleaned } },
            { new: true }
        ).select("-password");

        res.json(updatedUser);
    } catch (err) { res.status(500).json(err); }
});

app.put('/api/users/:username', authMiddleware, async (req, res) => {
    try {
        // User sirf apni hi profile edit kar sakta hai, kisi aur ki nahi
        if (req.user.username !== req.params.username) {
            return res.status(403).json({ message: "You can only edit your own profile" });
        }
        const { password, ...safeUpdates } = req.body; // password yahan se update nahi hoga
        const updatedUser = await User.findOneAndUpdate(
            { username: req.params.username },
            { $set: safeUpdates },
            { new: true }
        ).select("-password");
        res.json(updatedUser);
    } catch (err) { res.status(500).json(err); }
});

// === FOLLOW / UNFOLLOW / FOLLOW-REQUEST (naya — private account support ke saath) ===
app.put('/api/users/:username/follow', authMiddleware, async (req, res) => {
    try {
        const targetUsername = req.params.username;
        const myUsername = req.user.username;

        if (targetUsername === myUsername) {
            return res.status(400).json({ message: "Aap khud ko follow nahi kar sakte" });
        }

        const targetUser = await User.findOne({ username: targetUsername });
        const meUser = await User.findOne({ username: myUsername });
        if (!targetUser || !meUser) return res.status(404).json({ message: "User not found" });

        const isFollowing = targetUser.followers.includes(myUsername);
        const hasRequested = (targetUser.followRequests || []).includes(myUsername);

        // Case 1: pehle se follow kar rahe hain -> unfollow
        if (isFollowing) {
            targetUser.followers = targetUser.followers.filter((u) => u !== myUsername);
            meUser.following = meUser.following.filter((u) => u !== targetUsername);
            await targetUser.save();
            await meUser.save();
            return res.json({ status: 'none', followersCount: targetUser.followers.length });
        }

        // Case 2: pending request pehle se bheji hui hai -> cancel karo
        if (hasRequested) {
            targetUser.followRequests = targetUser.followRequests.filter((u) => u !== myUsername);
            await targetUser.save();
            return res.json({ status: 'none', followersCount: targetUser.followers.length });
        }

        // Case 3: target private hai -> seedha follow nahi, request bhejo
        if (targetUser.isPrivate) {
            targetUser.followRequests = targetUser.followRequests || [];
            targetUser.followRequests.push(myUsername);
            await targetUser.save();
            await notifyUser(targetUsername, myUsername, 'follow_request', `${myUsername} ne aapko follow karne ki request bheji`);
            return res.json({ status: 'requested', followersCount: targetUser.followers.length });
        }

        // Case 4: public account -> turant follow
        targetUser.followers.push(myUsername);
        meUser.following.push(targetUsername);
        await targetUser.save();
        await meUser.save();
        await notifyUser(targetUsername, myUsername, 'follow', `${myUsername} ne aapko follow kiya`);
        res.json({ status: 'following', followersCount: targetUser.followers.length });
    } catch (err) { res.status(500).json(err); }
});

// Pending follow requests ki list (sirf apni khud ki, Settings page ke liye)
app.get('/api/follow-requests', authMiddleware, async (req, res) => {
    try {
        const me = await User.findOne({ username: req.user.username });
        if (!me) return res.status(404).json({ message: "User not found" });
        const requesters = await User.find({ username: { $in: me.followRequests || [] } })
            .select("username profilePic department");
        res.json(requesters);
    } catch (err) { res.status(500).json(err); }
});

// Follow request accept karo
app.put('/api/follow-requests/:requesterUsername/accept', authMiddleware, async (req, res) => {
    try {
        const me = await User.findOne({ username: req.user.username });
        const requester = await User.findOne({ username: req.params.requesterUsername });
        if (!me || !requester) return res.status(404).json({ message: "User not found" });
        if (!(me.followRequests || []).includes(requester.username)) {
            return res.status(400).json({ message: "Koi pending request nahi mili" });
        }
        me.followRequests = me.followRequests.filter((u) => u !== requester.username);
        me.followers.push(requester.username);
        requester.following.push(me.username);
        await me.save();
        await requester.save();
        await notifyUser(requester.username, me.username, 'follow_accept', `${me.username} ne aapki follow request accept kar li`);
        res.json({ message: "Accepted", followersCount: me.followers.length });
    } catch (err) { res.status(500).json(err); }
});

// Follow request reject karo
app.put('/api/follow-requests/:requesterUsername/reject', authMiddleware, async (req, res) => {
    try {
        const me = await User.findOne({ username: req.user.username });
        if (!me) return res.status(404).json({ message: "User not found" });
        me.followRequests = (me.followRequests || []).filter((u) => u !== req.params.requesterUsername);
        await me.save();
        res.json({ message: "Rejected" });
    } catch (err) { res.status(500).json(err); }
});

// === POST ROUTES (ab protected) ===
// ?club=slug diya jaaye toh sirf usi club ke posts (ClubDetail page ke liye)
// ?username=X diya jaaye toh sirf usi user ke posts (Profile page ke liye) — private account check ke saath
app.get('/api/posts', optionalAuth, async (req, res) => {
    try {
        const filter = {};
        if (req.query.club) filter.club = req.query.club;
        if (req.query.type) filter.type = req.query.type; // NAYA — ?type=meme

        if (req.query.username) {
            const profileUser = await User.findOne({ username: req.query.username });
            if (!profileUser) return res.json({ locked: false, posts: [] });
            const viewer = req.user?.username || null;
            const isOwner = viewer === profileUser.username;
            const isFollower = viewer ? profileUser.followers.includes(viewer) : false;
            if (profileUser.isPrivate && !isOwner && !isFollower) {
                // private account, viewer follower nahi hai -> posts lock rahenge
                return res.json({ locked: true, posts: [] });
            }
            filter.username = req.query.username;
            const posts = await Post.find(filter).sort({ createdAt: -1 });
            return res.json({ locked: false, posts });
        }

        const posts = await Post.find(filter).sort({ createdAt: -1 });
        res.json(posts);
    }
    catch (err) { res.status(500).json(err); }
});

app.post('/api/posts', authMiddleware, async (req, res) => {
    try {
        // Post ke saath current profilePic bhi save karte hain, taaki feed mein
        // sahi (latest) profile photo dikhe, sirf letter wala default avatar nahi
        const user = await User.findOne({ username: req.user.username });
        const newPost = new Post({ ...req.body, username: req.user.username, profilePic: user?.profilePic || "" });
        await newPost.save();

        // NAYA — apne saare followers ko notify karo ki naya post aaya hai
        if (user?.followers?.length) {
            user.followers.forEach((followerUsername) => {
                notifyUser(followerUsername, req.user.username, 'post', `${req.user.username} ne naya post kiya`, newPost._id);
            });
        }

        res.json(newPost);
    } catch (err) { res.status(500).json(err); }
});

app.put('/api/posts/:id/like', authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });
        const username = req.user.username;
        const alreadyLiked = post.likedBy.includes(username);
        if (alreadyLiked) {
            post.likedBy = post.likedBy.filter((u) => u !== username);
            post.likes = Math.max(0, post.likes - 1);
        } else {
            post.likedBy.push(username);
            post.likes += 1;
        }
        await post.save();

        // NAYA — sirf naye like pe notification (unlike pe nahi)
        if (!alreadyLiked) {
            await notifyUser(post.username, username, 'like', `${username} ne aapki post like ki`, post._id);
        }

        res.json(post);
    } catch (err) { res.status(500).json(err); }
});

// === NAYA: EMOJI REACTIONS ===
const ALLOWED_REACTIONS = ["👍", "❤️", "😂", "😮", "😢"];

app.put('/api/posts/:id/react', authMiddleware, async (req, res) => {
    try {
        const { emoji } = req.body;
        if (!ALLOWED_REACTIONS.includes(emoji)) {
            return res.status(400).json({ message: "Invalid reaction" });
        }
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });
        const username = req.user.username;

        const existingIndex = post.reactions.findIndex((r) => r.username === username);
        const hadSameReaction = existingIndex !== -1 && post.reactions[existingIndex].emoji === emoji;

        if (existingIndex !== -1) post.reactions.splice(existingIndex, 1);
        if (!hadSameReaction) {
            post.reactions.push({ username, emoji });
            if (post.username !== username) {
                await notifyUser(post.username, username, 'like', `${username} ne aapki post pe ${emoji} react kiya`, post._id);
            }
        }

        await post.save();
        res.json(post);
    } catch (err) { res.status(500).json(err); }
});

app.get('/api/memes/of-the-week', async (req, res) => {
    try {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const memes = await Post.find({ type: 'meme', createdAt: { $gte: weekAgo } });
        if (!memes.length) return res.json(null);
        const winner = memes.reduce((best, m) => {
            const score = (m.reactions?.length || 0) + (m.likes || 0);
            const bestScore = (best.reactions?.length || 0) + (best.likes || 0);
            return score > bestScore ? m : best;
        });
        res.json(winner);
    } catch (err) { res.status(500).json(err); }
});

app.put('/api/posts/:id/save', authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });
        const username = req.user.username;
        const alreadySaved = post.savedBy.includes(username);
        if (alreadySaved) {
            post.savedBy = post.savedBy.filter((u) => u !== username);
        } else {
            post.savedBy.push(username);
        }
        await post.save();
        res.json(post);
    } catch (err) { res.status(500).json(err); }
});

app.put('/api/posts/:id/share', authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });
        post.shareCount += 1;
        await post.save();
        res.json(post);
    } catch (err) { res.status(500).json(err); }
});

// Poll par vote karna - ek user sirf ek hi option pe vote kar sakta hai (revote allowed, replace hoga)
app.put('/api/posts/:id/vote', authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });
        const { optionIndex } = req.body;
        const username = req.user.username;

        // Pehle is user ka vote sabhi options se hata do (agar tha to)
        post.pollOptions.forEach((opt) => {
            opt.votes = opt.votes.filter((u) => u !== username);
        });
        // Fir naye option mein add karo
        if (post.pollOptions[optionIndex]) {
            post.pollOptions[optionIndex].votes.push(username);
        }
        await post.save();
        res.json(post);
    } catch (err) { res.status(500).json(err); }
});

app.post('/api/posts/:id/reply', authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        post.comments.push({ username: req.user.username, text: req.body.text });
        await post.save();
        io.emit('send-reply', { text: "Naya reply aaya hai!" });

        // NAYA — post owner ko comment ki notification
        await notifyUser(post.username, req.user.username, 'comment', `${req.user.username} ne aapki post pe comment kiya`, post._id);

        res.json(post);
    } catch (err) { res.status(500).json(err); }
});

app.delete('/api/posts/:id', authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });
        // Sirf apna post delete kar sakta hai
        if (post.username !== req.user.username) {
            return res.status(403).json({ message: "You can only delete your own posts" });
        }
        await Post.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted" });
    } catch (err) { res.status(500).json(err); }
});

// === STUDY MATERIALS ROUTES (naye) ===
app.get('/api/materials', async (req, res) => {
    try {
        const materials = await Material.find().sort({ createdAt: -1 });
        res.json(materials);
    } catch (err) { res.status(500).json(err); }
});

app.post('/api/materials', authMiddleware, (req, res, next) => {
    // NAYA: multer/Cloudinary upload ko manually wrap kiya hai taaki uska error bhi
    // pakad sakein (normally ye middleware ka error try/catch ke bahar hota hai
    // isliye pehle generic [object Object] / silent 500 aa raha tha)
    upload.single('file')(req, res, (err) => {
        if (err) {
            console.error("Upload middleware error:", err);
            return res.status(500).json({ message: "File upload failed", error: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "File is required" });
        const newMaterial = new Material({
            title: req.body.title,
            department: req.body.department,
            fileUrl: req.file.path, // Cloudinary ka secure_url yahan aata hai
            fileName: req.file.originalname,
            uploadedBy: req.user.username, // client se aaya value ignore, JWT se trusted username
        });
        await newMaterial.save();
        res.json(newMaterial);
    } catch (err) {
        console.error("Material save error:", err);
        res.status(500).json({ message: "Server error saving material", error: err.message });
    }
});

app.delete('/api/materials/:id', authMiddleware, async (req, res) => {
    try {
        const material = await Material.findById(req.params.id);
        if (!material) return res.status(404).json({ message: "Material not found" });
        if (material.uploadedBy !== req.user.username) {
            return res.status(403).json({ message: "You can only delete your own uploads" });
        }
        await Material.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted" });
    } catch (err) { res.status(500).json(err); }
});

// === NOTICE BOARD ROUTES (naye) ===
app.get('/api/notices', async (req, res) => {
    try {
        const notices = await Notice.find().sort({ createdAt: -1 });
        res.json(notices);
    } catch (err) { res.status(500).json(err); }
});

app.post('/api/notices', authMiddleware, async (req, res) => {
    try {
        const newNotice = new Notice({
            title: req.body.title,
            content: req.body.content,
            department: req.body.department,
            postedBy: req.user.username, // client se aaya value ignore, JWT se trusted username
        });
        await newNotice.save();
        res.json(newNotice);
    } catch (err) { res.status(500).json(err); }
});

app.delete('/api/notices/:id', authMiddleware, async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id);
        if (!notice) return res.status(404).json({ message: "Notice not found" });
        if (notice.postedBy !== req.user.username) {
            return res.status(403).json({ message: "You can only delete your own notices" });
        }
        await Notice.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted" });
    } catch (err) { res.status(500).json(err); }
});

// === CHAT ROUTES ===

// Sab users ki list (private chat + Students modal ke liye, apna naam chhodke)
app.get('/api/users', authMiddleware, async (req, res) => {
    try {
        const users = await User.find({ username: { $ne: req.user.username } })
            .select("username profilePic department followers following isPrivate followRequests");
        const myUsername = req.user.username;
        const result = users.map((u) => ({
            username: u.username,
            profilePic: u.profilePic,
            department: u.department,
            followersCount: u.followers.length,
            followingCount: u.following.length,
            isPrivate: !!u.isPrivate,
            isFollowing: u.followers.includes(myUsername),
            hasRequested: (u.followRequests || []).includes(myUsername), // NAYA — private account ko request bheji hui hai?
        }));
        res.json(result);
    } catch (err) { res.status(500).json(err); }
});

// Group chat ke abhi tak zinda (30 sec se purane nahi) messages
app.get('/api/messages/group', authMiddleware, async (req, res) => {
    try {
        const messages = await GroupMessage.find().sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) { res.status(500).json(err); }
});

// Kisi ek user ke saath private conversation history
app.get('/api/messages/private/:otherUsername', authMiddleware, async (req, res) => {
    try {
        const roomId = getPrivateRoomId(req.user.username, req.params.otherUsername);
        const messages = await PrivateMessage.find({
            $or: [
                { from: req.user.username, to: req.params.otherUsername },
                { from: req.params.otherUsername, to: req.user.username }
            ]
        }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) { res.status(500).json(err); }
});

// === NOTIFICATIONS ROUTES (naye) ===
app.get('/api/notifications', authMiddleware, async (req, res) => {
    try {
        const notifications = await Notification.find({ toUsername: req.user.username })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(notifications);
    } catch (err) { res.status(500).json(err); }
});

app.put('/api/notifications/read', authMiddleware, async (req, res) => {
    try {
        await Notification.updateMany(
            { toUsername: req.user.username, read: false },
            { $set: { read: true } }
        );
        res.json({ message: "Marked as read" });
    } catch (err) { res.status(500).json(err); }
});

// === STATS (Dashboard top cards ke liye) ===
app.get('/api/stats', authMiddleware, async (req, res) => {
    try {
        const [students, notes, notices, events] = await Promise.all([
            User.countDocuments(),
            Post.countDocuments({ type: { $in: ['notes', 'pdf'] } }),
            Notice.countDocuments(),
            Post.countDocuments({ type: 'event' })
        ]);
        res.json({ students, notes, notices, events });
    } catch (err) { res.status(500).json(err); }
});

// === 🛑 NAYA: AI ASSISTANT (Google Gemini — free tier se connected) ===
// Node 18+ mein fetch built-in hai, isliye koi extra npm package nahi lagi.
app.post('/api/ai/chat', authMiddleware, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ message: "Message khali nahi ho sakta" });
        }

        const systemPrompt = `Tum "Campus AI" ho — Campus Connect app (ek college students ke liye bana campus app) ka built-in assistant.
Tumhara kaam students ki padhai aur campus life mein madad karna hai: concepts explain karna, study notes dhoondhne mein guide karna (jo "Study Materials" section mein milte hain), GTU jaisi university ke purane papers (PYQ) ke baare mein general study tips dena, aur agar koi Attendance ya Events poochhe to unhe bata dena ki Events "Notice Board" mein aur Dashboard ke "Upcoming Events" mein milte hain, aur Attendance tracking abhi is app mein available nahi hai.
Hamesha friendly, concise aur helpful jawab do — Hinglish (Hindi + English mix) mein baat karo jaisa Indian college students aapas mein karte hain. Zaroorat se zyada lamba jawab mat do.`;

        const callGemini = () => fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    contents: [{ role: "user", parts: [{ text: message }] }],
                }),
            }
        );

        // === 🛑 NAYA: Retry logic — Gemini kabhi-kabhi "high demand" (503) dikhata hai,
        // jo temporary hota hai. 2 baar automatic retry karte hain user ko error dikhane se pehle.
        let response = await callGemini();
        let data = await response.json();

        for (let attempt = 0; !response.ok && response.status === 503 && attempt < 2; attempt++) {
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1))); // 1s, phir 2s wait
            response = await callGemini();
            data = await response.json();
        }

        if (!response.ok) {
            console.error("Gemini API error:", data);
            return res.status(502).json({ message: "AI se jawab nahi mila, thodi der baad try karo." });
        }

        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Maaf karo, jawab nahi mil paya.";
        res.json({ reply });
    } catch (err) {
        console.error("AI chat failed:", err.message);
        res.status(500).json({ message: "Server error, thodi der baad try karo." });
    }
});

const DAILY_POLL_QUESTIONS = [
    { content: "Aaj ka canteen ka best item kaunsa hai? 🍽️", options: ["Samosa", "Maggi", "Chai", "Vada Pav"] },
    { content: "Kaunsa department sabse zyada assignment deta hai? 😂", options: ["CSE", "Mechanical", "Electrical", "Civil"] },
    { content: "Weekend pe kya karoge?", options: ["Sona", "Ghumna", "Padhna", "Netflix"] },
    { content: "Sabse boring lecture kaunsa hota hai?", options: ["Maths", "Physics", "Chemistry", "Theory subject"] },
    { content: "Exam ke ek din pehle kya karte ho?", options: ["Poora syllabus padhte hain", "Sirf important topics", "Panic karte hain", "Sote hain"] },
];

async function postDailyPoll() {
    try {
        const q = DAILY_POLL_QUESTIONS[Math.floor(Math.random() * DAILY_POLL_QUESTIONS.length)];
        const poll = new Post({
            username: "CampusBot",
            content: q.content,
            type: "poll",
            pollOptions: q.options.map((text) => ({ text, votes: [] })),
        });
        await poll.save();
        console.log("✅ Daily poll posted:", q.content);
    } catch (err) { console.error("Daily poll post failed:", err.message); }
}

cron.schedule('0 9 * * *', postDailyPoll);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));