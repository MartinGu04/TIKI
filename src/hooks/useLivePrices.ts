import { useEffect, useState } from 'react';
import { Holding, PriceData } from '../types';
import { getCurrentPrice } from '../services/marketData';

export interface LivePrices {
  /** Live quote per symbol (5-min cached by marketData.ts) — undefined if the fetch failed or hasn't resolved yet. */
  quotes: Record<string, PriceData>;
  /** Symbols whose live fetch failed this pass — displays should fall back to the asset's stored currentPrice. */
  staleSymbols: Set<string>;
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
 * for a while) — no refresh on tab/view change within the app itself (all
 * views share this one App-level fetch) and no manual refresh action yet.
 */
export function useLivePrices(holdings: Holding[]): LivePrices {
  const symbols = [...new Set(holdings.map((h) => h.symbol))].sort();
  const symbolsKey = symbols.join(',');

  const [state, setState] = useState<LivePrices>({ quotes: {}, staleSymbols: new Set() });

  useEffect(() => {
    if (symbols.length === 0) { setState({ quotes: {}, staleSymbols: new Set() }); return; }
    let alive = true;

    const refresh = () => {
      Promise.allSettled(symbols.map((s) => getCurrentPrice(s))).then((results) => {
        if (!alive) return;
        const quotes: Record<string, PriceData> = {};
        const staleSymbols = new Set<string>();
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') quotes[symbols[i]] = r.value;
          else staleSymbols.add(symbols[i]);
        });
        setState({ quotes, staleSymbols });
      });
    };

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

  return state;
}
