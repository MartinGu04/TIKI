import { Transaction } from '../types';

/**
 * v1 reminders are in-app banners only — no OS push notifications, since no
 * Notification-permission/service-worker infra exists in this app. Both
 * reminders are lightweight, date-based nudges computed client-side from
 * existing transaction history; neither depends on an external dividend
 * calendar (no such data source exists), so the dividend reminder is
 * intentionally a periodic "did you log any dividends?" nudge rather than a
 * per-security prediction of an actual payout date.
 */

const MONTHLY_DISMISS_PREFIX = 'tiki-monthly-reminder-dismissed:';
const DIVIDEND_DISMISS_PREFIX = 'tiki-dividend-reminder-dismissed:';
const DIVIDEND_REMINDER_INTERVAL_DAYS = 30;

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Shows once `monthlyReminderDay` has passed for the current calendar month,
 * as long as no Buy has been logged yet this month and the user hasn't
 * already dismissed it this month.
 */
export function shouldShowMonthlyReminder(
  monthlyReminder: boolean, monthlyReminderDay: number, transactions: Transaction[], today: Date = new Date(),
): boolean {
  if (!monthlyReminder) return false;
  if (today.getDate() < monthlyReminderDay) return false;

  const key = monthKey(today);
  if (localStorage.getItem(MONTHLY_DISMISS_PREFIX + key) === '1') return false;

  const hasBuyThisMonth = transactions.some((tx) => tx.type === 'buy' && monthKey(new Date(tx.date + 'T00:00:00')) === key);
  return !hasBuyThisMonth;
}

export function dismissMonthlyReminder(today: Date = new Date()): void {
  localStorage.setItem(MONTHLY_DISMISS_PREFIX + monthKey(today), '1');
}

/**
 * Shows if it's been at least DIVIDEND_REMINDER_INTERVAL_DAYS since the last
 * dividend was logged (or since the oldest transaction, if none), and the
 * user hasn't dismissed it within that window.
 */
export function shouldShowDividendReminder(
  dividendReminder: boolean, transactions: Transaction[], today: Date = new Date(),
): boolean {
  if (!dividendReminder) return false;
  if (transactions.length === 0) return false;

  const lastDismissed = localStorage.getItem(DIVIDEND_DISMISS_PREFIX + 'at');
  if (lastDismissed && daysSince(new Date(lastDismissed), today) < DIVIDEND_REMINDER_INTERVAL_DAYS) return false;

  const dividendDates = transactions.filter((tx) => tx.type === 'dividend').map((tx) => tx.date).sort();
  const referenceDate = dividendDates.length > 0
    ? dividendDates[dividendDates.length - 1]
    : [...transactions].map((tx) => tx.date).sort()[0];

  return daysSince(new Date(referenceDate + 'T00:00:00'), today) >= DIVIDEND_REMINDER_INTERVAL_DAYS;
}

export function dismissDividendReminder(today: Date = new Date()): void {
  localStorage.setItem(DIVIDEND_DISMISS_PREFIX + 'at', today.toISOString());
}

function daysSince(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}
