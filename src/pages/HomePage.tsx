import { TrendingUp, TrendingDown, CalendarClock, Wallet } from 'lucide-react';
import { Asset, PortfolioStats } from '../types';
import { useT, useLang } from '../contexts/LanguageContext';
import { fmt, fmtPct, getNextDepositDate, fmtDate } from '../utils/calculations';
import { greetingWord } from '../utils/greeting';
import { Translations } from '../i18n';

interface Props {
  assets: Asset[];
  stats: PortfolioStats;
  onAddAsset: () => void;
  userLabel?: string;
}

function personalitySentence(stats: PortfolioStats, assets: Asset[], t: Translations): string {
  if (assets.length === 0) return t.personalityStart;
  if (stats.profitLoss < 0) return t.personalityDown;
  if (stats.roi >= 8) return t.personalityGain;
  if (stats.profitLoss > 0) return t.personalityGrowing;
  return t.personalityBuilding;
}

export function HomePage({ assets, stats, onAddAsset, userLabel }: Props) {
  const t = useT();
  const { lang } = useLang();

  const isProfit = stats.profitLoss >= 0;

  const nextDeposit = assets
    .filter((a) => a.frequency.type !== 'one-time' && a.monthlyContribution > 0)
    .map((a) => {
      const d = getNextDepositDate(a.frequency);
      return d ? { asset: a, date: d } : null;
    })
    .filter((x): x is { asset: Asset; date: Date } => x !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null;

  const sentence = personalitySentence(stats, assets, t);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-28 sm:pb-10 space-y-4">

      {/* Greeting + personality */}
      <div className="animate-slide-up" style={{ animationDelay: '0ms' }}>
        <p className="text-2xl font-bold" style={{ color: 'var(--t1)' }}>
          {greetingWord(lang)}{userLabel ? `, ${userLabel}` : ''} 👋
        </p>
        <p className="text-sm mt-1.5 font-medium" style={{ color: 'var(--t3)' }}>
          {sentence}
        </p>
      </div>

      {/* Hero card — total value + P&L */}
      <div
        className="card card-hover rounded-3xl p-6 relative overflow-hidden animate-slide-up"
        style={{ animationDelay: '40ms' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{ background: `radial-gradient(ellipse at 50% -20%, var(--a20) 0%, transparent 65%)` }}
        />
        <div className="relative">
          <p className="text-[12px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--t3)' }}>
            {t.ourPortfolio}
          </p>
          {/* Value — single currency shows large hero; mixed shows per-currency stack */}
          {stats.isMixedCurrency ? (
            <div className="mb-3 space-y-1">
              {stats.currencyGroups.map((g) => (
                <div key={g.currency} className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black tracking-tight ltr tabular-nums animate-count-in" style={{ color: 'var(--t1)' }}>
                    {fmt(g.currentValue, g.currency)}
                  </span>
                  <span className={`text-sm font-semibold ltr ${g.profitLoss >= 0 ? '' : ''}`} style={{ color: g.profitLoss >= 0 ? 'var(--up)' : 'var(--dn)' }}>
                    {g.profitLoss >= 0 ? '+' : ''}{fmt(g.profitLoss, g.currency)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="text-5xl sm:text-6xl font-black tracking-tight mb-3 ltr tabular-nums animate-count-in"
              style={{ color: 'var(--t1)' }}
            >
              {fmt(stats.currentValue, stats.currencies[0])}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {!stats.isMixedCurrency && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ltr"
                style={{
                  background: isProfit ? 'var(--up10)' : 'var(--dn10)',
                  color: isProfit ? 'var(--up)' : 'var(--dn)',
                }}
              >
                {isProfit ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                {isProfit ? '+' : ''}{fmt(stats.profitLoss, stats.currencies[0])}
                &nbsp;({fmtPct(stats.roi)})
              </div>
            )}
            <span className="text-xs" style={{ color: 'var(--t3)' }}>{t.sinceStart}</span>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 animate-slide-up" style={{ animationDelay: '80ms' }}>
        <div className="card card-hover rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={14} style={{ color: 'var(--at)' }} />
            <span className="text-[12px] font-medium" style={{ color: 'var(--t3)' }}>{t.monthlyInvestment}</span>
          </div>
          <p className="text-xl font-bold tabular-nums ltr" style={{ color: 'var(--t1)' }}>
            {fmt(stats.monthlyContribution)}
          </p>
        </div>

        <div className="card card-hover rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock size={14} style={{ color: 'var(--at)' }} />
            <span className="text-[12px] font-medium" style={{ color: 'var(--t3)' }}>{t.nextDeposit}</span>
          </div>
          {nextDeposit ? (
            <>
              <p className="text-xl font-bold tabular-nums ltr" style={{ color: 'var(--t1)' }}>
                {fmt(nextDeposit.asset.monthlyContribution, nextDeposit.asset.currency)}
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>
                {fmtDate(nextDeposit.date)}
              </p>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--t3)' }}>{t.noRecurring}</p>
          )}
        </div>
      </div>

      {/* Progress section — simplified position sentiment */}
      {assets.length > 0 && (
        <div className="animate-slide-up" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: 'var(--t4)' }}>
              {t.positions(assets.length)}
            </p>
            <p className="text-sm font-bold" style={{ color: 'var(--t1)' }}>{t.ourInvestments}</p>
          </div>
          <div className="space-y-2">
            {assets.map((a, i) => {
              const roi = a.avgBuyPrice > 0
                ? ((a.currentPrice - a.avgBuyPrice) / a.avgBuyPrice) * 100
                : 0;
              const pos = roi >= 0;
              const totalValue = assets.reduce((s, x) => s + x.currentPrice * x.quantity, 0);
              const weight = totalValue > 0 ? (a.currentPrice * a.quantity) / totalValue : 0;

              return (
                <div
                  key={a.id}
                  className="card card-hover rounded-2xl px-4 py-3 animate-slide-up"
                  style={{ animationDelay: `${(i + 4) * 40}ms` }}
                >
                  {/* Top row: ticker + ROI */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                      <span className="text-sm font-bold ticker" style={{ color: 'var(--t1)' }}>{a.ticker}</span>
                    </div>
                    <span
                      className="text-sm font-bold tabular-nums ltr"
                      style={{ color: pos ? 'var(--up)' : 'var(--dn)' }}
                    >
                      {fmtPct(roi)}
                    </span>
                  </div>
                  {/* Weight bar */}
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(weight * 100).toFixed(1)}%`, backgroundColor: a.color, opacity: 0.7 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
