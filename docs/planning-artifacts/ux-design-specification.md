---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-03-core-experience
  - step-04-emotional-response
  - step-05-inspiration
  - step-06-design-system
  - step-07-defining-experience
  - step-08-visual-foundation
  - step-09-design-directions
  - step-10-user-journeys
  - step-11-component-strategy
  - step-12-ux-patterns
  - step-13-responsive-accessibility
  - step-14-complete
inputDocuments:
  - docs/planning-artifacts/prds/prd-timekeeper-2026-05-22/prd.md
  - docs/planning-artifacts/prds/prd-timekeeper-2026-05-22/addendum.md
  - docs/planning-artifacts/design/tokens.json
  - docs/planning-artifacts/design/tokens.css
status: final
---

# UX Design Specification — TimeKeeper

**Author:** Sally (UX Designer) · on behalf of the MC Foundry hackathon team
**Date:** 2026-05-22
**Design system:** "Ledger & Dial" (custom, token-driven)
**Governance:** **Token system only — absolutely no inline CSS.** See §13. Tokens: `design/tokens.json` (DTCG source) → `design/tokens.css` (consumable layer).

> Built by running the BMAD `bmad-create-ux-design` workflow (all 14 steps) headless, anchored to the PRD's features (FR-1…FR-26) and user journeys (UJ-1…UJ-5). This spec feeds `bmad-create-architecture` and `bmad-create-epics-and-stories`. Every visual decision resolves to a token; markup examples style via classes that consume tokens — there is not one `style="…"` in this document and there must not be one in the product.

---

## 1. Discovery & Context

**Product.** TimeKeeper — an internal, single-tenant, agent-native rebuild of Harvest's time-tracking core (see PRD §1). The UI is a **peer interface to the MCP server**: every human screen here maps to operations an AI Agent can also perform.

**Who uses the UI** (PRD §2):
- **Member** — logs their own time; lives in the day view and the weekly grid; wants near-zero friction.
- **Project Manager** — watches budget burn, approves time; needs glanceable status.
- **Administrator** — manages clients/projects/tasks/users, pulls reports.
- **AI Agent** — not a screen user, but its actions surface *in* the UI (activity, "logged by agent" provenance). Designing for it = keeping state legible and every action mappable to a tool.

**Platform.** Responsive web app, desktop-first (this is a daily professional tool, data-dense), degrading cleanly to tablet and phone for the high-frequency Member tasks (start/stop a timer, add an entry). Native mobile, offline, and calendar import are PRD non-goals (§8).

**This spec resolves PRD OQ-5:** a human web UI **is in scope** — the four human journeys (UJ-1–UJ-4) get real screens; the agent loop (UJ-5) remains the headline. *(See §14 note back to the PRD.)*

**Constraints carried in:** hackathon time-box, decimal-accurate hours, server-authoritative timers, WCAG 2.1 AA, and the design governance above.

---

## 2. Core Experience

The product is one loop, performed three ways and watched by two audiences:

> **Capture an hour → see it land → watch the budget move.**

Everything else is in service of that loop staying *trustworthy* (the number is right) and *frictionless* (capturing costs seconds). The core experience is therefore **the timer as a precision instrument**: starting it should feel like clicking a fine stopwatch — immediate, tactile, unambiguous — and the running state should be visible from across the room.

The secondary core experience is **the ledger** — dense, legible, tabular data (entries, reports, budgets) that a professional trusts at a glance, with numbers in a monospaced tabular face so columns align and totals are scannable.

---

## 3. Emotional Response Goals

| When the user… | They should feel… | The design lever |
|---|---|---|
| Starts a timer | *In control, precise* | Instant state flip, the live teal dial pulse (`--color-status-running`), monospaced elapsed count |
| Fills the Friday grid | *Efficient, unblocked* | Keyboard-first cells, live row/column totals, no modal interruptions |
| Sees a project nearing budget | *Forewarned, not alarmed* | Calm amber warning before red danger; one alert, never nagging (FR-20) |
| Reads a report | *Confident in the numbers* | Tabular figures, clear totals row, honest empty states |
| Sees an agent acted | *Oriented, in the loop* | A quiet "logged by Agent" provenance chip — never spooky |

Anti-goals: never feel like generic SaaS, never feel nagged, never feel unsure whether a number is current.

---

## 4. Inspiration & Aesthetic Direction

**Direction: "Ledger & Dial."** Two references fused:
- **The mechanical stopwatch / precision instrument** — a calm cream dial, sharp markings, and one decisive moving element. This is the *dial*: our live timer and the teal accent that signals "alive."
- **The editorial accounting ledger** — warm paper, ruled lines, confident column headers, numbers that line up. This is the *ledger*: our tables, grids, and reports.

Deliberately **not**: purple-on-white gradients, Inter/Roboto/Space Grotesk, glassmorphism, generic card soup. The character comes from a **serif display face (Fraunces)** against a **humanist UI sans (IBM Plex Sans)** with **monospaced tabular numerals (IBM Plex Mono)** for all time/money — an unusual, intentional pairing that signals "instrument + ledger," not "AI template."

Signature, memorable moment: **the running Timer Instrument** — a large monospaced elapsed readout inside a card whose teal edge softly pulses (`@keyframes tk-dial-pulse`), the one alive thing on a calm page.

---

## 5. Design System Foundation

### 5.1 Design System Choice
**Custom, token-first design system** ("Ledger & Dial"), implemented as a **two-tier token pipeline**: a W3C DTCG source (`tokens.json`) compiled to a CSS custom-property layer (`tokens.css`) that every component consumes via `var(--…)`.

### 5.2 Rationale for Selection
- The PRD's differentiator is an *instrument-grade* feel for time data; off-the-shelf kits (Material, Ant) would make it look like every other internal tool and fight our serif/mono character.
- A token system is mandated by the team ("token systems only, no inline CSS"). A DTCG→CSS-vars pipeline is the portable, lint-enforceable way to guarantee that — and it future-proofs a second platform target (the build can emit other outputs from the same `tokens.json`).
- Custom ≠ slow here: the surface is small (one app, ~10 screens), so a tight bespoke component set is cheaper than theming a heavy library into submission.

### 5.3 Implementation Approach
- **Source of truth:** `tokens.json` (primitives + semantic aliases). Nothing downstream hard-codes a value.
- **Consumable layer:** `tokens.css` exposes semantic custom properties (`--color-*`, `--type-*`, `--space-*`, `--motion-*`, …) for light + dark.
- **Components:** plain CSS (or CSS Modules / utility classes generated from tokens) — each rule references tokens only. Framework-agnostic; works whether the app shell ends up React, Vue, or server-rendered.
- **Theming:** `:root[data-theme="dark"]` + `prefers-color-scheme`; components never branch on theme — they read semantic tokens that the theme remaps.

### 5.4 Customization Strategy
- Extend by **adding tokens**, never by introducing raw values. New brand need → add a semantic alias to `tokens.json`, regenerate `tokens.css`, use it.
- Component variants are token-scoped (e.g. a button maps `--color-bg-accent` → its surface); restyling a variant means swapping which token it reads, not editing values.

---

## 6. Defining Experience — the Timer Instrument

The make-or-break interaction (realizes FR-1 / UJ-1).

**Idle → Running (one action):**
1. Member picks Project + Task in the instrument's combobox (FR-10 governs availability).
2. Presses **Start**. State flips in `<120ms` (`--motion-control`): the card gains a teal rule, the elapsed readout (`--type-timer`) begins counting from server time, and the card edge begins the slow `tk-dial-pulse`.
3. Only one runs at once (FR-1): starting another shows an inline, non-modal notice — "Stopped *Design · Project Alpha* (1:04) and started *Review*" — so the auto-stop is never silent.

**Running → Stopped:** **Stop** freezes the readout, writes decimal hours server-side (FR-1), the pulse ceases, and the entry slides into today's list with a notes field focused. Sub-minute stops still produce a valid entry.

**Resilience:** elapsed time is server-derived — reloading mid-run shows the correct time and the pulsing dial resumes (NFR-2). The instrument is the same surface an Agent drives via `start_timer`/`stop_timer`; when an agent starts it, the instrument shows the live dial *and* an "Agent" provenance chip.

```
┌──────────────────────────────────────────── Timer Instrument (running) ──┐
│  ▌ running                                          [ Design ▾ ][ Alpha ▾ ]│   ← teal left rule = --border-width-rule, --color-status-running
│                                                                            │
│     01:42:09                                              ⟲ logged by you  │   ← --type-timer (mono, tabular)
│     ‹elapsed, counting›                                                    │
│                                                                            │
│  [ + Note ]                                                  [ ■ Stop ]    │   ← Stop = --color-accent-default surface
└────────────────────────────────────────────────────────────────────────┘
        ╰ card edge softly pulses: @keyframes tk-dial-pulse (token-driven)
```

---

## 7. Visual Design Foundation

All values below are **token references**. The bracketed name is the semantic token in `tokens.css`; raw values live only in `tokens.json`/`tokens.css`.

### 7.1 Color System
**Strategy:** a warm neutral canvas (paper/ink), **one** brand accent — teal, the "luminous dial" — and a hue-separated semantic set so **red means exactly one thing: over budget / danger**. The running timer is *teal* (alive, positive), never red, so "live" and "over budget" can never be confused at a glance or by a color-blind user.

| Role | Token | Light | Use |
|---|---|---|---|
| Canvas | `--color-bg-canvas` | warm paper | App background |
| Surface | `--color-bg-surface` | white | Cards, tables, the instrument |
| Sunken | `--color-bg-sunken` | paper-100 | Grid wells, inputs |
| Text primary | `--color-text-primary` | ink-900 | Headings, data |
| Text secondary / muted | `--color-text-secondary` / `--color-text-muted` | ink-700 / ink-500 | Labels, meta |
| Accent (brand) | `--color-accent-default` (+ `-hover`,`-active`) | teal-500 | Primary actions, links, the dial |
| Running | `--color-status-running` | teal-500 | Live timer pulse, "running" pill |
| Success / under budget | `--color-status-success-fg` / `-bg` | green | Healthy budget, approved |
| Warning / nearing | `--color-status-warning-fg` / `-bg` | amber | ≥ threshold approach |
| Danger / over budget | `--color-status-danger-fg` / `-bg` / `-solid` | red | Over budget, destructive, errors |
| Borders | `--color-border-subtle/default/strong/focus` | warm grays / teal | Rules, dividers, focus |

**Contrast:** the semantic pairs are tuned so body text on its surface and status-fg on status-bg meet WCAG AA (≥ 4.5:1 text, ≥ 3:1 large/UI). Dark theme remaps the same tokens (§ tokens.css `[data-theme="dark"]`).

### 7.2 Typography System
**Three intentional faces, all SIL OFL (loadable, no licensing blocker):**
- **Fraunces** (`--p-font-display`) — display serif with character → `display`, `h1`, `h2`. Editorial warmth.
- **IBM Plex Sans** (`--p-font-sans`) → `h3`, `body`, `label`, `overline`. Humanist, professional, dense-data friendly.
- **IBM Plex Mono** (`--p-font-mono`) → `timer`, `data` (every hour, duration, budget %, money). **Tabular figures** so columns align and totals scan.

**Type roles (tokens):** `--type-display`, `--type-h1`, `--type-h2`, `--type-h3`, `--type-body`, `--type-body-sm`, `--type-label`, `--type-overline` (uppercase, tracked), `--type-timer` (the hero readout), `--type-data` (table numerals). Each role bundles font + weight + size + leading + tracking tokens — components apply a role, never loose values.

Rationale: a serif display + mono numerals is the "instrument + ledger" thesis made literal, and it's the opposite of AI-slop sans-everywhere.

### 7.3 Spacing & Layout Foundation
- **4px base unit**, scale `--p-space-0…10`, exposed as **intent aliases**: `--space-inset-*` (padding), `--space-stack` (vertical rhythm), `--space-gutter` (between regions), `--space-section`.
- **Density:** "efficient, not cramped." Tables and the grid run tighter (`--space-inset-sm`); the canvas around primary surfaces stays generous (`--space-section`).
- **Grid:** 12-column fluid content area with a **fixed left rail** (`--size-sidebar`) and a max content width (`--size-container`). Ruled dividers (`--border-width-rule` in `--color-border-strong`) echo the ledger.
- **Radii:** restrained — `--radius-control` (inputs/buttons), `--radius-card`; the instrument leans slightly sharp to read as precise.

### 7.4 Accessibility Considerations (foundation)
- Color never the sole signal: running = pulse **+** "running" text pill; budget state = color **+** label **+** bar position; billable = icon **+** label.
- Focus is always visible: `--focus-ring-width` / `--focus-ring-color` / `--focus-ring-offset` on every interactive element.
- Targets ≥ `--size-tap-min` (44px) on touch.
- `prefers-reduced-motion` collapses all token durations to 0 (the dial stops pulsing) — handled centrally in `tokens.css`.

---

## 8. Design Directions

**Chosen direction:** "Ledger & Dial" — light **paper** default, first-class dark, a single teal accent, serif headings, mono data. (Two alternates were considered and rejected in §E of the PRD addendum's spirit: a neutral Material-style internal tool — too generic; a maximalist dark dashboard — fights data legibility.)

**App shell (desktop):**
```
┌───────────────┬─────────────────────────────────────────────────────────┐
│  TimeKeeper   │  Today · Thu 22 May 2026                    ◐ theme  ◇ you │  ← header: --type-h2 (Fraunces)
│  ───────────  │                                                           │
│  ▸ Today      │  ┌── Timer Instrument (idle / running) ─────────────────┐ │
│  ▸ This Week  │  │  ...                                                  │ │
│  ▸ Projects   │  └──────────────────────────────────────────────────────┘ │
│  ▸ Reports    │                                                           │
│  ▸ Team       │  TODAY'S ENTRIES                              Σ 6.25 h    │  ← --type-overline + mono total
│  ───────────  │  ───────────────────────────────────────────────────────│
│  [ + Entry ]  │  09:00  Design · Alpha            2.00  • billable   ⋯    │  ← --type-data rows
│               │  11:15  Review · Beacon           1.25  • billable   ⋯    │
│  rail =        │  13:00  Standup · Internal       0.50  ○ non-bill   ⋯    │
│  --size-      │                                                           │
│  sidebar      │                                                           │
└───────────────┴─────────────────────────────────────────────────────────┘
```

**Weekly grid (UJ-2):**
```
THIS WEEK · 18–24 May                                            Σ 31.5 h
┌───────────────────────────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬──────┐
│ Project · Task            │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun │  Row │
├───────────────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼──────┤
│ Alpha · Design            │ 2.0 │ 3.0 │ 4.0 │  ·  │  ·  │  ·  │  ·  │  9.0 │
│ Beacon · Review        🔒 │ 1.0 │ 1.0 │  ·  │  ·  │  ·  │  ·  │  ·  │  2.0 │  ← 🔒 approved = read-only cell
│ Internal · Standup        │ 0.5 │ 0.5 │ 0.5 │ 0.5 │  ·  │  ·  │  ·  │  2.0 │
├───────────────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼──────┤
│ Day total                 │ 3.5 │ 4.5 │ 4.5 │ 0.5 │  ·  │  ·  │  ·  │ 31.5 │
└───────────────────────────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴──────┘
   cells: --type-data, sunken on edit; totals: mono, --color-text-primary
```

**Project budget (UJ-3) — the Budget Meter:**
```
ALPHA — Acme Co.                                          ● on track
Budget   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░  41 / 80 h   51%
              warning tick ↑64 (80%)   danger ↑80
```
States: under (success), nearing ≥ threshold (warning), over (danger, solid red fill + one alert per FR-20).

---

## 9. User Journeys (UX flows)

Each maps to a PRD UJ; FRs noted.

- **UJ-1 Start a timer (Member).** Today screen → pick Project/Task in the instrument → **Start** (live dial) → work → **Stop** → entry lands, notes focused. *FR-1, FR-4, FR-5.* Edge: second start auto-stops first with inline notice.
- **UJ-2 Weekly grid (Member).** This Week → tab through cells, type hours, totals update live, `0` clears, approved rows locked (🔒). *FR-3.* No modals; entirely keyboard-operable.
- **UJ-3 Budget watch (PM).** Projects → Alpha detail → Budget Meter; crossing threshold raises **one** toast + a persistent danger badge. *FR-18, FR-20.* Drill to filtered report.
- **UJ-4 Report (Admin).** Reports → Time → filter rail (date/user/project/client/billable) → table + totals row → **Export CSV**. Empty state is explicit, not an error. *FR-17.*
- **UJ-5 Agent loop (signature).** No new screen — but agent actions are **legible in the human UI**: an "Agent" provenance chip on entries it created, and the live dial if it started a timer. The Admin can watch an agent log time in real time. *FR-23–FR-25; reinforces NFR-4 parity.*

---

## 10. Component Strategy

### 10.1 Design System Components (foundation — built from tokens)
Button, Icon Button, Text Field, Number Field, Combobox/Select, Checkbox, Toggle, Tabs, Tooltip, Toast, Modal/Dialog, Menu, Badge/Pill, Table, Tag. Each: states (default/hover/active/focus/disabled/error), all styled via tokens, no inline CSS, AA contrast, full keyboard support.

### 10.2 Custom Components (the differentiators)

#### Timer Instrument
**Purpose:** start/stop/observe the live timer (FR-1) — the product's signature surface.
**Anatomy:** project+task comboboxes · elapsed readout (`--type-timer`) · running rule + `tk-dial-pulse` edge · Start/Stop · note affordance · provenance chip.
**States:** `idle`, `running` (teal rule + pulse), `stopping` (brief), `disabled` (no eligible project), `agent-driven` (provenance = Agent).
**Accessibility:** Start/Stop is one labelled button toggling `aria-pressed`; elapsed exposed via `aria-live="polite"` at minute granularity (not every tick); reduced-motion removes pulse, keeps the text pill.
**Styling:** classes only (`.tk-timer`, `.tk-timer--running`); colors/space/motion from tokens.

#### Weekly Timesheet Grid
**Purpose:** keyboard-first weekly entry (FR-3). **Anatomy:** project/task row header · 7 day cells · row + day totals (mono). **States:** empty cell, editing (sunken), saved, `0`→deleted, **locked** (approved, `aria-disabled`, 🔒). **A11y:** true grid semantics (`role="grid"`/`gridcell`), arrow-key navigation, `aria-readonly` on locked cells, >24h/day warning announced politely (FR-3 assumption).

#### Budget Meter
**Purpose:** budget vs consumed at a glance (FR-18) with threshold ticks; drives the over-budget state (FR-20). **States:** `under` (success), `nearing` (warning, ≥ threshold), `over` (danger solid). **A11y:** `role="progressbar"` with `aria-valuenow/min/max`; state in text + position, never color alone.

#### Time Entry Row
**Purpose:** one logged entry in day/report lists. **Anatomy:** time/period · project·task · hours (mono) · billable indicator (icon+label) · approval pill · provenance chip · overflow menu (edit/delete, disabled when locked, FR-6). 

#### Status Pill
Variants via token mapping: `running` (teal), `billable`/`non-billable`, approval `unsubmitted`/`submitted`/`approved`, budget `under`/`nearing`/`over`. Icon + text always.

#### Report Table
Dense, sortable, **tabular-figure** numeric columns, sticky header, totals row in `--color-text-primary` mono, CSV export action, explicit empty state.

#### Capacity Bar
Logged vs `Weekly Capacity` per user (FR-19); over-capacity uses warning, not danger (over-capacity ≠ error).

#### Agent Provenance Chip
**Purpose:** show when an Agent (vs a human) performed an action — the UI manifestation of the agent-native thesis (UJ-5, NFR-4). Quiet, labelled, with a tooltip naming the tool/identity. Never alarming.

#### App Shell
Fixed left rail (`--size-sidebar`), header with date + theme toggle + identity, content max-width `--size-container`, skip-link to main.

### 10.3 Component Implementation Strategy
- Every component is a class set consuming **semantic tokens only** (`var(--…)`); zero raw values; zero inline `style`.
- Variants = different token bindings, not new values.
- States covered exhaustively (incl. focus + disabled + error) before a component is "done."
- A11y is part of the component contract (roles, keyboard, `aria-*`), not a later pass.

### 10.4 Implementation Roadmap
- **Phase 1 (core loop / demo):** App Shell, Timer Instrument, Time Entry Row, Combobox, Button/Field, Budget Meter, Report Table, Status Pill. *(Covers UJ-1, UJ-3, UJ-4, and the surfaces UJ-5 makes visible.)*
- **Phase 2:** Weekly Grid, Capacity Bar, Toast/alerts for FR-20, Agent Provenance Chip everywhere.
- **Phase 3:** Modal flows for admin CRUD (Client/Project/Task/User), Tabs, Menu polish, dark-theme QA.

---

## 11. UX Patterns (consistency rules)

- **Inline over modal.** Capture and edits happen in place (grid cells, entry rows). Modals only for destructive confirms and admin CRUD.
- **Optimistic, then reconciled.** Saves apply immediately; budget/totals reconcile within 60s or live (FR-18). Failures revert with a clear toast — never a silent drop.
- **One alert per crossing.** Threshold/budget notifications fire once (FR-20); the persistent badge carries ongoing state, the toast does not repeat.
- **Numbers are mono + tabular, always.** Hours, %, money never render in the sans face — consistency = trust.
- **Empty states are honest.** "No time tracked for these filters" (FR-17), never an error or a blank.
- **Provenance is universal.** Any entry/timer shows who acted (you / teammate / Agent).
- **Permission-aware UI.** Controls a role can't use are absent, not just disabled where it'd mislead; refusals (and agent-tool refusals) read identically (FR-13, NFR-4).
- **Theme-agnostic components.** Components read semantic tokens; light/dark is a token remap, never component logic.

---

## 12. Responsive Design & Accessibility

### 12.1 Responsive Strategy
- **Desktop (primary):** rail + 12-col content; grid and reports use the width for dense tables.
- **Tablet:** rail collapses to an icon rail or top tabs; Timer Instrument full-width; grid horizontally scrolls with a sticky project/task column.
- **Mobile:** single column, bottom-anchored primary action (Start/Add); the Timer Instrument is the hero; the weekly grid degrades to a day-switcher list (entry-per-day) rather than a cramped 7-col table.

### 12.2 Breakpoint Strategy
Mobile-first, tokenized breakpoints (consumed by the build / media queries — CSS can't `var()` inside `@media`, so these live as the canonical `--p-breakpoint-*` token values and are referenced by name in build config):
`sm 40rem · md 48rem · lg 64rem · xl 80rem`. Layout shifts: rail collapses < `lg`; grid → day-list < `md`.

### 12.3 Accessibility Strategy — **WCAG 2.1 AA**
- Contrast AA across both themes (token pairs pre-checked).
- Full keyboard operability: timer toggle, grid arrow-nav, combobox (ARIA combobox pattern), menus, modals (focus-trapped, ESC-closable).
- Screen-reader semantics: `role="grid"` timesheet, `role="progressbar"` meters, `aria-live` for elapsed (minute cadence) and for toasts.
- Color never sole signal (status = color + icon + text).
- Targets ≥ 44px touch; visible focus everywhere; skip-link to main.
- `prefers-reduced-motion` honored globally (durations → 0; dial pulse stops).

### 12.4 Testing Strategy
- Automated: axe / Lighthouse a11y in CI; a **token-lint** gate (no raw values, no inline style — §13).
- Manual: keyboard-only pass on UJ-1/UJ-2/UJ-4; VoiceOver + NVDA on the Timer Instrument and Grid; color-blind simulation on budget/running states; light + dark.
- Responsive: real-device check on the Member tasks (start/stop, add entry) at phone/tablet/desktop.

### 12.5 Implementation Guidelines (for the Developer/Architect agent)
- **Style only through tokens.** `var(--…)` everywhere; if a value is missing, add a token to `tokens.json` → regenerate `tokens.css` → use it.
- **No inline CSS.** No `style="…"`, no inline style objects/`cssText`. Styling lives in stylesheets/CSS Modules. (Enforced — §13.)
- Relative units (`rem`/`%`/`vw`) already encoded in tokens; don't reintroduce px.
- Semantic HTML first; add ARIA only to fill gaps.
- Theme via `data-theme` on `<html>` + system pref; never branch components on theme.
- Load the three fonts in the app shell (`<link>`/`@font-face`); reference families only via `--p-font-*`.

---

## 13. Governance — Token-Only Styling & No Inline CSS

**The rule (team mandate):** *We ONLY use the token system for design, and there is absolutely NO inline CSS.*

What this means concretely:
1. **Single source of truth:** `design/tokens.json` (DTCG). All values originate here; `tokens.css` is generated/maintained as the consumable mirror.
2. **Components consume semantic tokens only** via `var(--…)`. No raw hex/rgb/px/ms/font-name in component CSS. No use of the `--p-*` primitive layer outside `tokens.css`.
3. **No inline CSS, ever:** the `style` attribute, React `style={{…}}`/`element.style`/`cssText`, and `<style>` blocks holding raw values are forbidden. Styling is class-based in stylesheets/CSS Modules.
4. **Extending = adding a token,** never hard-coding.

**Enforcement (wire into CI — the token-lint gate from §12.4):**
- **Stylelint** — `declaration-property-value-disallowed-list` to ban raw colors/lengths where a token exists, plus a custom rule allowing values only via `var(--…)`; `scale-unlimited/declaration-strict-value` to require variables for color/font/spacing properties.
- **ESLint** — `react/forbid-dom-props` / `react/forbid-component-props` for `style`; a `no-restricted-syntax` rule flagging `JSXAttribute[name.name='style']` and `.style[...] =` / `cssText` assignments.
- **HTML lint / template lint** — disallow the `style` attribute in markup.
- **PR check** — `grep`-level guard: fail if a diff introduces `style=` or `:root`-external raw hex.

> Self-attestation for this spec: it contains **zero** inline styles; every visual value above is named as a token. The same bar applies to all product code.

---

## 14. Handoff / Completion

**Artifacts produced:**
- `design/tokens.json` — DTCG token source of truth.
- `design/tokens.css` — consumable CSS custom-property layer (light + dark, motion, focus, reduced-motion, `tk-dial-pulse`).
- `ux-design-specification.md` — this document (foundation → components → patterns → responsive/a11y → governance).

**Resolves PRD OQ-5:** the human web UI is in scope (UJ-1–UJ-4 have screens); the agent loop (UJ-5) remains the headline and is made *visible* in the UI via provenance.

**Downstream:**
- `bmad-create-architecture` — consume the token pipeline + component contracts + PRD addendum stack.
- `bmad-create-epics-and-stories` — the Implementation Roadmap (§10.4) maps to build epics; each component carries its states/a11y as acceptance criteria.

**Open design questions:**
- DQ-1 — Default theme: ship light-default with dark opt-in (recommended) vs. follow system only? 
- DQ-2 — Token build tool: Style Dictionary vs. a thin custom `tokens.json → tokens.css` script for the hackathon (recommended: thin script; Style Dictionary post-hackathon).
- DQ-3 — Component layer tech (CSS Modules vs. utility classes generated from tokens) — defer to architecture; both satisfy the governance rule.
