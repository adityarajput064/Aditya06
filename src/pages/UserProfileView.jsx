import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, MessageCircle, Grid3x3 } from "lucide-react";
import api from "../utils/api";
import { PostCard } from "../components/PostCard";
import { FollowButton } from "../components/FollowButton";
import { useLanguage } from "../context/LanguageContext";

// === NAYA: Kisi bhi user ka poora profile card dekhne wala page ===
// Route mein add karo: <Route path="/u/:username" element={<UserProfileView />} />
export const UserProfileView = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const currentUsername = localStorage.getItem("username") || "";

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await api.get(`/api/users/${username}`);
      setProfile(res.data);
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true);
      console.error("Profile load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [username]);

  const loadPosts = useCallback(async () => {
    try {
      const res = await api.get(`/api/posts?username=${username}`);
      setLocked(!!res.data.locked);
      setPosts(res.data.posts || []);
    } catch (err) {
      console.error("Posts load failed:", err);
    }
  }, [username]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    // profile load hone ke baad hi decide kar sakte hain ki locked hai ya nahi
    if (profile && !profile.isLocked) loadPosts();
    else if (profile && profile.isLocked) { setLocked(true); setPosts([]); }
  }, [profile, loadPosts]);

  const handleFollowStatusChange = (newStatus, newFollowersCount) => {
    setProfile((p) => ({ ...p, relationship: newStatus, followersCount: newFollowersCount, isLocked: newStatus === "following" ? false : p.isLocked }));
    if (newStatus === "following") loadPosts(); // turant follow hote hi posts load kar do
  };

  // === Post action handlers (PostCard ke props) ===
  const updatePostInList = (updated) => {
    setPosts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
  };

  const handleLike = async (id) => {
    try { const res = await api.put(`/api/posts/${id}/like`); updatePostInList(res.data); } catch (err) { console.error(err); }
  };
  const handleSave = async (id) => {
    try { const res = await api.put(`/api/posts/${id}/save`); updatePostInList(res.data); } catch (err) { console.error(err); }
  };
  const handleShare = async (id) => {
    try { const res = await api.put(`/api/posts/${id}/share`); updatePostInList(res.data); } catch (err) { console.error(err); }
  };
  const handleVote = async (id, optionIndex) => {
    try { const res = await api.put(`/api/posts/${id}/vote`, { optionIndex }); updatePostInList(res.data); } catch (err) { console.error(err); }
  };
  const handleReply = async (id, text) => {
    try { const res = await api.post(`/api/posts/${id}/reply`, { text }); updatePostInList(res.data); } catch (err) { console.error(err); }
  };
  const handleReact = async (id, emoji) => {
    try { const res = await api.put(`/api/posts/${id}/react`, { emoji }); updatePostInList(res.data); } catch (err) { console.error(err); }
  };
  const handleDelete = async (id) => {
    if (!confirm("Ye post delete karni hai?")) return;
    try { await api.delete(`/api/posts/${id}`); setPosts((prev) => prev.filter((p) => p._id !== id)); } catch (err) { console.error(err); }
  };

  if (loading) {
    return <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>Loading...</div>;
  }

  if (notFound || !profile) {
    return (
      <div className="p-8 text-center">
        <p style={{ color: "var(--text-muted)" }}>Ye user nahi mila.</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-sm font-semibold" style={{ color: "var(--accent-1)" }}>
          {t("backToProfile")}
        </button>
      </div>
    );
  }

  const isOwner = profile.relationship === "owner";

  return (
    <div className="max-w-2xl mx-auto p-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-medium mb-4"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft size={16} /> {t("backToProfile")}
      </button>

      {/* PROFILE HEADER */}
      <div className="glow-card p-6 mb-5">
        <div className="flex items-center gap-5 flex-wrap">
          {profile.profilePic ? (
            <img
              src={profile.profilePic}
              alt={profile.username}
              className="w-20 h-20 rounded-full object-cover"
              style={{ border: "2px solid var(--accent-1)" }}
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold"
              style={{ background: "color-mix(in srgb, var(--accent-1) 16%, transparent)", color: "var(--accent-1)" }}
            >
              {profile.username?.[0]?.toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold" style={{ color: "var(--text-main)" }}>{profile.username}</h1>
              {profile.isPrivate && <Lock size={15} style={{ color: "var(--text-muted)" }} />}
            </div>
            {profile.department && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{profile.department}</p>
            )}

            <div className="flex gap-5 mt-3">
              <div className="text-sm">
                <span className="font-bold" style={{ color: "var(--text-main)" }}>{locked ? "—" : posts.length}</span>{" "}
                <span style={{ color: "var(--text-muted)" }}>{t("posts")}</span>
              </div>
              <div className="text-sm">
                <span className="font-bold" style={{ color: "var(--text-main)" }}>{profile.followersCount ?? 0}</span>{" "}
                <span style={{ color: "var(--text-muted)" }}>{t("followers")}</span>
              </div>
              <div className="text-sm">
                <span className="font-bold" style={{ color: "var(--text-main)" }}>{profile.followingCount ?? 0}</span>{" "}
                <span style={{ color: "var(--text-muted)" }}>{t("following")}</span>
              </div>
            </div>
          </div>

          {!isOwner && (
            <div className="flex gap-2">
              <FollowButton
                username={profile.username}
                status={profile.relationship}
                onStatusChange={handleFollowStatusChange}
              />
              <button
                onClick={() => navigate(`/chat?to=${profile.username}`)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition"
                style={{ background: "var(--surface-2)", color: "var(--text-main)", border: "1px solid var(--border-subtle)" }}
              >
                <MessageCircle size={15} /> {t("message")}
              </button>
            </div>
          )}
        </div>

        {profile.bio && (
          <p className="text-sm mt-4 whitespace-pre-wrap" style={{ color: "var(--text-main)" }}>{profile.bio}</p>
        )}

        {profile.skills && (
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>💡 {profile.skills}</p>
        )}
      </div>

      {/* POSTS or LOCKED MESSAGE */}
      {locked ? (
        <div className="glow-card p-10 flex flex-col items-center text-center">
          <Lock size={32} style={{ color: "var(--text-muted)" }} />
          <h3 className="font-semibold mt-3" style={{ color: "var(--text-main)" }}>{t("privateAccountLocked")}</h3>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{t("privateAccountLockedDesc")}</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="glow-card p-10 flex flex-col items-center text-center">
          <Grid3x3 size={28} style={{ color: "var(--text-muted)" }} />
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>Abhi tak koi post nahi hai.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              currentUsername={currentUsername}
              onDelete={handleDelete}
              onLike={handleLike}
              onSave={handleSave}
              onShare={handleShare}
              onVote={handleVote}
              onReply={handleReply}
              onReact={handleReact}
            />
          ))}
        </div>
      )}
    </div>
  );
};