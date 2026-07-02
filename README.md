# TIKI — Personal Investment Dashboard

A clean, bilingual (Hebrew/English) investment portfolio tracker built for couples and individuals who want a calm, focused overview of their assets — without the noise of a full brokerage platform.

---

## Current Development Status

**Status: v1.0.0 — stable.** TIKI has completed its v1 milestone: a full rewrite
from a single-holding snapshot tracker into a proper transaction-ledger
portfolio app (buy/sell/dividend entries, average-cost P&L, live prices,
CSV/JSON import-export, bilingual RTL/LTR UI). See
**[CHANGELOG.md](./CHANGELOG.md)** for the complete v1.0.0 summary and
everything planned next.

This project follows [Semantic Versioning](https://semver.org/) — breaking
changes bump the major version, new backwards-compatible features bump the
minor version, and fixes bump the patch version.

---

## Features

- **Transaction ledger** — buy, sell, and dividend entries with average-cost
  basis and realized/unrealized P&L (not a lot-tracking system)
- **Portfolio overview** — current value, unrealized P&L, ROI, live price
  freshness and manual refresh
- **Multi-currency** — USD, ILS, EUR, GBP, and more per holding; mixed
  portfolios show per-currency breakdowns, never a fake combined total
- **Projection chart** — compound-growth simulator with adjustable annual
  return and time horizon
- **CSV / JSON import-export** — of holdings and transaction history
- **Google authentication (required)** — sign in with Google via Supabase;
  data syncs across devices under your account. There is no offline/no-account
  mode in v1
- **Legacy data migration** — early users' single-holding data is migrated
  into the transaction ledger automatically on first sign-in
- **Reminders** — opt-in dividend and monthly-contribution banners
- **Hebrew + English** — full RTL/LTR switching; locale-aware date and number
  formatting
- **Three themes** — dark (default), light, and a secret Mamish mode (5 rapid
  taps on the theme button)
- **PWA-ready** — installable, favicon, web manifest

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS v3 + CSS custom properties |
| Charts | Recharts |
| Icons | Lucide React |
| Auth + DB | Supabase (Google OAuth + Postgres + RLS) |
| Hosting | Vercel (recommended) |

---

## Local Development

### Prerequisites

- Node.js 18+
- A Supabase project — **required**. TIKI has no offline/local-only mode; the
  app shows a "not configured" screen until `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` are set

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/TIKI.git
cd TIKI

# 2. Install dependencies
npm install

# 3. Configure environment (required)
cp .env.example .env.local
# Edit .env.local and fill in your Supabase URL and anon key — see Supabase Setup below

# 4. Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Supabase Setup

See **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** for the complete guide:

- Creating a Supabase project
- Enabling Google OAuth
- Running the SQL schema (`profiles`, `portfolios`, `holdings`, `transactions`, `app_settings` tables)
- Row Level Security policies

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL (`https://xxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

Copy `.env.example` to `.env.local` and fill in the values. **Never commit `.env.local`.**

Both variables are **required**. Without them, `AuthGate` blocks the app with a
"not configured" message instead of rendering the login screen.

---

## Build

```bash
npm run build
```

Output goes to `dist/`. The build runs TypeScript first (`tsc`) then Vite.

---

## Deployment — Vercel

1. Push this repository to GitHub
2. Import the repo in [Vercel](https://vercel.com/new)
3. Framework preset: **Vite** (auto-detected)
4. Add environment variables in Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. In your Supabase project → Authentication → URL Configuration, add your Vercel domain to **Allowed Redirect URLs**:
   ```
   https://your-app.vercel.app
   ```
6. In Google Cloud Console, add the same URL to **Authorised JavaScript origins** and `https://xxxx.supabase.co/auth/v1/callback` to **Authorised redirect URIs** (already done during Supabase setup)
7. Deploy — Vercel handles the rest

No server required. This is a fully static SPA.

---

## Project Structure

```
src/
  components/     UI components — Header, BottomNav, HoldingsList,
                  TransactionModal, TickerDetailModal, charts, etc.
                  components/ui/ holds shared primitives (Sheet, EmptyState,
                  Skeleton, Toast, ConfirmSheet)
  contexts/       React contexts — Auth, Theme, Language, Toast
  hooks/          useLivePrices, usePriceFlash, useLockBodyScroll, etc.
  i18n/           Hebrew + English translations
  lib/            Supabase client
  pages/          HomePage, PortfolioPage, HistoryPage, SettingsPage
  services/       storageService (Supabase), marketData, import/exportService
  types/          TypeScript types
  utils/          calculations, portfolioEngine, legacyMigration, reminders
public/
  favicon.svg
  site.webmanifest
```

---

## Data Privacy

- All portfolio data is stored in your own Supabase project under your Google
  account. Row Level Security ensures each user can only access their own data.
- No analytics, no tracking, no third-party data sharing.
