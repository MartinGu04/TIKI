import { useState } from 'react';
import { PortfolioStats } from '../types';
import { generateProjection, fmt } from '../utils/calculations';
import { Sparkles } from 'lucide-react';
import { useT } from '../contexts/LanguageContext';

interface Props { stats: PortfolioStats }

export function ProjectionSimulator({ stats }: Props) {
  const t = useT();
  const [annualReturn, setAnnualReturn] = useState(8);
  const [years, setYears] = useState(10);
  // Not derived from portfolio data (there's no recurring-contribution concept
  // anymore) — a plain user-adjustable "what if I kept investing" input.
  const [monthlyContribution, setMonthlyContribution] = useState(0);

  const data = generateProjection(stats.currentValue, monthlyContribution, annualReturn, years);
  const projected = data[data.length - 1]?.withContrib ?? stats.currentValue;
  const gain = projected - stats.currentValue;
  const multiplier = stats.currentValue > 0 ? projected / stats.currentValue : 1;

  return (
    <div className="rounded-2xl card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={13} style={{ color: '#f59e0b' }} />
        <h2 className="text-sm font-bold" style={{ color: 'var(--t1)' }}>{t.simulator}</h2>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[12px]" style={{ color: 'var(--t3)' }}>{t.assumedMonthlyContribution}</label>
            <span className="text-[12px] font-semibold tabular-nums ltr" style={{ color: 'var(--at)' }}>{fmt(monthlyContribution)}</span>
          </div>
          <input type="range" min={0} max={5000} step={50} value={monthlyContribution}
            onChange={(e) => setMonthlyContribution(Number(e.target.value))} />
          <div className="flex justify-between text-[11px] mt-1 ltr" style={{ color: 'var(--t4)' }}>
            <span>$0</span><span>$5,000</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[12px]" style={{ color: 'var(--t3)' }}>{t.annualReturn}</label>
            <span className="text-[12px] font-semibold tabular-nums" style={{ color: 'var(--at)' }}>{annualReturn}%</span>
          </div>
          <input type="range" min={1} max={20} step={0.5} value={annualReturn}
            onChange={(e) => setAnnualReturn(Number(e.target.value))} />
          <div className="flex justify-between text-[11px] mt-1 ltr" style={{ color: 'var(--t4)' }}>
            <span>1%</span><span>20%</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[12px]" style={{ color: 'var(--t3)' }}>{t.timeHorizon}</label>
            <span className="text-[12px] font-semibold tabular-nums" style={{ color: 'var(--at)' }}>{years} {t.year}</span>
          </div>
          <input type="range" min={1} max={40} value={years}
            onChange={(e) => setYears(Number(e.target.value))} />
          <div className="flex justify-between text-[11px] mt-1 ltr" style={{ color: 'var(--t4)' }}>
            <span>1</span><span>40</span>
          </div>
        </div>

        <div
          className="rounded-xl p-4 mt-1"
          style={{ background: 'var(--a10)', border: '1px solid var(--a20)' }}
        >
          <p className="text-[11px] uppercase tracking-widest mb-2" style={{ color: 'var(--at)' }}>
            {t.valueInYears(years)}
          </p>
          <p className="text-2xl font-bold tabular-nums ltr" style={{ color: 'var(--t1)' }}>{fmt(projected)}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs font-medium ltr" style={{ color: 'var(--up)' }}>+{fmt(gain)}</span>
            {/* Mixed Hebrew+number string — must NOT be forced ltr, or the Hebrew words render reversed */}
            <span className="text-[12px]" style={{ color: 'var(--t3)' }}>{t.xTimesYourMoney(multiplier)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
