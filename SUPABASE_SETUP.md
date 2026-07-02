# Supabase Setup

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

Open the **SQL Editor** in your Supabase project and run:

```sql
-- Profiles (auto-created on first sign-in via trigger)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Auto-create profile on new user
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

-- Investments
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

-- App settings (one row per user)
create table public.app_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  language text default 'he',
  theme text default 'dark',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.profiles    enable row level security;
alter table public.investments enable row level security;
alter table public.app_settings enable row level security;

-- profiles
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- investments
create policy "Users can select own investments"
  on public.investments for select using (auth.uid() = user_id);
create policy "Users can insert own investments"
  on public.investments for insert with check (auth.uid() = user_id);
create policy "Users can update own investments"
  on public.investments for update using (auth.uid() = user_id);
create policy "Users can delete own investments"
  on public.investments for delete using (auth.uid() = user_id);

-- app_settings
create policy "Users can select own settings"
  on public.app_settings for select using (auth.uid() = user_id);
create policy "Users can upsert own settings"
  on public.app_settings for insert with check (auth.uid() = user_id);
create policy "Users can update own settings"
  on public.app_settings for update using (auth.uid() = user_id);
```

## 5. Verify

After running the SQL, open the Table Editor and confirm the three tables exist with RLS enabled (indicated by a shield icon).

## 6. Migration: recurring investment tracking (required if your project predates this)

If your `investments` table was created before the `recurrence_last_processed`
column existed, run this in the SQL Editor before deploying — otherwise every
save/update of an investment will fail with a "column not found" error:

```sql
alter table public.investments
  add column if not exists recurrence_last_processed text;
```

## 7. Migration: profiles insert policy (required if your project predates this)

The client calls `profiles.upsert(...)` as a defensive fallback in case the
`handle_new_user` trigger doesn't fire (e.g. it was added after your project,
or failed silently). Without an INSERT policy, that upsert gets rejected
with a 403 whenever the row doesn't already exist. Run this once:

```sql
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);
```

## 8. TIKI v1: portfolios, holdings & transactions (2026-07-02)

TIKI v1 replaces the flat `investments` table with a proper transaction ledger:
one default `portfolio` per user, `holdings` (a cached, recomputed-on-every-write
position per ticker), and `transactions` (buy/sell/dividend — the source of
truth). Run this once in the SQL Editor. The old `investments` table and its
`owner`/`recurrence_*`/`monthly_contribution` columns are left in place,
unused, as a rollback safety net — do not drop them here.

```sql
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

alter table public.app_settings
  add column if not exists dividend_reminder boolean not null default false,
  add column if not exists monthly_reminder boolean not null default false,
  add column if not exists monthly_reminder_day integer default 1;

alter table public.portfolios   enable row level security;
alter table public.holdings     enable row level security;
alter table public.transactions enable row level security;

create policy "select own portfolios" on public.portfolios for select using (auth.uid() = user_id);
create policy "insert own portfolios" on public.portfolios for insert with check (auth.uid() = user_id);
create policy "update own portfolios" on public.portfolios for update using (auth.uid() = user_id);
create policy "delete own portfolios" on public.portfolios for delete using (auth.uid() = user_id);

create policy "select own holdings" on public.holdings for select using (auth.uid() = user_id);
create policy "insert own holdings" on public.holdings for insert with check (auth.uid() = user_id);
create policy "update own holdings" on public.holdings for update using (auth.uid() = user_id);
create policy "delete own holdings" on public.holdings for delete using (auth.uid() = user_id);

create policy "select own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "insert own transactions" on public.transactions for insert with check (auth.uid() = user_id);
create policy "update own transactions" on public.transactions for update using (auth.uid() = user_id);
create policy "delete own transactions" on public.transactions for delete using (auth.uid() = user_id);

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
```

### Verify

Open the Table Editor and confirm `portfolios`, `holdings`, and `transactions`
exist with RLS enabled (shield icon). Sign in once with a fresh account and
confirm a `portfolios` row was auto-created for it.

### One-time legacy data migration

Existing `investments` rows are migrated client-side, automatically, the first
time each signed-in user opens the app after this ships — see
`src/utils/legacyMigration.ts`. No SQL step is required for this; it runs
per-user on login and is idempotent (gated by a local flag so it never
reruns). Each legacy `investments` row becomes one `holdings` row plus one
synthetic `buy` transaction dated at the row's original `created_at`.
