import { Bell, X } from 'lucide-react';

interface Props {
  message: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
}

/** Lightweight, dismissible in-app nudge — the entire v1 "reminder" delivery mechanism (no OS push notifications). */
export function ReminderBanner({ message, actionLabel, onAction, onDismiss }: Props) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl animate-slide-up"
      style={{ background: 'var(--a10)', border: '1px solid var(--a20)' }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Bell size={15} className="shrink-0" style={{ color: 'var(--at)' }} />
        <span className="text-sm truncate" style={{ color: 'var(--t1)' }}>{message}</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onAction}
          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
          style={{ background: 'var(--a)' }}
        >
          {actionLabel}
        </button>
        <button onClick={onDismiss} className="p-1.5 rounded-lg transition-opacity hover:opacity-60" style={{ color: 'var(--t3)' }}>
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
