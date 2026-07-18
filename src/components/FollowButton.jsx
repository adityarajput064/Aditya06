import { useState } from "react";
import { UserPlus, UserCheck, Clock, UserMinus } from "lucide-react";
import api from "../utils/api";
import { useLanguage } from "../context/LanguageContext";

// === NAYA: Follow/Unfollow/Request button — public account pe turant follow,
// private account pe request bhejta hai jab tak owner accept na kare ===
// Props:
//   username        -> jisko follow karna hai
//   status           -> 'owner' | 'following' | 'requested' | 'none'
//   onStatusChange   -> (newStatus, newFollowersCount) => void   (parent state update ke liye)
export const FollowButton = ({ username, status, onStatusChange, className = "" }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [hover, setHover] = useState(false);

  if (status === "owner") return null; // apni khud ki profile pe button nahi dikhta

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.put(`/api/users/${username}/follow`);
      onStatusChange?.(res.data.status, res.data.followersCount);
    } catch (err) {
      console.error("Follow toggle failed:", err);
      alert(err.response?.data?.message || "Kuch galat ho gaya, dobara try karo.");
    } finally {
      setLoading(false);
    }
  };

  let label = t("follow");
  let Icon = UserPlus;
  let style = { background: "var(--accent-1)", color: "var(--bg-base)" };

  if (status === "following") {
    label = hover ? t("unfollow") : t("following");
    Icon = hover ? UserMinus : UserCheck;
    style = hover
      ? { background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.4)" }
      : { background: "var(--surface-2)", color: "var(--text-main)", border: "1px solid var(--border-subtle)" };
  } else if (status === "requested") {
    label = t("requested");
    Icon = Clock;
    style = { background: "var(--surface-2)", color: "var(--text-muted)", border: "1px solid var(--border-subtle)" };
  }

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={loading}
      className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-60 ${className}`}
      style={style}
    >
      <Icon size={15} strokeWidth={2} /> {label}
    </button>
  );
};