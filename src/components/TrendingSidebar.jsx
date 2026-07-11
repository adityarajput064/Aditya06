import { GlowCard } from "./GlowCard";
import { Flame } from "lucide-react";

export const TrendingSidebar = ({ posts }) => {
  // Real posts mein se sabse zyada "Helpful" (likes) wale top 5 nikaal rahe hain
  const trending = [...posts]
    .filter((p) => p.likes > 0)
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 5);

  return (
    <GlowCard className="p-5">
      <h3
        className="text-sm font-bold mb-4 tracking-widest uppercase flex items-center gap-2"
        style={{ color: "var(--text-muted)" }}
      >
        <Flame size={15} style={{ color: "var(--accent-2)" }} /> Trending
      </h3>

      {trending.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Abhi koi trending post nahi hai — jaise hi posts ko "Helpful" milega, wo yahan dikhega.
        </p>
      ) : (
        <div className="space-y-3">
          {trending.map((post) => (
            <div
              key={post._id}
              className="flex items-start gap-2 p-2 rounded-lg hover:bg-[var(--surface-2)] transition cursor-default"
            >
              <Flame size={17} style={{ color: "var(--accent-2)" }} className="shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm truncate" style={{ color: "var(--text-main)" }}>{post.content || "Attachment post"}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{post.likes} Helpful · by {post.username}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlowCard>
  );
};
