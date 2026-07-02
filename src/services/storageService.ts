import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Holding, Portfolio, Transaction } from '../types';
import { computeHoldingPosition } from '../utils/portfolioEngine';

// Thrown when Supabase is unreachable (network down / DNS failure).
// Callers catch this to show a friendly offline notice without console noise.
export class CloudUnavailableError extends Error {
  constructor() { super('cloud-unavailable'); this.name = 'CloudUnavailableError'; }
}

// Thrown when a sell would take a holding's quantity negative. Enforced here
// (the data layer) in addition to the client-side pre-check in
// portfolioEngine.validateSell — the UI check is for immediate feedback, this
// is the real guarantee, since it re-derives the position from the database's
// current transaction history right before the write, not from whatever
// (possibly stale) holding snapshot the UI happened to have in memory.
export class InsufficientSharesError extends Error {
  constructor() { super('insufficient-shares'); this.name = 'InsufficientSharesError'; }
}

// Thrown before any Supabase call when a required id (portfolioId, userId,
// holdingId) is missing or empty — every uuid column write must be blocked
// client-side rather than sent as an empty string, which Postgres rejects
// with an unhelpful "invalid input syntax for type uuid" error after the
// fact. Logs which field was missing so the caller's bug is traceable.
export class InvalidRequestError extends Error {
  constructor(message: string) { super(message); this.name = 'InvalidRequestError'; }
}

function requireId(value: string | undefined | null, fieldName: string, context: string): string {
  if (!value) {
    const message = `${context}: ${fieldName} is required but was missing/empty`;
    console.error(message);
    throw new InvalidRequestError(message);
  }
  return value;
}

// Postgres unique_violation (code 23505). Used to recover from races where
// two concurrent calls both see "no row yet" and both attempt to insert the
// singleton row — e.g. React StrictMode's intentional double-invoke of
// effects in dev, or a fast reload/second tab in production.
function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  const msg = (err as { message?: string })?.message ?? '';
  return code === '23505' || msg.includes('duplicate key value violates unique constraint');
}

function isNetworkError(err: unknown): boolean {
  const msg = (err as { message?: string })?.message ?? String(err ?? '');
  return (
    msg === 'Failed to fetch' ||
    msg.includes('NetworkError') ||
    msg.includes('network error') ||
    msg.includes('ERR_INTERNET') ||
    msg.includes('ERR_NAME_NOT_RESOLVED')
  );
}

// Throws CloudUnavailableError for network failures; logs everything else.
function handleError(err: unknown, context: string): never {
  if (isNetworkError(err)) throw new CloudUnavailableError();
  console.error(context, err);
  throw err;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppSettings {
  language: 'he' | 'en';
  theme: 'dark' | 'light' | 'mamish';
  dividendReminder: boolean;
  monthlyReminder: boolean;
  monthlyReminderDay: number;
}

// ─── Mappers (domain ↔ Supabase row) ──────────────────────────────────────────

function portfolioToRow(p: Portfolio) {
  return { id: p.id, user_id: p.userId, name: p.name, is_default: p.isDefault };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToPortfolio(row: any): Portfolio {
  return { id: row.id, userId: row.user_id, name: row.name, isDefault: row.is_default };
}

function holdingToRow(h: Holding, portfolioId: string, userId: string) {
  return {
    id: h.id,
    portfolio_id: portfolioId,
    user_id: userId,
    ticker: h.ticker,
    symbol: h.symbol,
    name: h.name,
    currency: h.currency,
    color: h.color,
    current_price: h.currentPrice,
    last_price_update: h.lastPriceUpdate ? new Date(h.lastPriceUpdate).toISOString() : null,
    quantity: h.quantity,
    avg_cost: h.avgCost,
    realized_pnl: h.realizedPnL,
    updated_at: new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToHolding(row: any): Holding {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    ticker: row.ticker,
    symbol: row.symbol,
    name: row.name,
    currency: row.currency,
    color: row.color,
    currentPrice: row.current_price,
    lastPriceUpdate: row.last_price_update ? new Date(row.last_price_update).getTime() : undefined,
    quantity: row.quantity,
    avgCost: row.avg_cost,
    realizedPnL: row.realized_pnl,
  };
}

function transactionToRow(tx: Transaction, portfolioId: string, userId: string) {
  return {
    id: tx.id,
    holding_id: tx.holdingId,
    portfolio_id: portfolioId,
    user_id: userId,
    type: tx.type,
    date: tx.date,
    quantity: tx.quantity,
    price: tx.price,
    amount: tx.amount,
    note: tx.note ?? null,
    metadata: tx.metadata ?? {},
    updated_at: new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTransaction(row: any): Transaction {
  return {
    id: row.id,
    holdingId: row.holding_id,
    type: row.type,
    date: row.date,
    createdAt: row.created_at ?? undefined,
    quantity: row.quantity,
    price: row.price,
    amount: row.amount,
    note: row.note ?? undefined,
    metadata: row.metadata ?? {},
  };
}

// ─── Supabase implementation ──────────────────────────────────────────────────

export const supabaseStorageService = {
  // Idempotent upsert — guarantees the profile row exists before any
  // portfolio/holding/transaction writes, defensive against DB trigger failures.
  async ensureProfile(user: User): Promise<void> {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email ?? null,
        name: (user.user_metadata?.full_name as string | undefined) ?? null,
        avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
      }, { onConflict: 'id' });
      if (error && !isNetworkError(error)) console.error('ensureProfile:', error);
    } catch (e) {
      // Non-fatal: if this fails the rest of the login flow continues.
      if (!isNetworkError(e)) console.error('ensureProfile:', e);
    }
  },

  // Loads the user's default portfolio, defensively creating one if the
  // handle_new_user_portfolio trigger didn't fire (mirrors ensureProfile's
  // upsert-as-fallback pattern). Idempotent under races (e.g. React
  // StrictMode's double-invoked effects, a second tab, a fast reload): if
  // two callers both see no row and both try to insert, the second insert's
  // unique-constraint conflict is treated as "someone else just created it",
  // and that row is loaded and returned instead of failing.
  async loadPortfolio(userId: string): Promise<Portfolio> {
    if (!supabase) throw new CloudUnavailableError();
    try {
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .maybeSingle();
      if (error) handleError(error, 'loadPortfolio');
      if (data) return rowToPortfolio(data);

      const { data: created, error: createError } = await supabase
        .from('portfolios')
        .insert({ user_id: userId, name: 'My Portfolio', is_default: true })
        .select()
        .single();
      if (createError) {
        if (isUniqueViolation(createError)) {
          const { data: existing, error: reloadError } = await supabase
            .from('portfolios')
            .select('*')
            .eq('user_id', userId)
            .eq('is_default', true)
            .single();
          if (reloadError) handleError(reloadError, 'loadPortfolio:reload');
          return rowToPortfolio(existing);
        }
        handleError(createError, 'loadPortfolio:create');
      }
      return rowToPortfolio(created);
    } catch (e) {
      if (e instanceof CloudUnavailableError) throw e;
      handleError(e, 'loadPortfolio');
    }
  },

  async loadHoldings(portfolioId: string): Promise<Holding[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('holdings')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('created_at', { ascending: true });
      if (error) handleError(error, 'loadHoldings');
      return (data ?? []).map(rowToHolding);
    } catch (e) {
      if (e instanceof CloudUnavailableError) throw e;
      handleError(e, 'loadHoldings');
    }
  },

  async loadTransactions(portfolioId: string): Promise<Transaction[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('date', { ascending: true });
      if (error) handleError(error, 'loadTransactions');
      return (data ?? []).map(rowToTransaction);
    } catch (e) {
      if (e instanceof CloudUnavailableError) throw e;
      handleError(e, 'loadTransactions');
    }
  },

  // Creates the holding row first if `newHolding` is provided (a Buy on a
  // ticker not yet held), inserts the transaction, then recomputes and
  // persists that holding's cached quantity/avg_cost/realized_pnl from its
  // full transaction history. Returns the saved transaction and the holding
  // (created or updated) so callers can update local state without a refetch.
  async saveTransaction(
    tx: Omit<Transaction, 'id' | 'holdingId'> & { holdingId?: string },
    portfolioId: string,
    userId: string,
    newHolding?: Omit<Holding, 'id' | 'portfolioId' | 'quantity' | 'avgCost' | 'realizedPnL'>,
  ): Promise<{ transaction: Transaction; holding: Holding }> {
    if (!supabase) throw new CloudUnavailableError();
    requireId(portfolioId, 'portfolioId', 'saveTransaction');
    requireId(userId, 'userId', 'saveTransaction');
    try {
      let holdingId = tx.holdingId;
      if (!holdingId && newHolding) {
        // `id` is intentionally omitted from this insert (not set to '') so
        // Postgres's `gen_random_uuid() default` fills it in — sending an
        // empty string for a uuid column is rejected by Postgres, not
        // silently defaulted.
        const { id: _omitId, ...holdingRow } = holdingToRow(
          { ...newHolding, id: '', portfolioId, quantity: 0, avgCost: 0, realizedPnL: 0 },
          portfolioId, userId,
        );
        void _omitId;
        const { data: createdHolding, error: holdingError } = await supabase
          .from('holdings')
          .insert(holdingRow)
          .select()
          .single();
        if (holdingError) handleError(holdingError, 'saveTransaction:createHolding');
        holdingId = createdHolding.id;
      }
      // Sell/Dividend must target an existing holding; Buy on a brand-new
      // ticker must supply `newHolding` (handled above). Neither present here
      // means the caller has a bug — block before any further Supabase call.
      holdingId = requireId(holdingId, 'holdingId', `saveTransaction:${tx.type}`);

      if (tx.type === 'sell') {
        const { data: existingTxRows, error: existingTxError } = await supabase
          .from('transactions').select('*').eq('holding_id', holdingId);
        if (existingTxError) handleError(existingTxError, 'saveTransaction:checkSell');
        const position = computeHoldingPosition((existingTxRows ?? []).map(rowToTransaction));
        if ((tx.quantity ?? 0) > position.quantity) throw new InsufficientSharesError();
      }

      // Same as above — omit `id` so the insert gets a real generated uuid.
      const { id: _omitTxId, ...txRowPayload } = transactionToRow({ ...tx, id: '', holdingId } as Transaction, portfolioId, userId);
      void _omitTxId;
      const { data: txRow, error: txError } = await supabase
        .from('transactions')
        .insert(txRowPayload)
        .select()
        .single();
      if (txError) handleError(txError, 'saveTransaction:insert');

      const holding = await supabaseStorageService.recomputeHolding(holdingId, portfolioId, userId);
      return { transaction: rowToTransaction(txRow), holding };
    } catch (e) {
      if (e instanceof CloudUnavailableError || e instanceof InsufficientSharesError || e instanceof InvalidRequestError) throw e;
      handleError(e, 'saveTransaction');
    }
  },

  async updateTransaction(tx: Transaction, portfolioId: string, userId: string): Promise<Holding> {
    if (!supabase) throw new CloudUnavailableError();
    requireId(portfolioId, 'portfolioId', 'updateTransaction');
    requireId(userId, 'userId', 'updateTransaction');
    requireId(tx.id, 'transaction.id', 'updateTransaction');
    requireId(tx.holdingId, 'transaction.holdingId', 'updateTransaction');
    try {
      if (tx.type === 'sell') {
        const { data: otherTxRows, error: otherTxError } = await supabase
          .from('transactions').select('*').eq('holding_id', tx.holdingId).neq('id', tx.id);
        if (otherTxError) handleError(otherTxError, 'updateTransaction:checkSell');
        const position = computeHoldingPosition((otherTxRows ?? []).map(rowToTransaction));
        if ((tx.quantity ?? 0) > position.quantity) throw new InsufficientSharesError();
      }

      const { error } = await supabase
        .from('transactions')
        .update(transactionToRow(tx, portfolioId, userId))
        .eq('id', tx.id)
        .eq('user_id', userId);
      if (error) handleError(error, 'updateTransaction');
      return await supabaseStorageService.recomputeHolding(tx.holdingId, portfolioId, userId);
    } catch (e) {
      if (e instanceof CloudUnavailableError || e instanceof InsufficientSharesError || e instanceof InvalidRequestError) throw e;
      handleError(e, 'updateTransaction');
    }
  },

  async deleteTransaction(id: string, holdingId: string, portfolioId: string, userId: string): Promise<Holding> {
    if (!supabase) throw new CloudUnavailableError();
    requireId(id, 'id', 'deleteTransaction');
    requireId(holdingId, 'holdingId', 'deleteTransaction');
    requireId(portfolioId, 'portfolioId', 'deleteTransaction');
    requireId(userId, 'userId', 'deleteTransaction');
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) handleError(error, 'deleteTransaction');
      return await supabaseStorageService.recomputeHolding(holdingId, portfolioId, userId);
    } catch (e) {
      if (e instanceof CloudUnavailableError || e instanceof InvalidRequestError) throw e;
      handleError(e, 'deleteTransaction');
    }
  },

  // Recomputes a holding's cached quantity/avg_cost/realized_pnl from its
  // full remaining transaction list and persists the result. Average-cost
  // recompute is not incrementally-undo-safe, so edits/deletes always
  // recompute from scratch rather than adjusting the cache in place.
  async recomputeHolding(holdingId: string, portfolioId: string, userId: string): Promise<Holding> {
    if (!supabase) throw new CloudUnavailableError();
    requireId(holdingId, 'holdingId', 'recomputeHolding');
    requireId(portfolioId, 'portfolioId', 'recomputeHolding');
    requireId(userId, 'userId', 'recomputeHolding');
    const { data: holdingRow, error: holdingError } = await supabase
      .from('holdings').select('*').eq('id', holdingId).single();
    if (holdingError) handleError(holdingError, 'recomputeHolding:load');

    const { data: txRows, error: txError } = await supabase
      .from('transactions').select('*').eq('holding_id', holdingId);
    if (txError) handleError(txError, 'recomputeHolding:loadTx');

    const position = computeHoldingPosition((txRows ?? []).map(rowToTransaction));
    const holding = rowToHolding(holdingRow);
    const updated: Holding = { ...holding, ...position };

    const { error: updateError } = await supabase
      .from('holdings')
      .update({
        quantity: position.quantity,
        avg_cost: position.avgCost,
        realized_pnl: position.realizedPnL,
        updated_at: new Date().toISOString(),
      })
      .eq('id', holdingId)
      .eq('user_id', userId);
    if (updateError) handleError(updateError, 'recomputeHolding:update');

    return updated;
  },

  async updateHoldingPrice(id: string, currentPrice: number, userId: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase
      .from('holdings')
      .update({ current_price: currentPrice, last_price_update: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);
    if (error && !isNetworkError(error)) console.error('updateHoldingPrice:', error);
  },

  async deleteHolding(id: string, userId: string): Promise<void> {
    if (!supabase) return;
    requireId(id, 'id', 'deleteHolding');
    requireId(userId, 'userId', 'deleteHolding');
    try {
      // DB cascades the holding's transactions; nothing else to clean up here.
      const { error } = await supabase
        .from('holdings')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) handleError(error, 'deleteHolding');
    } catch (e) {
      if (e instanceof CloudUnavailableError || e instanceof InvalidRequestError) throw e;
      handleError(e, 'deleteHolding');
    }
  },

  // Bulk-inserts imported holdings/transactions (each gets a fresh Supabase
  // UUID — imported ids are never reused). `replace` first clears every
  // existing holding for the portfolio (cascade-deletes their transactions);
  // `merge` inserts alongside what's already there. Rows that fail to insert
  // (e.g. a ticker collision on merge) are silently skipped rather than
  // aborting the whole import — acceptable for a best-effort v1 import path.
  async importHoldingsAndTransactions(
    portfolioId: string, userId: string,
    holdings: Holding[], transactions: Transaction[], mode: 'merge' | 'replace',
  ): Promise<{ holdings: Holding[]; transactions: Transaction[] }> {
    if (!supabase) throw new CloudUnavailableError();

    if (mode === 'replace') {
      const { error } = await supabase.from('holdings').delete().eq('portfolio_id', portfolioId).eq('user_id', userId);
      if (error) handleError(error, 'importHoldingsAndTransactions:clear');
    }

    const idMap = new Map<string, string>();
    const insertedHoldingIds: string[] = [];
    for (const h of holdings) {
      const { data, error } = await supabase.from('holdings').insert({
        portfolio_id: portfolioId, user_id: userId, ticker: h.ticker, symbol: h.symbol, name: h.name,
        currency: h.currency, color: h.color, current_price: h.currentPrice, quantity: 0, avg_cost: 0, realized_pnl: 0,
      }).select().single();
      if (error || !data) continue;
      idMap.set(h.id, data.id);
      insertedHoldingIds.push(data.id);
    }

    for (const tx of transactions) {
      const newHoldingId = idMap.get(tx.holdingId);
      if (!newHoldingId) continue;
      await supabase.from('transactions').insert({
        holding_id: newHoldingId, portfolio_id: portfolioId, user_id: userId, type: tx.type, date: tx.date,
        quantity: tx.quantity, price: tx.price, amount: tx.amount, note: tx.note ?? null, metadata: tx.metadata ?? {},
      });
    }

    const finalHoldings: Holding[] = [];
    for (const id of insertedHoldingIds) {
      finalHoldings.push(await supabaseStorageService.recomputeHolding(id, portfolioId, userId));
    }
    const finalTransactions = await supabaseStorageService.loadTransactions(portfolioId);

    return { holdings: finalHoldings, transactions: finalTransactions };
  },

  async loadSettings(userId: string): Promise<AppSettings | null> {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('app_settings')
      .select('language, theme, dividend_reminder, monthly_reminder, monthly_reminder_day')
      .eq('user_id', userId)
      .single();
    if (error || !data) return null;
    return {
      language: data.language,
      theme: data.theme,
      dividendReminder: data.dividend_reminder ?? false,
      monthlyReminder: data.monthly_reminder ?? false,
      monthlyReminderDay: data.monthly_reminder_day ?? 1,
    };
  },

  async saveSettings(userId: string, settings: Partial<AppSettings>): Promise<void> {
    if (!supabase) return;
    const row: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
    if (settings.language !== undefined) row.language = settings.language;
    if (settings.theme !== undefined) row.theme = settings.theme;
    if (settings.dividendReminder !== undefined) row.dividend_reminder = settings.dividendReminder;
    if (settings.monthlyReminder !== undefined) row.monthly_reminder = settings.monthlyReminder;
    if (settings.monthlyReminderDay !== undefined) row.monthly_reminder_day = settings.monthlyReminderDay;
    // `app_settings`'s primary key is `id` (a fresh UUID per row), with a
    // separate unique constraint on `user_id` — upsert() conflict-resolves on
    // the primary key by default, and this payload never includes `id`, so
    // without an explicit onConflict it always attempted an INSERT and
    // collided with the user_id unique constraint on the second save.
    const { error } = await supabase.from('app_settings').upsert(row, { onConflict: 'user_id' });
    if (error) handleError(error, 'saveSettings');
  },
};
