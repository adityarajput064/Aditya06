import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { Search, MessageCircle, Bell, Moon, Sun, User, LogOut, Settings } from "lucide-react";
import api from "../utils/api";

const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000");

// Notification ke time ko "5m pehle", "2h pehle" jaisa dikhane ke liye
const timeAgo = (date) => {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return "abhi";
  if (diff < 3600) return `${Math.floor(diff / 60)}m pehle`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h pehle`;
  return `${Math.floor(diff / 86400)}d pehle`;
};

export const Navbar = ({ username, profilePic }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showNotifs, setShowNotifs] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [notifications, setNotifications] = useState([]);

  const notifRef = useRef(null);
  const avatarRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Theme ko <html> tag pe apply karte hain taaki CSS variables switch ho sakein
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Bahar click karne pe dropdowns band ho jayein
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target)) setShowAvatarMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // === NAYA: Notifications fetch karo + real-time updates ke liye socket room join karo ===
  useEffect(() => {
    if (!username || username === "Guest") return;

    fetchNotifications();

    socket.emit("register-user", username);
    socket.on("new-notification", (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    });

    return () => socket.off("new-notification");
  }, [username]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/api/notifications");
      setNotifications(res.data);
    } catch (err) { console.error(err); }
  };

  // Bell khulte hi saari notifications ko "read" mark kar do
  const handleBellClick = async () => {
    const opening = !showNotifs;
    setShowNotifs(opening);
    if (opening && unreadCount > 0) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      try { await api.put("/api/notifications/read"); } catch (err) { console.error(err); }
    }
  };

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <nav
      className="navbar-glass sticky top-0 z-30 h-16 flex items-center justify-between px-4 md:px-6 border-b"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      {/* SEARCH */}
      <div className="flex items-center gap-2 bg-[var(--surface-2)] rounded-xl px-3 py-2 w-full max-w-xs md:max-w-sm">
        <Search size={16} strokeWidth={1.8} style={{ color: "var(--text-muted)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search students, notes, events..."
          className="bg-transparent outline-none text-sm w-full placeholder:text-[var(--text-muted)]"
        />
      </div>

      {/* RIGHT ICONS */}
      <div className="flex items-center gap-2 md:gap-3">

        {/* Messages */}
        <button
          onClick={() => navigate("/chat")}
          className="relative w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[var(--surface-2)] transition"
          title="Messages"
        >
          <MessageCircle size={19} strokeWidth={1.8} style={{ color: "var(--text-main)" }} />
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleBellClick}
            className="relative w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[var(--surface-2)] transition"
            title="Notifications"
          >
            <Bell size={19} strokeWidth={1.8} style={{ color: "var(--text-main)" }} />
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 w-4 h-4 text-[10px] font-bold rounded-full flex items-center justify-center"
                style={{ background: "var(--accent-1)", color: "var(--bg-base)" }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div
              className="fixed left-4 right-4 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-72 navbar-glass rounded-xl shadow-2xl overflow-hidden border max-h-96 overflow-y-auto z-50"
            >
              <div
                className="px-4 py-3 font-semibold text-sm border-b sticky top-0"
                style={{ borderColor: "var(--border-subtle)", background: "var(--surface-1)" }}
              >
                Notifications
              </div>
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
                  Koi notification nahi hai
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n._id}
                    className="px-4 py-3 text-sm hover:bg-[var(--surface-2)] transition border-b last:border-0"
                    style={{
                      borderColor: "var(--border-subtle)",
                      background: n.read ? "transparent" : "color-mix(in srgb, var(--accent-1) 8%, transparent)",
                    }}
                  >
                    <p>{n.text}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{timeAgo(n.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Settings */}
        <button
          onClick={() => navigate("/settings")}
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[var(--surface-2)] transition"
          title="Settings"
        >
          <Settings size={18} strokeWidth={1.8} style={{ color: "var(--text-main)" }} />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[var(--surface-2)] transition"
          title="Toggle theme"
        >
          {theme === "dark" ? (
            <Moon size={18} strokeWidth={1.8} style={{ color: "var(--text-main)" }} />
          ) : (
            <Sun size={18} strokeWidth={1.8} style={{ color: "var(--text-main)" }} />
          )}
        </button>

        {/* Avatar dropdown */}
        <div className="relative" ref={avatarRef}>
          <button
            onClick={() => setShowAvatarMenu((s) => !s)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-[var(--surface-2)] transition"
          >
            <img
              src={profilePic || `https://ui-avatars.com/api/?name=${username}&background=00E5FF&color=000`}
              className="w-8 h-8 rounded-full object-cover border-2"
              style={{ borderColor: "var(--accent-1)" }}
              alt="avatar"
            />
            <span className="hidden md:block text-sm font-medium">{username}</span>
          </button>

          {showAvatarMenu && (
            <div
              className="absolute right-0 mt-2 w-48 navbar-glass rounded-xl shadow-2xl overflow-hidden border"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <button
                onClick={() => { setShowAvatarMenu(false); navigate("/profile"); }}
                className="w-full flex items-center gap-2.5 text-left px-4 py-3 text-sm hover:bg-[var(--surface-2)] transition"
              >
                <User size={16} strokeWidth={1.8} /> View profile
              </button>
              <button
                onClick={() => { setShowAvatarMenu(false); navigate("/settings"); }}
                className="w-full flex items-center gap-2.5 text-left px-4 py-3 text-sm hover:bg-[var(--surface-2)] transition"
              >
                <Settings size={16} strokeWidth={1.8} /> Settings
              </button>
              <button
                onClick={() => { localStorage.clear(); navigate("/login"); }}
                className="w-full flex items-center gap-2.5 text-left px-4 py-3 text-sm hover:bg-[var(--surface-2)] transition"
                style={{ color: "#f87171" }}
              >
                <LogOut size={16} strokeWidth={1.8} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};