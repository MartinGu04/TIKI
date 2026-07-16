import { describe, it, expect } from 'vitest';
import { computeHomeNowState, computeHomeSignals } from './homeState';

describe('computeHomeNowState', () => {
  it('noPortfolio wins over every other condition', () => {
    const state = computeHomeNowState({
      holdingsCount: 0, pricesStale: true, dailyChangeAmount: 100, profitLoss: 100, isMixedCurrency: true,
    });
    expect(state.id).toBe('noPortfolio');
  });

  it('dataUnavailableOrStale wins over portfolio state', () => {
    const state = computeHomeNowState({
      holdingsCount: 3, pricesStale: true, dailyChangeAmount: 50, profitLoss: 50, isMixedCurrency: false,
    });
    expect(state.id).toBe('dataUnavailableOrStale');
  });

  it('isMixedCurrency always resolves to Neutral, no combined value implied', () => {
    const state = computeHomeNowState({
      holdingsCount: 3, pricesStale: false, dailyChangeAmount: 500, profitLoss: 500, isMixedCurrency: true,
    });
    expect(state.id).toBe('currentPortfolioNeutral');
    expect(state.isMixedCurrency).toBe(true);
  });

  it('uses dailyChange as basis when available ("today")', () => {
    const state = computeHomeNowState({
      holdingsCount: 3, pricesStale: false, dailyChangeAmount: 10, profitLoss: -10, isMixedCurrency: false,
    });
    expect(state.id).toBe('currentPortfolioPositive');
    expect(state.changeBasis).toBe('today');
  });

  it('falls back to profitLoss when dailyChange is null ("overall")', () => {
    const state = computeHomeNowState({
      holdingsCount: 3, pricesStale: false, dailyChangeAmount: null, profitLoss: -10, isMixedCurrency: false,
    });
    expect(state.id).toBe('currentPortfolioNegative');
    expect(state.changeBasis).toBe('overall');
  });

  describe('thresholds', () => {
    const base = { holdingsCount: 3, pricesStale: false, isMixedCurrency: false };

    it('exact 0 is neutral', () => {
      expect(computeHomeNowState({ ...base, dailyChangeAmount: 0, profitLoss: 0 }).id).toBe('currentPortfolioNeutral');
    });
    it('+0.001 is neutral (below epsilon)', () => {
      expect(computeHomeNowState({ ...base, dailyChangeAmount: 0.001, profitLoss: 0 }).id).toBe('currentPortfolioNeutral');
    });
    it('-0.001 is neutral (below epsilon)', () => {
      expect(computeHomeNowState({ ...base, dailyChangeAmount: -0.001, profitLoss: 0 }).id).toBe('currentPortfolioNeutral');
    });
    it('+0.005 is positive (at epsilon)', () => {
      expect(computeHomeNowState({ ...base, dailyChangeAmount: 0.005, profitLoss: 0 }).id).toBe('currentPortfolioPositive');
    });
    it('-0.005 is negative (at epsilon)', () => {
      expect(computeHomeNowState({ ...base, dailyChangeAmount: -0.005, profitLoss: 0 }).id).toBe('currentPortfolioNegative');
    });
    it('+0.01 is positive', () => {
      expect(computeHomeNowState({ ...base, dailyChangeAmount: 0.01, profitLoss: 0 }).id).toBe('currentPortfolioPositive');
    });
    it('-0.01 is negative', () => {
      expect(computeHomeNowState({ ...base, dailyChangeAmount: -0.01, profitLoss: 0 }).id).toBe('currentPortfolioNegative');
    });
  });
});

describe('computeHomeSignals', () => {
  it('returns 0 signals when neither reminder is due', () => {
    expect(computeHomeSignals({ monthlyReminderDue: false, dividendReminderDue: false })).toEqual([]);
  });

  it('returns 1 signal when only monthly is due', () => {
    expect(computeHomeSignals({ monthlyReminderDue: true, dividendReminderDue: false }))
      .toEqual([{ id: 'monthlyReminder' }]);
  });

  it('returns 1 signal when only dividend is due', () => {
    expect(computeHomeSignals({ monthlyReminderDue: false, dividendReminderDue: true }))
      .toEqual([{ id: 'dividendReminder' }]);
  });

  it('returns 2 signals, monthly before dividend, when both are due', () => {
    expect(computeHomeSignals({ monthlyReminderDue: true, dividendReminderDue: true }))
      .toEqual([{ id: 'monthlyReminder' }, { id: 'dividendReminder' }]);
  });

  it('never duplicates a signal', () => {
    const signals = computeHomeSignals({ monthlyReminderDue: true, dividendReminderDue: true });
    const ids = signals.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
