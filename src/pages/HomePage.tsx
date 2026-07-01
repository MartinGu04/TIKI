import { useState } from 'react';
import { TrendingUp, TrendingDown, CalendarClock } from 'lucide-react';
import { Asset, PortfolioStats, PriceData } from '../types';
import { useT, useLang } from '../contexts/LanguageContext';
import { fmt, fmtPct, getNextDepositDate, fmtDate, DailyChange } from '../utils/calculations';
import { greetingWord } from '../utils/greeting';
import { Translations } from '../i18n';
import { TickerDetailModal } from '../components/TickerDetailModal';
import { RecurringDepositsModal } from '../components/RecurringDepositsModal';
import { MarketExchangesModal } from '../components/MarketExchangesModal';
import { MarketStatusIcon } from '../components/MarketStatusIcon';
import { useMarketSummary } from '../hooks/useMarketSummary';
import { useMarketExchanges } from '../hooks/useMarketExchanges';

interface Props {
  assets: Asset[];
  stats: PortfolioStats;
  onAddAsset: () => void;
  userLabel?: string;
  dailyChange: DailyChange | null;
  pricesStale: boolean;
  livePrices: Record<string, PriceData>;
}

function personalitySentence(stats: PortfolioStats, assets: Asset[], t: Translations): string {
  if (assets.length === 0) return t.personalityStart;
  if (stats.profitLoss < 0) return t.personalityDown;
  if (stats.roi >= 8) return t.personalityGain;
  if (stats.profitLoss > 0) return t.personalityGrowing;
  return t.personalityBuilding;
}

export function HomePage({ assets, stats, onAddAsset, userLabel, dailyChange, pricesStale, livePrices }: Props) {
  const t = useT();
  const { lang } = useLang();
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  const [showDepositBreakdown, setShowDepositBreakdown] = useState(false);
  const [showMarketExchanges, setShowMarketExchanges] = useState(false);
  const marketSummary = useMarketSummary(assets, livePrices, t);
  const marketExchanges = useMarketExchanges(assets, livePrices);

  const isProfit = stats.profitLoss >= 0;

  const upcomingDeposits = assets
    .filter((a) => a.frequency.type !== 'one-time' && a.monthlyContribution > 0)
    .map((a) => {
      const d = getNextDepositDate(a.frequency);
      return d ? { asset: a, date: d } : null;
    })
    .filter((x): x is { asset: Asset; date: Date } => x !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const nextDeposit = upcomingDeposits[0] ?? null;

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
        {marketSummary && (
          <button
            onClick={() => setShowMarketExchanges(true)}
            className="flex items-center gap-1.5 text-xs font-medium mt-1.5 transition-opacity hover:opacity-70"
            style={{ color: 'var(--t3)' }}
          >
            <MarketStatusIcon isOpen={marketSummary.isOpen} size={7} />
            {marketSummary.label}
          </button>
        )}
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

          {!stats.isMixedCurrency && (
            <div className="space-y-2.5 pt-3 mt-1" style={{ borderTop: '1px solid var(--border)' }}>
              {dailyChange && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--t3)' }}>{t.dailyChangeLabel}</span>
                  <span
                    className="flex items-center gap-1 text-sm font-bold ltr"
                    style={{ color: dailyChange.amount >= 0 ? 'var(--up)' : 'var(--dn)' }}
                  >
                    {dailyChange.amount >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {dailyChange.amount >= 0 ? '+' : ''}{fmt(dailyChange.amount, stats.currencies[0])}
                    &nbsp;({fmtPct(dailyChange.pct)})
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-semibold" style={{ color: 'var(--t3)' }} title={t.sincePurchaseHint}>
                  {t.sincePurchase}
                </span>
                <span
                  className="flex items-center gap-1 text-sm font-bold ltr"
                  style={{ color: isProfit ? 'var(--up)' : 'var(--dn)' }}
                >
                  {isProfit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {isProfit ? '+' : ''}{fmt(stats.profitLoss, stats.currencies[0])}
                  &nbsp;({fmtPct(stats.roi)})
                </span>
              </div>
            </div>
          )}
          {pricesStale && (
            <p className="text-xs mt-2" style={{ color: 'var(--t3)' }}>{t.pricesStaleNote}</p>
          )}
        </div>
      </div>

      {/* Next Deposit — replaces the old two-card grid; the separate Monthly
          Investment card was dropped for duplicating info this card (plus
          its breakdown popup) already communicates. */}
      <div
        className={`card card-hover rounded-2xl p-4 animate-slide-up ${nextDeposit ? 'cursor-pointer' : ''}`}
        style={{ animationDelay: '80ms' }}
        onClick={() => nextDeposit && setShowDepositBreakdown(true)}
      >
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
            {upcomingDeposits.length > 1 && (
              <p className="text-[11px] mt-1 font-medium" style={{ color: 'var(--at)' }}>
                {t.recurringActiveCount(upcomingDeposits.length)}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm" style={{ color: 'var(--t3)' }}>{t.noRecurring}</p>
        )}
      </div>

      {/* Progress section — simplified position sentiment */}
      {assets.length > 0 && (
        <div className="animate-slide-up" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: 'var(--t3)' }}>
              {t.positions(assets.length)}
            </p>
            <p className="text-sm font-bold" style={{ color: 'var(--t1)' }}>{t.ourInvestments}</p>
          </div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs" style={{ color: 'var(--t3)' }}>{t.sincePurchaseCaption}</p>
            <p className="text-xs" style={{ color: 'var(--t3)' }}>{t.allocationTitle}</p>
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
                  className="card card-hover rounded-2xl px-4 py-3 animate-slide-up cursor-pointer"
                  style={{ animationDelay: `${(i + 4) * 40}ms` }}
                  onClick={() => setDetailAsset(a)}
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
                  {/* Allocation bar — explicit % alongside it so the bar's
                      meaning (share of portfolio) is self-evident rather
                      than implied purely by relative bar length, matching
                      the same convention already used in AllocationDonut. */}
                  <div className="flex items-center gap-2">
                    <div className="h-1 rounded-full overflow-hidden flex-1" style={{ background: 'var(--border)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${(weight * 100).toFixed(1)}%`, backgroundColor: a.color, opacity: 0.7 }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold tabular-nums ltr shrink-0" style={{ color: 'var(--t3)' }}>
                      {(weight * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {detailAsset && (
        <TickerDetailModal asset={detailAsset} onClose={() => setDetailAsset(null)} quote={livePrices[detailAsset.symbol]} />
      )}

      {showDepositBreakdown && nextDeposit && (
        <RecurringDepositsModal
          deposits={upcomingDeposits}
          totalMonthly={stats.monthlyContribution}
          nextDate={nextDeposit.date}
          onClose={() => setShowDepositBreakdown(false)}
        />
      )}

      {showMarketExchanges && (
        <MarketExchangesModal exchanges={marketExchanges} onClose={() => setShowMarketExchanges(false)} />
      )}
    </div>
  );
}
