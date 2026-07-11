import { useNavigate, useLocation } from "react-router-dom";
import {
  Building2,
  MessageCircle,
  BookOpen,
  Pin,
  User,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Campus Feed", icon: Building2, path: "/dashboard" },
  { label: "Discussion Room", icon: MessageCircle, path: "/chat" },
  { label: "Study Materials", icon: BookOpen, path: "/study-materials" },
  { label: "Notice Board", icon: Pin, path: "/notice-board" },
  { label: "Profile", icon: User, path: "/profile" },
];

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div
      className="fixed left-0 top-0 h-screen w-20 flex flex-col items-center justify-between py-8 z-20 border-r"
      style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
    >
      <div className="flex flex-col items-center gap-8 w-full">
        <img
          src="/bg-image.png"
          alt="College Logo"
          className="w-11 h-11 rounded-2xl object-cover cursor-pointer"
          style={{ border: "2px solid var(--accent-1)" }}
          onClick={() => navigate("/dashboard")}
        />

        <nav className="flex flex-col items-center gap-2 w-full px-2">
          {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                title={label}
                className="w-full flex flex-col items-center gap-1 py-2.5 rounded-xl transition"
                style={{
                  color: active ? "var(--accent-1)" : "var(--text-muted)",
                  background: active ? "color-mix(in srgb, var(--accent-1) 12%, transparent)" : "transparent",
                }}
              >
                <Icon size={19} strokeWidth={1.8} />
                <span className="text-[9px] font-medium leading-tight text-center px-1">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <button
        onClick={handleLogout}
        title="Logout"
        className="flex flex-col items-center gap-1 py-2.5"
        style={{ color: "#f87171" }}
      >
        <LogOut size={19} strokeWidth={1.8} />
        <span className="text-[9px] font-medium">Logout</span>
      </button>
    </div>
  );
};
