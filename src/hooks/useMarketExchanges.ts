import { useMemo } from 'react';
import { Holding, PriceData, MarketStatus } from '../types';

/**
 * Deduped, per-exchange MarketStatus for every exchange actually present in
 * the held portfolio (manual entries with no marketStatus are skipped).
 * Shared base for both the Home ambient summary (useMarketSummary) and the
 * "which markets am I in" popup — one exchange, one entry, regardless of
 * how many held assets sit on it.
 */
export function useMarketExchanges(holdings: Holding[], quotes: Record<string, PriceData>): MarketStatus[] {
  return useMemo(() => {
    const byExchange = new Map<string, MarketStatus>();
    for (const h of holdings) {
      const status = quotes[h.symbol]?.marketStatus;
      if (status && !byExchange.has(status.exchange)) byExchange.set(status.exchange, status);
    }
    return [...byExchange.values()];
  }, [holdings, quotes]);
}
