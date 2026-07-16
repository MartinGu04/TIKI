import { Holding, PortfolioStats } from '../../types';
import { DailyChange } from '../../utils/calculations';
import { computeHomeNowState, computeHomeSignals } from '../../utils/homeState';
import { NowSection } from './NowSection';
import { SignalsSection } from './SignalsSection';

interface Props {
  holdings: Holding[];
  stats: PortfolioStats;
  dailyChange: DailyChange | null;
  pricesStale: boolean;
  pricesRefreshing: boolean;
  onRefreshPrices: () => void;
  monthlyReminderDue: boolean;
  dividendReminderDue: boolean;
  onLogInvestment: () => void;
  onAddDividend: () => void;
  onDismissMonthlyReminder: () => void;
  onDismissDividendReminder: () => void;
}

/**
 * Thin composer: computes Now's state and the Signal list, then renders
 * NowSection followed by SignalsSection. Owns no content itself — Continue
 * does not render in V1 (no persisted resumable state exists).
 */
export function LivingOverview({
  holdings, stats, dailyChange, pricesStale, pricesRefreshing, onRefreshPrices,
  monthlyReminderDue, dividendReminderDue, onLogInvestment, onAddDividend,
  onDismissMonthlyReminder, onDismissDividendReminder,
}: Props) {
  const state = computeHomeNowState({
    holdingsCount: holdings.length,
    pricesStale,
    dailyChangeAmount: dailyChange?.amount ?? null,
    profitLoss: stats.profitLoss,
    isMixedCurrency: stats.isMixedCurrency,
  });
  const signals = computeHomeSignals({ monthlyReminderDue, dividendReminderDue });

  return (
    <div className="space-y-3">
      <NowSection
        state={state}
        stats={stats}
        dailyChange={dailyChange}
        pricesRefreshing={pricesRefreshing}
        onRefreshPrices={onRefreshPrices}
      />
      <SignalsSection
        signals={signals}
        onLogInvestment={onLogInvestment}
        onAddDividend={onAddDividend}
        onDismissMonthly={onDismissMonthlyReminder}
        onDismissDividend={onDismissDividendReminder}
      />
    </div>
  );
}
