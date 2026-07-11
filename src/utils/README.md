# Campus Connect — Security Fixes (Round 1)

## Kya-kya fix hua

### Backend (`server.js`)
- MongoDB URI ab `.env` se aata hai, code mein hardcoded nahi
- Password ab **bcrypt** se hash hoke store hota hai
- Login/Signup ab **JWT token** return karte hain
- Naye `authMiddleware` se protected routes: post create, like, reply, delete, profile update
- Delete post: ab sirf apna post delete kar sakte ho (ownership check)
- Signup: duplicate username/email check add hua
- Login: response mein poori profile info (email, mobile, bio, etc.) bhi milti hai

### Frontend
- `src/utils/api.js` — naya shared axios instance jo automatically JWT token attach karta hai har request mein, aur 401 aane par login pe redirect kar deta hai
- `Login.jsx` — token + poori profile info localStorage mein save karta hai
- `Signup.jsx` — backend se aane wala real error message dikhata hai
- `ProtectedRoute.jsx` — ab token bhi check karta hai, sirf username nahi
- `App.jsx` — `ProtectedRoute` ab actually Dashboard/Chat/Profile routes ko wrap karta hai
- `Dashboard.jsx` — axios ki jagah shared `api` instance; delete button sirf apne post par dikhta hai; dead emoji-ternary bug fix

## ⚠️ Setup — ye steps zaroor follow karo

1. **MongoDB password turant change karo** Atlas dashboard se — jo password tumne pehle share kiya tha wo ab tumhare liye rotate karna hi hoga, chahe kuch bhi ho.

2. Backend mein naye packages install karo:
   ```bash
   cd server
   npm install bcryptjs jsonwebtoken dotenv
   ```

3. `server/.env` file banao (`.env.example` ko copy karke):
   ```
   MONGO_URI=<naya connection string, naye password ke saath>
   JWT_SECRET=<koi bhi lamba random string>
   PORT=5000
   ```

4. `server/.gitignore` mein (agar nahi hai to banao):
   ```
   node_modules/
   .env
   uploads/
   ```

5. Frontend mein agar deploy karna hai to `.env` mein:
   ```
   VITE_API_URL=https://tumhara-backend-url.com
   ```
   (local development ke liye kuch nahi karna, default `localhost:5000` use hoga)

6. **`models/User.js` aur `models/Post.js` delete kar do** — ye ab dead code hain, `server.js` mein hi schema define hai (single source of truth).

## Abhi baaki hai (agla round)

- Profile.jsx abhi bhi sirf localStorage use karta hai — backend `/api/users/:username` route se connect nahi hai
- Chat messages persist nahi hote (database mein save nahi ho rahe)
- `Sidebar.jsx` + `MainLayout.jsx` kahin use nahi ho rahe

Bata dena jab ye round test kar liya ho — agla step **Profile ko backend se connect karna** hoga.
