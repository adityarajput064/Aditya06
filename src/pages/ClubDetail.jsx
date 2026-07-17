import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";
import { Navbar } from "../components/Navbar";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { PostCard } from "../components/PostCard";
import { PostSkeleton } from "../components/PostSkeleton";
import { ArrowLeft, Wrench, Gamepad2, BookMarked, Rocket, Briefcase, Users } from "lucide-react";

const CLUB_INFO = {
  "mechanical-dept": { name: "Mechanical Dept", icon: Wrench, accent: "var(--text-muted)" },
  "esports-club": { name: "Esports Club", icon: Gamepad2, accent: "var(--accent-1)" },
  "lit-society": { name: "Lit Society", icon: BookMarked, accent: "var(--accent-3)" },
  "tech-fest": { name: "Tech Fest", icon: Rocket, accent: "var(--accent-2)" },
  "placement-cell": { name: "Placement Cell", icon: Briefcase, accent: "var(--accent-1)" },
};

export const ClubDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "Guest";
  const profilePic = localStorage.getItem("profilePic") || "";

  const club = CLUB_INFO[slug] || { name: "Unknown Group", icon: Users, accent: "var(--text-muted)" };
  const ClubIcon = club.icon;

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClubPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const fetchClubPosts = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/posts?club=${slug}`);
      setPosts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (id) => {
    try {
      const res = await api.put(`/api/posts/${id}/like`);
      setPosts((prev) => prev.map((p) => (p._id === id ? res.data : p)));
    } catch { alert("Like nahi ho paya."); }
  };

  const handleSave = async (id) => {
    try {
      const res = await api.put(`/api/posts/${id}/save`);
      setPosts((prev) => prev.map((p) => (p._id === id ? res.data : p)));
    } catch { alert("Save nahi ho paya."); }
  };

  const handleShare = async (id) => {
    try {
      const res = await api.put(`/api/posts/${id}/share`);
      setPosts((prev) => prev.map((p) => (p._id === id ? res.data : p)));
      await navigator.clipboard.writeText(`${window.location.origin}/club/${slug}`);
      alert("Link copy ho gaya!");
    } catch { alert("Share nahi ho paya."); }
  };

  const handleVote = async (id, optionIndex) => {
    try {
      const res = await api.put(`/api/posts/${id}/vote`, { optionIndex });
      setPosts((prev) => prev.map((p) => (p._id === id ? res.data : p)));
    } catch { alert("Vote nahi ho paya."); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/posts/${id}`);
      fetchClubPosts();
    } catch (err) {
      alert(err.response?.data?.message || "Delete nahi ho paya.");
    }
  };

  const handleReply = async (id, text) => {
    if (!text.trim()) return;
    try {
      const res = await api.post(`/api/posts/${id}/reply`, { text });
      setPosts((prev) => prev.map((p) => (p._id === id ? res.data : p)));
    } catch { alert("Reply nahi ho paya."); }
  };

  // NAYA — emoji reaction toggle
  const handleReact = async (id, emoji) => {
    try {
      const res = await api.put(`/api/posts/${id}/react`, { emoji });
      setPosts((prev) => prev.map((p) => (p._id === id ? res.data : p)));
    } catch { alert("Reaction nahi ho paya."); }
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
          <span
            className="flex items-center justify-center w-14 h-14 rounded-2xl shrink-0"
            style={{
              background: "color-mix(in srgb, " + club.accent + " 14%, var(--surface-1))",
              border: "1px solid color-mix(in srgb, " + club.accent + " 30%, var(--border-subtle))",
            }}
          >
            <ClubIcon size={24} strokeWidth={1.7} style={{ color: club.accent }} />
          </span>
          <div>
            <h1 className="text-lg font-semibold">{club.name}</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{posts.length} update{posts.length !== 1 && "s"}</p>
          </div>
        </div>

        <div className="space-y-8">
          {loading ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : posts.length > 0 ? (
            posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                currentUsername={username}
                onDelete={handleDelete}
                onLike={handleLike}
                onSave={handleSave}
                onShare={handleShare}
                onVote={handleVote}
                onReply={handleReply}
                onReact={handleReact}
              />
            ))
          ) : (
            <div className="glow-card text-center p-10">
              <ClubIcon size={36} strokeWidth={1.5} style={{ color: "var(--text-muted)" }} className="mx-auto mb-3" />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No updates from {club.name} yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};