# TIKI Product Vision & Design Philosophy

## Status of this document

This is a **long-term reference document**, not a sprint plan and not a feature checklist. Nothing in this document is scheduled work, and nothing here should be implemented unless explicitly approved separately.

Its purpose is to describe how TIKI should **feel, behave, and evolve** as a product, so that product, UX, UI, and design decisions — now and in the future — stay consistent with a single, coherent philosophy rather than being made ad hoc per feature or per contributor.

---

## 1. Core Philosophy

### 1.1 Polish before expansion

TIKI should prefer being a **smaller, cleaner, more polished** product over a larger product with inconsistent UX. When in doubt about whether to build something new or refine something that already exists, refinement wins.

### 1.2 The belonging test

Before adding any new feature, ask:

> **"Does this feel like it has always belonged inside TIKI?"**

A new feature should naturally inherit the app's existing:
- spacing
- typography
- colors
- animation
- formatting
- interaction patterns

No feature should feel visually or behaviorally disconnected from the rest of the app. If a feature can't pass this test without special-casing its own look and feel, it isn't ready to ship — the inconsistency should be resolved before the feature is considered done.

---

## 2. Design Consistency Standards

Every screen in TIKI should feel like it was designed by the same person. Concretely, that means consistent:

- percentage formatting
- currency formatting
- daily-change formatting
- colors
- spacing
- typography
- badges
- loading states
- empty states
- error states
- animations
- RTL/LTR behavior everywhere

These are standards, not one-off style choices — every screen and every new feature is expected to follow them.

---

## 3. Live Market Data Architecture

The way TIKI handles live market data follows a strict, deliberate separation between **display** and **source of truth**:

- `useLivePrices` (or its architectural successor) remains a **display-layer** concern only.
- Live prices overlay stored portfolio data **at render time** — they are never persisted automatically.
- Live prices must **never automatically write back to Supabase**.
- Supabase remains the source of truth for all *owned* data: symbol, quantity, average buy price, and overall user portfolio state.

This separation keeps the displayed numbers current and trustworthy while keeping the stored data (what the user actually owns and paid) stable and explicit: it changes only through deliberate user action, never as a side effect of a price refresh.

---

## 4. Live Market Presentation

How live data is *shown* to the user, from the simplest indicator to a full market-data view.

### 4.1 Live indicators

- Use a subtle live indicator, such as "● Live".
- Prefer green or blue.
- Avoid red — red suggests market losses, and a live indicator should not carry that connotation.
- Avoid aggressive flashing.
- A soft pulse is acceptable only if it feels premium and doesn't become distracting.

### 4.2 Last updated

- Show a small "Updated X sec ago" near live prices where useful.
- If the market is closed, don't pretend prices are still moving.
- Prefer showing the real last market update / close time instead.

### 4.3 Market status *(future)*

- Add asset-specific market status, based on the asset's actual exchange — not a blanket "US market" assumption.
- Examples:
  - "Market Open — Closes in 3h"
  - "Market Closed — Next open in 8h"
- Each ETF/stock should know its own exchange where possible.

### 4.4 Market data panel *(future)*

- Clicking a price could eventually open a clean, professional market-data panel.
- Candidate contents:
  - current price
  - today's change
  - exchange
  - currency
  - data source
  - market status
  - last update
- The standard to meet: professional, not overwhelming.

---

## 5. Motion & Micro-interactions

### 5.1 Price-change animations

- Use small, subtle animations — nothing loud.
- When a live price changes, the number itself can briefly animate/count.
- On an increase, only the number can briefly flash green.
- On a decrease, only the number can briefly flash red.
- Do **not** animate entire cards — the motion stays scoped to the number.
- Motion should stay subtle and premium, never gimmicky.

### 5.2 Expanding the motion language

The same premium motion language described above should eventually extend to:
- portfolio value
- daily change
- home metrics
- live prices

The goal is one consistent "feel" for any number that updates live, wherever it appears.

---

## 6. Mobile Experience

Mobile should not feel like a compressed desktop page — it should feel designed for mobile. Ongoing areas to keep improving:

- safe area handling
- status bar handling
- header layout
- popup layout
- typography
- spacing
- touch targets
- responsive behavior

This is an ongoing commitment, not a one-time fix — mobile polish should be revisited continuously as the product evolves.

---

## 7. Premium Polish Backlog

TIKI should maintain a **Premium Polish Backlog** — separate from the feature backlog. This backlog is explicitly *not* for new features. It exists to track:

- UX refinements
- visual consistency fixes
- better spacing
- better typography
- better animations
- better mobile behavior
- accessibility improvements
- performance polish
- small interaction improvements

**Goal:** make TIKI feel more premium over time, even during periods when no new functionality is being added.

---

## Suggested Additions

*(Not part of the agreed philosophy above — flagged separately per your instructions, for you to accept, reject, or fold in later.)*

A few gaps I noticed while structuring this document, worth considering as future additions to the philosophy itself:

1. **Accessibility as a named principle.** Section 7 mentions "accessibility improvements" as backlog material, but the document has no accessibility stance of its own (e.g. minimum contrast ratios, focus states, screen-reader labeling, `prefers-reduced-motion` support for the animations in Section 5). Given how much of this document is about visual/motion polish, a short explicit accessibility principle would give it equal footing rather than being an implicit backlog item.
2. **A definition of "premium."** The word "premium" appears repeatedly (Sections 4, 5, 7) as the quality bar, but it's never defined. A short, concrete description of what "premium" means for TIKI specifically (e.g., restraint over decoration, motion that clarifies rather than delights, silence over notification-noise) would make the bar easier to hold contributors to consistently.
3. **A living design-tokens reference.** Section 2 lists *categories* that must be consistent (color, spacing, typography, etc.) but the actual values live only in code (`index.css` custom properties). A short pointer from this document to wherever those tokens are canonically defined would prevent this vision doc and the codebase from drifting apart over time.
4. **Performance as a felt quality, not just a backlog line.** "Performance polish" is listed under the backlog (Section 7), but performance (load time, jank-free scrolling/animation, avoiding layout shift) is arguably part of what makes something feel "premium" in the first place — it could be worth calling out as its own short principle rather than only a backlog category.
5. **Explicit motion-reduction guidance.** Given how central subtle motion is to Sections 5.1–5.2, it may be worth stating outright that all of this motion should be automatically suppressed for users with `prefers-reduced-motion` set, rather than leaving that as an implicit accessibility afterthought.

---

## Critical review of the document as written

A few observations worth flagging now, before this becomes a long-standing reference:

- **Tension between "polish before features" (1.1) and the forward-looking sections (4.3, 4.4).** Sections 4.3 (market status) and 4.4 (market data panel) are both marked "(future)" and read as genuinely new features (new data sourced per-exchange, a new UI surface), which sits in some tension with Section 1.1's "polish over expansion" stance. This isn't a contradiction as written — the "(future)" tag and the standalone Premium Polish Backlog concept both signal that this is intentional, deferred work — but it's worth being deliberate that these two sections are the exception to 1.1, not entries in the same category as the rest of the document. Consider a one-line note in 4.3/4.4 acknowledging they're features, not polish, so a future reader doesn't mistake them for backlog items.
- **"Premium" is used as the standard but never defined** (also flagged above as a suggested addition) — right now the document tells contributors what premium *isn't* (aggressive flashing, red live-indicators, whole-card animation) more clearly than what it *is*. Definitions by negation are useful but incomplete; a positive definition would make this document more self-sufficient.
- **Section 3's data ownership boundary could use one clarifying example.** The rule "Supabase remains the source of truth for owned data" is clear in principle, but the boundary between "owned data" (never overwritten by a live fetch) and "displayed data" (always overlaid live) could be misread by a future contributor working on a feature this document doesn't anticipate (e.g., historical performance tracking, cost-basis lots). A short example of a borderline case and how it resolves would make this section more durable.
- **No mention of how conflicts between sections get resolved.** E.g., if a future "premium" motion idea (Section 5) would hurt mobile performance (Section 6) or accessibility (suggested addition #1), the document doesn't say which principle wins. This is minor now but could matter once more contributors are working from this doc independently.
- **Scope note:** everything above is analysis of the document's structure and completeness, not a suggestion to change the underlying philosophy — the content you provided is preserved in full; nothing was reorganized in a way that changes its meaning, and no item was dropped for being "small."
