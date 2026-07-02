import { Holding, HoldingStats, PortfolioStats, ProjectionPoint, PriceData } from '../types';

/**
 * Returns a new array with each holding's currentPrice replaced by its live
 * quote where one was fetched successfully, falling back to the holding's
 * stored (possibly stale) currentPrice otherwise. Never mutates the input
 * and never gets written back to storage — this is a render-time overlay so
 * portfolio value/ROI/change figures reflect live data without treating the
 * fetch as the new source of truth for the record itself.
 */
export function overlayLivePrices<T extends Holding>(holdings: T[], quotes: Record<string, PriceData>): T[] {
  return holdings.map((h) => {
    const q = quotes[h.symbol];
    return q ? { ...h, currentPrice: q.price } : h;
  });
}

export interface DailyChange {
  amount: number;
  pct: number;
}

/**
 * Portfolio-wide day-over-day change, using each live quote's previousClose.
 * Holdings without a resolved previousClose (fetch failed, or a manual entry
 * with no market data) are excluded from both sides of the ratio rather than
 * counted as zero change, so they don't silently dilute the result. Returns
 * null if no holding has enough data to contribute.
 */
export function calculateDailyChange(holdings: Holding[], quotes: Record<string, PriceData>): DailyChange | null {
  let deltaSum = 0;
  let baseSum = 0;
  for (const h of holdings) {
    const prevClose = quotes[h.symbol]?.previousClose;
    if (prevClose == null) continue;
    deltaSum += h.quantity * (h.currentPrice - prevClose);
    baseSum += h.quantity * prevClose;
  }
  if (baseSum <= 0) return null;
  return { amount: deltaSum, pct: (deltaSum / baseSum) * 100 };
}

/**
 * Color for a live price figure based on today's movement vs. previousClose
 * — green up, red down, neutral (--t1) when unchanged or when there's no
 * previousClose to compare against (e.g. quote hasn't resolved yet). Shared
 * so "does this price color mean the same thing" stays consistent everywhere
 * a live price is shown (Portfolio's holdings table, the ticker detail view).
 */
export function priceChangeColor(currentPrice: number, previousClose: number | null | undefined): string {
  if (previousClose == null || currentPrice === previousClose) return 'var(--t1)';
  return currentPrice > previousClose ? 'var(--up)' : 'var(--dn)';
}

/** Same up/down/neutral basis as priceChangeColor, for the arrow indicator next to a live price. */
export function priceChangeDirection(currentPrice: number, previousClose: number | null | undefined): 'up' | 'down' | 'neutral' {
  if (previousClose == null || currentPrice === previousClose) return 'neutral';
  return currentPrice > previousClose ? 'up' : 'down';
}

export function toHoldingStats(holding: Holding): HoldingStats {
  const costBasisRemaining = holding.avgCost * holding.quantity;
  const currentValue = holding.currentPrice * holding.quantity;
  const unrealizedPnL = currentValue - costBasisRemaining;
  const unrealizedPnLPct = costBasisRemaining > 0 ? (unrealizedPnL / costBasisRemaining) * 100 : 0;
  return { ...holding, costBasisRemaining, currentValue, unrealizedPnL, unrealizedPnLPct };
}

export function calculatePortfolioStats(holdings: Holding[], totalDividends = 0): PortfolioStats {
  const stats = holdings.map(toHoldingStats);
  const totalInvested = stats.reduce((s, h) => s + h.costBasisRemaining, 0);
  const currentValue = stats.reduce((s, h) => s + h.currentValue, 0);
  const profitLoss = currentValue - totalInvested;
  const roi = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
  const totalRealizedPnL = holdings.reduce((s, h) => s + h.realizedPnL, 0);

  const uniqueCurrencies = [...new Set(holdings.map((h) => h.currency))];
  const isMixedCurrency = uniqueCurrencies.length > 1;

  const currencyGroups = uniqueCurrencies.map((currency) => {
    const group = stats.filter((h) => h.currency === currency);
    const invested = group.reduce((s, h) => s + h.costBasisRemaining, 0);
    const value = group.reduce((s, h) => s + h.currentValue, 0);
    return { currency, invested, currentValue: value, profitLoss: value - invested };
  });

  return {
    totalInvested, currentValue, profitLoss, roi, totalRealizedPnL, totalDividends,
    currencies: uniqueCurrencies, isMixedCurrency, currencyGroups,
  };
}

export function generateProjection(
  currentValue: number,
  monthlyContribution: number,
  annualReturn: number,
  years: number,
): ProjectionPoint[] {
  const monthlyRate = annualReturn / 100 / 12;
  const data: ProjectionPoint[] = [];
  let withContrib = currentValue;
  let withoutContrib = currentValue;

  for (let m = 0; m <= years * 12; m++) {
    if (m > 0) {
      withContrib = withContrib * (1 + monthlyRate) + monthlyContribution;
      withoutContrib = withoutContrib * (1 + monthlyRate);
    }
    if (m % 12 === 0) {
      data.push({
        year: m / 12,
        withContrib: Math.round(withContrib),
        withoutContrib: Math.round(withoutContrib),
      });
    }
  }
  return data;
}

// ─── Formatting ──────────────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', GBP: '£', EUR: '€', ILS: '₪',
};

export function currencySymbol(currency = 'USD'): string {
  return CURRENCY_SYMBOLS[currency] ?? currency + ' ';
}

export function fmt(value: number, currency = 'USD'): string {
  const sym = currencySymbol(currency);
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${sym}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 100_000) return `${sign}${sym}${(abs / 1_000).toFixed(0)}K`;
  if (abs >= 1_000) return `${sign}${sym}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${sym}${abs.toFixed(2)}`;
}

export function fmtPrice(value: number, currency = 'USD'): string {
  const sym = currencySymbol(currency);
  if (value >= 10_000) return `${sym}${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `${sym}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Friendly display precision for share quantities — average-cost math on
 * amount-based buys/sells routinely produces long floats (e.g.
 * 0.3874300549871461 from amount/price); this only affects what's rendered.
 * Internal calculations always use the raw, full-precision number — never
 * this formatted string.
 */
export function fmtQty(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 5 });
}

export function fmtPct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function fmtDate(date: Date): string {
  const locale = document.documentElement.lang === 'en' ? 'en-US' : 'he-IL';
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Short day-group header ("1 July") — no year, since it's meant for grouping a scrollable list, not standing alone. */
export function fmtDayHeader(date: Date): string {
  const locale = document.documentElement.lang === 'en' ? 'en-US' : 'he-IL';
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
}

/** HH:MM the transaction was actually recorded (from `createdAt`) — the tiebreaker for same-day ordering, so it's worth surfacing per-row. */
export function fmtTime(isoTimestamp: string): string {
  const locale = document.documentElement.lang === 'en' ? 'en-US' : 'he-IL';
  return new Date(isoTimestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}
