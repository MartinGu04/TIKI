interface Props {
  isOpen: boolean;
  size?: number;
}

/**
 * Shared open/closed indicator for every market-status surface (Home
 * summary, the exchanges popup, the ticker popup's market info block).
 * Open: a small dot with a soft, continuous pulse — the only animated
 * element, and only while at least one relevant market is open. Closed:
 * the existing static moon, unchanged — no motion at all, on purpose, so
 * the UI reads calmer when nothing is moving.
 */
export function MarketStatusIcon({ isOpen, size = 8 }: Props) {
  if (!isOpen) return <span aria-hidden>🌙</span>;
  return (
    <span
      className="inline-block rounded-full animate-pulse-dot shrink-0"
      style={{ width: size, height: size, background: 'var(--up)' }}
      aria-hidden
    />
  );
}
