// Server-side Yahoo Finance client. Runs in Node (Vercel serverless function
// in production, Vite dev-server middleware locally) — never in the browser —
// so there is no CORS restriction here and no need for a third-party proxy.

const YF_BASE = 'https://query1.finance.yahoo.com';
const YF_SEARCH_BASE = 'https://query2.finance.yahoo.com';

// Yahoo's endpoints reject requests without a browser-like User-Agent.
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'application/json',
};

// Kept comfortably below the function's maxDuration (see api/market.ts) so
// there's always time left for our own error handling to run and respond.
const FETCH_TIMEOUT_MS = 9000;

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: HEADERS });
    if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Yahoo Finance request timed out');
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Types from Yahoo Finance ────────────────────────────────────────────────

interface YFSearchQuote {
  symbol: string;
  shortname?: string;
  longname?: string;
  exchange: string;
  quoteType: string;
}

interface YFSearchResponse {
  quotes: YFSearchQuote[];
}

interface YFTradingPeriod {
  start: number; // unix seconds
  end: number;   // unix seconds
}

interface YFChartMeta {
  currency: string;
  symbol: string;
  regularMarketPrice: number;
  chartPreviousClose?: number;
  previousClose?: number;
  exchangeName?: string;
  fullExchangeName?: string;
  exchangeTimezoneName?: string; // IANA zone, e.g. "America/New_York"
  currentTradingPeriod?: { pre?: YFTradingPeriod; regular?: YFTradingPeriod; post?: YFTradingPeriod };
  shortName?: string;
  longName?: string;
}

interface YFChartResponse {
  chart: {
    result: Array<{
      meta: YFChartMeta;
      timestamp?: number[];
      indicators: {
        quote: Array<{ close: (number | null)[] }>;
        adjclose?: Array<{ adjclose: (number | null)[] }>;
      };
    }> | null;
    error: null | { message: string };
  };
}

// Yahoo quotes LSE-listed lines in pence ("GBp"/"GBX"), a distinct currency
// code from pound sterling ("GBP") — normalize to GBP here so every caller
// (avgBuyPrice, currentPrice, display formatting) works with one consistent
// currency code and magnitude.
function normalizeCurrency(price: number, currency: string): { price: number; currency: string } {
  if (currency === 'GBp' || currency === 'GBX') return { price: price / 100, currency: 'GBP' };
  return { price, currency };
}

export type MarketStatusValue = 'open' | 'closed';

export interface MarketStatus {
  status: MarketStatusValue;
  exchange: string;    // full exchange name — the only market label ever shown to the user
  opensAt: number;     // unix ms — today's/most-recent regular-session open
  closesAt: number;    // unix ms — today's/most-recent regular-session close
  nextOpenAt: number;  // unix ms — best-effort next session open; see caveat below
}

const DAY_MS = 24 * 60 * 60 * 1000;

function isWeekendInZone(unixMs: number, timeZone: string): boolean {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(new Date(unixMs));
  return weekday === 'Sat' || weekday === 'Sun';
}

// Best-effort only: advances a day at a time from `opensAt`, skipping
// Saturday/Sunday as observed in the exchange's own timezone (needed here
// only to determine the correct weekday — never surfaced to the client).
// This does NOT know market holidays; there is no calendar to maintain, by
// design, so a holiday will show one incorrect "next open" estimate rather
// than requiring us to build and keep a per-exchange holiday calendar.
function computeNextOpenAt(opensAt: number, timeZone: string): number {
  let candidate = opensAt + DAY_MS;
  while (isWeekendInZone(candidate, timeZone)) candidate += DAY_MS;
  return candidate;
}

// Yahoo's exchange fields are inconsistent for display purposes — some are
// already-abbreviated codes ("LSE"), some are hybrid labels ("NasdaqGS"),
// some are just a city ("Milan"). Keyed off the short `exchangeName` code
// (Yahoo's stable identifier), covering the exchanges TIKI's users are
// realistically holding — not a global registry. Anything not covered here
// falls back to Yahoo's own fullExchangeName rather than guessing.
const EXCHANGE_DISPLAY_NAMES: Record<string, string> = {
  NMS: 'NASDAQ', NGM: 'NASDAQ', NCM: 'NASDAQ',
  NYQ: 'New York Stock Exchange', ASE: 'NYSE American', PCX: 'NYSE Arca',
  BTS: 'Cboe BZX',
  LSE: 'London Stock Exchange', IOB: 'London Stock Exchange',
  MIL: 'Borsa Italiana', GER: 'Deutsche Börse Xetra', FRA: 'Frankfurt Stock Exchange',
  PAR: 'Euronext Paris', AMS: 'Euronext Amsterdam', BRU: 'Euronext Brussels',
  LIS: 'Euronext Lisbon', SWX: 'SIX Swiss Exchange', VIE: 'Vienna Stock Exchange',
  TOR: 'Toronto Stock Exchange', ASX: 'Australian Securities Exchange',
  HKG: 'Hong Kong Stock Exchange', JPX: 'Tokyo Stock Exchange',
};

function displayExchangeName(meta: YFChartMeta): string {
  const code = meta.exchangeName;
  if (code && EXCHANGE_DISPLAY_NAMES[code]) return EXCHANGE_DISPLAY_NAMES[code];
  return meta.fullExchangeName ?? code ?? 'Market';
}

function computeMarketStatus(meta: YFChartMeta, now: number): MarketStatus | null {
  const period = meta.currentTradingPeriod?.regular;
  const timeZone = meta.exchangeTimezoneName;
  if (!period || !timeZone) return null;

  const opensAt = period.start * 1000;
  const closesAt = period.end * 1000;
  const status: MarketStatusValue = now >= opensAt && now <= closesAt ? 'open' : 'closed';

  return {
    status,
    exchange: displayExchangeName(meta),
    opensAt,
    closesAt,
    nextOpenAt: computeNextOpenAt(opensAt, timeZone),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface SearchResultDTO {
  symbol: string;
  ticker: string;
  name: string;
  exchange: string;
  type: string;
  currency: string;
}

export async function searchYahoo(query: string): Promise<SearchResultDTO[]> {
  const url = `${YF_SEARCH_BASE}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&enableFuzzyQuery=false`;
  const data = await fetchJson<YFSearchResponse>(url);

  return (data.quotes ?? [])
    .filter((q) => q.quoteType !== 'CURRENCY' && q.quoteType !== 'MUTUALFUND')
    .slice(0, 6)
    .map((q) => ({
      symbol: q.symbol,
      ticker: q.symbol.replace(/\.[A-Z]+$/, ''),
      name: q.longname || q.shortname || q.symbol,
      exchange: q.exchange,
      type: q.quoteType,
      currency: '',
    }));
}

export interface QuoteDTO {
  symbol: string;
  price: number;
  currency: string;
  name: string;
  previousClose: number | null;
  exchange: string | null;
  marketStatus: MarketStatus | null;
}

export async function getQuote(symbol: string): Promise<QuoteDTO> {
  const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const data = await fetchJson<YFChartResponse>(url);

  const result = data.chart.result?.[0];
  if (!result) throw new Error('No data for ' + symbol);

  const meta = result.meta;
  const { price, currency } = normalizeCurrency(meta.regularMarketPrice, meta.currency ?? 'USD');
  const rawPrevClose = meta.previousClose ?? meta.chartPreviousClose ?? null;
  const previousClose = rawPrevClose === null ? null : normalizeCurrency(rawPrevClose, meta.currency ?? 'USD').price;

  return {
    symbol,
    price,
    currency,
    name: meta.longName ?? meta.shortName ?? symbol,
    previousClose,
    exchange: meta.exchangeName ?? null,
    marketStatus: computeMarketStatus(meta, Date.now()),
  };
}

export interface ChartPoint {
  date: string; // yyyy-mm-dd
  close: number;
}

const CHART_RANGES = ['1w', '1mo', '3mo', '1y'] as const;
export type ChartRange = (typeof CHART_RANGES)[number];

// Yahoo's `range` param has no literal "1 week" value — "5d" (5 trading
// days) is the closest live equivalent and what our "1W" label maps to.
const YAHOO_RANGE: Record<ChartRange, string> = { '1w': '5d', '1mo': '1mo', '3mo': '3mo', '1y': '1y' };

/** Daily close series for `symbol` over the given range, for a simple price chart. */
export async function getChartRange(symbol: string, range: ChartRange): Promise<ChartPoint[]> {
  if (!CHART_RANGES.includes(range)) throw new Error('Invalid range: ' + range);
  const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${YAHOO_RANGE[range]}`;
  const data = await fetchJson<YFChartResponse>(url);

  const result = data.chart.result?.[0];
  if (!result) throw new Error('No chart data for ' + symbol);

  const timestamps = result.timestamp ?? [];
  const closes = result.indicators.quote[0]?.close ?? [];
  const currency = result.meta.currency ?? 'USD';

  const points: ChartPoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close == null) continue;
    points.push({
      date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
      close: normalizeCurrency(close, currency).price,
    });
  }
  return points;
}

/** Closing price closest to `dateStr` (yyyy-mm-dd), searching a 5-day window to handle weekends/holidays. */
export async function getHistoricalClose(symbol: string, dateStr: string): Promise<number> {
  const target = new Date(dateStr);
  const start = Math.floor(target.getTime() / 1000) - 4 * 86400;
  const end = Math.floor(target.getTime() / 1000) + 4 * 86400;
  const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${start}&period2=${end}`;
  const data = await fetchJson<YFChartResponse>(url);

  const result = data.chart.result?.[0];
  if (!result) throw new Error('No historical data for ' + symbol);

  const timestamps = result.timestamp ?? [];
  const closes = result.indicators.quote[0]?.close ?? [];

  let bestPrice: number | null = null;
  let bestDelta = Infinity;
  const targetSec = target.getTime() / 1000;

  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close == null) continue;
    const delta = Math.abs(timestamps[i] - targetSec);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestPrice = close;
    }
  }

  if (bestPrice === null) throw new Error('Could not find price for that date');
  return normalizeCurrency(bestPrice, result.meta.currency).price;
}

export interface PriceDiagnosticsDTO {
  symbol: string;
  requestedDate: string;
  matchedDate: string;
  currency: string;
  exchange: string | null;
  close: number;
  adjClose: number | null;
}

/**
 * Debug helper for comparing TIKI's resolved historical price against an
 * external reference (e.g. BLINK) for a specific ticker/date — surfaces the
 * raw ingredients (resolved symbol, matched trading day, currency, close vs.
 * adjusted close) without changing what getHistoricalClose actually returns
 * or how purchase prices get calculated.
 */
export async function getHistoricalDiagnostics(symbol: string, dateStr: string): Promise<PriceDiagnosticsDTO> {
  const target = new Date(dateStr);
  const start = Math.floor(target.getTime() / 1000) - 4 * 86400;
  const end = Math.floor(target.getTime() / 1000) + 4 * 86400;
  const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${start}&period2=${end}`;
  const data = await fetchJson<YFChartResponse>(url);

  const result = data.chart.result?.[0];
  if (!result) throw new Error('No historical data for ' + symbol);

  const timestamps = result.timestamp ?? [];
  const closes = result.indicators.quote[0]?.close ?? [];
  const adjCloses = result.indicators.adjclose?.[0]?.adjclose ?? [];
  const rawCurrency = result.meta.currency ?? 'USD';

  let bestIndex = -1;
  let bestDelta = Infinity;
  const targetSec = target.getTime() / 1000;

  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] == null) continue;
    const delta = Math.abs(timestamps[i] - targetSec);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestIndex = i;
    }
  }

  if (bestIndex === -1) throw new Error('Could not find price for that date');

  const { price: close, currency } = normalizeCurrency(closes[bestIndex]!, rawCurrency);
  const rawAdjClose = adjCloses[bestIndex];
  const adjClose = rawAdjClose == null ? null : normalizeCurrency(rawAdjClose, rawCurrency).price;

  return {
    symbol,
    requestedDate: dateStr,
    matchedDate: new Date(timestamps[bestIndex] * 1000).toISOString().split('T')[0],
    currency,
    exchange: result.meta.exchangeName ?? null,
    close,
    adjClose,
  };
}
