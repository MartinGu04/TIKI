import { DollarSign, TrendingUp, TrendingDown, Percent, Repeat } from 'lucide-react';
import { PortfolioStats, Asset } from '../types';
import { fmt, fmtPct, fmtDate, getNextDepositDate } from '../utils/calculations';
import { useT } from '../contexts/LanguageContext';

interface Props {
  stats: PortfolioStats;
  assets: Asset[];
}

export function OverviewCards({ stats, assets }: Props) {
  const t = useT();
  const isProfit = stats.profitLoss >= 0;
  const isPositiveRoi = stats.roi >= 0;

  const nextDates = assets
    .map((a) => getNextDepositDate(a.frequency))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());
  const nextDeposit = nextDates[0] ? fmtDate(nextDates[0]) : null;

  const cards = [
    {
      label: t.totalInvested,
      value: stats.isMixedCurrency
        ? stats.currencyGroups.map((g) => fmt(g.invested, g.currency)).join(' · ')
        : fmt(stats.totalInvested, stats.currencies[0]),
      sub: t.positions(assets.length),
      Icon: DollarSign,
      glow: 'rgba(99,102,241,0.12)',
      iconStyle: { color: 'var(--at)', background: 'var(--a10)' },
      valueColor: 'var(--t1)',
    },
    {
      label: t.currentValue,
      value: stats.isMixedCurrency
        ? stats.currencyGroups.map((g) => fmt(g.currentValue, g.currency)).join(' · ')
        : fmt(stats.currentValue, stats.currencies[0]),
      sub: '',
      Icon: TrendingUp,
      glow: 'rgba(139,92,246,0.12)',
      iconStyle: { color: '#a78bfa', background: 'rgba(139,92,246,0.10)' },
      valueColor: 'var(--t1)',
    },
    {
      label: t.profitLoss,
      value: stats.isMixedCurrency
        ? stats.currencyGroups.map((g) => `${g.profitLoss >= 0 ? '+' : ''}${fmt(g.profitLoss, g.currency)}`).join(' · ')
        : `${isProfit ? '+' : ''}${fmt(stats.profitLoss, stats.currencies[0])}`,
      sub: isProfit ? t.unrealizedGain : t.unrealizedLoss,
      Icon: isProfit ? TrendingUp : TrendingDown,
      glow: isProfit ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
      iconStyle: { color: isProfit ? 'var(--up)' : 'var(--dn)', background: isProfit ? 'var(--up10)' : 'var(--dn10)' },
      valueColor: isProfit ? 'var(--up)' : 'var(--dn)',
    },
    {
      label: t.roi,
      value: fmtPct(stats.roi),
      sub: 'ROI',
      Icon: Percent,
      glow: isPositiveRoi ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
      iconStyle: { color: isPositiveRoi ? '#f59e0b' : 'var(--dn)', background: isPositiveRoi ? 'rgba(245,158,11,0.10)' : 'var(--dn10)' },
      valueColor: isPositiveRoi ? '#f59e0b' : 'var(--dn)',
    },
    {
      label: t.monthlyContrib,
      value: fmt(stats.monthlyContribution),
      sub: nextDeposit ? `${t.nextDepositLabel} ${nextDeposit}` : t.noRecurring,
      Icon: Repeat,
      glow: 'rgba(6,182,212,0.12)',
      iconStyle: { color: '#22d3ee', background: 'rgba(6,182,212,0.10)' },
      valueColor: 'var(--t1)',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {cards.map((card) => {
        const { Icon } = card;
        return (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-2xl card card-hover p-5 cursor-default group"
          >
            <div
              className="absolute -top-8 -left-8 w-28 h-28 rounded-full blur-2xl opacity-60 group-hover:opacity-90 transition-opacity duration-300 pointer-events-none"
              style={{ background: card.glow }}
            />
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest leading-tight" style={{ color: 'var(--t3)' }}>
                  {card.label}
                </p>
                <div className="p-1.5 rounded-lg shrink-0" style={card.iconStyle}>
                  <Icon size={13} strokeWidth={2} />
                </div>
              </div>
              <p className="text-[22px] font-bold leading-none tabular-nums ltr" style={{ color: card.valueColor }}>
                {card.value}
              </p>
              {card.sub && (
                <p className="text-[11px] mt-2 leading-tight" style={{ color: 'var(--t4)' }}>{card.sub}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
