import { useState, useEffect } from "react";
import { X, Smile, Users, Camera, Laugh } from "lucide-react";
import api from "../utils/api";

// === NAYA: Photo/Meme quick post — caption + image + mood + tag people ===

const MOODS = [
  { emoji: "😊", label: "Happy" },
  { emoji: "😂", label: "Laughing" },
  { emoji: "😍", label: "In Love" },
  { emoji: "🥳", label: "Celebrating" },
  { emoji: "😎", label: "Chill" },
  { emoji: "🔥", label: "Excited" },
  { emoji: "🤩", label: "Amazed" },
  { emoji: "🙃", label: "Silly" },
  { emoji: "😴", label: "Tired" },
  { emoji: "😢", label: "Sad" },
  { emoji: "😭", label: "Crying" },
  { emoji: "😡", label: "Annoyed" },
  { emoji: "😤", label: "Frustrated" },
  { emoji: "🥺", label: "Emotional" },
  { emoji: "😬", label: "Awkward" },
  { emoji: "🤔", label: "Thoughtful" },
  { emoji: "🤯", label: "Mind Blown" },
  { emoji: "😅", label: "Nervous" },
  { emoji: "🤒", label: "Sick" },
  { emoji: "📚", label: "Studying" },
  { emoji: "💪", label: "Motivated" },
  { emoji: "🥱", label: "Bored" },
  { emoji: "🎉", label: "Festive" },
  { emoji: "❤️", label: "Grateful" },
];

export const QuickPostModal = ({ type, onSubmit, onClose }) => {
  const [caption, setCaption] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [mood, setMood] = useState(null);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [users, setUsers] = useState([]);
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [showTagPicker, setShowTagPicker] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get("/api/users");
        setUsers(res.data);
      } catch (err) { console.error(err); }
    };
    fetchUsers();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5000000) { alert("File 5MB se badi hai!"); return; }
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const toggleTag = (username) => {
    setTaggedUsers((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
    );
  };

  const handleSubmit = () => {
    if (!imagePreview) {
      alert(type === "meme" ? "Meme image lagao pehle!" : "Photo lagao pehle!");
      return;
    }
    onSubmit({
      type,
      content: caption,
      imageUrl: imagePreview,
      mood: mood ? `${mood.emoji} ${mood.label}` : "",
      tags: taggedUsers,
    });
  };

  const title = type === "meme" ? "Share a Meme" : "Share a Photo";
  const TitleIcon = type === "meme" ? Laugh : Camera;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
      <div
        className="rounded-2xl border w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
      >
        <div className="flex justify-between items-center border-b p-5" style={{ borderColor: "var(--border-subtle)" }}>
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--accent-1)" }}>
            <TitleIcon size={19} /> {title}
          </h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {imagePreview ? (
            <div className="relative mb-4">
              <img
                src={imagePreview}
                className="rounded-xl max-h-72 w-full object-cover border"
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
          ) : (
            <label
              className="cursor-pointer flex flex-col items-center justify-center gap-2 py-10 rounded-xl border-2 border-dashed mb-4 transition"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}
            >
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              <TitleIcon size={28} strokeWidth={1.5} />
              <span className="text-sm font-medium">Tap to upload {type === "meme" ? "meme" : "photo"}</span>
            </label>
          )}

          <textarea
            className="w-full p-4 rounded-xl mb-4 outline-none text-base resize-none border"
            style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)", color: "var(--text-main)" }}
            rows="3"
            placeholder="Caption likho..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />

          <div className="flex gap-2 mb-4 relative">
            <button
              onClick={() => { setShowMoodPicker((s) => !s); setShowTagPicker(false); }}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition"
              style={{ background: "var(--surface-2)", color: mood ? "var(--accent-1)" : "var(--text-muted)" }}
            >
              <Smile size={15} /> {mood ? `${mood.emoji} ${mood.label}` : "Add mood"}
            </button>
            <button
              onClick={() => { setShowTagPicker((s) => !s); setShowMoodPicker(false); }}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition"
              style={{ background: "var(--surface-2)", color: taggedUsers.length ? "var(--accent-1)" : "var(--text-muted)" }}
            >
              <Users size={15} /> {taggedUsers.length ? `${taggedUsers.length} tagged` : "Tag people"}
            </button>

            {showMoodPicker && (
              <div
                className="absolute top-12 left-0 z-20 grid grid-cols-4 gap-1 p-3 rounded-xl border shadow-xl w-72 max-h-64 overflow-y-auto"
                style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
              >
                {MOODS.map((m) => (
                  <button
                    key={m.label}
                    onClick={() => { setMood(m); setShowMoodPicker(false); }}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] transition"
                    style={{ color: "var(--text-main)" }}
                  >
                    <span className="text-xl">{m.emoji}</span>
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {showTagPicker && (
              <div
                className="absolute top-12 left-0 z-20 max-h-56 overflow-y-auto p-2 rounded-xl border shadow-xl w-64 space-y-1"
                style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
              >
                {users.length === 0 ? (
                  <p className="text-xs text-center py-3" style={{ color: "var(--text-muted)" }}>Koi student nahi mila.</p>
                ) : (
                  users.map((u) => (
                    <label
                      key={u.username}
                      className="flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm"
                      style={{
                        background: taggedUsers.includes(u.username) ? "color-mix(in srgb, var(--accent-1) 10%, transparent)" : "transparent",
                        color: "var(--text-main)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={taggedUsers.includes(u.username)}
                        onChange={() => toggleTag(u.username)}
                        className="accent-cyan-500"
                      />
                      {u.username}
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          {taggedUsers.length > 0 && (
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              Tagged: {taggedUsers.map((u) => `@${u}`).join(", ")}
            </p>
          )}

          <button
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl font-semibold transition"
            style={{ background: "var(--accent-1)", color: "var(--bg-base)" }}
          >
            Share {type === "meme" ? "meme" : "photo"}
          </button>
        </div>
      </div>
    </div>
  );
};