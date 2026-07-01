import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { PortfolioStats } from '../types';
import { generateProjection, fmt } from '../utils/calculations';
import { useT } from '../contexts/LanguageContext';

interface Props { stats: PortfolioStats }

export function ProjectionChart({ stats }: Props) {
  const t = useT();
  const [years, setYears] = useState(10);
  const [annualReturn, setAnnualReturn] = useState(8);

  const data = generateProjection(stats.currentValue, stats.monthlyContribution, annualReturn, years);
  const finalValue = data[data.length - 1]?.withContrib ?? 0;
  const totalGain = finalValue - stats.currentValue;
  const multiplier = stats.currentValue > 0 ? finalValue / stats.currentValue : 1;

  const tooltipStyle = {
    backgroundColor: 'var(--modal)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '10px 14px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    direction: 'ltr' as const,
  };

  return (
    <div className="rounded-2xl card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--t1)' }}>{t.portfolioProjection}</h2>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>
            {t.estimatedWith}{' '}
            <span className="font-medium ltr" style={{ color: 'var(--at)' }}>{fmt(stats.monthlyContribution)}</span>
            {t.perMonth}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 flex-wrap" dir="ltr">
          <div className="flex flex-col gap-1 min-w-[110px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px]" style={{ color: 'var(--t3)' }}>{t.annualReturn}</span>
              <span className="text-[12px] font-semibold tabular-nums" style={{ color: 'var(--at)' }}>{annualReturn}%</span>
            </div>
            <input type="range" min={1} max={20} step={0.5} value={annualReturn}
              onChange={(e) => setAnnualReturn(Number(e.target.value))} />
          </div>
          <div className="flex flex-col gap-1 min-w-[110px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px]" style={{ color: 'var(--t3)' }}>{t.timeHorizon}</span>
              <span className="text-[12px] font-semibold tabular-nums" style={{ color: 'var(--at)' }}>{years} {t.year}</span>
            </div>
            <input type="range" min={1} max={40} value={years}
              onChange={(e) => setYears(Number(e.target.value))} />
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="flex gap-6 mb-5" dir="ltr">
        <div>
          <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--t3)' }}>{t.inYears(years)}</p>
          <p className="text-xl font-bold mt-0.5 tabular-nums" style={{ color: 'var(--t1)' }}>{fmt(finalValue)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--t3)' }}>{t.totalGain}</p>
          <p className="text-xl font-bold mt-0.5 tabular-nums" style={{ color: 'var(--up)' }}>+{fmt(totalGain)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--t3)' }}>{t.multiplier}</p>
          <p className="text-xl font-bold mt-0.5 tabular-nums" style={{ color: 'var(--at)' }}>{multiplier.toFixed(1)}×</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 5, right: 4, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="gradWith" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--a)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--a)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradWithout" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--t4)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="var(--t4)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" />
          <XAxis dataKey="year" stroke="transparent" tick={{ fill: 'var(--t3)', fontSize: 10 }}
            tickFormatter={(v) => (v === 0 ? t.today : `Y${v}`)} tickLine={false} axisLine={false} />
          <YAxis stroke="transparent" tick={{ fill: 'var(--t3)', fontSize: 10 }}
            tickFormatter={(v) => fmt(v)} tickLine={false} axisLine={false} width={58} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: 'var(--t3)', fontSize: 11, marginBottom: 6 }}
            itemStyle={{ fontSize: 12, padding: '1px 0', color: 'var(--t1)' }}
            formatter={(value: number, name: string) => [fmt(value), name === 'withContrib' ? t.withContributions : t.growthOnly]}
            labelFormatter={(label) => (label === 0 ? t.today : `${t.year} ${label}`)}
          />
          <Area type="monotone" dataKey="withoutContrib" stroke="var(--t4)" strokeWidth={1.5}
            strokeDasharray="5 4" fill="url(#gradWithout)" dot={false} />
          <Area type="monotone" dataKey="withContrib" stroke="var(--a)" strokeWidth={2}
            fill="url(#gradWith)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-5 mt-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 rounded" style={{ background: 'var(--a)' }} />
          <span className="text-[12px]" style={{ color: 'var(--t3)' }}>{t.withContributions}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 border-t border-dashed" style={{ borderColor: 'var(--t4)' }} />
          <span className="text-[12px]" style={{ color: 'var(--t3)' }}>{t.growthOnly}</span>
        </div>
      </div>
    </div>
  );
}
