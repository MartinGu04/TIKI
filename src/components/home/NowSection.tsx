import { TrendingUp, TrendingDown } from 'lucide-react';
import { PortfolioStats } from '../../types';
import { DailyChange, fmt, fmtPct } from '../../utils/calculations';
import { HomeNowState } from '../../utils/homeState';
import { useT } from '../../contexts/LanguageContext';

interface Props {
  state: HomeNowState;
  stats: PortfolioStats;
  dailyChange: DailyChange | null;
  pricesRefreshing: boolean;
  onRefreshPrices: () => void;
}

/** Renders only Now's content — headline, value, stale/no-portfolio treatment. Never renders Signals. */
export function NowSection({ state, stats, dailyChange, pricesRefreshing, onRefreshPrices }: Props) {
  const t = useT();
  const currency = stats.currencies[0];

  if (state.isMixedCurrency) {
    return (
      <div className="card card-hover rounded-3xl p-6 animate-slide-up">
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--t1)' }}>{t.homeNowMixedCurrencyIntro}</p>
        <div className="space-y-1">
          {stats.currencyGroups.map((g) => (
            <div key={g.currency} className="flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight ltr tabular-nums" style={{ color: 'var(--t1)' }}>
                {fmt(g.currentValue, g.currency)}
              </span>
              <span className="text-sm font-semibold ltr" style={{ color: g.profitLoss >= 0 ? 'var(--up)' : 'var(--dn)' }}>
                {g.profitLoss >= 0 ? '+' : ''}{fmt(g.profitLoss, g.currency)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const changeAmount = state.changeBasis === 'today' && dailyChange ? dailyChange.amount : stats.profitLoss;
  const changePct = state.changeBasis === 'today' && dailyChange ? dailyChange.pct : stats.roi;

  let headline: string;
  switch (state.id) {
    case 'currentPortfolioPositive':
      headline = state.changeBasis === 'today'
        ? t.homeNowPositiveToday(`+${fmt(changeAmount, currency)}`, fmtPct(changePct))
        : t.homeNowPositiveOverall(`+${fmt(changeAmount, currency)}`, fmtPct(changePct));
      break;
    case 'currentPortfolioNegative':
      headline = state.changeBasis === 'today'
        ? t.homeNowNegativeToday(fmt(changeAmount, currency), fmtPct(changePct))
        : t.homeNowNegativeOverall(fmt(changeAmount, currency), fmtPct(changePct));
      break;
    case 'dataUnavailableOrStale':
      headline = t.homeNowStale;
      break;
    case 'noPortfolio':
      headline = t.homeNowNoPortfolio;
      break;
    case 'currentPortfolioNeutral':
    default:
      headline = t.homeNowNeutral(fmt(stats.currentValue, currency));
      break;
  }

  const isPositive = state.id === 'currentPortfolioPositive';
  const isNegative = state.id === 'currentPortfolioNegative';

  return (
    <div className="card card-hover rounded-3xl p-6 relative overflow-hidden animate-slide-up">
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{ background: `radial-gradient(ellipse at 50% -20%, var(--a20) 0%, transparent 65%)` }}
      />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          {isPositive && <TrendingUp size={18} style={{ color: 'var(--up)' }} />}
          {isNegative && <TrendingDown size={18} style={{ color: 'var(--dn)' }} />}
          <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>{headline}</p>
        </div>
        <div
          className="text-4xl sm:text-5xl font-black tracking-tight ltr tabular-nums animate-count-in"
          style={{ color: 'var(--t1)' }}
        >
          {fmt(stats.currentValue, currency)}
        </div>
        {state.id === 'dataUnavailableOrStale' && (
          <button
            onClick={onRefreshPrices}
            disabled={pricesRefreshing}
            className="mt-3 text-xs font-semibold underline transition-opacity hover:opacity-70 disabled:opacity-50"
            style={{ color: 'var(--a)' }}
          >
            {t.homeRefreshPrices}
          </button>
        )}
      </div>
    </div>
  );
}
