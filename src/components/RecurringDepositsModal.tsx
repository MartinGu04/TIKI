import { X } from 'lucide-react';
import { Asset } from '../types';
import { fmt, fmtDate } from '../utils/calculations';
import { useT } from '../contexts/LanguageContext';

interface Props {
  deposits: { asset: Asset; date: Date }[];
  totalMonthly: number;
  nextDate: Date;
  onClose: () => void;
}

/** Quick breakdown of what makes up Home's "Next Deposit" figure — opened
 * from that stat card so the user doesn't have to navigate to Advanced to
 * see which recurring investments contribute what. */
export function RecurringDepositsModal({ deposits, totalMonthly, nextDate, onClose }: Props) {
  const t = useT();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-[420px] rounded-2xl overflow-hidden shadow-2xl animate-scale-in max-h-[90vh] flex flex-col"
        style={{ background: 'var(--modal)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--t1)' }}>{t.recurringBreakdownTitle}</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl transition-all hover:opacity-70"
            style={{ color: 'var(--t3)', background: 'var(--input)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="space-y-2.5">
            {deposits.map(({ asset }) => (
              <div key={asset.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: asset.color }} />
                  <span className="text-sm font-bold ticker truncate" style={{ color: 'var(--t1)' }}>{asset.ticker}</span>
                </div>
                <span className="text-sm font-semibold tabular-nums ltr shrink-0" style={{ color: 'var(--t2)' }}>
                  {fmt(asset.monthlyContribution, asset.currency)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--t3)' }}>{t.recurringTotal}</span>
            <span className="text-base font-bold tabular-nums ltr" style={{ color: 'var(--t1)' }}>{fmt(totalMonthly)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--t3)' }}>{t.nextExecution}</span>
            <span className="text-xs font-semibold" style={{ color: 'var(--t2)' }}>{fmtDate(nextDate)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
