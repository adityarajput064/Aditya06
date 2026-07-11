import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MessageCircle, Bell, Moon, Sun, User, LogOut } from "lucide-react";

const DUMMY_NOTIFICATIONS = [
  { id: 1, text: "Mid-1 Exam schedule released", time: "2h ago" },
  { id: 2, text: "New reply on your doubt post", time: "5h ago" },
  { id: 3, text: "Workshop practical submission due tomorrow", time: "1d ago" },
];

export const Navbar = ({ username, profilePic }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showNotifs, setShowNotifs] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");

  const notifRef = useRef(null);
  const avatarRef = useRef(null);

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
            onClick={() => setShowNotifs((s) => !s)}
            className="relative w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[var(--surface-2)] transition"
            title="Notifications"
          >
            <Bell size={19} strokeWidth={1.8} style={{ color: "var(--text-main)" }} />
            {DUMMY_NOTIFICATIONS.length > 0 && (
              <span
                className="absolute top-1 right-1 w-4 h-4 text-[10px] font-bold rounded-full flex items-center justify-center"
                style={{ background: "var(--accent-1)", color: "var(--bg-base)" }}
              >
                {DUMMY_NOTIFICATIONS.length}
              </span>
            )}
          </button>

          {showNotifs && (
            <div
              className="absolute right-0 mt-2 w-72 navbar-glass rounded-xl shadow-2xl overflow-hidden border"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div
                className="px-4 py-3 font-semibold text-sm border-b"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                Notifications
              </div>
              {DUMMY_NOTIFICATIONS.map((n) => (
                <div
                  key={n.id}
                  className="px-4 py-3 text-sm hover:bg-[var(--surface-2)] transition border-b last:border-0"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <p>{n.text}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{n.time}</p>
                </div>
              ))}
            </div>
          )}
        </div>

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
