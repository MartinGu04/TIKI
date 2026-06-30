import { Asset, FrequencyConfig, PortfolioStats, ProjectionPoint } from '../types';

export function calculatePortfolioStats(assets: Asset[]): PortfolioStats {
  const totalInvested = assets.reduce((s, a) => s + a.avgBuyPrice * a.quantity, 0);
  const currentValue = assets.reduce((s, a) => s + a.currentPrice * a.quantity, 0);
  const profitLoss = currentValue - totalInvested;
  const roi = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
  const monthlyContribution = assets
    .filter((a) => a.frequency.type !== 'one-time')
    .reduce((s, a) => s + a.monthlyContribution, 0);

  const uniqueCurrencies = [...new Set(assets.map((a) => a.currency))];
  const isMixedCurrency = uniqueCurrencies.length > 1;

  const currencyGroups = uniqueCurrencies.map((currency) => {
    const group = assets.filter((a) => a.currency === currency);
    const invested = group.reduce((s, a) => s + a.avgBuyPrice * a.quantity, 0);
    const value = group.reduce((s, a) => s + a.currentPrice * a.quantity, 0);
    return { currency, invested, currentValue: value, profitLoss: value - invested };
  });

  return {
    totalInvested, currentValue, profitLoss, roi, monthlyContribution,
    currencies: uniqueCurrencies, isMixedCurrency, currencyGroups,
  };
}

export function generateProjection(
  currentValue: number,
  monthlyContribution: number,
  annualReturn: number,
  years: number,
): ProjectionPoint[] {
  const monthlyRate = annualReturn / 100 / 12;
  const data: ProjectionPoint[] = [];
  let withContrib = currentValue;
  let withoutContrib = currentValue;

  for (let m = 0; m <= years * 12; m++) {
    if (m > 0) {
      withContrib = withContrib * (1 + monthlyRate) + monthlyContribution;
      withoutContrib = withoutContrib * (1 + monthlyRate);
    }
    if (m % 12 === 0) {
      data.push({
        year: m / 12,
        withContrib: Math.round(withContrib),
        withoutContrib: Math.round(withoutContrib),
      });
    }
  }
  return data;
}

/** Get the next deposit date for an asset based on its frequency config. */
export function getNextDepositDate(freq: FrequencyConfig): Date | null {
  const now = new Date();
  const { type, dayOfMonth = 1, weekday = 1, everyXMonths = 3, startDate } = freq;

  if (type === 'one-time') return null;

  const startFrom = startDate ? new Date(startDate) : now;

  if (type === 'monthly') {
    let d = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
    if (d <= now) d = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
    return d;
  }

  if (type === 'quarterly' || type === 'every-x-months') {
    const months = type === 'quarterly' ? 3 : everyXMonths;
    let candidate = new Date(startFrom);
    candidate.setDate(dayOfMonth);
    while (candidate <= now) {
      candidate = new Date(candidate.getFullYear(), candidate.getMonth() + months, dayOfMonth);
    }
    return candidate;
  }

  if (type === 'semi-annually') {
    let candidate = new Date(startFrom);
    candidate.setDate(dayOfMonth);
    while (candidate <= now) {
      candidate = new Date(candidate.getFullYear(), candidate.getMonth() + 6, dayOfMonth);
    }
    return candidate;
  }

  if (type === 'yearly') {
    let candidate = new Date(startFrom);
    candidate.setDate(dayOfMonth);
    while (candidate <= now) {
      candidate = new Date(candidate.getFullYear() + 1, candidate.getMonth(), dayOfMonth);
    }
    return candidate;
  }

  if (type === 'weekly') {
    let d = new Date(now);
    d.setDate(d.getDate() + 1);
    while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
    return d;
  }

  if (type === 'daily') {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d;
  }

  return null;
}

export function frequencyLabel(freq: FrequencyConfig): string {
  const labels: Record<string, string> = {
    'one-time': 'חד פעמי',
    'daily': 'יומי',
    'weekly': 'שבועי',
    'monthly': 'חודשי',
    'every-x-months': `כל ${freq.everyXMonths ?? 2} חודשים`,
    'quarterly': 'רבעוני',
    'semi-annually': 'חצי שנתי',
    'yearly': 'שנתי',
  };
  return labels[freq.type] ?? freq.type;
}

// ─── Formatting ──────────────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', GBP: '£', EUR: '€', ILS: '₪',
};

export function currencySymbol(currency = 'USD'): string {
  return CURRENCY_SYMBOLS[currency] ?? currency + ' ';
}

export function fmt(value: number, currency = 'USD'): string {
  const sym = currencySymbol(currency);
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${sym}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 100_000) return `${sign}${sym}${(abs / 1_000).toFixed(0)}K`;
  if (abs >= 1_000) return `${sign}${sym}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${sym}${abs.toFixed(2)}`;
}

export function fmtPrice(value: number, currency = 'USD'): string {
  const sym = currencySymbol(currency);
  if (value >= 10_000) return `${sym}${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `${sym}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtPct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function fmtDate(date: Date): string {
  const locale = document.documentElement.lang === 'en' ? 'en-US' : 'he-IL';
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}
