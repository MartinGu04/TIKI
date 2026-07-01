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

interface YFChartMeta {
  currency: string;
  symbol: string;
  regularMarketPrice: number;
  shortName?: string;
  longName?: string;
}

interface YFChartResponse {
  chart: {
    result: Array<{
      meta: YFChartMeta;
      timestamp?: number[];
      indicators: { quote: Array<{ close: (number | null)[] }> };
    }> | null;
    error: null | { message: string };
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
}

export async function getQuote(symbol: string): Promise<QuoteDTO> {
  const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const data = await fetchJson<YFChartResponse>(url);

  const result = data.chart.result?.[0];
  if (!result) throw new Error('No data for ' + symbol);

  const meta = result.meta;
  return {
    symbol,
    price: meta.regularMarketPrice,
    currency: meta.currency ?? 'USD',
    name: meta.longName ?? meta.shortName ?? symbol,
  };
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
  return bestPrice;
}
