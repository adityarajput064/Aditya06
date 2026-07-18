import { Camera, Laugh } from "lucide-react";

// === NAYA: Instagram jaisa quick-post bar — Dashboard feed ke top pe dikhta hai ===
export const QuickPostBar = ({ onSelect }) => {
  return (
    <div className="flex gap-3 mb-6">
      <button
        onClick={() => onSelect("image")}
        className="glow-card flex-1 flex items-center justify-center gap-2 py-3.5 font-semibold text-sm"
        style={{ color: "var(--accent-1)" }}
      >
        <Camera size={18} strokeWidth={2} /> Photo
      </button>
      <button
        onClick={() => onSelect("meme")}
        className="glow-card flex-1 flex items-center justify-center gap-2 py-3.5 font-semibold text-sm"
        style={{ color: "var(--accent-2)" }}
      >
        <Laugh size={18} strokeWidth={2} /> Meme
      </button>
    </div>
  );
};