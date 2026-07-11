export const PostSkeleton = () => {
  return (
    <div className="bg-[var(--surface-1)] border rounded-2xl p-5 shadow-xl" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full skeleton-shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 rounded skeleton-shimmer" />
          <div className="h-2 w-20 rounded skeleton-shimmer" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 w-full rounded skeleton-shimmer" />
        <div className="h-3 w-4/5 rounded skeleton-shimmer" />
      </div>
      <div className="h-48 w-full rounded-xl skeleton-shimmer mb-4" />
      <div className="flex gap-6 pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="h-4 w-20 rounded skeleton-shimmer" />
        <div className="h-4 w-20 rounded skeleton-shimmer" />
      </div>
    </div>
  );
};
