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
const sendEmail = async (to, otp, purpose) => {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            service_id: process.env.EMAILJS_SERVICE_ID,
            template_id: process.env.EMAILJS_TEMPLATE_ID,
            user_id: process.env.EMAILJS_PUBLIC_KEY,
            accessToken: process.env.EMAILJS_PRIVATE_KEY,
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
    name: { type: String, default: "" },
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
    followers: [{ type: String }],
    following: [{ type: String }],
    isPrivate: { type: Boolean, default: false },
    followRequests: [{ type: String }],
    language: { type: String, default: "en" },
    privacy: {
        showEmail: { type: Boolean, default: true },
        showMobile: { type: Boolean, default: false }
    },
    socialLinks: [{
        platform: { type: String, default: "website" },
        label: { type: String, default: "Website" },
        url: { type: String, required: true },
        visibility: { type: String, enum: ['public', 'private', 'custom'], default: 'public' },
        customMode: { type: String, enum: ['only', 'except'], default: 'only' },
        customUsers: [{ type: String }],
    }],
});
const User = mongoose.model('User', UserSchema);

// === 🛑 NAYA SUBSCRIBER SCHEMA (Push Notifications ke liye) ===
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
// NAYA — 'message' type add kiya gaya hai (private chat messages ke notification ke liye)
const NotificationSchema = new mongoose.Schema({
    toUsername: { type: String, required: true },
    fromUsername: { type: String, required: true },
    type: { type: String, enum: ['follow', 'like', 'comment', 'post', 'follow_request', 'follow_accept', 'message'], required: true },
    text: { type: String, required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
    read: { type: Boolean, default: false },
}, { timestamps: true });
const Notification = mongoose.model('Notification', NotificationSchema);
// ===============================================================

// === 🛑 NAYA: OTP SCHEMA (email login ke liye) ===
const OtpSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 300 }
});
const Otp = mongoose.model('Otp', OtpSchema);
// ===============================================================


// === 🛑 NAYA SUBSCRIBE ROUTE & NOTICE HELPER FUNCTION ===

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
async function notifyUser(toUsername, fromUsername, type, text, postId = null) {
  if (toUsername === fromUsername) return; // khud ko notification nahi
  try {
    const notif = await new Notification({ toUsername, fromUsername, type, text, postId }).save();
    io.to(toUsername).emit('new-notification', notif);
    await sendPushToUser(toUsername, text);
  } catch (err) { console.error("Notify failed:", err.message); }
}
// ===============================================================

const Post = mongoose.model('Post', new mongoose.Schema({
    username: String,
    profilePic: { type: String, default: "" },
    content: String,
    type: {
        type: String,
        enum: ['general', 'image', 'pdf', 'notes', 'question', 'poll', 'lostfound', 'event', 'notice', 'meme'],
        default: 'general'
    },
    club: { type: String, default: null },
    imageUrl: String,
    fileUrl: String,
    fileName: String,
    eventDate: String,
    mood: { type: String, default: "" },
    tags: [{ type: String }],
    pollOptions: [{
        text: String,
        votes: [String]
    }],
    likes: { type: Number, default: 0 },
    likedBy: [String],
    reactions: [{ username: String, emoji: String }],
    savedBy: [String],
    shareCount: { type: Number, default: 0 },
    comments: [{ username: String, text: String }]
}, { timestamps: true }));

// === STUDY MATERIALS (naya) ===
const MaterialSchema = new mongoose.Schema({
    title: { type: String, required: true },
    department: { type: String, default: "General" },
    fileUrl: { type: String, required: true },
    fileName: String,
    uploadedBy: String,
}, { timestamps: true });
const Material = mongoose.model('Material', MaterialSchema);

// === NOTICES (naya) ===
const NoticeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    department: { type: String, default: "Admin Office" },
    postedBy: String,
}, { timestamps: true });
const Notice = mongoose.model('Notice', NoticeSchema);

// GROUP CHAT: 30 second baad MongoDB khud document delete kar dega (TTL index).
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
    createdAt: { type: Date, default: Date.now, expires: 21600 }
});
const PrivateMessage = mongoose.model('PrivateMessage', PrivateMessageSchema);

const getPrivateRoomId = (userA, userB) => [userA, userB].sort().join("__");

// === MULTER + CLOUDINARY (study material file uploads) ===
const uploadStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'campus-connect-materials',
        resource_type: 'auto',
        public_id: (req, file) => `${Date.now()}-${path.parse(file.originalname).name.replace(/\s+/g, '_')}`,
    },
});
const upload = multer({
    storage: uploadStorage,
    limits: { fileSize: 20 * 1024 * 1024 }
});

// === 🛑 NAYA: ONLINE USERS TRACKING (Discussion Room ke liye) ===
const onlineUsers = new Map();

function broadcastOnlineUsers() {
    io.emit('online-users', Array.from(onlineUsers.keys()));
}

io.on('connection', (socket) => {
    socket.on('send-reply', (data) => { io.emit('receive-notification', data); });

    socket.on('register-user', (username) => {
        if (username) {
            socket.join(username);
            socket.data.username = username;

            if (!onlineUsers.has(username)) onlineUsers.set(username, new Set());
            onlineUsers.get(username).add(socket.id);
            broadcastOnlineUsers();
        }
    });

    socket.on('group-typing-start', (typingUsername) => {
        socket.broadcast.emit('group-typing-start', typingUsername);
    });
    socket.on('group-typing-stop', (typingUsername) => {
        socket.broadcast.emit('group-typing-stop', typingUsername);
    });

    socket.on('private-typing-start', ({ from, to }) => {
        const roomId = getPrivateRoomId(from, to);
        socket.to(roomId).emit('private-typing-start', { from });
    });
    socket.on('private-typing-stop', ({ from, to }) => {
        const roomId = getPrivateRoomId(from, to);
        socket.to(roomId).emit('private-typing-stop', { from });
    });

    // === GROUP CHAT (Discuss Room) ===
    // NAYA — group message pe bhi sabko (sender ke alawa) notification jaati hai
    socket.on('send-group-msg', async (data) => {
        try {
            const saved = await new GroupMessage({ username: data.username, text: data.text }).save();
            io.emit('receive-group-msg', {
                _id: saved._id,
                username: saved.username,
                text: saved.text,
                createdAt: saved.createdAt
            });

            // NAYA — abhi online sabhi users ko (khud ko chhodke) message notification
            onlineUsers.forEach((_, uname) => {
                if (uname !== data.username) {
                    notifyUser(uname, data.username, 'message', `${data.username} (Group): ${data.text}`);
                }
            });
        } catch (err) { console.error("Group message save failed:", err.message); }
    });

    // === PRIVATE CHAT (1-on-1) ===
    socket.on('join-private-room', ({ myUsername, otherUsername }) => {
        const roomId = getPrivateRoomId(myUsername, otherUsername);
        socket.join(roomId);
    });

    // NAYA — private message bhejte hi receiver ko notification (bell + push) jaati hai
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

            // NAYA — yahi missing tha: ab har private message pe notifyUser() chalega
            await notifyUser(to, from, 'message', `${from}: ${text}`);
        } catch (err) { console.error("Private message save failed:", err.message); }
    });

    socket.on('disconnect', () => {
        const disconnectedUsername = socket.data.username;
        if (disconnectedUsername && onlineUsers.has(disconnectedUsername)) {
            onlineUsers.get(disconnectedUsername).delete(socket.id);
            if (onlineUsers.get(disconnectedUsername).size === 0) {
                onlineUsers.delete(disconnectedUsername);
            }
            broadcastOnlineUsers();
        }
    });
});

// === 🛑 NAYA: DISPOSABLE / TEMP EMAIL BLOCKLIST ===
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
    return domain ? DISPOSABLE_EMAIL_DOMAINS.has(domain) : true;
}

// === AUTH ROUTES ===

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

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await Otp.deleteMany({ email });
        await new Otp({ email, otp }).save();

        await sendEmail(email, otp, "verify your email for signup");

        res.json({ message: "OTP bhej diya gaya hai" });
    } catch (err) {
        console.error("Signup OTP send failed:", err.message);
        res.status(500).json({ message: "OTP bhejne mein error aaya, dobara try karo" });
    }
});

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
        await Otp.deleteMany({ email });

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

app.post('/api/otp/send-reset', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email zaroori hai" });

        const user = await User.findOne({ email });
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
        await Otp.deleteMany({ email });

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

        userObj.socialLinks = (userObj.socialLinks || []).filter((link) => {
            if (isOwner) return true;
            if (link.visibility === 'public') return true;
            if (link.visibility === 'private') return false;
            if (link.visibility === 'custom') {
                if (!viewer) return false;
                if (link.customMode === 'only') return link.customUsers?.includes(viewer);
                if (link.customMode === 'except') return !link.customUsers?.includes(viewer);
            }
            return false;
        });

        const isFollowing = viewer ? user.followers.includes(viewer) : false;
        const hasRequested = viewer ? (user.followRequests || []).includes(viewer) : false;
        userObj.relationship = isOwner ? 'owner' : isFollowing ? 'following' : hasRequested ? 'requested' : 'none';
        userObj.followersCount = user.followers.length;
        userObj.followingCount = user.following.length;
        userObj.isLocked = !!(user.isPrivate && !isOwner && !isFollowing);
        if (!isOwner) delete userObj.followRequests;

        res.json(userObj);
    } catch (err) { res.status(500).json(err); }
});

app.put('/api/users/:username/social-links', authMiddleware, async (req, res) => {
    try {
        if (req.user.username !== req.params.username) {
            return res.status(403).json({ message: "You can only edit your own social links" });
        }
        const { socialLinks } = req.body;
        if (!Array.isArray(socialLinks)) {
            return res.status(400).json({ message: "socialLinks array chahiye" });
        }
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
        if (req.user.username !== req.params.username) {
            return res.status(403).json({ message: "You can only edit your own profile" });
        }
        const { password, ...safeUpdates } = req.body;

        if (safeUpdates.username && safeUpdates.username !== req.params.username) {
            const clash = await User.findOne({ username: safeUpdates.username });
            if (clash) {
                return res.status(400).json({ message: "Username already taken" });
            }
        }

        const updatedUser = await User.findOneAndUpdate(
            { username: req.params.username },
            { $set: safeUpdates },
            { new: true }
        ).select("-password");

        if (!updatedUser) return res.status(404).json({ message: "User not found" });

        const responseObj = updatedUser.toObject();

        if (safeUpdates.username && safeUpdates.username !== req.params.username) {
            responseObj.newToken = jwt.sign(
                { id: updatedUser._id, username: updatedUser.username },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );
        }

        res.json(responseObj);
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

        if (isFollowing) {
            targetUser.followers = targetUser.followers.filter((u) => u !== myUsername);
            meUser.following = meUser.following.filter((u) => u !== targetUsername);
            await targetUser.save();
            await meUser.save();
            return res.json({ status: 'none', followersCount: targetUser.followers.length });
        }

        if (hasRequested) {
            targetUser.followRequests = targetUser.followRequests.filter((u) => u !== myUsername);
            await targetUser.save();
            return res.json({ status: 'none', followersCount: targetUser.followers.length });
        }

        if (targetUser.isPrivate) {
            targetUser.followRequests = targetUser.followRequests || [];
            targetUser.followRequests.push(myUsername);
            await targetUser.save();
            await notifyUser(targetUsername, myUsername, 'follow_request', `${myUsername} ne aapko follow karne ki request bheji`);
            return res.json({ status: 'requested', followersCount: targetUser.followers.length });
        }

        targetUser.followers.push(myUsername);
        meUser.following.push(targetUsername);
        await targetUser.save();
        await meUser.save();
        await notifyUser(targetUsername, myUsername, 'follow', `${myUsername} ne aapko follow kiya`);
        res.json({ status: 'following', followersCount: targetUser.followers.length });
    } catch (err) { res.status(500).json(err); }
});

app.get('/api/follow-requests', authMiddleware, async (req, res) => {
    try {
        const me = await User.findOne({ username: req.user.username });
        if (!me) return res.status(404).json({ message: "User not found" });
        const requesters = await User.find({ username: { $in: me.followRequests || [] } })
            .select("username profilePic department");
        res.json(requesters);
    } catch (err) { res.status(500).json(err); }
});

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
app.get('/api/posts', optionalAuth, async (req, res) => {
    try {
        const filter = {};
        if (req.query.club) filter.club = req.query.club;
        if (req.query.type) filter.type = req.query.type;

        if (req.query.username) {
            const profileUser = await User.findOne({ username: req.query.username });
            if (!profileUser) return res.json({ locked: false, posts: [] });
            const viewer = req.user?.username || null;
            const isOwner = viewer === profileUser.username;
            const isFollower = viewer ? profileUser.followers.includes(viewer) : false;
            if (profileUser.isPrivate && !isOwner && !isFollower) {
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
        const user = await User.findOne({ username: req.user.username });
        const newPost = new Post({ ...req.body, username: req.user.username, profilePic: user?.profilePic || "" });
        await newPost.save();

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

app.put('/api/posts/:id/vote', authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });
        const { optionIndex } = req.body;
        const username = req.user.username;

        post.pollOptions.forEach((opt) => {
            opt.votes = opt.votes.filter((u) => u !== username);
        });
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

        await notifyUser(post.username, req.user.username, 'comment', `${req.user.username} ne aapki post pe comment kiya`, post._id);

        res.json(post);
    } catch (err) { res.status(500).json(err); }
});

app.delete('/api/posts/:id', authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });
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
            fileUrl: req.file.path,
            fileName: req.file.originalname,
            uploadedBy: req.user.username,
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
            postedBy: req.user.username,
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
            hasRequested: (u.followRequests || []).includes(myUsername),
        }));
        res.json(result);
    } catch (err) { res.status(500).json(err); }
});

app.get('/api/messages/group', authMiddleware, async (req, res) => {
    try {
        const messages = await GroupMessage.find().sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) { res.status(500).json(err); }
});

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

        let response = await callGemini();
        let data = await response.json();

        for (let attempt = 0; !response.ok && response.status === 503 && attempt < 2; attempt++) {
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
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