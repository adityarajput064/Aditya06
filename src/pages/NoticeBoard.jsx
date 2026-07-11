import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { Navbar } from "../components/Navbar";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { ArrowLeft, Pin, Trash2, Send } from "lucide-react";

const DEPARTMENTS = ["Admin Office", "Mechanical", "CSE", "Electrical", "Civil", "Placement Cell"];

export const NoticeBoard = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "Guest";
  const profilePic = localStorage.getItem("profilePic") || "";

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [department, setDepartment] = useState(DEPARTMENTS[0]);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const res = await api.get("/api/notices");
      setNotices(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert("Title aur content dono zaroori hain.");
      return;
    }
    setPosting(true);
    try {
      await api.post("/api/notices", { title, content, department, postedBy: username });
      setTitle("");
      setContent("");
      fetchNotices();
    } catch (err) {
      alert("Notice post nahi ho paya.");
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/notices/${id}`);
      fetchNotices();
    } catch (err) {
      alert("Delete nahi ho paya.");
    }
  };

  return (
    <div className="min-h-screen relative font-sans" style={{ background: "var(--bg-base)", color: "var(--text-main)" }}>
      <AnimatedBackground />
      <Navbar username={username} profilePic={profilePic} />

      <div className="max-w-3xl mx-auto w-full py-8 px-4 z-10 relative">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm font-medium mb-6"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={16} /> Back to feed
        </button>

        <h1 className="text-xl font-semibold mb-1">Notice Board</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Official notices and updates from departments.
        </p>

        {/* Create notice */}
        <form onSubmit={handlePost} className="glow-card p-5 mb-8 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notice title"
              className="w-full p-3 rounded-xl outline-none text-sm"
              style={{ background: "var(--surface-2)", color: "var(--text-main)", border: "1px solid var(--border-subtle)" }}
            />
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full p-3 rounded-xl outline-none text-sm"
              style={{ background: "var(--surface-2)", color: "var(--text-main)", border: "1px solid var(--border-subtle)" }}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Notice details..."
            rows={3}
            className="w-full p-3 rounded-xl outline-none text-sm resize-none"
            style={{ background: "var(--surface-2)", color: "var(--text-main)", border: "1px solid var(--border-subtle)" }}
          />
          <button
            type="submit"
            disabled={posting}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60"
            style={{ background: "var(--accent-1)", color: "var(--bg-base)" }}
          >
            <Send size={15} /> {posting ? "Posting..." : "Post notice"}
          </button>
        </form>

        {/* List */}
        {loading ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading notices...</p>
        ) : notices.length === 0 ? (
          <div className="glow-card p-10 text-center">
            <Pin size={36} strokeWidth={1.5} style={{ color: "var(--text-muted)" }} className="mx-auto mb-3" />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No notices yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notices.map((n) => (
              <div key={n._id} className="glow-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 mt-0.5"
                      style={{ background: "color-mix(in srgb, var(--accent-3) 15%, transparent)", color: "var(--accent-3)" }}
                    >
                      <Pin size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{n.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {n.department} • {new Date(n.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-sm mt-2 whitespace-pre-wrap" style={{ color: "var(--text-main)" }}>{n.content}</p>
                    </div>
                  </div>
                  {n.postedBy === username && (
                    <button
                      onClick={() => handleDelete(n._id)}
                      className="p-2 rounded-lg shrink-0"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
