export type HomeNowStateId =
  | 'noPortfolio'
  | 'dataUnavailableOrStale'
  | 'currentPortfolioPositive'
  | 'currentPortfolioNegative'
  | 'currentPortfolioNeutral';

export interface HomeNowState {
  id: HomeNowStateId;
  /** Only set for positive/negative/neutral: which figure drove the classification. */
  changeBasis?: 'today' | 'overall';
  isMixedCurrency?: boolean;
}

export type HomeSignalId = 'monthlyReminder' | 'dividendReminder';

export interface HomeSignal {
  id: HomeSignalId;
}

// Guards against floating-point noise classifying an exact-zero change as a
// tiny positive/negative.
const NEUTRAL_EPSILON = 0.005;

/**
 * Deterministic Now-state precedence: noPortfolio > dataUnavailableOrStale >
 * portfolio positive/negative/neutral. Reminders never appear here — they
 * are always Signals (see computeHomeSignals) and never override or hide
 * the portfolio state.
 */
export function computeHomeNowState(input: {
  holdingsCount: number;
  pricesStale: boolean;
  dailyChangeAmount: number | null;
  profitLoss: number;
  isMixedCurrency: boolean;
}): HomeNowState {
  const { holdingsCount, pricesStale, dailyChangeAmount, profitLoss, isMixedCurrency } = input;

  if (holdingsCount === 0) return { id: 'noPortfolio' };
  if (pricesStale) return { id: 'dataUnavailableOrStale' };

  // No single blended sign is trustworthy across currencies (no FX
  // normalization exists in this repository) — always neutral, real
  // per-currency breakdown is shown instead of one combined figure.
  if (isMixedCurrency) return { id: 'currentPortfolioNeutral', isMixedCurrency: true };

  const usingToday = dailyChangeAmount !== null;
  const amount = usingToday ? (dailyChangeAmount as number) : profitLoss;
  const changeBasis: 'today' | 'overall' = usingToday ? 'today' : 'overall';

  if (amount >= NEUTRAL_EPSILON) return { id: 'currentPortfolioPositive', changeBasis };
  if (amount <= -NEUTRAL_EPSILON) return { id: 'currentPortfolioNegative', changeBasis };
  return { id: 'currentPortfolioNeutral', changeBasis };
}

/**
 * Signals are independent of Now's state — reminders never get consumed by
 * or excluded because of it. Priority: monthly before dividend. 0-2 signals
 * in V1 (only two real candidate facts exist today).
 */
export function computeHomeSignals(input: {
  monthlyReminderDue: boolean;
  dividendReminderDue: boolean;
}): HomeSignal[] {
  const signals: HomeSignal[] = [];
  if (input.monthlyReminderDue) signals.push({ id: 'monthlyReminder' });
  if (input.dividendReminderDue) signals.push({ id: 'dividendReminder' });
  return signals;
}
