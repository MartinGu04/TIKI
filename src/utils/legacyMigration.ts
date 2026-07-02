import { supabase } from '../lib/supabase';

const MIGRATED_FLAG_PREFIX = 'tiki-legacy-migrated:';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface LegacyInvestmentRow { [key: string]: any }

/**
 * One-time, per-user migration of the legacy flat `investments` table into
 * the new `holdings` + `transactions` model. For each legacy row, creates a
 * `holdings` row plus one synthetic `buy` transaction dated at the row's
 * original `created_at` (fallback: today), carrying over quantity/average
 * price as-is. Owner and recurrence data are intentionally dropped — nothing
 * in the new model reads them. Old `investments` rows are left untouched.
 *
 * Gated by a localStorage flag so it only ever runs once per user per browser.
 */
export async function migrateLegacyInvestments(userId: string, portfolioId: string): Promise<void> {
  if (!supabase) return;
  const flagKey = MIGRATED_FLAG_PREFIX + userId;
  if (localStorage.getItem(flagKey)) return;

  const { data: legacyRows, error } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    // Table may not exist for brand-new projects — nothing to migrate either way.
    localStorage.setItem(flagKey, '1');
    return;
  }
  if (!legacyRows || legacyRows.length === 0) {
    localStorage.setItem(flagKey, '1');
    return;
  }

  for (const row of legacyRows as LegacyInvestmentRow[]) {
    const { data: holding, error: holdingError } = await supabase
      .from('holdings')
      .insert({
        portfolio_id: portfolioId,
        user_id: userId,
        ticker: row.ticker,
        symbol: row.symbol,
        name: row.name,
        currency: row.currency,
        color: row.color,
        current_price: row.current_price,
        last_price_update: row.last_price_update,
      })
      .select()
      .single();
    if (holdingError || !holding) continue;

    const date = row.created_at ? String(row.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10);
    const quantity = row.quantity ?? 0;
    const price = row.average_price ?? 0;

    await supabase.from('transactions').insert({
      holding_id: holding.id,
      portfolio_id: portfolioId,
      user_id: userId,
      type: 'buy',
      date,
      quantity,
      price,
      amount: quantity * price,
      note: 'Migrated from legacy holding',
    });

    await supabase
      .from('holdings')
      .update({ quantity, avg_cost: price, realized_pnl: 0 })
      .eq('id', holding.id);
  }

  localStorage.setItem(flagKey, '1');
}
