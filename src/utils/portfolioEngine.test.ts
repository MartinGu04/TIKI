import { describe, it, expect } from 'vitest';
import {
  computeHoldingPosition,
  computeHoldingStats,
  compareTransactionsAsc,
  validateSell,
} from './portfolioEngine';
import type { Transaction, Holding } from '../types';

let txIdCounter = 0;
function makeTx(partial: Partial<Transaction> & Pick<Transaction, 'type' | 'date'>): Transaction {
  txIdCounter += 1;
  return {
    id: `tx-${txIdCounter}`,
    holdingId: 'h1',
    quantity: null,
    price: null,
    amount: 0,
    ...partial,
  };
}

function makeHolding(partial: Partial<Holding> = {}): Holding {
  return {
    id: 'h1',
    portfolioId: 'p1',
    ticker: 'AAA',
    symbol: 'AAA',
    name: 'Test Co',
    currency: 'USD',
    color: '#6366f1',
    currentPrice: 100,
    quantity: 0,
    avgCost: 0,
    realizedPnL: 0,
    ...partial,
  };
}

describe('computeHoldingPosition — behavioral contract', () => {
  it('1. single buy establishes avgCost = price paid, quantity = shares bought', () => {
    const position = computeHoldingPosition([
      makeTx({ type: 'buy', date: '2026-01-01', quantity: 10, price: 100, amount: 1000 }),
    ]);
    expect(position.quantity).toBe(10);
    expect(position.avgCost).toBe(100);
    expect(position.realizedPnL).toBe(0);
  });

  it('2. two buys at different prices produce the correct weighted average', () => {
    const position = computeHoldingPosition([
      makeTx({ type: 'buy', date: '2026-01-01', quantity: 10, price: 100, amount: 1000 }),
      makeTx({ type: 'buy', date: '2026-01-02', quantity: 10, price: 200, amount: 2000 }),
    ]);
    expect(position.quantity).toBe(20);
    expect(position.avgCost).toBe(150);
  });

  it('3. buy then partial sell: realizedPnL reflects the spread, avgCost is unchanged by the sell', () => {
    const position = computeHoldingPosition([
      makeTx({ type: 'buy', date: '2026-01-01', quantity: 10, price: 100, amount: 1000 }),
      makeTx({ type: 'buy', date: '2026-01-02', quantity: 10, price: 200, amount: 2000 }),
      makeTx({ type: 'sell', date: '2026-01-03', quantity: 5, price: 180, amount: 900 }),
    ]);
    expect(position.quantity).toBe(15);
    expect(position.avgCost).toBe(150);
    expect(position.realizedPnL).toBe(150);
  });

  it('4. selling the entire remaining quantity settles to zero, and a subsequent re-buy computes correctly from that state', () => {
    const soldOut = computeHoldingPosition([
      makeTx({ type: 'buy', date: '2026-01-01', quantity: 10, price: 100, amount: 1000 }),
      makeTx({ type: 'sell', date: '2026-01-02', quantity: 10, price: 120, amount: 1200 }),
    ]);
    expect(soldOut.quantity).toBe(0);
    expect(soldOut.avgCost).toBe(100);
    expect(soldOut.realizedPnL).toBe(200);

    const reBought = computeHoldingPosition([
      makeTx({ type: 'buy', date: '2026-01-01', quantity: 10, price: 100, amount: 1000 }),
      makeTx({ type: 'sell', date: '2026-01-02', quantity: 10, price: 120, amount: 1200 }),
      makeTx({ type: 'buy', date: '2026-01-03', quantity: 5, price: 90, amount: 450 }),
    ]);
    expect(reBought.quantity).toBe(5);
    expect(reBought.avgCost).toBe(90);
    // realizedPnL is preserved from the earlier sell-out — a buy never touches it.
    expect(reBought.realizedPnL).toBe(200);
  });

  it('6. a dividend transaction is a no-op on quantity/avgCost/realizedPnL', () => {
    const position = computeHoldingPosition([
      makeTx({ type: 'buy', date: '2026-01-01', quantity: 10, price: 100, amount: 1000 }),
      makeTx({ type: 'dividend', date: '2026-02-01', amount: 25 }),
    ]);
    expect(position.quantity).toBe(10);
    expect(position.avgCost).toBe(100);
    expect(position.realizedPnL).toBe(0);
  });
});

describe('computeHoldingPosition — CHARACTERIZATION ONLY (test 5)', () => {
  it(
    '5. CHARACTERIZATION ONLY: documents the current Math.min oversell clamp — ' +
      'this is NOT the desired product invariant and must be revisited when the ' +
      'concurrency/oversell behavior is deliberately fixed (see PR0.1 plan, ' +
      '"oversell race — investigation findings")',
    () => {
      // A sell requesting more shares than are owned is silently clamped to the
      // owned quantity today, rather than rejected. This test asserts that
      // EXISTING behavior so any future change to it is a visible, intentional
      // diff — it does NOT assert that overselling is safe, correct, or
      // approved. The unresolved question (whether concurrent writes can bypass
      // upstream validation and reach this function with an inconsistent
      // transaction log) is explicitly not answered by this test — see the
      // Phase 0 plan for what evidence is still required before any fix.
      const position = computeHoldingPosition([
        makeTx({ type: 'buy', date: '2026-01-01', quantity: 10, price: 100, amount: 1000 }),
        // Requests selling 15 shares against a 10-share position.
        makeTx({ type: 'sell', date: '2026-01-02', quantity: 15, price: 50, amount: 750 }),
      ]);
      // Current behavior: clamped to the 10 actually owned, not rejected.
      expect(position.quantity).toBe(0);
      expect(position.realizedPnL).toBe(-500); // (50 - 100) * 10, using the clamped 10, not the requested 15
    },
  );
});

describe('compareTransactionsAsc — behavioral contract', () => {
  it('7. orders by date first, then createdAt, then id — a same-day sell never folds before its same-day buy', () => {
    const earlierDate = makeTx({
      type: 'buy', date: '2025-12-31', createdAt: '2025-12-31T23:59:00Z', id: 'z-last-alphabetically',
    });
    const sameDayEarlyCreated = makeTx({
      type: 'buy', date: '2026-01-01', createdAt: '2026-01-01T09:00:00Z', id: 'z-second-alphabetically',
    });
    const sameDayLateCreated = makeTx({
      type: 'sell', date: '2026-01-01', createdAt: '2026-01-01T10:00:00Z', id: 'a-first-alphabetically',
      quantity: 1, price: 10, amount: 10,
    });

    // Deliberately scrambled input order, and ids chosen to sort the OPPOSITE
    // way to the intended chronological order, so this proves date/createdAt
    // take precedence over id, not the other way around.
    const sorted = [sameDayLateCreated, earlierDate, sameDayEarlyCreated].sort(compareTransactionsAsc);

    expect(sorted.map((t) => t.id)).toEqual([
      earlierDate.id,          // earliest date
      sameDayEarlyCreated.id,  // same day as the last one, but created first
      sameDayLateCreated.id,   // same day, created second — despite its id sorting first alphabetically
    ]);
  });
});

describe('computeHoldingStats — behavioral contract', () => {
  it('8. zero cost-basis holding returns unrealizedPnLPct = 0, not NaN/Infinity', () => {
    const holding = makeHolding({ currentPrice: 100 });
    const stats = computeHoldingStats(holding, { quantity: 5, avgCost: 0, realizedPnL: 0 });
    expect(stats.costBasisRemaining).toBe(0);
    expect(stats.currentValue).toBe(500);
    expect(stats.unrealizedPnL).toBe(500);
    expect(stats.unrealizedPnLPct).toBe(0);
    expect(Number.isNaN(stats.unrealizedPnLPct)).toBe(false);
  });
});

describe('validateSell — behavioral contract', () => {
  it('9. rejects a non-positive sell quantity, rejects an oversell request, accepts a valid partial sell', () => {
    const holding = makeHolding({ quantity: 10 });

    expect(validateSell(holding, 0).ok).toBe(false);
    expect(validateSell(holding, -1).ok).toBe(false);
    expect(validateSell(holding, 11).ok).toBe(false);
    expect(validateSell(holding, 11).error).toBe('insufficientShares');

    const valid = validateSell(holding, 5);
    expect(valid.ok).toBe(true);
  });
});
