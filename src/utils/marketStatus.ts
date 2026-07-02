import { Holding, MarketStatus } from '../types';
import { Translations } from '../i18n';

/**
 * Infers the user's primary market as the exchange held by the most
 * distinct tickers in their portfolio (plurality, not portfolio-value
 * weighted — a small high-value position shouldn't out-rank a market the
 * user is more broadly invested in). Returns null with zero/ambiguous data
 * rather than guessing. No manual override in v1 — Settings shows this
 * read-only, per the "reduce unnecessary configuration" product decision.
 */
export function inferPrimaryMarket(holdings: Holding[]): string | null {
  const counts = new Map<string, number>();
  for (const h of holdings) {
    if (!h.exchange) continue;
    counts.set(h.exchange, (counts.get(h.exchange) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Duration is rendered as a plain "3h 12m" / "45m" — universal, unlocalized
// shorthand, matching how the rest of the app already keeps numbers/times in
// a fixed LTR format regardless of language (e.g. the header's live clock).
function formatDuration(ms: number): string {
  const totalMinutes = Math.max(1, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

// Local calendar-day difference between two dates — always the *user's*
// local calendar, since plain Date methods (no timeZone option) already
// operate in the browser's local timezone. This is what keeps every label
// ("tomorrow", "Monday", ...) framed from the user's perspective rather than
// the exchange's, per the confirmed product rule.
function localDayDiff(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

/**
 * Renders a MarketStatus as a short, human-friendly timing string, always
 * from the user's local perspective:
 *  - open:   "Closes in 3h"
 *  - closed, opens later today/tomorrow: "Opens in 45m" / "Opens tomorrow"
 *  - closed, opens 2+ days away (weekend/holiday-scale gap): "Opens Monday"
 */
export function formatMarketTiming(status: MarketStatus, t: Translations, now: Date = new Date()): string {
  if (status.status === 'open') {
    return t.marketClosesIn(formatDuration(status.closesAt - now.getTime()));
  }

  const target = new Date(status.nextOpenAt);
  const dayDiff = localDayDiff(now, target);

  if (dayDiff <= 0) return t.marketOpensIn(formatDuration(Math.max(0, status.nextOpenAt - now.getTime())));
  if (dayDiff === 1) return t.marketOpensTomorrow;

  const locale = document.documentElement.lang === 'en' ? 'en-US' : 'he-IL';
  const weekday = target.toLocaleDateString(locale, { weekday: 'long' });
  return t.marketOpensOnDay(weekday);
}
