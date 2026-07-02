import { RefreshCw } from 'lucide-react';

interface Props {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}

/** Calm, non-technical error banner with a "Try Again" action — never exposes raw error text to the user. */
export function ErrorBanner({ message, retryLabel, onRetry }: Props) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-sm"
      style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', color: 'var(--t2)' }}
    >
      <span>{message}</span>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--t1)' }}
      >
        <RefreshCw size={12} />
        {retryLabel}
      </button>
    </div>
  );
}
