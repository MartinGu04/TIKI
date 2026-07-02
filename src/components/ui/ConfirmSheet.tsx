import { Sheet } from './Sheet';

interface Props {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Destructive-only confirmation sheet — per product decision, non-destructive actions never use this. */
export function ConfirmSheet({ open, title, body, confirmLabel, cancelLabel, onConfirm, onCancel }: Props) {
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--t3)' }}>{body}</p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 text-sm font-medium rounded-xl transition-all hover:opacity-70"
          style={{ color: 'var(--t2)', background: 'var(--card-h)', border: '1px solid var(--border)' }}
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 text-sm font-bold rounded-xl transition-all hover:opacity-90"
          style={{ color: 'var(--dn)', background: 'var(--dn10)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
