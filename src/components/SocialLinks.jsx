import { useState } from "react";
import { Plus, Pencil, Trash2, Lock, Globe, Users } from "lucide-react";
import { SocialIcon } from "./SocialIcon";
import { SocialLinkModal } from "./SocialLinkModal";

// === NAYA: SOCIAL LINKS SECTION (Profile page ke andar use hota hai) ===
// isOwner=true ho to add/edit/delete controls dikhte hain, warna sirf
// (backend se already filtered) visible links dikhte hain, click karke khulte hain.

const VISIBILITY_META = {
  public: { icon: Globe, label: "Public" },
  private: { icon: Lock, label: "Only me" },
  custom: { icon: Users, label: "Custom" },
};

export const SocialLinks = ({ links = [], isOwner, onChange }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const openAdd = () => { setEditingIndex(null); setShowModal(true); };
  const openEdit = (i) => { setEditingIndex(i); setShowModal(true); };

  const handleSave = (linkData) => {
    const updated = [...links];
    if (editingIndex !== null) updated[editingIndex] = linkData;
    else updated.push(linkData);
    onChange(updated);
    setShowModal(false);
  };

  const handleDelete = (i) => {
    onChange(links.filter((_, idx) => idx !== i));
  };

  if (!isOwner && links.length === 0) return null; // dusre ke profile pe kuch bhi na dikhe agar links hi nahi

  return (
    <div className="mb-5">
      <label className="text-xs block mb-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        Social Links
      </label>

      {links.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Koi link add nahi kiya abhi tak.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {links.map((link, i) => {
            const meta = VISIBILITY_META[link.visibility] || VISIBILITY_META.public;
            const VisIcon = meta.icon;
            return (
              <div
                key={i}
                className="flex items-center gap-2 pl-3 pr-2 py-2 rounded-xl border group"
                style={{ borderColor: "var(--border-subtle)", background: "var(--surface-2)" }}
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-medium"
                  style={{ color: "var(--text-main)" }}
                >
                  <SocialIcon platform={link.platform} size={17} />
                  {link.label}
                </a>

                {isOwner && (
                  <>
                    <span
                      className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ml-1"
                      style={{ background: "var(--surface-1)", color: "var(--text-muted)" }}
                      title={meta.label}
                    >
                      <VisIcon size={10} /> {meta.label}
                    </span>
                    <button onClick={() => openEdit(i)} style={{ color: "var(--text-muted)" }}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(i)} style={{ color: "var(--text-muted)" }}>
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isOwner && (
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 text-xs font-semibold mt-3 px-3 py-2 rounded-lg"
          style={{ background: "var(--surface-2)", color: "var(--accent-1)" }}
        >
          <Plus size={14} /> Add link
        </button>
      )}

      {showModal && (
        <SocialLinkModal
          initialLink={editingIndex !== null ? links[editingIndex] : null}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};