import { SearchResult, PriceData, ChartPoint, ChartRange, PriceDiagnostics } from '../types';

// Served by api/market.ts on Vercel (serverless function) and mirrored by a
// Vite dev-server middleware locally — the browser never calls Yahoo Finance
// directly, so there's no CORS/third-party-proxy dependency.
const API_BASE = '/api/market';
const LS_PREFIX = 'tiki-mkt:';

const CACHE_TTL = {
  price: 5 * 60 * 1000,        // 5 min
  historicalPrice: 24 * 60 * 60 * 1000, // 24 h (historical prices don't change)
  search: 60 * 60 * 1000,      // 1 h
  name: 7 * 24 * 60 * 60 * 1000, // 7 days
  chart: 60 * 60 * 1000,       // 1 h (only the most recent point can still move)
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

async function apiFetch<T>(params: Record<string, string>): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}?${qs}`, { signal: controller.signal });
    if (!res.ok) {
      const body = await res.json().catch(() => null) as { error?: string } | null;
      throw new Error(body?.error ?? `HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function searchTicker(query: string): Promise<SearchResult[]> {
  const cacheKey = `search:${query.toUpperCase()}`;
  const cached = lsGet<SearchResult[]>(cacheKey);
  if (cached) return cached;

  const { results } = await apiFetch<{ results: SearchResult[] }>({ action: 'search', q: query });

  lsSet(cacheKey, results, CACHE_TTL.search);
  return results;
}

export async function getCurrentPrice(symbol: string): Promise<PriceData> {
  const cacheKey = `price:${symbol}`;
  const cached = lsGet<PriceData>(cacheKey);
  if (cached) return cached;

  const out = await apiFetch<PriceData>({ action: 'quote', symbol });

  lsSet(cacheKey, out, CACHE_TTL.price);
  return out;
}

export async function getHistoricalPrice(symbol: string, date: Date): Promise<number> {
  const dateStr = date.toISOString().split('T')[0];
  const cacheKey = `hist:${symbol}:${dateStr}`;
  const cached = lsGet<number>(cacheKey);
  if (cached !== null) return cached;

  const { price } = await apiFetch<{ price: number }>({ action: 'history', symbol, date: dateStr });

  lsSet(cacheKey, price, CACHE_TTL.historicalPrice);
  return price;
}

/** Returns the last cached price for a symbol (or null if no cache exists). */
export function getCachedPrice(symbol: string): PriceData | null {
  return lsGet<PriceData>(`price:${symbol}`);
}

/** Debug helper for comparing TIKI's resolved historical price against an external reference. */
export async function getPriceDiagnostics(symbol: string, date: Date): Promise<PriceDiagnostics> {
  const dateStr = date.toISOString().split('T')[0];
  const cacheKey = `diag:${symbol}:${dateStr}`;
  const cached = lsGet<PriceDiagnostics>(cacheKey);
  if (cached) return cached;

  const diagnostics = await apiFetch<PriceDiagnostics>({ action: 'diagnose', symbol, date: dateStr });

  lsSet(cacheKey, diagnostics, CACHE_TTL.historicalPrice);
  return diagnostics;
}

export async function getChartRange(symbol: string, range: ChartRange): Promise<ChartPoint[]> {
  const cacheKey = `chart:${symbol}:${range}`;
  const cached = lsGet<ChartPoint[]>(cacheKey);
  if (cached) return cached;

  const { points } = await apiFetch<{ points: ChartPoint[] }>({ action: 'chart', symbol, range });

  lsSet(cacheKey, points, CACHE_TTL.chart);
  return points;
}
