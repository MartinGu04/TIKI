export type Owner = 'me' | 'partner' | 'shared';

export type FrequencyType =
  | 'one-time'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'every-x-months'
  | 'quarterly'
  | 'semi-annually'
  | 'yearly';

export interface FrequencyConfig {
  type: FrequencyType;
  dayOfMonth?: number;   // 1–28, for monthly/quarterly/etc.
  weekday?: number;      // 0 (Sun) – 6 (Sat), for weekly
  everyXMonths?: number; // for every-x-months
  startDate?: string;    // ISO yyyy-mm-dd, when the first deposit happens
  /** ISO yyyy-mm-dd of the last recurring deposit already applied to quantity/avgBuyPrice. */
  lastProcessedDate?: string;
}

export interface Asset {
  id: string;
  ticker: string;     // display ticker, e.g. "CSPX"
  symbol: string;     // Yahoo Finance symbol, e.g. "CSPX.L"
  name: string;
  owner: Owner;
  avgBuyPrice: number;
  quantity: number;
  currentPrice: number;
  currency: string;   // "USD", "GBP", "EUR", "ILS"
  monthlyContribution: number; // always expressed in the asset's currency
  frequency: FrequencyConfig;
  color: string;
  lastPriceUpdate?: number; // unix ms timestamp
  exchange?: string;  // display exchange, e.g. "LSE" — captured at search time
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
  monthlyContribution: number;
  /** All distinct currencies in the portfolio */
  currencies: string[];
  /** True when assets span more than one currency */
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

export interface PriceData {
  symbol: string;
  price: number;
  currency: string;
  name: string;
  previousClose: number | null;
  exchange: string | null;
}

export interface ChartPoint {
  date: string; // yyyy-mm-dd
  close: number;
}

export type ChartRange = '1w' | '1mo' | '3mo' | '1y';

export interface PriceDiagnostics {
  symbol: string;
  requestedDate: string;
  matchedDate: string;
  currency: string;
  exchange: string | null;
  close: number;
  adjClose: number | null;
}
