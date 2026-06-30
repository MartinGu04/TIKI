# TIKI — Personal Investment Dashboard

A clean, bilingual (Hebrew/English) investment portfolio tracker built for couples and individuals who want a calm, focused overview of their assets — without the noise of a full brokerage platform.

---

## Features

- **Portfolio overview** — current value, unrealized P&L, ROI, monthly contribution
- **Multi-currency** — USD, ILS, EUR per investment; mixed portfolios show per-currency breakdowns, never a fake combined total
- **Recurring investments** — one-time, weekly, monthly, quarterly, semi-annual, yearly, or every-X-months schedules with upcoming deposit calendar
- **Projection chart** — compound-growth simulator with adjustable annual return and time horizon
- **Google authentication** — sign in with Google via Supabase; cloud sync across devices
- **Demo / local mode** — works fully offline with LocalStorage, no account required
- **Migration prompt** — when you sign in for the first time, optionally save existing local data to your account
- **Hebrew + English** — full RTL/LTR switching; locale-aware date and number formatting
- **Three themes** — dark (default), light, and a secret Mamish mode (5 rapid taps on the theme button)
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
- A Supabase project (optional — the app works without one in demo mode)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/TIKI.git
cd TIKI

# 2. Install dependencies
npm install

# 3. Configure environment (optional — skip for demo/local mode)
cp .env.example .env.local
# Edit .env.local and fill in your Supabase URL and anon key

# 4. Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Without `.env.local`, the app runs entirely in LocalStorage mode — no login screen, no cloud sync.

---

## Supabase Setup

See **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** for the complete guide:

- Creating a Supabase project
- Enabling Google OAuth
- Running the SQL schema (`profiles`, `investments`, `app_settings` tables)
- Row Level Security policies

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL (`https://xxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

Copy `.env.example` to `.env.local` and fill in the values. **Never commit `.env.local`.**

Both variables are optional. Without them the app runs in demo mode with no authentication.

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
  components/     UI components (Header, AssetModal, charts, etc.)
  contexts/       React contexts (Auth, Theme, Language)
  hooks/          useLocalStorage
  i18n/           Hebrew + English translations
  lib/            Supabase client
  pages/          HomePage, AdvancedPage
  services/       storageService (LocalStorage + Supabase), marketData
  types/          TypeScript types
  utils/          calculations, formatting
public/
  favicon.svg
  site.webmanifest
```

---

## Data Privacy

- **Local mode**: all data stays on-device in `localStorage`. Nothing leaves the browser.
- **Cloud mode**: data is stored in your own Supabase project under your account. Row Level Security ensures each user can only access their own data.
- No analytics, no tracking, no third-party data sharing.
