import { X } from 'lucide-react';
import { ReactNode } from 'react';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}

/**
 * The bottom-sheet-on-mobile / centered-on-desktop overlay convention used
 * throughout TIKI's modals — extracted here so every sheet-style surface
 * (confirmations, transaction form, settings popups, import/export) shares
 * one implementation instead of being copy-pasted per component.
 */
export function Sheet({ open, onClose, title, children, maxWidth = 'max-w-sm' }: Props) {
  useLockBodyScroll(open);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative z-10 w-full ${maxWidth} rounded-3xl p-6 animate-scale-in max-h-[90vh] overflow-y-auto`}
        style={{ background: 'var(--modal)', border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}
      >
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-base font-bold" style={{ color: 'var(--t1)' }}>{title}</h2>}
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl transition-all hover:opacity-70 ms-auto"
            style={{ color: 'var(--t3)', background: 'var(--input)' }}
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
