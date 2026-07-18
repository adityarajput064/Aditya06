import { useState } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

// === NAYA: Language dropdown — Settings page mein use hota hai ===
export const LanguageSwitcher = () => {
  const { language, setLanguage, languages, t } = useLanguage();
  const [open, setOpen] = useState(false);

  const current = languages.find((l) => l.code === language);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border transition"
        style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)", color: "var(--text-main)" }}
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <Globe size={16} style={{ color: "var(--accent-1)" }} />
          {current?.native || "English"}
        </span>
        <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 mt-2 rounded-xl border shadow-xl z-20 overflow-hidden"
          style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
        >
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLanguage(l.code); setOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-3 text-sm transition"
              style={{ color: "var(--text-main)", background: l.code === language ? "var(--surface-2)" : "transparent" }}
            >
              <span>
                {l.native} <span style={{ color: "var(--text-muted)" }}>({l.label})</span>
              </span>
              {l.code === language && <Check size={15} style={{ color: "var(--accent-1)" }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};