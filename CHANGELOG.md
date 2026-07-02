# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

## [1.0.0] - 2026-07-02

The first stable release of TIKI: a full rewrite from a single-holding snapshot
tracker into a proper transaction-ledger portfolio app.

### Added

- Transaction ledger — buy, sell, and dividend entries with average-cost basis
  and realized/unrealized P&L
- Portfolio, History, and Settings pages behind a persistent bottom navigation,
  with a floating "Add Transaction" action
- Google sign-in via Supabase (Postgres + Row Level Security); data syncs
  across devices under the signed-in account
- Live market prices with automatic polling, a manual refresh control, and an
  "updated Ns ago" freshness indicator
- CSV and JSON import/export of holdings and transaction history
- Opt-in reminder banners for dividends and monthly contributions
- Bilingual interface (Hebrew / English) with full RTL/LTR layout switching
- Multi-currency support (USD, ILS, EUR, GBP, and more), with per-currency
  breakdowns shown separately for mixed-currency portfolios
- Compound-growth projection chart with adjustable annual return and time
  horizon
- One-time migration path for early users' legacy single-holding data into
  the new transaction ledger
- Three themes — dark (default), light, and a hidden "Mamish" easter egg
- Subtle rolling-number and directional-arrow micro-interactions for live
  price updates, plus skeleton loading and empty states (no holdings, no
  history, no search results) with clear calls to action

### Changed

- Cost basis is computed via average cost rather than tracking individual
  purchase lots
- The holding-detail modal now renders identically (size, layout, and
  content) regardless of which screen it's opened from

### Fixed

- Modal backdrops no longer leave a gap at the top of the screen in some
  contexts — overlays now portal to the document body instead of mounting
  inline in the page tree, which was the root cause
- Searching the holdings table with no matches now shows a proper "no
  results" state instead of the generic empty-portfolio message

### Removed

- Manual "Owner" (me / partner / shared) tracking on holdings
- The silent recurring auto-invest simulation
- Local-only (no-account) demo mode — signing in is now required

[Unreleased]: https://github.com/MartinGu04/TIKI/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/MartinGu04/TIKI/releases/tag/v1.0.0
