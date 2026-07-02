export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
}

// String union rather than a closed enum — adding a future type (Stock
// Split, Cash Deposit, Fee, Interest, Transfer) is additive, not a rename.
export type TransactionType = 'buy' | 'sell' | 'dividend';

export interface Transaction {
  id: string;
  holdingId: string;
  type: TransactionType;
  date: string;            // ISO yyyy-mm-dd — user-entered transaction date, no time component
  /** DB-assigned insert timestamp — the tiebreaker for same-`date` ordering (real chronological order, since `date` alone can't distinguish two transactions entered the same day). */
  createdAt?: string;
  quantity: number | null; // null for dividend
  price: number | null;    // null for dividend
  amount: number;          // buy/sell: quantity*price; dividend: cash amount
  note?: string;
  /** Free-form bag for future transaction-type-specific fields (e.g. a split ratio) — never read by v1 logic. */
  metadata?: Record<string, unknown>;
}

export interface Holding {
  id: string;
  portfolioId: string;
  ticker: string;     // display ticker, e.g. "CSPX"
  symbol: string;     // Yahoo Finance symbol, e.g. "CSPX.L"
  name: string;
  currency: string;   // "USD", "GBP", "EUR", "ILS" — inferred from the asset, never user-configured
  color: string;
  currentPrice: number;
  lastPriceUpdate?: number; // unix ms timestamp
  exchange?: string;  // display exchange, e.g. "LSE" — captured at search time
  // Cached, derived from `transactions` — recomputed on every write via
  // portfolioEngine.ts. Never hand-edited; transactions remain the source of truth.
  quantity: number;
  avgCost: number;
  realizedPnL: number;
}

export interface HoldingStats extends Holding {
  costBasisRemaining: number; // avgCost * quantity
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
}

export interface CurrencyGroup {
  currency: string;
  invested: number;
  currentValue: number;
  profitLoss: number;
}

export interface PortfolioStats {
  totalInvested: number;
  currentValue: number;
  profitLoss: number;
  roi: number;
  totalRealizedPnL: number;
  totalDividends: number;
  /** All distinct currencies in the portfolio */
  currencies: string[];
  /** True when holdings span more than one currency */
  isMixedCurrency: boolean;
  /** Per-currency totals for display */
  currencyGroups: CurrencyGroup[];
}

export interface ProjectionPoint {
  year: number;
  withContrib: number;
  withoutContrib: number;
}

// Market data service types
export interface SearchResult {
  symbol: string;
  ticker: string;  // display ticker without exchange suffix
  name: string;
  exchange: string;
  type: string;
  currency: string;
}

export type MarketStatusValue = 'open' | 'closed';

export interface MarketStatus {
  status: MarketStatusValue;
  exchange: string;    // full exchange name — the only market label ever shown
  opensAt: number;     // unix ms
  closesAt: number;    // unix ms
  nextOpenAt: number;  // unix ms — best-effort, see api/lib/yahoo.ts for the caveat
}

export interface PriceData {
  symbol: string;
  price: number;
  currency: string;
  name: string;
  previousClose: number | null;
  exchange: string | null;
  marketStatus: MarketStatus | null;
}

export interface ChartPoint {
  date: string; // yyyy-mm-dd
  close: number;
}

export type ChartRange = '1w' | '1mo' | '3mo' | '1y';
