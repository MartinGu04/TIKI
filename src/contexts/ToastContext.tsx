import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';

export type ToastVariant = 'success' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastCtx {
  toasts: ToastItem[];
  showToast: (message: string, variant?: ToastVariant) => void;
  dismissToast: (id: string) => void;
}

const Ctx = createContext<ToastCtx>({ toasts: [], showToast: () => {}, dismissToast: () => {} });

const AUTO_DISMISS_MS = 2500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = `toast-${Date.now()}-${counter.current++}`;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => dismissToast(id), AUTO_DISMISS_MS);
  }, [dismissToast]);

  return (
    <Ctx.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
    </Ctx.Provider>
  );
}

export function useToast() { return useContext(Ctx); }
