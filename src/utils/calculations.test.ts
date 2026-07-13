import { describe, it, expect } from 'vitest';
import {
  calculatePortfolioStats,
  calculateDailyChange,
  generateProjection,
  fmt,
} from './calculations';
import type { Holding, PriceData } from '../types';

function makeHolding(partial: Partial<Holding> & Pick<Holding, 'symbol'>): Holding {
  return {
    id: partial.symbol,
    portfolioId: 'p1',
    ticker: partial.symbol,
    name: 'Test Co',
    currency: 'USD',
    color: '#6366f1',
    currentPrice: 0,
    quantity: 0,
    avgCost: 0,
    realizedPnL: 0,
    ...partial,
  };
}

function makeQuote(partial: Partial<PriceData> & Pick<PriceData, 'symbol'>): PriceData {
  return {
    price: 0,
    currency: 'USD',
    name: 'Test Co',
    previousClose: null,
    exchange: null,
    marketStatus: null,
    ...partial,
  };
}

describe('calculatePortfolioStats — behavioral contract', () => {
  it('10. totalInvested = 0 guard: roi is 0, not NaN/Infinity, even with nonzero profitLoss', () => {
    // Zero cost basis (e.g. gifted/free shares) but real current value —
    // without the guard this would divide by zero.
    const holding = makeHolding({ symbol: 'FREE', quantity: 10, avgCost: 0, currentPrice: 50 });
    const stats = calculatePortfolioStats([holding], 0);

    expect(stats.totalInvested).toBe(0);
    expect(stats.currentValue).toBe(500);
    expect(stats.profitLoss).toBe(500);
    expect(stats.roi).toBe(0);
    expect(Number.isNaN(stats.roi)).toBe(false);
  });

  it('11. mixed-currency holdings: isMixedCurrency is true, each currency group carries its own independent subtotals', () => {
    const usdHolding = makeHolding({
      symbol: 'AAA', currency: 'USD', quantity: 10, avgCost: 100, currentPrice: 120,
    });
    const eurHolding = makeHolding({
      symbol: 'BBB', currency: 'EUR', quantity: 5, avgCost: 50, currentPrice: 40,
    });
    const stats = calculatePortfolioStats([usdHolding, eurHolding], 0);

    expect(stats.isMixedCurrency).toBe(true);
    expect(stats.currencies.sort()).toEqual(['EUR', 'USD']);

    // Each currency's group is checked independently — USD and EUR figures
    // are never meaningfully addable to one another, so this test does not
    // assert anything about the combined totalInvested/currentValue figures.
    const usdGroup = stats.currencyGroups.find((g) => g.currency === 'USD');
    const eurGroup = stats.currencyGroups.find((g) => g.currency === 'EUR');
    expect(usdGroup).toEqual({ currency: 'USD', invested: 1000, currentValue: 1200, profitLoss: 200 });
    expect(eurGroup).toEqual({ currency: 'EUR', invested: 250, currentValue: 200, profitLoss: -50 });
  });
});

describe('calculateDailyChange — behavioral contract', () => {
  it('12. a holding with no resolved previousClose is excluded from both sums, and null is returned when no holding has usable data', () => {
    const holdingWithQuote = makeHolding({ symbol: 'AAA', quantity: 10, currentPrice: 110 });
    const holdingWithoutQuote = makeHolding({ symbol: 'BBB', quantity: 5, currentPrice: 50 });

    // Only AAA has a resolved quote; BBB's fetch is simulated as having failed
    // (absent from the quotes map entirely).
    const quotes: Record<string, PriceData> = {
      AAA: makeQuote({ symbol: 'AAA', price: 110, previousClose: 100 }),
    };

    const change = calculateDailyChange([holdingWithQuote, holdingWithoutQuote], quotes);
    expect(change).not.toBeNull();
    // BBB must not silently count as zero change: if it did, amount/pct would
    // differ from the AAA-only calculation below.
    expect(change!.amount).toBe(100); // 10 * (110 - 100)
    expect(change!.pct).toBe(10); // 100 / (10 * 100) * 100

    const noUsableData = calculateDailyChange(
      [holdingWithoutQuote],
      { BBB: makeQuote({ symbol: 'BBB', price: 50, previousClose: null }) },
    );
    expect(noUsableData).toBeNull();
  });
});

describe('generateProjection — behavioral contract', () => {
  it('13. monthly compounding at the year-1 boundary, with and without a monthly contribution', () => {
    // Expected values independently hand-derived (12% annual = 1%/month
    // compounding over 12 months on a $1,000 start), not by re-running this
    // function's own formula.
    const withoutContribution = generateProjection(1000, 0, 12, 1);
    expect(withoutContribution[0]).toEqual({ year: 0, withContrib: 1000, withoutContrib: 1000 });
    expect(withoutContribution[1]).toEqual({ year: 1, withContrib: 1127, withoutContrib: 1127 });

    const withContribution = generateProjection(1000, 50, 12, 1);
    expect(withContribution[0]).toEqual({ year: 0, withContrib: 1000, withoutContrib: 1000 });
    expect(withContribution[1]).toEqual({ year: 1, withContrib: 1761, withoutContrib: 1127 });
  });
});

describe('fmt — behavioral contract', () => {
  it('14. formats at the 1,000 / 100,000 / 1,000,000 thresholds, with sign and currency symbol handled correctly', () => {
    expect(fmt(999)).toBe('$999.00');
    expect(fmt(1000)).toBe('$1.0K');
    expect(fmt(50000)).toBe('$50.0K');
    expect(fmt(100000)).toBe('$100K');
    expect(fmt(500000)).toBe('$500K');
    expect(fmt(1000000)).toBe('$1.00M');
    expect(fmt(-1500)).toBe('-$1.5K');
    expect(fmt(1000, 'EUR')).toBe('€1.0K');
  });
});
