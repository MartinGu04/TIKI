import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { MarketStatus } from '../types';
import { formatMarketTiming } from '../utils/marketStatus';
import { MarketStatusIcon } from './MarketStatusIcon';
import { useT } from '../contexts/LanguageContext';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

interface Props {
  exchanges: MarketStatus[];
  onClose: () => void;
}

/** Opened from Home's ambient market summary — only the exchanges the user
 * actually holds, with full human-readable names, so the one-line Home
 * summary can stay exchange-anonymous while still offering real detail on
 * request. */
export function MarketExchangesModal({ exchanges, onClose }: Props) {
  const t = useT();
  useLockBodyScroll();

  return createPortal(
    <div className="fixed inset-0 z-50 isolate flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-[420px] rounded-2xl overflow-hidden shadow-2xl animate-scale-in max-h-[90vh] flex flex-col"
        style={{ background: 'var(--modal)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--t1)' }}>{t.marketExchangesTitle}</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl transition-all hover:opacity-70"
            style={{ color: 'var(--t3)', background: 'var(--input)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3">
          {exchanges.map((status) => {
            const isOpen = status.status === 'open';
            return (
              <div key={status.exchange} className="rounded-xl p-4" style={{ background: 'var(--input)', border: '1px solid var(--border)' }}>
                <p className="text-sm font-bold" style={{ color: 'var(--t1)' }}>{status.exchange}</p>
                <p className="text-sm mt-1 flex items-center gap-1.5" style={{ color: 'var(--t2)' }}>
                  <MarketStatusIcon isOpen={isOpen} />
                  {isOpen ? t.marketOpen : t.marketClosed}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--t3)' }}>{formatMarketTiming(status, t)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
