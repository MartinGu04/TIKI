import { useCallback, useEffect, useRef, useState } from 'react';
import { Holding, PriceData } from '../types';
import { getCurrentPrice } from '../services/marketData';

export interface LivePrices {
  /** Live quote per symbol (5-min cached by marketData.ts) — undefined if the fetch failed or hasn't resolved yet. */
  quotes: Record<string, PriceData>;
  /** Symbols whose live fetch failed this pass — displays should fall back to the asset's stored currentPrice. */
  staleSymbols: Set<string>;
  /** Date.now() when the last poll (auto or manual) settled — null before the first one resolves. */
  lastUpdated: number | null;
  /** True while a fetch (auto or manual) is in flight. */
  refreshing: boolean;
  /** Manually trigger an immediate refresh, e.g. from a "last updated" tap target. */
  refresh: () => void;
}

const REFRESH_INTERVAL_MS = 60_000;

/**
 * Fetches a live quote per unique symbol across `assets` (deduped, so owning
 * the same ticker under multiple owners costs one request). Never touches
 * storage — this is a render-time overlay only, used to keep displayed
 * value/ROI/change figures live without treating the fetched price as the
 * new source of truth for the asset record itself.
 *
 * Refresh strategy (v1): fetches on mount and whenever the held symbol set
 * changes, then polls every 60s while the tab is visible, and immediately
 * refreshes when the tab regains visibility (e.g. after being backgrounded
 * for a while). `refresh()` exposes the same fetch for a manual trigger
 * (e.g. tapping the "last updated" label) — it doesn't reset the 60s
 * interval, it just does one extra pass; cheap since `marketData.ts`
 * already caches each symbol for 5 minutes upstream.
 */
export function useLivePrices(holdings: Holding[]): LivePrices {
  const symbols = [...new Set(holdings.map((h) => h.symbol))].sort();
  const symbolsKey = symbols.join(',');

  const [state, setState] = useState<Omit<LivePrices, 'refresh'>>({
    quotes: {}, staleSymbols: new Set(), lastUpdated: null, refreshing: false,
  });
  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (symbols.length === 0) { setState({ quotes: {}, staleSymbols: new Set(), lastUpdated: null, refreshing: false }); return; }
    let alive = true;

    const refresh = () => {
      setState((prev) => ({ ...prev, refreshing: true }));
      Promise.allSettled(symbols.map((s) => getCurrentPrice(s))).then((results) => {
        if (!alive) return;
        const quotes: Record<string, PriceData> = {};
        const staleSymbols = new Set<string>();
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') quotes[symbols[i]] = r.value;
          else staleSymbols.add(symbols[i]);
        });
        setState({ quotes, staleSymbols, lastUpdated: Date.now(), refreshing: false });
      });
    };
    refreshRef.current = refresh;

    refresh();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, REFRESH_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      alive = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey]);

  const refresh = useCallback(() => refreshRef.current(), []);

  return { ...state, refresh };
}
