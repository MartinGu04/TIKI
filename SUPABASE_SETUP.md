# Supabase Setup

This guide sets up the **current TIKI v1 data model**: `portfolios`,
`holdings`, and `transactions` (a transaction ledger with buy/sell/dividend
entries, average-cost P&L). If you're setting up a new project, follow
steps 1–5 below and stop — you're done.

The old flat `investments` table (one row per holding, no transaction
history) predates v1 and is **not used by the app anymore**. If you're
upgrading an existing pre-v1 project, see
[**Legacy migrations**](#legacy-migrations-only-relevant-if-your-project-predates-tiki-v1)
at the bottom of this document.

## 1. Create a project

Go to https://supabase.com and create a new project. Note the **Project URL** and **anon key** from Settings → API.

## 2. Environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## 3. Enable Google OAuth

1. Go to your Supabase project → Authentication → Providers → Google
2. Enable the Google provider
3. In [Google Cloud Console](https://console.cloud.google.com/):
   - Create a new OAuth 2.0 Client (Web application)
   - Add Authorised JavaScript origins: `http://localhost:5173` (dev) + your production URL
   - Add Authorised redirect URI: `https://xxxx.supabase.co/auth/v1/callback`
4. Paste the Client ID and Client Secret into Supabase

## 4. Run the schema

Open the **SQL Editor** in your Supabase project and run this once. It creates
everything TIKI v1 needs — no `investments` table involved.

```sql
-- ── profiles (auto-created on first sign-in via trigger) ───────────────────────

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  name text,
  avatar_url text,
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── portfolios (one default portfolio per user; schema supports more later) ────

create table public.portfolios (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null default 'My Portfolio',
  is_default boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create unique index one_default_portfolio_per_user
  on public.portfolios(user_id) where is_default;

-- Auto-create one default portfolio per new user, same pattern as handle_new_user.
create or replace function public.handle_new_user_portfolio()
returns trigger language plpgsql security definer as $$
begin
  insert into public.portfolios (user_id, name, is_default) values (new.id, 'My Portfolio', true);
  return new;
end;
$$;

create trigger on_profile_created_portfolio
  after insert on public.profiles
  for each row execute procedure public.handle_new_user_portfolio();

-- ── holdings (a cached, recomputed-on-every-write position per ticker) ─────────

create table public.holdings (
  id uuid default gen_random_uuid() primary key,
  portfolio_id uuid references public.portfolios(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  ticker text not null,
  symbol text not null,
  name text not null,
  currency text not null default 'USD',
  color text not null default '#6366f1',
  current_price numeric not null default 0,
  last_price_update timestamptz,
  quantity numeric not null default 0,     -- cached, derived from transactions
  avg_cost numeric not null default 0,     -- cached, derived from transactions
  realized_pnl numeric not null default 0, -- cached, derived from transactions
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (portfolio_id, symbol)
);

-- ── transactions (buy/sell/dividend — the source of truth) ─────────────────────

-- `type` is plain text + CHECK (not a Postgres enum) and `metadata` is a free
-- jsonb bag specifically so future transaction types (Stock Split, Cash
-- Deposit, Fee, Interest, Transfer) can be added later without a schema
-- redesign — just a new CHECK value and, if needed, new metadata keys.
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  holding_id uuid references public.holdings(id) on delete cascade not null,
  portfolio_id uuid references public.portfolios(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('buy','sell','dividend')),
  date date not null,
  quantity numeric,    -- null for dividend
  price numeric,       -- null for dividend
  amount numeric not null, -- buy/sell: quantity*price; dividend: cash amount
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index transactions_holding_idx on public.transactions(holding_id, date);
create index transactions_portfolio_idx on public.transactions(portfolio_id, date desc);

-- ── app_settings (one row per user) ─────────────────────────────────────────────

create table public.app_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  language text default 'he',
  theme text default 'dark',
  dividend_reminder boolean not null default false,
  monthly_reminder boolean not null default false,
  monthly_reminder_day integer default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.profiles     enable row level security;
alter table public.portfolios   enable row level security;
alter table public.holdings     enable row level security;
alter table public.transactions enable row level security;
alter table public.app_settings enable row level security;

-- profiles
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- portfolios
create policy "select own portfolios" on public.portfolios for select using (auth.uid() = user_id);
create policy "insert own portfolios" on public.portfolios for insert with check (auth.uid() = user_id);
create policy "update own portfolios" on public.portfolios for update using (auth.uid() = user_id);
create policy "delete own portfolios" on public.portfolios for delete using (auth.uid() = user_id);

-- holdings
-- insert/update also verify portfolio_id belongs to the caller, not just user_id,
-- so a row can't be planted against another user's portfolio.
create policy "select own holdings" on public.holdings for select using (auth.uid() = user_id);
create policy "insert own holdings" on public.holdings for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.portfolios p
      where p.id = holdings.portfolio_id
        and p.user_id = auth.uid()
    )
  );
create policy "update own holdings" on public.holdings for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.portfolios p
      where p.id = holdings.portfolio_id
        and p.user_id = auth.uid()
    )
  );
create policy "delete own holdings" on public.holdings for delete using (auth.uid() = user_id);

-- transactions
-- insert/update also verify holding_id belongs to the caller and that the
-- holding's own portfolio_id matches the transaction's portfolio_id.
create policy "select own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "insert own transactions" on public.transactions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.holdings h
      where h.id = transactions.holding_id
        and h.user_id = auth.uid()
        and h.portfolio_id = transactions.portfolio_id
    )
  );
create policy "update own transactions" on public.transactions for update
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
create policy "delete own transactions" on public.transactions for delete using (auth.uid() = user_id);

-- app_settings
create policy "Users can select own settings"
  on public.app_settings for select using (auth.uid() = user_id);
create policy "Users can upsert own settings"
  on public.app_settings for insert with check (auth.uid() = user_id);
create policy "Users can update own settings"
  on public.app_settings for update using (auth.uid() = user_id);
```

## 5. Verify

Open the **Table Editor** and confirm `profiles`, `portfolios`, `holdings`,
`transactions`, and `app_settings` all exist with RLS enabled (shield icon).
Sign in once with a fresh account and confirm a `profiles` row and a default
`portfolios` row were both auto-created for it.

That's the full setup for a new project — nothing below this point applies to you.

---

## Legacy migrations (only relevant if your project predates TIKI v1)

**Skip this whole section for a new project.** It exists only for Supabase
projects that were created before the v1 transaction-ledger rewrite and
still have data in the old flat `investments` table.

`investments` is **not part of the current data model**. It is not read,
written, or referenced anywhere in the app anymore — the client only talks
to `portfolios`, `holdings`, `transactions`, `profiles`, and `app_settings`
(see §4 above). The sections below are historical reference and rollback
notes for upgrading an existing project, not setup instructions.

### A. Old `investments` schema (historical reference — do not run on a new project)

This is the table TIKI used before v1. If your project already has it, leave
it in place — it's an inert rollback safety net, not something to drop or
maintain going forward.

```sql
create table public.investments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  ticker text not null,
  symbol text not null,
  name text not null,
  owner text not null default 'me',
  currency text not null default 'USD',
  quantity numeric not null default 0,
  average_price numeric not null default 0,
  current_price numeric not null default 0,
  monthly_contribution numeric default 0,
  recurrence_type text not null default 'one-time',
  recurrence_day integer,
  recurrence_weekday integer,
  recurrence_every_x integer,
  recurrence_start_date text,
  recurrence_last_processed text,
  color text not null default '#6366f1',
  last_price_update timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.investments enable row level security;

create policy "Users can select own investments"
  on public.investments for select using (auth.uid() = user_id);
create policy "Users can insert own investments"
  on public.investments for insert with check (auth.uid() = user_id);
create policy "Users can update own investments"
  on public.investments for update using (auth.uid() = user_id);
create policy "Users can delete own investments"
  on public.investments for delete using (auth.uid() = user_id);
```

### B. Migration: recurring investment tracking column

Only relevant if your `investments` table predates the `recurrence_last_processed`
column and you're still running pre-v1 app code against it. Not applicable once
you're on v1, since v1 never reads or writes `investments` at all.

```sql
alter table public.investments
  add column if not exists recurrence_last_processed text;
```

### C. Migration: profiles insert policy

Only relevant if your `profiles` table predates the INSERT policy added
above in §4. The client calls `profiles.upsert(...)` as a defensive fallback
in case the `handle_new_user` trigger doesn't fire (e.g. it was added after
your project, or failed silently). Without an INSERT policy, that upsert gets
rejected with a 403 whenever the row doesn't already exist.

```sql
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);
```

### D. Migration: reminder columns on `app_settings`

Only relevant if you already ran an earlier version of the v1 schema (§4)
that created `portfolios`/`holdings`/`transactions` but predates the
`dividend_reminder`/`monthly_reminder`/`monthly_reminder_day` columns being
folded into the base `app_settings` table above.

```sql
alter table public.app_settings
  add column if not exists dividend_reminder boolean not null default false,
  add column if not exists monthly_reminder boolean not null default false,
  add column if not exists monthly_reminder_day integer default 1;
```

### E. One-time legacy data migration (automatic, no SQL required)

Existing `investments` rows are migrated client-side, automatically, the
first time each signed-in user opens the v1 app — see
`src/utils/legacyMigration.ts`. It runs per-user on login and is idempotent
(gated by a local flag so it never reruns). Each legacy `investments` row
becomes one `holdings` row plus one synthetic `buy` transaction dated at the
row's original `created_at`.
