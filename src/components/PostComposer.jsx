import { useState } from "react";
import {
  MessageCircle,
  HelpCircle,
  FileText,
  Image as ImageIcon,
  BarChart3,
  Search,
  PartyPopper,
  Pin,
  X,
  Paperclip,
  Wrench,
  Gamepad2,
  BookMarked,
  Rocket,
  Briefcase,
  Laugh,
} from "lucide-react";

const POST_TYPES = [
  { key: "general", label: "General", icon: MessageCircle },
  { key: "question", label: "Question", icon: HelpCircle },
  { key: "notes", label: "Notes", icon: FileText },
  { key: "pdf", label: "PDF", icon: FileText },
  { key: "image", label: "Image", icon: ImageIcon },
  { key: "meme", label: "Meme", icon: Laugh },
  { key: "poll", label: "Poll", icon: BarChart3 },
  { key: "lostfound", label: "Lost & Found", icon: Search },
  { key: "event", label: "Event", icon: PartyPopper },
  { key: "notice", label: "Notice", icon: Pin },
];

// Dashboard/ClubDetail ke slugs se match karta hai
const CLUBS = [
  { slug: "", label: "General Feed (no club)" },
  { slug: "mechanical-dept", label: "Mechanical Dept", icon: Wrench },
  { slug: "esports-club", label: "Esports Club", icon: Gamepad2 },
  { slug: "lit-society", label: "Lit Society", icon: BookMarked },
  { slug: "tech-fest", label: "Tech Fest", icon: Rocket },
  { slug: "placement-cell", label: "Placement Cell", icon: Briefcase },
];

export const PostComposer = ({ onSubmit, onClose }) => {
  const [type, setType] = useState("general");
  const [club, setClub] = useState("");
  const [content, setContent] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [filePreview, setFilePreview] = useState("");
  const [fileName, setFileName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5000000) { alert("File 5MB se badi hai!"); return; }
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5000000) { alert("File 5MB se badi hai!"); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setFilePreview(reader.result); setFileName(file.name); };
    reader.readAsDataURL(file);
  };

  const updatePollOption = (i, value) => {
    const updated = [...pollOptions];
    updated[i] = value;
    setPollOptions(updated);
  };

  const addPollOption = () => {
    if (pollOptions.length < 4) setPollOptions([...pollOptions, ""]);
  };

  const removePollOption = (i) => {
    if (pollOptions.length > 2) setPollOptions(pollOptions.filter((_, idx) => idx !== i));
  };

  const handleSubmit = () => {
    const clubValue = club || null;

    if (type === "poll") {
      const validOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (!content.trim() || validOptions.length < 2) {
        alert("Poll ke liye question aur kam se kam 2 options chahiye.");
        return;
      }
      onSubmit({
        type,
        club: clubValue,
        content,
        pollOptions: validOptions.map((text) => ({ text, votes: [] })),
      });
      return;
    }

    if (!content.trim() && !imagePreview && !filePreview) {
      alert("Bhai! Kuch likho, ya photo/file add karo.");
      return;
    }

    onSubmit({
      type,
      club: clubValue,
      content,
      imageUrl: imagePreview,
      fileUrl: filePreview,
      fileName,
      eventDate: type === "event" ? eventDate : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
      <div className="rounded-2xl border w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}>

        <div className="flex justify-between items-center border-b p-5" style={{ borderColor: "var(--border-subtle)" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--accent-1)" }}>Share Campus Update</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-main)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {/* TYPE SELECTOR */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-hide">
            {POST_TYPES.map((t) => {
              const TypeIcon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setType(t.key)}
                  className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl flex-shrink-0 transition text-xs font-medium"
                  style={{
                    background: type === t.key ? "color-mix(in srgb, var(--accent-1) 20%, transparent)" : "var(--surface-2)",
                    color: type === t.key ? "var(--accent-1)" : "var(--text-muted)",
                    border: type === t.key ? "1px solid var(--accent-1)" : "1px solid transparent",
                  }}
                >
                  <TypeIcon size={17} strokeWidth={1.8} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* CLUB SELECTOR */}
          <div className="mb-4">
            <label className="text-xs block mb-1 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Post to
            </label>
            <select
              value={club}
              onChange={(e) => setClub(e.target.value)}
              className="w-full p-3 rounded-xl outline-none text-sm border"
              style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)", color: "var(--text-main)" }}
            >
              {CLUBS.map((c) => (
                <option key={c.slug} value={c.slug}>{c.label}</option>
              ))}
            </select>
          </div>

          <textarea
            className="w-full p-4 rounded-xl mb-4 outline-none text-base resize-none border"
            style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)", color: "var(--text-main)" }}
            rows="4"
            placeholder={type === "poll" ? "Poll ka question likho..." : "Ask a doubt, share a notice, or upload study notes..."}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {/* POLL OPTIONS */}
          {type === "poll" && (
            <div className="space-y-2 mb-4">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="w-full p-3 rounded-xl outline-none border text-sm"
                    style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)", color: "var(--text-main)" }}
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={(e) => updatePollOption(i, e.target.value)}
                  />
                  {pollOptions.length > 2 && (
                    <button onClick={() => removePollOption(i)} className="px-2" style={{ color: "#f87171" }}>
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 4 && (
                <button onClick={addPollOption} className="text-sm font-medium" style={{ color: "var(--accent-1)" }}>
                  + Add option
                </button>
              )}
            </div>
          )}

          {/* EVENT DATE */}
          {type === "event" && (
            <input
              type="date"
              className="w-full p-3 rounded-xl mb-4 outline-none border text-sm"
              style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)", color: "var(--text-main)" }}
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          )}

          {/* IMAGE UPLOAD (meme bhi isi UI ko reuse karta hai) */}
          {(type === "image" || type === "meme") && (
            <>
              {imagePreview && (
                <div className="relative mb-4">
                  <img
                    src={imagePreview}
                    className="rounded-lg max-h-64 w-full object-cover border"
                    style={{ borderColor: "var(--border-subtle)" }}
                    alt="Preview"
                  />
                  <button
                    onClick={() => setImagePreview("")}
                    className="absolute top-2 right-2 rounded-full w-8 h-8 flex items-center justify-center"
                    style={{ background: "rgba(239,68,68,0.85)", color: "#fff" }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <label
                className="cursor-pointer text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-2 border w-fit mb-2"
                style={{ borderColor: "var(--border-subtle)", color: "var(--text-main)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                <Paperclip size={15} /> Attach image
              </label>
            </>
          )}

          {/* PDF / NOTES FILE UPLOAD */}
          {(type === "pdf" || type === "notes") && (
            <>
              {fileName && (
                <div
                  className="flex items-center gap-2 mb-4 p-3 rounded-lg border text-sm"
                  style={{ borderColor: "var(--border-subtle)", background: "var(--surface-2)" }}
                >
                  <FileText size={16} style={{ color: "var(--accent-1)" }} /> {fileName}
                  <button onClick={() => { setFilePreview(""); setFileName(""); }} className="ml-auto" style={{ color: "#f87171" }}>
                    <X size={16} />
                  </button>
                </div>
              )}
              <label
                className="cursor-pointer text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-2 border w-fit mb-2"
                style={{ borderColor: "var(--border-subtle)", color: "var(--text-main)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={handleFileChange} className="hidden" />
                <Paperclip size={15} /> Attach file
              </label>
            </>
          )}

          <button
            onClick={handleSubmit}
            className="w-full mt-4 py-3 rounded-xl font-semibold transition"
            style={{ background: "var(--accent-1)", color: "var(--bg-base)" }}
          >
            Post update
          </button>
        </div>
      </div>
    </div>
  );
};