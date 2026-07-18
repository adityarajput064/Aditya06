import { useState, useEffect, useMemo } from "react";
import { X, Globe, Users, Search } from "lucide-react";
import api from "../utils/api";
import { detectPlatform, normalizeUrl } from "../utils/socialPlatforms";
import { SocialIcon } from "./SocialIcon";

// === NAYA: SOCIAL LINK ADD/EDIT MODAL ===
// URL paste karte hi platform auto-detect hoke icon+naam dikhta hai.
// Visibility: Public / Private / Custom (custom mein "sirf inko dikhao" ya "inse chhupao")

export const SocialLinkModal = ({ initialLink, onSave, onClose }) => {
  const [url, setUrl] = useState(initialLink?.url || "");
  const [visibility, setVisibility] = useState(initialLink?.visibility || "public");
  const [customMode, setCustomMode] = useState(initialLink?.customMode || "only");
  const [customUsers, setCustomUsers] = useState(initialLink?.customUsers || []);
  const [allUsers, setAllUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const detected = useMemo(() => detectPlatform(url), [url]);

  useEffect(() => {
    if (visibility === "custom") fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibility]);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/api/users");
      setAllUsers(res.data);
    } catch (err) { console.error(err); }
  };

  const toggleUser = (username) => {
    setCustomUsers((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
    );
  };

  const filteredUsers = allUsers.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    if (!url.trim()) {
      alert("Link daalo pehle.");
      return;
    }
    setSaving(true);
    onSave({
      platform: detected.key,
      label: detected.label,
      url: normalizeUrl(url),
      visibility,
      customMode,
      customUsers: visibility === "custom" ? customUsers : [],
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[70] backdrop-blur-sm">
      <div
        className="rounded-2xl border w-full max-w-md shadow-2xl max-h-[85vh] overflow-y-auto"
        style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
      >
        <div className="flex justify-between items-center border-b p-5" style={{ borderColor: "var(--border-subtle)" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--accent-1)" }}>
            {initialLink ? "Edit Link" : "Add Social Link"}
          </h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* URL INPUT + AUTO-DETECTED PREVIEW */}
          <div>
            <label className="text-xs block mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Profile Link
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g. instagram.com/yourusername"
              className="w-full p-3 rounded-xl outline-none text-sm"
              style={{ background: "var(--surface-2)", color: "var(--text-main)", border: "1px solid var(--border-subtle)" }}
            />
            {url.trim() && (
              <div
                className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", color: "var(--text-main)" }}
              >
                <SocialIcon platform={detected.key} size={16} />
                Detected: <span className="font-medium">{detected.label}</span>
              </div>
            )}
          </div>

          {/* VISIBILITY */}
          <div>
            <label className="text-xs block mb-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Who can see this
            </label>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: "public", label: "Public" },
                { key: "private", label: "Only me" },
                { key: "custom", label: "Custom" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setVisibility(opt.key)}
                  className="px-3 py-2 rounded-xl text-xs font-medium transition"
                  style={{
                    background: visibility === opt.key ? "color-mix(in srgb, var(--accent-1) 20%, transparent)" : "var(--surface-2)",
                    color: visibility === opt.key ? "var(--accent-1)" : "var(--text-muted)",
                    border: visibility === opt.key ? "1px solid var(--accent-1)" : "1px solid transparent",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* CUSTOM SUB-OPTIONS */}
          {visibility === "custom" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setCustomMode("only")}
                  className="flex-1 px-3 py-2 rounded-xl text-xs font-medium transition"
                  style={{
                    background: customMode === "only" ? "color-mix(in srgb, var(--accent-1) 20%, transparent)" : "var(--surface-2)",
                    color: customMode === "only" ? "var(--accent-1)" : "var(--text-muted)",
                  }}
                >
                  Sirf inko dikhao
                </button>
                <button
                  onClick={() => setCustomMode("except")}
                  className="flex-1 px-3 py-2 rounded-xl text-xs font-medium transition"
                  style={{
                    background: customMode === "except" ? "color-mix(in srgb, var(--accent-1) 20%, transparent)" : "var(--surface-2)",
                    color: customMode === "except" ? "var(--accent-1)" : "var(--text-muted)",
                  }}
                >
                  Inse chhupao
                </button>
              </div>

              <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "var(--surface-2)" }}>
                <Search size={14} style={{ color: "var(--text-muted)" }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Student search karo..."
                  className="bg-transparent outline-none text-sm w-full"
                  style={{ color: "var(--text-main)" }}
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {filteredUsers.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>Koi student nahi mila.</p>
                ) : (
                  filteredUsers.map((u) => (
                    <label
                      key={u.username}
                      className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer"
                      style={{ background: customUsers.includes(u.username) ? "color-mix(in srgb, var(--accent-1) 10%, transparent)" : "transparent" }}
                    >
                      <input
                        type="checkbox"
                        checked={customUsers.includes(u.username)}
                        onChange={() => toggleUser(u.username)}
                        className="accent-cyan-500"
                      />
                      <img
                        src={u.profilePic || `https://ui-avatars.com/api/?name=${u.username}&background=00E5FF&color=111`}
                        className="w-6 h-6 rounded-full object-cover"
                        alt={u.username}
                      />
                      <span className="text-sm truncate" style={{ color: "var(--text-main)" }}>{u.username}</span>
                    </label>
                  ))
                )}
              </div>
              <p className="text-[11px] flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                <Users size={12} /> {customUsers.length} student{customUsers.length !== 1 && "s"} selected
              </p>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl font-semibold text-sm transition disabled:opacity-60"
            style={{ background: "var(--accent-1)", color: "var(--bg-base)" }}
          >
            {initialLink ? "Save changes" : "Add link"}
          </button>
        </div>
      </div>
    </div>
  );
};