import { useState } from "react";
import { GlowCard } from "./GlowCard";
import {
  HelpCircle,
  FileText,
  Image as ImageIcon,
  BarChart3,
  Search,
  PartyPopper,
  Pin,
  Trash2,
  Calendar,
  Lightbulb,
  MessageCircle,
  Repeat2,
  Bookmark,
  Check,
  Send,
} from "lucide-react";

const TYPE_BADGES = {
  question: { label: "Question", icon: HelpCircle },
  notes: { label: "Notes", icon: FileText },
  pdf: { label: "PDF", icon: FileText },
  image: { label: "Image", icon: ImageIcon },
  poll: { label: "Poll", icon: BarChart3 },
  lostfound: { label: "Lost & Found", icon: Search },
  event: { label: "Event", icon: PartyPopper },
  notice: { label: "Notice", icon: Pin },
};

export const PostCard = ({ post, currentUsername, onDelete, onLike, onSave, onShare, onVote, onReply }) => {
  const [showComments, setShowComments] = useState(false);
  const [replyText, setReplyText] = useState("");

  const badge = TYPE_BADGES[post.type];
  const BadgeIcon = badge?.icon;
  const hasLiked = post.likedBy?.includes(currentUsername);
  const hasSaved = post.savedBy?.includes(currentUsername);
  const totalVotes = post.pollOptions?.reduce((sum, o) => sum + o.votes.length, 0) || 0;
  const myVoteIndex = post.pollOptions?.findIndex((o) => o.votes.includes(currentUsername));

  const handleReplySubmit = () => {
    if (!replyText.trim()) return;
    onReply(post._id, replyText);
    setReplyText("");
  };

  return (
    <GlowCard className="p-5">

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-base font-semibold"
            style={{
              background: "color-mix(in srgb, var(--accent-1) 16%, transparent)",
              color: "var(--accent-1)",
              border: "1px solid color-mix(in srgb, var(--accent-1) 35%, transparent)",
            }}
          >
            {post.username ? post.username[0].toUpperCase() : "?"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm" style={{ color: "var(--text-main)" }}>{post.username}</h3>
              {badge && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ background: "color-mix(in srgb, var(--accent-1) 15%, transparent)", color: "var(--accent-1)" }}
                >
                  <BadgeIcon size={11} strokeWidth={2} /> {badge.label}
                </span>
              )}
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{new Date(post.createdAt).toLocaleString()}</p>
          </div>
        </div>
        {post.username === currentUsername && (
          <button
            onClick={() => onDelete(post._id)}
            className="flex items-center gap-1.5 text-sm transition"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <Trash2 size={15} strokeWidth={1.8} /> <span className="hidden md:inline">Delete</span>
          </button>
        )}
      </div>

      {post.content && (
        <p className="text-sm mb-4 whitespace-pre-wrap leading-relaxed" style={{ color: "var(--text-main)" }}>{post.content}</p>
      )}

      {/* EVENT DATE */}
      {post.type === "event" && post.eventDate && (
        <div
          className="mb-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
          style={{ background: "color-mix(in srgb, var(--accent-3) 15%, transparent)", color: "var(--accent-3)" }}
        >
          <Calendar size={15} strokeWidth={1.8} />
          {new Date(post.eventDate).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
      )}

      {/* IMAGE */}
      {post.imageUrl && (
        <div className="mb-4">
          <img
            src={post.imageUrl}
            className="w-full max-h-[500px] object-cover rounded-xl border"
            style={{ borderColor: "var(--border-subtle)" }}
            alt="Attachment"
          />
        </div>
      )}

      {/* PDF/NOTES FILE */}
      {post.fileUrl && (
        <a
          href={post.fileUrl}
          download={post.fileName}
          className="flex items-center gap-3 mb-4 p-3 rounded-xl border transition"
          style={{ borderColor: "var(--border-subtle)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <span
            className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
            style={{ background: "color-mix(in srgb, var(--accent-1) 14%, transparent)", color: "var(--accent-1)" }}
          >
            <FileText size={18} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--text-main)" }}>{post.fileName || "Attached file"}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Tap to download</p>
          </div>
        </a>
      )}

      {/* POLL */}
      {post.type === "poll" && post.pollOptions?.length > 0 && (
        <div className="space-y-2 mb-4">
          {post.pollOptions.map((opt, i) => {
            const pct = totalVotes === 0 ? 0 : Math.round((opt.votes.length / totalVotes) * 100);
            const isMyVote = myVoteIndex === i;
            return (
              <button
                key={i}
                onClick={() => onVote(post._id, i)}
                className="w-full text-left relative rounded-xl overflow-hidden border p-3 transition"
                style={{ borderColor: isMyVote ? "var(--accent-1)" : "var(--border-subtle)" }}
              >
                <div
                  className="absolute inset-y-0 left-0 transition-all"
                  style={{ width: `${pct}%`, background: "color-mix(in srgb, var(--accent-1) 18%, transparent)" }}
                />
                <div className="relative flex justify-between items-center text-sm">
                  <span className="flex items-center gap-1.5" style={{ color: "var(--text-main)" }}>
                    {opt.text} {isMyVote && <Check size={14} strokeWidth={2.5} style={{ color: "var(--accent-1)" }} />}
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>{pct}% ({opt.votes.length})</span>
                </div>
              </button>
            );
          })}
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{totalVotes} vote{totalVotes !== 1 && "s"}</p>
        </div>
      )}

      {/* ACTIONS: Like / Comment / Share / Save */}
      <div className="flex gap-6 mt-2 pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
        <button
          onClick={() => onLike(post._id)}
          className="flex items-center gap-2 transition text-sm font-medium"
          style={{ color: hasLiked ? "var(--accent-1)" : "var(--text-muted)" }}
        >
          <Lightbulb size={17} strokeWidth={1.8} fill={hasLiked ? "currentColor" : "none"} />
          {post.likes || 0} Helpful
        </button>
        <button
          onClick={() => setShowComments((s) => !s)}
          className="flex items-center gap-2 transition text-sm font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          <MessageCircle size={17} strokeWidth={1.8} /> {post.comments?.length || 0} Discuss
        </button>
        <button
          onClick={() => onShare(post._id)}
          className="flex items-center gap-2 transition text-sm font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          <Repeat2 size={17} strokeWidth={1.8} /> {post.shareCount > 0 ? post.shareCount : "Share"}
        </button>
        <button
          onClick={() => onSave(post._id)}
          className="flex items-center gap-2 transition text-sm font-medium ml-auto"
          style={{ color: hasSaved ? "var(--accent-1)" : "var(--text-muted)" }}
        >
          <Bookmark size={17} strokeWidth={1.8} fill={hasSaved ? "currentColor" : "none"} /> {hasSaved ? "Saved" : "Save"}
        </button>
      </div>

      {showComments && (
        <>
          {post.comments && post.comments.length > 0 && (
            <div
              className="mt-4 rounded-xl p-4 space-y-3 border"
              style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}
            >
              {post.comments.map((c, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <span className="font-semibold" style={{ color: "var(--accent-1)" }}>{c.username}:</span>
                  <span style={{ color: "var(--text-main)" }}>{c.text}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex gap-3 items-center">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0"
              style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
            >
              You
            </div>
            <input
              className="text-sm w-full outline-none rounded-lg px-4 py-2 border transition"
              style={{ background: "var(--surface-2)", color: "var(--text-main)", borderColor: "var(--border-subtle)" }}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleReplySubmit()}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-1)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
              placeholder="Write your reply or solution..."
            />
            <button
              onClick={handleReplySubmit}
              className="flex items-center gap-1.5 font-semibold text-sm px-4 py-2 rounded-lg transition shrink-0"
              style={{ background: "var(--accent-1)", color: "var(--bg-base)" }}
            >
              <Send size={14} strokeWidth={2} /> Send
            </button>
          </div>
        </>
      )}
    </GlowCard>
  );
};
