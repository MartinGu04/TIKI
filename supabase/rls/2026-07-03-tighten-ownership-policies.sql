-- ============================================================================
-- TIKI: tighten holdings/transactions INSERT+UPDATE RLS ownership checks
-- Date: 2026-07-03
--
-- Problem: the "insert own holdings", "update own holdings",
-- "insert own transactions", and "update own transactions" policies only
-- check auth.uid() = user_id. They never verify that holdings.portfolio_id,
-- or transactions.holding_id/portfolio_id, actually belong to that same
-- user. An authenticated attacker could insert/update a row that stamps
-- their own user_id while pointing portfolio_id/holding_id at another
-- user's real portfolio/holding.
--
-- Scope: these 4 policies only. SELECT and DELETE policies are untouched.
-- portfolios/profiles/app_settings policies are untouched. No numeric
-- CHECK constraints. No app code changes.
--
-- This file is NOT executed automatically by any tooling in this repo.
-- STATUS: the "PRODUCTION MIGRATION" block below was manually applied to
-- production in the Supabase SQL Editor on 2026-07-03 and is now live.
-- The "ROLLBACK" block below the migration is commented out — uncomment
-- and run it only if you need to revert.
-- ============================================================================


-- ============================================================================
-- PRODUCTION MIGRATION — run this block to apply the fix
-- ============================================================================

begin;

-- 1. holdings — INSERT: caller's user_id must match, AND portfolio_id must
--    be a portfolio that caller owns.
alter policy "insert own holdings" on public.holdings
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.portfolios p
      where p.id = holdings.portfolio_id
        and p.user_id = auth.uid()
    )
  );

-- 2. holdings — UPDATE: existing row must already be caller's (USING,
--    unchanged); resulting row's user_id + portfolio_id must both check
--    out (WITH CHECK, new).
alter policy "update own holdings" on public.holdings
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.portfolios p
      where p.id = holdings.portfolio_id
        and p.user_id = auth.uid()
    )
  );

-- 3. transactions — INSERT: caller's user_id must match, AND holding_id
--    must be a holding the caller owns, AND that holding's own
--    portfolio_id must equal the transaction's portfolio_id (internal
--    consistency, not just ownership).
alter policy "insert own transactions" on public.transactions
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.holdings h
      where h.id = transactions.holding_id
        and h.user_id = auth.uid()
        and h.portfolio_id = transactions.portfolio_id
    )
  );

-- 4. transactions — UPDATE: same USING/WITH CHECK split as holdings above.
alter policy "update own transactions" on public.transactions
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.holdings h
      where h.id = transactions.holding_id
        and h.user_id = auth.uid()
        and h.portfolio_id = transactions.portfolio_id
    )
  );

commit;


-- ============================================================================
-- ROLLBACK — restores the four policies to their pre-2026-07-03 state
-- (auth.uid() = user_id only). Commented out on purpose: this file is not
-- meant to apply-then-immediately-revert if run top to bottom. To roll
-- back, copy the block below into the SQL Editor with the leading "-- "
-- stripped from each line, or select and run just that block.
-- ============================================================================

-- begin;
--
-- alter policy "insert own holdings" on public.holdings
--   with check (auth.uid() = user_id);
--
-- alter policy "update own holdings" on public.holdings
--   using (auth.uid() = user_id)
--   with check (auth.uid() = user_id);
--
-- alter policy "insert own transactions" on public.transactions
--   with check (auth.uid() = user_id);
--
-- alter policy "update own transactions" on public.transactions
--   using (auth.uid() = user_id)
--   with check (auth.uid() = user_id);
--
-- commit;
