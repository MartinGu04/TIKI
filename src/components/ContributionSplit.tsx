import { Asset } from '../types';
import { fmt } from '../utils/calculations';
import { Users } from 'lucide-react';
import { useT } from '../contexts/LanguageContext';

interface Props { assets: Asset[] }

export function ContributionSplit({ assets }: Props) {
  const t = useT();
  const recurring = assets.filter((a) => a.frequency.type !== 'one-time');

  const owners = [
    { key: 'me' as const, label: t.me, color: 'var(--a)' },
    { key: 'partner' as const, label: t.partner, color: '#8b5cf6' },
    { key: 'shared' as const, label: t.shared, color: 'var(--up)' },
  ];

  const totals = owners.map(({ key, label, color }) => ({
    label,
    color,
    value: recurring
      .filter((a) => a.owner === key)
      .reduce((s, a) => s + a.monthlyContribution, 0),
  }));

  const total = totals.reduce((s, t) => s + t.value, 0);

  return (
    <div className="rounded-2xl card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users size={13} style={{ color: 'var(--t3)' }} />
        <h2 className="text-sm font-bold" style={{ color: 'var(--t1)' }}>{t.monthlySplit}</h2>
      </div>

      {total > 0 ? (
        <>
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-5" dir="ltr">
            {totals.filter((t) => t.value > 0).map((item) => (
              <div
                key={item.label}
                style={{ width: `${(item.value / total) * 100}%`, backgroundColor: item.color }}
                className="transition-all duration-700 first:rounded-l-full last:rounded-r-full"
              />
            ))}
          </div>

          <div className="space-y-3">
            {totals.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs" style={{ color: 'var(--t2)' }}>{item.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] tabular-nums ltr" style={{ color: 'var(--t3)' }}>
                    {total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%
                  </span>
                  <span className="text-xs font-semibold tabular-nums ltr w-14 text-left" style={{ color: 'var(--t1)' }}>
                    {fmt(item.value)}
                  </span>
                </div>
              </div>
            ))}

            <div className="pt-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
              <span className="text-[12px]" style={{ color: 'var(--t3)' }}>{t.totalPerMonth}</span>
              <span className="text-xs font-bold tabular-nums ltr" style={{ color: 'var(--at)' }}>{fmt(total)}</span>
            </div>
          </div>
        </>
      ) : (
        <p className="text-xs text-center py-4" style={{ color: 'var(--t3)' }}>{t.noUpcoming}</p>
      )}
    </div>
  );
}
