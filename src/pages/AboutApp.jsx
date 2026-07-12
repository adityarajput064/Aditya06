import { useNavigate } from "react-router-dom";

// === ADITECH — About / Credits Page ===
// Standalone hai, koi external CSS file pe depend nahi karta (sab inline styles),
// isliye kisi bhi project mein directly drop kar sakte ho.

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    color: "#e2e8f0",
    padding: "24px 16px 60px",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  backBtn: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#e2e8f0",
    borderRadius: "10px",
    padding: "8px 14px",
    fontSize: "14px",
    cursor: "pointer",
    marginBottom: "24px",
  },
  hero: {
    textAlign: "center",
    marginBottom: "36px",
  },
  logoCircle: {
    width: "84px",
    height: "84px",
    borderRadius: "22px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 14px",
    fontSize: "34px",
    fontWeight: "800",
    color: "#fff",
    boxShadow: "0 10px 30px rgba(99,102,241,0.35)",
  },
  appName: {
    fontSize: "26px",
    fontWeight: "800",
    margin: "0 0 4px",
  },
  tagline: {
    fontSize: "14px",
    color: "#94a3b8",
    margin: 0,
  },
  card: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "18px",
    maxWidth: "560px",
    marginLeft: "auto",
    marginRight: "auto",
  },
  cardTitle: {
    fontSize: "13px",
    fontWeight: "700",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#a5b4fc",
    marginBottom: "12px",
  },
  creatorRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  creatorAvatar: {
    width: "46px",
    height: "46px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #f472b6, #fb923c)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    color: "#fff",
    fontSize: "18px",
    flexShrink: 0,
  },
  creatorName: {
    fontWeight: "700",
    fontSize: "15px",
    margin: 0,
  },
  creatorRole: {
    fontSize: "13px",
    color: "#94a3b8",
    margin: 0,
  },
  stackGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
    gap: "10px",
  },
  stackChip: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px",
    padding: "10px 12px",
    fontSize: "13px",
  },
  stackChipLabel: {
    color: "#64748b",
    fontSize: "11px",
    display: "block",
    marginBottom: "2px",
  },
  stepList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  step: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
  },
  stepNum: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    background: "#6366f1",
    color: "#fff",
    fontSize: "12px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: "1px",
  },
  stepText: {
    fontSize: "14px",
    color: "#cbd5e1",
    lineHeight: "1.5",
  },
  platformTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#f1f5f9",
    margin: "18px 0 10px",
  },
  footer: {
    textAlign: "center",
    fontSize: "12px",
    color: "#64748b",
    marginTop: "30px",
  },
};

export function AboutApp() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <button style={styles.backBtn} onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div style={styles.hero}>
        <div style={styles.logoCircle}>AT</div>
        <h1 style={styles.appName}>Campus Connect</h1>
        <p style={styles.tagline}>Part of the ADITECH platform</p>
      </div>

      {/* CREATOR CREDITS */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>Created By</div>
        <div style={styles.creatorRow}>
          <div style={styles.creatorAvatar}>AR</div>
          <div>
            <p style={styles.creatorName}>Aditya Rajput</p>
            <p style={styles.creatorRole}>Design, Development & Deployment</p>
          </div>
        </div>
      </div>

      {/* PLATFORM */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>Platform</div>
        <div style={styles.creatorRow}>
          <div style={styles.creatorAvatar}>AT</div>
          <div>
            <p style={styles.creatorName}>ADITECH</p>
            <p style={styles.creatorRole}>
              <a
                href="https://aditechindia.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#a5b4fc", textDecoration: "none" }}
              >
                aditechindia.vercel.app
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* TECH STACK */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>Built With</div>
        <div style={styles.stackGrid}>
          <div style={styles.stackChip}>
            <span style={styles.stackChipLabel}>Frontend</span>
            React (Vite)
          </div>
          <div style={styles.stackChip}>
            <span style={styles.stackChipLabel}>Routing</span>
            React Router
          </div>
          <div style={styles.stackChip}>
            <span style={styles.stackChipLabel}>Backend</span>
            Node.js + Express
          </div>
          <div style={styles.stackChip}>
            <span style={styles.stackChipLabel}>Database</span>
            MongoDB (Mongoose)
          </div>
          <div style={styles.stackChip}>
            <span style={styles.stackChipLabel}>Realtime</span>
            Socket.IO
          </div>
          <div style={styles.stackChip}>
            <span style={styles.stackChipLabel}>Auth</span>
            JWT + bcrypt
          </div>
          <div style={styles.stackChip}>
            <span style={styles.stackChipLabel}>File Storage</span>
            Cloudinary
          </div>
          <div style={styles.stackChip}>
            <span style={styles.stackChipLabel}>Push Notifications</span>
            Web Push (VAPID)
          </div>
          <div style={styles.stackChip}>
            <span style={styles.stackChipLabel}>Backend Hosting</span>
            Render
          </div>
          <div style={styles.stackChip}>
            <span style={styles.stackChipLabel}>Frontend Hosting</span>
            Vercel
          </div>
        </div>
      </div>

      {/* INSTALL GUIDE */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>Install Campus Connect</div>

        <div style={styles.platformTitle}>📱 Android (Chrome)</div>
        <ol style={styles.stepList}>
          <li style={styles.step}>
            <span style={styles.stepNum}>1</span>
            <span style={styles.stepText}>Website Chrome mein khol.</span>
          </li>
          <li style={styles.step}>
            <span style={styles.stepNum}>2</span>
            <span style={styles.stepText}>Upar-right corner mein ⋮ (three dots) menu pe tap kar.</span>
          </li>
          <li style={styles.step}>
            <span style={styles.stepNum}>3</span>
            <span style={styles.stepText}>"Add to Home screen" ya "Install app" option choose kar.</span>
          </li>
          <li style={styles.step}>
            <span style={styles.stepNum}>4</span>
            <span style={styles.stepText}>Confirm kar — app icon home screen pe aa jayega, ab normal app ki tarah khulega.</span>
          </li>
        </ol>

        <div style={styles.platformTitle}>🍏 iPhone (Safari)</div>
        <ol style={styles.stepList}>
          <li style={styles.step}>
            <span style={styles.stepNum}>1</span>
            <span style={styles.stepText}>Website Safari mein khol (Chrome se nahi hoga, iOS pe sirf Safari se PWA install hota hai).</span>
          </li>
          <li style={styles.step}>
            <span style={styles.stepNum}>2</span>
            <span style={styles.stepText}>Neeche Share icon (□↑) pe tap kar.</span>
          </li>
          <li style={styles.step}>
            <span style={styles.stepNum}>3</span>
            <span style={styles.stepText}>"Add to Home Screen" select kar, phir "Add" pe tap kar.</span>
          </li>
        </ol>

        <div style={styles.platformTitle}>💻 Laptop / Desktop (Chrome/Edge)</div>
        <ol style={styles.stepList}>
          <li style={styles.step}>
            <span style={styles.stepNum}>1</span>
            <span style={styles.stepText}>Website khol, address bar ke right side mein install icon (⊕ ya monitor icon) dikhega.</span>
          </li>
          <li style={styles.step}>
            <span style={styles.stepNum}>2</span>
            <span style={styles.stepText}>Us icon pe click kar aur "Install" confirm kar.</span>
          </li>
          <li style={styles.step}>
            <span style={styles.stepNum}>3</span>
            <span style={styles.stepText}>App ab taskbar/desktop se ek standalone window mein khulega.</span>
          </li>
        </ol>
      </div>

      <p style={styles.footer}>Campus Connect © {new Date().getFullYear()} — Built by Aditya Rajput · ADITECH</p>
    </div>
  );
}
