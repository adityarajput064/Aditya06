export const StatCard = ({ icon, label, value }) => {
  return (
    <div
      className="glow-card flex items-center gap-3 p-4"
    >
      <span
        className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
        style={{
          background: "color-mix(in srgb, var(--accent-1) 14%, transparent)",
          color: "var(--accent-1)",
        }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-tight" style={{ color: "var(--text-main)" }}>
          {value ?? 0}
        </p>
        <p className="text-[11px] font-medium truncate" style={{ color: "var(--text-muted)" }}>
          {label}
        </p>
      </div>
    </div>
  );
};
