import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

/** Generic success/error toast queue, stacked bottom-center — reuses MamishToast's positioning/animation for visual consistency. */
export function ToastHost() {
  const { toasts } = useToast();
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none"
      style={{ bottom: 'calc(7rem + env(safe-area-inset-bottom))' }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold shadow-2xl animate-mamish"
          style={
            toast.variant === 'success'
              ? { background: 'var(--a)', color: '#fff', boxShadow: '0 8px 32px var(--a20)' }
              : { background: 'var(--modal)', color: 'var(--dn)', border: '1px solid rgba(239,68,68,0.3)' }
          }
        >
          {toast.variant === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.message}
        </div>
      ))}
    </div>
  );
}
