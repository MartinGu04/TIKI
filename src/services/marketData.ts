import { SearchResult, PriceData } from '../types';

const YF_BASE = 'https://query1.finance.yahoo.com';
const YF_SEARCH_BASE = 'https://query2.finance.yahoo.com';
const PROXY = 'https://corsproxy.io/?url=';
const LS_PREFIX = 'tiki-mkt:';

const CACHE_TTL = {
  price: 5 * 60 * 1000,        // 5 min
  historicalPrice: 24 * 60 * 60 * 1000, // 24 h (historical prices don't change)
  search: 60 * 60 * 1000,      // 1 h
  name: 7 * 24 * 60 * 60 * 1000, // 7 days
};

interface CacheEntry<T> {
  data: T;
  ts: number;
  ttl: number;
}

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.ts > entry.ttl) {
      localStorage.removeItem(LS_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function lsSet<T>(key: string, data: T, ttl: number) {
  try {
    const entry: CacheEntry<T> = { data, ts: Date.now(), ttl };
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage may be full
  }
}

async function proxyFetch<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(PROXY + encodeURIComponent(url), {
      signal: controller.signal,
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
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
  score: number;
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
      indicators: {
        quote: Array<{ close: (number | null)[] }>;
      };
    }> | null;
    error: null | { message: string };
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function searchTicker(query: string): Promise<SearchResult[]> {
  const cacheKey = `search:${query.toUpperCase()}`;
  const cached = lsGet<SearchResult[]>(cacheKey);
  if (cached) return cached;

  const url = `${YF_SEARCH_BASE}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&enableFuzzyQuery=false`;
  const data = await proxyFetch<YFSearchResponse>(url);

  const results: SearchResult[] = (data.quotes ?? [])
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

  lsSet(cacheKey, results, CACHE_TTL.search);
  return results;
}

export async function getCurrentPrice(symbol: string): Promise<PriceData> {
  const cacheKey = `price:${symbol}`;
  const cached = lsGet<PriceData>(cacheKey);
  if (cached) return cached;

  const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const data = await proxyFetch<YFChartResponse>(url);

  const result = data.chart.result?.[0];
  if (!result) throw new Error('No data for ' + symbol);

  const meta = result.meta;
  const out: PriceData = {
    symbol,
    price: meta.regularMarketPrice,
    currency: meta.currency ?? 'USD',
    name: meta.longName ?? meta.shortName ?? symbol,
  };

  lsSet(cacheKey, out, CACHE_TTL.price);
  return out;
}

export async function getHistoricalPrice(symbol: string, date: Date): Promise<number> {
  const dateStr = date.toISOString().split('T')[0];
  const cacheKey = `hist:${symbol}:${dateStr}`;
  const cached = lsGet<number>(cacheKey);
  if (cached !== null) return cached;

  // Fetch a 5-day window around the date to handle weekends/holidays
  const start = Math.floor(date.getTime() / 1000) - 4 * 86400;
  const end = Math.floor(date.getTime() / 1000) + 4 * 86400;
  const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${start}&period2=${end}`;
  const data = await proxyFetch<YFChartResponse>(url);

  const result = data.chart.result?.[0];
  if (!result) throw new Error('No historical data for ' + symbol);

  // Find the closing price closest to the target date
  const timestamps = result.timestamp ?? [];
  const closes = result.indicators.quote[0]?.close ?? [];

  let bestPrice: number | null = null;
  let bestDelta = Infinity;
  const target = date.getTime() / 1000;

  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close == null) continue;
    const delta = Math.abs(timestamps[i] - target);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestPrice = close;
    }
  }

  if (bestPrice === null) throw new Error('Could not find price for that date');

  lsSet(cacheKey, bestPrice, CACHE_TTL.historicalPrice);
  return bestPrice;
}

/** Returns the last cached price for a symbol (or null if no cache exists). */
export function getCachedPrice(symbol: string): PriceData | null {
  return lsGet<PriceData>(`price:${symbol}`);
}
