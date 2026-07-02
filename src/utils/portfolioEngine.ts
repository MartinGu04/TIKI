import { Holding, HoldingStats, Transaction } from '../types';

export interface HoldingComputed {
  quantity: number;
  avgCost: number;
  realizedPnL: number;
}

const EMPTY: HoldingComputed = { quantity: 0, avgCost: 0, realizedPnL: 0 };

/**
 * Ascending chronological order: `date`, then `createdAt` (the DB insert
 * timestamp) as the tiebreaker for same-day transactions, then `id` as a
 * last resort. `date` alone can't distinguish two same-day transactions'
 * real order, and `id` is a random uuid — a same-day Sell must never be
 * allowed to fold before its Buy just because its uuid sorts first. Shared
 * by every place transactions get ordered (the position engine, History,
 * the ticker detail "recent activity" list) so they all agree on "newest".
 */
export function compareTransactionsAsc(a: Transaction, b: Transaction): number {
  return a.date.localeCompare(b.date)
    || (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
    || a.id.localeCompare(b.id);
}

/**
 * Folds one holding's transactions (any order) into its current position,
 * using the weighted-average-cost method. Implemented as a reducer keyed on
 * `tx.type` — one case per type — so a future type (Stock Split, Fee,
 * Interest, Transfer) is a new case here, not a restructure of this function
 * or its callers. Unknown types are a no-op (forward-compatible if older
 * clients read data written by a newer one).
 */
export function computeHoldingPosition(transactions: Transaction[]): HoldingComputed {
  const ordered = [...transactions].sort(compareTransactionsAsc);

  return ordered.reduce<HoldingComputed>((pos, tx) => {
    switch (tx.type) {
      case 'buy': {
        const qty = tx.quantity ?? 0;
        const newQuantity = pos.quantity + qty;
        const avgCost = newQuantity > 0
          ? (pos.avgCost * pos.quantity + tx.amount) / newQuantity
          : pos.avgCost;
        return { ...pos, quantity: newQuantity, avgCost };
      }
      case 'sell': {
        const qty = Math.min(tx.quantity ?? 0, pos.quantity);
        const sellPrice = tx.price ?? 0;
        const realizedPnL = pos.realizedPnL + (sellPrice - pos.avgCost) * qty;
        // avgCost is unchanged by a sell — standard average-cost behavior.
        return { ...pos, quantity: pos.quantity - qty, realizedPnL };
      }
      case 'dividend':
      default:
        return pos;
    }
  }, EMPTY);
}

export function computeHoldingStats(holding: Holding, position: HoldingComputed): HoldingStats {
  const costBasisRemaining = position.avgCost * position.quantity;
  const currentValue = holding.currentPrice * position.quantity;
  const unrealizedPnL = currentValue - costBasisRemaining;
  const unrealizedPnLPct = costBasisRemaining > 0 ? (unrealizedPnL / costBasisRemaining) * 100 : 0;

  return {
    ...holding,
    quantity: position.quantity,
    avgCost: position.avgCost,
    realizedPnL: position.realizedPnL,
    costBasisRemaining,
    currentValue,
    unrealizedPnL,
    unrealizedPnLPct,
  };
}

/**
 * Re-derives every holding's quantity/avgCost/realizedPnL from the actual
 * `transactions` records, rather than trusting each holding's persisted
 * cache column. The cache is refreshed after every write (see
 * storageService.recomputeHolding), but the client already has the full,
 * authoritative transaction list in memory — deriving from it directly here
 * means the UI can never disagree with what a fresh server-side recompute
 * would say, even if the persisted cache was ever left stale by an earlier
 * bug, a partially-failed write, or direct DB edits. This is the one place
 * Home, Portfolio, the transaction form, and History should all read
 * quantity/avgCost/realizedPnL from, so they can't drift apart from each other.
 */
export function deriveHoldings(holdings: Holding[], transactions: Transaction[]): Holding[] {
  return holdings.map((h) => {
    const position = computeHoldingPosition(transactions.filter((tx) => tx.holdingId === h.id));
    return { ...h, ...position };
  });
}

export function sumDividends(transactions: Transaction[]): number {
  return transactions.reduce((s, tx) => (tx.type === 'dividend' ? s + tx.amount : s), 0);
}

/** No short selling in v1 — a sell can never take a holding's quantity negative. */
export function validateSell(holding: Holding, sellQty: number): { ok: boolean; error?: string } {
  if (!(sellQty > 0)) return { ok: false, error: 'invalidQuantity' };
  if (sellQty > holding.quantity) return { ok: false, error: 'insufficientShares' };
  return { ok: true };
}
