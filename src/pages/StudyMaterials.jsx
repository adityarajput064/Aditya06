import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { Navbar } from "../components/Navbar";
import { AnimatedBackground } from "../components/AnimatedBackground";
import {
  ArrowLeft,
  Upload,
  FileText,
  Trash2,
  Download,
  Loader2,
} from "lucide-react";

const DEPARTMENTS = ["Mechanical", "CSE", "Electrical", "Civil", "General"];

export const StudyMaterials = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "Guest";
  const profilePic = localStorage.getItem("profilePic") || "";

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const res = await api.get("/api/materials");
      setMaterials(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title.trim()) {
      alert("Title aur file dono zaroori hain.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("department", department);
      formData.append("file", file);
      formData.append("uploadedBy", username);

      await api.post("/api/materials", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setTitle("");
      setFile(null);
      fetchMaterials();
    } catch (err) {
      alert("Upload nahi ho paya. Server error.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/materials/${id}`);
      fetchMaterials();
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

        <h1 className="text-xl font-semibold mb-1">Study Materials</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Notes, PDFs and resources shared by students.
        </p>

        {/* Upload form */}
        <form onSubmit={handleUpload} className="glow-card p-5 mb-8 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs block mb-1 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Thermodynamics Unit 3 Notes"
                className="w-full p-3 rounded-xl outline-none text-sm"
                style={{ background: "var(--surface-2)", color: "var(--text-main)", border: "1px solid var(--border-subtle)" }}
              />
            </div>
            <div>
              <label className="text-xs block mb-1 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                Department
              </label>
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
          </div>

          <div>
            <label className="text-xs block mb-1 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              File (PDF, DOCX, image)
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full text-sm"
              style={{ color: "var(--text-muted)" }}
            />
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60"
            style={{ background: "var(--accent-1)", color: "var(--bg-base)" }}
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? "Uploading..." : "Upload material"}
          </button>
        </form>

        {/* List */}
        {loading ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading materials...</p>
        ) : materials.length === 0 ? (
          <div className="glow-card p-10 text-center">
            <FileText size={36} strokeWidth={1.5} style={{ color: "var(--text-muted)" }} className="mx-auto mb-3" />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No materials uploaded yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {materials.map((m) => (
              <div key={m._id} className="glow-card p-4 flex items-center gap-3">
                <span
                  className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
                  style={{ background: "color-mix(in srgb, var(--accent-1) 14%, transparent)", color: "var(--accent-1)" }}
                >
                  <FileText size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.title}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {m.department} • {m.uploadedBy} • {new Date(m.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <a
                  href={m.fileUrl}
                  download
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg shrink-0"
                  style={{ background: "var(--surface-2)", color: "var(--text-main)" }}
                >
                  <Download size={14} /> Download
                </a>
                {m.uploadedBy === username && (
                  <button
                    onClick={() => handleDelete(m._id)}
                    className="p-2 rounded-lg shrink-0"
                    style={{ color: "var(--text-muted)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
