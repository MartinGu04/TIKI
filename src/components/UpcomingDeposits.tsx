import { Asset } from '../types';
import { fmt, getNextDepositDate, fmtDate, frequencyLabel } from '../utils/calculations';
import { CalendarClock } from 'lucide-react';
import { useT } from '../contexts/LanguageContext';

interface Props { assets: Asset[] }

interface DepositRow { asset: Asset; nextDate: Date }

export function UpcomingDeposits({ assets }: Props) {
  const t = useT();

  const rows: DepositRow[] = assets
    .map((a) => {
      const d = getNextDepositDate(a.frequency);
      return d ? { asset: a, nextDate: d } : null;
    })
    .filter((r): r is DepositRow => r !== null && r.asset.monthlyContribution > 0)
    .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());

  const ownerLabel: Record<string, string> = { me: t.me, partner: t.partner, shared: t.shared };
  const totalDeposit = rows.reduce((s, r) => s + r.asset.monthlyContribution, 0);

  return (
    <div className="rounded-2xl card p-5">
      <div className="flex items-center gap-2 mb-1">
        <CalendarClock size={13} style={{ color: 'var(--t3)' }} />
        <h2 className="text-sm font-bold" style={{ color: 'var(--t1)' }}>{t.upcomingDeposits}</h2>
      </div>

      {rows.length > 0 ? (
        <>
          <div className="space-y-0 mt-3">
            {rows.map((row) => (
              <div
                key={row.asset.id}
                className="flex items-center justify-between py-2 rounded-lg px-1 -mx-1 transition-colors"
                style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span className="text-xs font-semibold tabular-nums ltr shrink-0 mr-2" style={{ color: 'var(--t1)' }}>
                  {fmt(row.asset.monthlyContribution, row.asset.currency)}
                </span>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: row.asset.color }} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold ticker" style={{ color: 'var(--t2)' }}>
                        {row.asset.ticker}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--t3)' }}>
                        {ownerLabel[row.asset.owner]}
                      </span>
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--t3)' }}>
                      {fmtDate(row.nextDate)} · {frequencyLabel(row.asset.frequency)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="text-[11px]" style={{ color: 'var(--t3)' }}>{t.totalDeposit}</span>
            <span className="text-xs font-bold tabular-nums ltr" style={{ color: 'var(--up)' }}>
              {fmt(totalDeposit)}
            </span>
          </div>
        </>
      ) : (
        <p className="text-xs text-center py-4 mt-2" style={{ color: 'var(--t3)' }}>{t.noUpcoming}</p>
      )}
    </div>
  );
}
