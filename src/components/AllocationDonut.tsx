import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Asset } from '../types';
import { fmt } from '../utils/calculations';
import { useT } from '../contexts/LanguageContext';

interface Props { assets: Asset[] }

export function AllocationDonut({ assets }: Props) {
  const t = useT();

  const data = assets
    .map((a) => ({
      id: a.id,
      name: a.ticker,
      fullName: a.name,
      value: Math.round(a.currentPrice * a.quantity * 100) / 100,
      color: a.color,
    }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((s, d) => s + d.value, 0);

  const tooltipStyle = {
    backgroundColor: 'var(--modal)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '8px 12px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
  };

  if (assets.length === 0) {
    return (
      <div className="rounded-2xl card flex items-center justify-center" style={{ minHeight: 340 }}>
        <p className="text-sm" style={{ color: 'var(--t3)' }}>{t.noInvestments}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl card p-6">
      <div className="mb-4">
        <h2 className="text-sm font-bold" style={{ color: 'var(--t1)' }}>{t.allocationTitle}</h2>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--t3)' }}>{t.byCurrentValue}</p>
      </div>

      <div className="relative">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={62} outerRadius={90}
              paddingAngle={2} dataKey="value" strokeWidth={0}>
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ display: 'none' }}
              itemStyle={{ fontSize: 12, color: 'var(--t1)' }}
              formatter={(value: number, _name: string, props: { payload?: { fullName?: string } }) => [
                <span className="ltr">{fmt(value)}</span>,
                props.payload?.fullName ?? '',
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--t3)' }}>{t.total}</p>
          <p className="text-base font-bold mt-0.5 ltr" style={{ color: 'var(--t1)' }}>{fmt(total)}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {data.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-lg px-1 -mx-1 transition-colors"
            style={{ cursor: 'default' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-xs font-medium ticker" style={{ color: 'var(--t1)' }}>{item.name}</span>
              <span className="text-[10px] hidden sm:block truncate" style={{ color: 'var(--t3)' }}>{item.fullName}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0 mr-2">
              <span className="text-[11px] tabular-nums ltr" style={{ color: 'var(--t3)' }}>
                {total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0'}%
              </span>
              <span className="text-xs tabular-nums w-14 text-left ltr" style={{ color: 'var(--t2)' }}>
                {fmt(item.value)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
