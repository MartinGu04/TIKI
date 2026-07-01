import { Asset } from '../types';
import { getElapsedDeposits } from './calculations';
import { getHistoricalPrice } from '../services/marketData';

// Bounds how many missed periods get bought in a single pass (e.g. 24 months
// of a monthly plan). Older backlogs are picked up on the next run — each
// pass advances lastProcessedDate, so the catch-up eventually converges
// without risking dozens of sequential price fetches blocking the UI.
const MAX_CATCHUP_PERIODS = 24;

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Applies any recurring deposits that have come due since the asset's
 * anchor date: buys shares at each missed date's historical price and
 * recomputes the weighted-average buy price. Returns a new Asset (the same
 * reference if nothing was due). Never mutates the input.
 */
export async function applyRecurringCatchUp(asset: Asset): Promise<Asset> {
  const { frequency, monthlyContribution } = asset;
  if (frequency.type === 'one-time' || monthlyContribution <= 0) return asset;

  const anchorStr = frequency.lastProcessedDate ?? frequency.startDate;
  if (!anchorStr) {
    // No known start date (legacy/demo assets created before this feature) —
    // start counting from today rather than guessing a retroactive history.
    return { ...asset, frequency: { ...frequency, lastProcessedDate: todayStr() } };
  }

  const due = getElapsedDeposits(frequency, new Date(anchorStr), new Date(), MAX_CATCHUP_PERIODS);
  if (due.length === 0) return asset;

  // Fetch all missed prices in parallel — arithmetic below is sequential,
  // but there's no need to serialize the network I/O.
  const prices = await Promise.all(
    due.map((date) => getHistoricalPrice(asset.symbol, date).catch(() => null)),
  );

  let quantity = asset.quantity;
  let avgBuyPrice = asset.avgBuyPrice;
  let lastProcessedDate = anchorStr;

  for (let i = 0; i < due.length; i++) {
    const price = prices[i];
    if (!price || price <= 0) break; // stop at the first gap; retry it next run
    const totalCost = avgBuyPrice * quantity + monthlyContribution;
    quantity += monthlyContribution / price;
    avgBuyPrice = totalCost / quantity;
    lastProcessedDate = due[i].toISOString().split('T')[0];
  }

  if (lastProcessedDate === anchorStr) return asset; // every fetch failed — nothing applied

  return {
    ...asset,
    quantity,
    avgBuyPrice,
    frequency: { ...frequency, lastProcessedDate },
  };
}

/** Runs applyRecurringCatchUp over a list of assets; returns [updatedAssets, anythingChanged]. */
export async function applyRecurringCatchUpAll(assets: Asset[]): Promise<[Asset[], boolean]> {
  let changed = false;
  const updated: Asset[] = [];
  for (const asset of assets) {
    const next = await applyRecurringCatchUp(asset);
    if (next !== asset) changed = true;
    updated.push(next);
  }
  return [updated, changed];
}
