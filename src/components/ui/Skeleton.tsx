export function SkeletonLine({ width = '100%', height = '0.875rem' }: { width?: string; height?: string }) {
  return (
    <div
      className="animate-shimmer rounded-md"
      style={{ width, height, border: '1px solid var(--border)' }}
    />
  );
}

export function SkeletonCard({ height = '5rem' }: { height?: string }) {
  return (
    <div
      className="animate-shimmer rounded-2xl"
      style={{ height, border: '1px solid var(--border)' }}
    />
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl card">
      <div className="animate-shimmer rounded-full shrink-0" style={{ width: 32, height: 32 }} />
      <div className="flex-1 space-y-2">
        <SkeletonLine width="40%" />
        <SkeletonLine width="60%" height="0.65rem" />
      </div>
    </div>
  );
}
