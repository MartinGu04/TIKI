import { useMemo } from 'react';
import { Asset, PriceData } from '../types';
import { Translations } from '../i18n';
import { useMarketExchanges } from './useMarketExchanges';

export interface MarketSummary {
  isOpen: boolean;
  label: string;
}

/**
 * Collapses each held asset's MarketStatus into Home's single ambient line.
 * Manual entries (no marketStatus) are skipped entirely, the same way
 * calculateDailyChange already skips assets with no previousClose.
 *
 * Deliberately NOT weighted by portfolio value — naming one exchange as
 * "dominant" would incorrectly imply it represents the whole portfolio.
 * Named status is only shown when every held market is the same exchange;
 * otherwise the line stays exchange-anonymous ("Markets Active/Closed").
 *
 * Returns isOpen rather than a baked-in icon — presentation (the pulsing
 * dot vs. static icon) is the component's job, not this hook's.
 */
export function useMarketSummary(assets: Asset[], quotes: Record<string, PriceData>, t: Translations): MarketSummary | null {
  const exchanges = useMarketExchanges(assets, quotes);

  return useMemo(() => {
    if (exchanges.length === 0) return null;

    if (exchanges.length === 1) {
      const isOpen = exchanges[0].status === 'open';
      return { isOpen, label: isOpen ? t.marketNamedOpen(exchanges[0].exchange) : t.marketNamedClosed(exchanges[0].exchange) };
    }

    const isOpen = exchanges.some((s) => s.status === 'open');
    return { isOpen, label: isOpen ? t.marketsActive : t.marketsClosed };
  }, [exchanges, t]);
}
