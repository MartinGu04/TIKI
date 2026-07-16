import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { Holding, PortfolioStats, PriceData, Transaction } from '../types';
import { useT, useLang } from '../contexts/LanguageContext';
import { fmtPct, toHoldingStats, DailyChange } from '../utils/calculations';
import { greetingWord } from '../utils/greeting';
import { TickerDetailModal } from '../components/TickerDetailModal';
import { MarketExchangesModal } from '../components/MarketExchangesModal';
import { MarketStatusIcon } from '../components/MarketStatusIcon';
import { useMarketSummary } from '../hooks/useMarketSummary';
import { useMarketExchanges } from '../hooks/useMarketExchanges';
import { EmptyState } from '../components/ui/EmptyState';
import { LivingOverview } from '../components/home/LivingOverview';

interface Props {
  holdings: Holding[];
  transactions: Transaction[];
  stats: PortfolioStats;
  onAddTransaction: () => void;
  onAddDividend: () => void;
  onQuickSell: (holding: Holding) => void;
  userLabel?: string;
  dailyChange: DailyChange | null;
  pricesStale: boolean;
  pricesRefreshing: boolean;
  onRefreshPrices: () => void;
  livePrices: Record<string, PriceData>;
  monthlyReminderDue: boolean;
  dividendReminderDue: boolean;
  onDismissMonthlyReminder: () => void;
  onDismissDividendReminder: () => void;
}

export function HomePage({
  holdings, transactions, stats, onAddTransaction, onAddDividend, onQuickSell, userLabel,
  dailyChange, pricesStale, pricesRefreshing, onRefreshPrices, livePrices,
  monthlyReminderDue, dividendReminderDue, onDismissMonthlyReminder, onDismissDividendReminder,
}: Props) {
  const t = useT();
  const { lang } = useLang();
  const [detailHolding, setDetailHolding] = useState<Holding | null>(null);
  const [showMarketExchanges, setShowMarketExchanges] = useState(false);
  const marketSummary = useMarketSummary(holdings, livePrices, t);
  const marketExchanges = useMarketExchanges(holdings, livePrices);

  if (holdings.length === 0) {
    return (
      <EmptyState
        variant="full"
        icon={<TrendingUp size={36} strokeWidth={1.5} style={{ color: 'var(--at)' }} />}
        title={userLabel ? `${greetingWord(lang)}, ${userLabel} 👋` : t.welcomeTitle}
        body={t.homeNowNoPortfolio}
        cta={{ label: t.addFirst, onClick: onAddTransaction }}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-28 lg:pb-10 space-y-4">

      <div className="animate-slide-up" style={{ animationDelay: '0ms' }}>
        <p className="text-2xl font-bold" style={{ color: 'var(--t1)' }}>
          {greetingWord(lang)}{userLabel ? `, ${userLabel}` : ''} 👋
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

      <div className="animate-slide-up" style={{ animationDelay: '40ms' }}>
        <LivingOverview
          holdings={holdings}
          stats={stats}
          dailyChange={dailyChange}
          pricesStale={pricesStale}
          pricesRefreshing={pricesRefreshing}
          onRefreshPrices={onRefreshPrices}
          monthlyReminderDue={monthlyReminderDue}
          dividendReminderDue={dividendReminderDue}
          onLogInvestment={onAddTransaction}
          onAddDividend={onAddDividend}
          onDismissMonthlyReminder={onDismissMonthlyReminder}
          onDismissDividendReminder={onDismissDividendReminder}
        />
      </div>

      {/* Positions list */}
      <div className="animate-slide-up" style={{ animationDelay: '80ms' }}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: 'var(--t3)' }}>
            {t.positions(holdings.length)}
          </p>
          <p className="text-sm font-bold" style={{ color: 'var(--t1)' }}>{t.ourInvestments}</p>
        </div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs" style={{ color: 'var(--t3)' }}>{t.sincePurchaseCaption}</p>
          <p className="text-xs" style={{ color: 'var(--t3)' }}>{t.allocationTitle}</p>
        </div>
        <div className="space-y-2">
          {holdings.map((h, i) => {
            const hs = toHoldingStats(h);
            const pos = hs.unrealizedPnLPct >= 0;
            const totalValue = holdings.reduce((s, x) => s + x.currentPrice * x.quantity, 0);
            const weight = totalValue > 0 ? (h.currentPrice * h.quantity) / totalValue : 0;

            return (
              <div
                key={h.id}
                className="card card-hover rounded-2xl px-4 py-3 animate-slide-up cursor-pointer"
                style={{ animationDelay: `${(i + 4) * 40}ms` }}
                onClick={() => setDetailHolding(h)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: h.color }} />
                    <span className="text-sm font-bold ticker" style={{ color: 'var(--t1)' }}>{h.ticker}</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums ltr" style={{ color: pos ? 'var(--up)' : 'var(--dn)' }}>
                    {fmtPct(hs.unrealizedPnLPct)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1 rounded-full overflow-hidden flex-1" style={{ background: 'var(--border)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(weight * 100).toFixed(1)}%`, backgroundColor: h.color, opacity: 0.7 }}
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

      {detailHolding && (
        <TickerDetailModal
          holding={detailHolding}
          onClose={() => setDetailHolding(null)}
          quote={livePrices[detailHolding.symbol]}
          transactions={transactions.filter((tx) => tx.holdingId === detailHolding.id)}
          onSell={() => onQuickSell(detailHolding)}
        />
      )}

      {showMarketExchanges && (
        <MarketExchangesModal exchanges={marketExchanges} onClose={() => setShowMarketExchanges(false)} />
      )}
    </div>
  );
}
