import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { Navbar } from "../components/Navbar";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { PostCard } from "../components/PostCard";
import { PostSkeleton } from "../components/PostSkeleton";
import { ArrowLeft, Laugh, Trophy } from "lucide-react";

export const MemeCorner = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "Guest";
  const profilePic = localStorage.getItem("profilePic") || "";
  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [memeOfWeek, setMemeOfWeek] = useState(null);

  useEffect(() => {
    fetchMemes();
    fetchMemeOfWeek();
  }, []);

  const fetchMemes = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/posts?type=meme");
      setMemes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemeOfWeek = async () => {
    try {
      const res = await api.get("/api/memes/of-the-week");
      setMemeOfWeek(res.data);
    } catch (err) { console.error(err); }
  };

  const handleLike = async (id) => {
    try {
      const res = await api.put(`/api/posts/${id}/like`);
      setMemes((prev) => prev.map((p) => (p._id === id ? res.data : p)));
    } catch { alert("Like nahi ho paya."); }
  };

  const handleReact = async (id, emoji) => {
    try {
      const res = await api.put(`/api/posts/${id}/react`, { emoji });
      setMemes((prev) => prev.map((p) => (p._id === id ? res.data : p)));
    } catch { alert("Reaction nahi ho paya."); }
  };

  const handleSave = async (id) => {
    try {
      const res = await api.put(`/api/posts/${id}/save`);
      setMemes((prev) => prev.map((p) => (p._id === id ? res.data : p)));
    } catch { alert("Save nahi ho paya."); }
  };

  const handleShare = async (id) => {
    try {
      const res = await api.put(`/api/posts/${id}/share`);
      setMemes((prev) => prev.map((p) => (p._id === id ? res.data : p)));
      await navigator.clipboard.writeText(`${window.location.origin}/meme-corner`);
      alert("Link copy ho gaya!");
    } catch { alert("Share nahi ho paya."); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/posts/${id}`);
      fetchMemes();
    } catch (err) {
      alert(err.response?.data?.message || "Delete nahi ho paya.");
    }
  };

  const handleReply = async (id, text) => {
    if (!text.trim()) return;
    try {
      const res = await api.post(`/api/posts/${id}/reply`, { text });
      setMemes((prev) => prev.map((p) => (p._id === id ? res.data : p)));
    } catch { alert("Reply nahi ho paya."); }
  };

  return (
    <div className="min-h-screen relative font-sans" style={{ background: "var(--bg-base)", color: "var(--text-main)" }}>
      <AnimatedBackground />
      <Navbar username={username} profilePic={profilePic} />
      <div className="max-w-2xl mx-auto w-full py-8 px-4 z-10 relative">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm font-medium mb-6"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={16} /> Back to feed
        </button>

        <div className="glow-card p-5 mb-6 flex items-center gap-4">
          <span className="flex items-center justify-center w-14 h-14 rounded-2xl shrink-0" style={{background: "color-mix(in srgb, var(--accent-2) 14%, var(--surface-1))", border: "1px solid color-mix(in srgb, var(--accent-2) 30%, var(--border-subtle))"}}>
            <Laugh size={24} strokeWidth={1.7} style={{ color: "var(--accent-2)" }} />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Meme Corner</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{memes.length} meme{memes.length !== 1 && "s"} shared</p>
          </div>
        </div>

        {memeOfWeek && (
          <div className="glow-card p-4 mb-6 flex items-center gap-3" style={{ borderColor: "color-mix(in srgb, #fbbf24 40%, var(--border-subtle))" }}>
            <span className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>
              <Trophy size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#fbbf24" }}>🏆 Meme of the Week</p>
              <p className="text-sm truncate" style={{ color: "var(--text-main)" }}>{memeOfWeek.content || "Untitled meme"} — by {memeOfWeek.username}</p>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {loading ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : memes.length > 0 ? (
            memes.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                currentUsername={username}
                onDelete={handleDelete}
                onLike={handleLike}
                onSave={handleSave}
                onShare={handleShare}
                onVote={() => {}}
                onReply={handleReply}
                onReact={handleReact}
              />
            ))
          ) : (
            <div className="glow-card text-center p-10">
              <Laugh size={36} strokeWidth={1.5} style={{ color: "var(--text-muted)" }} className="mx-auto mb-3" />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Koi meme nahi hai abhi — sabse pehle post karo!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};