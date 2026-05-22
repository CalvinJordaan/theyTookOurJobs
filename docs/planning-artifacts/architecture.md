---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - docs/planning-artifacts/prds/prd-timekeeper-2026-05-22/prd.md
  - docs/planning-artifacts/prds/prd-timekeeper-2026-05-22/addendum.md
  - docs/planning-artifacts/ux-design-specification.md
  - docs/planning-artifacts/design/tokens.json
  - docs/planning-artifacts/design/tokens.css
  - research/findings.md
  - research/mcp-server.md
  - research/data-model.md
workflowType: architecture
project_name: TimeKeeper
user_name: Bryan
date: 2026-05-22
status: final
---

# Architecture Decision Document — TimeKeeper

_Run of the BMAD `bmad-create-architecture` workflow (all 8 steps), headless. Decisions are made and recorded with rationale; technology versions verified via web search on 2026-05-22. This document is the authoritative technical contract for AI-agent implementers and **supersedes the dated version references in the PRD addendum** (see §0.1)._

## 0. Context

**Goal:** an internal, single-tenant, **MCP-native + event-native** rebuild of Harvest's time-tracking core (PRD §1). Two consumers of the same domain: a **human web UI** (UJ-1–UJ-4) and **AI agents via MCP** (UJ-5) — both must obey identical rules (PRD NFR-4).

**Architectural drivers (ranked):**
1. **Agent-operable surface** — a clean MCP tool/resource contract is the product (FR-23–FR-26).
2. **Single source of truth for behavior** — one service+permission layer behind both MCP and REST, so the two interfaces can't diverge (NFR-4).
3. **Event-native** — domain events emitted as work happens; they drive alerts/reminders and (stretch) MCP notifications (FR-20–FR-21, FR-26).
4. **Numeric correctness** — decimal hours/money, server-authoritative timers (NFR-1, NFR-2).
5. **Token-only UI, zero inline CSS** — design governance is a hard constraint (PRD §13, UX spec §13).
6. **Hackathon pragmatism** — one deployable process, local-first demo (PRD §6, OQ-7).

### 0.1 Version updates vs. PRD addendum (verified 2026-05-22)
| Item | Addendum (2026-05-21) | **Authoritative now** | Note |
|---|---|---|---|
| MCP spec | 2025-06-18 | **2025-11-25** | Streamable HTTP still the remote transport; HTTP+SSE deprecated. |
| MCP TS SDK | `@modelcontextprotocol/sdk` + `@modelcontextprotocol/node` | **`@modelcontextprotocol/sdk` 1.29.x only** | Streamable HTTP transport is built into the SDK; the separate `node` package is obsolete. Zod v4 peer (v3.25+ compatible). |
| Node | 22+ | **24 LTS** | 22 still maintenance; 24 is Active LTS. |
| ORM | "Prisma" | **Prisma 7.x** | v7 is Rust-free TS runtime (faster, smaller bundle). |
| DB | PostgreSQL | **PostgreSQL 18** | Current major. |
| Web build | (unspecified) | **Vite 8 + React 19** | UI decision made here (addendum deferred it). |

---

## 1. Project Context (step 2)

- **Type:** full-stack TypeScript monorepo producing **one deployable Node service** that hosts (a) the MCP server at `/mcp`, (b) a thin REST facade at `/api` for the web UI, and (c) the built SPA as static assets. MCP and REST both call the **same in-process service layer** (addendum co-location decision).
- **Domain complexity:** low–moderate. Core is TimeEntry + 2 join tables (UserAssignment, TaskAssignment) around User/Client/Project/Task (data-model §1). The interesting complexity is the timer state machine, the approval state machine, budget aggregation, and the event layer — not the entity count.
- **Scale:** single internal account; demo-scale data. No multi-tenant, no horizontal-scale requirement for the hackathon (but transport choice keeps the door open — §4.3).
- **Non-negotiables carried in:** decimal money/hours; server-authoritative timers; AA accessibility; **token-only styling, no inline CSS**; permission parity across MCP/REST.

---

## 2. Starter Template Evaluation (step 3)

**Decision: no heavyweight meta-framework starter; a thin custom monorepo.** Rationale: a Next.js/T3 starter would couple the UI and API and fight our "MCP server is the primary surface, web UI is a peer" shape; we want the MCP server independently runnable (and demoable via Inspector) without a UI build. The surface is small enough that a hand-rolled workspace is cheaper than de-opinionating a framework.

**Foundation (initialized as the first implementation story):**
- **Package manager / monorepo:** `pnpm` workspaces (fast, strict, good monorepo ergonomics).
- **Server:** Node **24 LTS**, TypeScript, `@modelcontextprotocol/sdk` **1.29.x** (Streamable HTTP), **Express 5** as the HTTP host for `/api` + `/mcp` mount + static SPA (well-trodden with the SDK; Hono is the lightweight alternative if preferred), **Zod** for schemas, **Prisma 7** + **PostgreSQL 18**, **pino** for logging.
- **Web:** **Vite 8** + **React 19** + TypeScript, **React Router**, **TanStack Query** (server state), **React Hook Form** (timer/grid forms), **CSS Modules** consuming `design-tokens`.
- **Design tokens:** `packages/design-tokens` holds `tokens.json` (DTCG source) and a build that emits `tokens.css`; the web app imports `tokens.css` once.
- **Tooling:** ESLint, **Stylelint** (token-strict), Prettier, **Vitest** (unit/integration), Playwright (e2e, optional), GitHub Actions CI.

> Initialization is **Story 1** (scaffold + `ping` tool on `/mcp` verified with `npx @modelcontextprotocol/inspector`) per the build sequence (addendum §F).

---

## 3. Core Architectural Decisions (step 4)

### Decision Priority Analysis
- **Critical (block implementation):** layered single-process topology; one service layer behind MCP+REST; Postgres+Prisma data layer with decimal; static-bearer auth → identity; MCP Streamable HTTP transport + tool/resource contract; in-process event bus; token-only UI pipeline.
- **Important (shape architecture):** error-envelope + uniform error mapping; timer & approval state machines; budget aggregation & single-fire alert; REST facade shape; SPA state strategy.
- **Deferred (post-hackathon):** OAuth 2.1; MCP notifications (FR-26); rate snapshots/profitability; multi-tenant `company_id`; horizontal-scale stateless sessions; split MCP server from API process.

### 3.1 Topology
**Modular monolith, layered, one process.**

```
            ┌──────────── AI Agents (Claude Code, Foundry agent, Inspector) ─┐
            │                         MCP client                              │
            ▼                                                                  
   ┌─────────────────────────────────────────────────────────────────────┐
   │  TimeKeeper service (Node 24, Express 5)                              │
   │  ┌───────────────┐   ┌───────────────┐   ┌──────────────────────┐    │
   │  │ MCP transport │   │ REST facade   │   │ static SPA (Vite dist)│    │  ← thin adapters
   │  │  /mcp         │   │  /api/*       │   │  /                    │    │
   │  └──────┬────────┘   └──────┬────────┘   └──────────────────────┘    │
   │         └──────────┬────────┘  (both adapters call the same layer)    │
   │             ┌──────▼───────────────┐                                  │
   │             │ Application services  │  use-cases + PERMISSION CHECKS   │  ← single source of behavior (NFR-4)
   │             └──────┬───────────────┘                                  │
   │        ┌───────────┼───────────────┐                                  │
   │   ┌────▼────┐  ┌────▼─────┐   ┌─────▼──────┐                          │
   │   │ domain  │  │ event bus│   │ repositories│ (Prisma)                │
   │   └─────────┘  └────┬─────┘   └─────┬──────┘                          │
   │       handlers: budget-alert, reminder, mcp-notify(stretch)           │
   └───────────────────────────────────────────┬──────────────────────────┘
                                                ▼
                                        PostgreSQL 18
```
Web UI talks to `/api` only; **agents talk to `/mcp`**. Both paths converge on the service layer — no behavior lives in an adapter.

### 3.2 Data Architecture
- **PostgreSQL 18 + Prisma 7.** Prisma `Decimal` for `hours`, budgets, and any rate/money — never float (NFR-1).
- **Entities (MVP, data-model §C):** User, Client, Project, Task, TaskAssignment, UserAssignment, TimeEntry. Single-tenant → **no `company_id`**. `client` on TimeEntry is **derived** via project (not stored). `approval_status` enum only (`is_closed` not modeled).
- **IDs:** integer PKs to match the Harvest data model; `TimeEntry.id` = `BigInt`. (Agents use these IDs in tool calls.)
- **Migrations:** Prisma Migrate; checked-in migration history; a `seed.ts` provisioning one account's worth of demo data (users/clients/projects/tasks/assignments/entries) for UJ-5.
- **Timer state:** on TimeEntry — `is_running: boolean`, `timer_started_at: timestamptz?`. Elapsed is computed server-side at read/stop (NFR-2), never stored as a running counter.
- **Validation strategy:** Zod at the boundary (MCP input schema + REST request schema) only; the service layer trusts validated input (matches the team rule "validate at system boundaries"). DB integrity via Prisma constraints.
- **Caching:** none in MVP (demo-scale); budget aggregation is a live `SUM` query. (Door open for a materialized budget cache later.)

### 3.3 Authentication & Security
- **AuthN (hackathon):** static **bearer token** in `Authorization: Bearer <token>`, validated by middleware that resolves the token → a User identity. Same mechanism for `/mcp` and `/api`. Token→user map from env/secret store. **OAuth 2.1** (MCP 2025-11-25 resource-server model, PKCE) is the documented productionization path (PRD OQ-4) — not built.
- **AuthZ:** enforced in the **service layer** (not adapters) so MCP and REST are identical (NFR-4). Role model: Administrator / Project Manager (per-project via UserAssignment.is_project_manager) / Member (FR-13). Every query is identity-scoped: Members → own entries + assigned projects; PMs → managed projects; Admin → all. Raw IDs that bypass the UI are still refused.
- **Hardening:** parameterized queries via Prisma (no string SQL); Zod input validation; secrets only via env (never committed); pino logs never include tokens or PII beyond names/emails; CORS locked to the SPA origin; agent actions can never exceed the identity they act for.

### 3.4 API & Communication Patterns
- **MCP (primary):** Streamable HTTP at `/mcp`, single endpoint, multiple concurrent clients (NFR-3). **Tools** = model-controlled actions; **Resources** = read-only `harvest://` context. Tool I/O typed with Zod; results returned as structured content. Catalogue per addendum §B / research/mcp-server.md; MVP subset per FR-23. Built so sessions stay thin (aligns with the 2026 stateless-scaling roadmap).
- **REST facade (`/api`, for the SPA):** resource-oriented JSON; **camelCase** JSON fields; **ISO-8601** dates; success returns the resource/collection directly; errors use one envelope (§5). The facade is a thin translation over the same services the MCP tools use.
- **Uniform errors:** one internal `AppError` taxonomy (validation / not-found / forbidden / conflict / running-timer-conflict …) mapped to HTTP status for REST and to structured MCP tool errors for `/mcp` — same reason text both ways (NFR-4, UJ-5 edge case).
- **Events:** in-process typed **event bus**. Names `domain.entity.action` (e.g. `timer.started`, `time_entry.created`, `budget.threshold_crossed`). Emitted by services after a successful state change; **idempotent per change** (FR-21). Handlers: budget-threshold alert (single-fire, FR-20), log-time reminder (FR-22, deferred), and an **MCP-notification bridge** (FR-26, stretch). Persisted event log doubles as the audit trail (NFR-5).

### 3.5 Frontend Architecture
- **React 19 + Vite 8 SPA**, TypeScript, React Router, **TanStack Query** for all server state (cache + optimistic updates for the grid/timer), minimal local UI state (no Redux). **React Hook Form** for the timer and weekly grid.
- **Styling — the governance core:** **CSS Modules**, every declaration referencing a **design token** via `var(--…)`; `packages/design-tokens` `tokens.css` imported once at the app root; **no inline CSS** (`style=` / `style={{}}` / `cssText` forbidden, lint-enforced). Components implement the "Ledger & Dial" system (UX spec §10): Timer Instrument, Weekly Grid, Budget Meter, Report Table, Status Pill, Agent Provenance Chip, App Shell.
- **Theme:** `data-theme` on `<html>` + `prefers-color-scheme`; components read semantic tokens only.
- **Data flow:** SPA → `/api` (REST) → services. The SPA never calls `/mcp` (that's the agent surface). Live updates for budget/timer via short polling in MVP (WebSocket/event-push deferred with FR-26).

### 3.6 Infrastructure & Deployment
- **Demo (default, OQ-7):** local **Docker Compose** — `postgres:18` + the Node service; agents connect to local `/mcp`, Inspector verifies. The single most important demo ("agent creates a Time Entry via MCP") runs entirely locally.
- **Optional cloud:** **Azure Container Apps** (one container + Azure Database for PostgreSQL); the agent app uses Azure AI Foundry `claude-opus-4-7` (model coupling lives only in the agent, NFR-7).
- **CI (GitHub Actions):** install → typecheck → **lint gate** (ESLint no-inline-style + Stylelint token-strict + the `style=`/raw-hex grep guard) → test (Vitest) → build (server + web). Lint gate failing blocks merge — this is how the token mandate is enforced.
- **Config:** `.env` (+ `.env.example`); `DATABASE_URL`, `MCP_BEARER_TOKENS`, `PORT`, `CORS_ORIGIN`.
- **Observability:** structured pino logs + the persisted domain-event stream as the activity/audit backbone (NFR-5).

### Decision Impact Analysis
- **Implementation sequence:** scaffold + MCP `ping` → Prisma schema + seed → service layer (TimeEntry/Timer) → MCP time-entry tools (minimal viable demo) → lookups + reports tools → REST facade → web shell + Timer Instrument → grid/reports UI → events (alert) → agent app on Foundry → stretch (notifications/approval/reminders/deploy).
- **Cross-component dependencies:** the **service layer** is the lynchpin — MCP tools, REST routes, and event emission all depend on it; build it once, correctly, with permission checks inside.

---

## 4. Implementation Patterns & Consistency Rules (step 5)

These exist so multiple AI agents produce compatible code. **All agents MUST follow them.**

### 4.1 Naming
- **DB (Postgres):** tables `snake_case` **plural** (`time_entries`, `user_assignments`); columns `snake_case` (`spent_date`, `is_running`); PK `id`; FK `<entity>_id` (`project_id`); index `idx_<table>_<cols>`.
- **Prisma models:** `PascalCase` singular (`TimeEntry`) mapped with `@@map("time_entries")` / `@map`.
- **API & all JSON (REST + MCP results):** `camelCase` fields (`spentDate`, `isRunning`). The Prisma/DB↔API mapping happens in the service/serialization layer — agents never leak snake_case to clients.
- **MCP tool names:** `snake_case` verb_noun, exactly as catalogued (`create_time_entry`, `start_timer`, `run_time_report`) — these are the agent contract; do not rename.
- **MCP resource URIs:** `harvest://…` exactly as catalogued.
- **TS files:** modules `kebab-case.ts` (`time-entry.service.ts`); React components `PascalCase.tsx` (`TimerInstrument.tsx`); CSS Modules `PascalCase.module.css`.
- **Functions/vars:** `camelCase`; types/interfaces `PascalCase`; enwhile constants `UPPER_SNAKE`.
- **Events:** `domain.entity.action` lower dot.snake (`time_entry.created`, `budget.threshold_crossed`).

### 4.2 Structure
- Tests **co-located** as `*.test.ts` next to source; e2e under `apps/web/e2e/`.
- Server organized **by layer then feature**; web organized **by feature** under `features/` with shared primitives under `components/`.
- One service per aggregate (`TimeEntryService`, `TimerService`, `ProjectService`, …); repositories wrap Prisma; no Prisma calls outside repositories.

### 4.3 Formats
- **Dates:** ISO-8601 strings in all APIs (`spentDate: "2026-05-22"`, timestamps with offset). Internally `timestamptz`.
- **Decimals:** hours/money serialized as JSON numbers with fixed precision (or strings if precision-critical) — never binary float; one shared `formatHours()` util.
- **REST success:** return the resource/collection directly (no envelope) with proper status (200/201/204).
- **Error envelope (REST + mirrored in MCP tool errors):**
  ```json
  { "error": { "code": "running_timer_conflict", "message": "Human-readable reason", "details": {} } }
  ```
- **Booleans:** real `true/false`. **Null** over omitted for "no value."

### 4.4 Communication
- **Event payloads:** `{ id, occurredAt, actor: {userId}, entity ids…, data }`; typed; additive-only evolution.
- **State updates (web):** immutable; TanStack Query cache is the source of server truth; optimistic update then reconcile, revert + toast on failure.
- **Permission checks:** always in the service layer via a shared `assertCan(actor, action, resource)` helper — never re-implemented in an adapter.

### 4.5 Process
- **Errors:** services throw typed `AppError`; one mapper per adapter converts to HTTP / MCP error. No silent catches (aligns with team standards).
- **Loading/empty states (web):** every data view handles loading, error, and explicit empty ("No time tracked for these filters", FR-17) — no blank screens.
- **Validation:** Zod at the boundary only; services assume valid input.

### 4.6 Enforcement
- **All agents MUST:** use semantic design tokens via `var(--…)` and **never write inline CSS**; keep behavior in services; keep MCP tool names/URIs stable; emit events idempotently.
- **Enforced by:** ESLint (`no-restricted-syntax` on JSX `style`, forbid `.style=`/`cssText`), Stylelint (`declaration-strict-value` for color/font/spacing), a PR grep guard (`style=` / `:root`-external raw hex), and typecheck — all in CI (§3.6).
- **Anti-patterns (reject in review):** business logic in an MCP tool handler or REST controller; raw hex/px in a component; a permission check that exists on REST but not MCP; storing a running timer counter; floats for hours.

---

## 5. Project Structure & Boundaries (step 6)

```
timekeeper/
├── package.json                      # pnpm workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── docker-compose.yml                # postgres:18 + app (demo default, OQ-7)
├── .env.example
├── .github/workflows/ci.yml          # typecheck · lint gate · test · build
├── README.md
├── packages/
│   ├── design-tokens/                # the token system (governance core)
│   │   ├── tokens.json               # DTCG source of truth (from docs/.../design)
│   │   ├── build.ts                  # tokens.json -> tokens.css
│   │   └── dist/tokens.css           # consumed by web; no raw values elsewhere
│   └── shared/                       # types + Zod schemas shared by server & web
│       └── src/{schemas,types}.ts
├── apps/
│   ├── server/
│   │   ├── src/
│   │   │   ├── main.ts               # Express 5: mounts /mcp, /api, static SPA
│   │   │   ├── config/env.ts
│   │   │   ├── mcp/                   # MCP ADAPTER (thin)
│   │   │   │   ├── server.ts          # McpServer + StreamableHTTPServerTransport
│   │   │   │   ├── tools/             # time-entry.tools.ts, project.tools.ts, report.tools.ts ...
│   │   │   │   └── resources/         # harvest:// resources
│   │   │   ├── http/                  # REST ADAPTER (thin)
│   │   │   │   ├── routes/            # time-entries.routes.ts, projects.routes.ts ...
│   │   │   │   ├── middleware/        # auth.ts (bearer->identity), error-handler.ts
│   │   │   │   └── serializers/       # snake_case(db) -> camelCase(api)
│   │   │   ├── services/              # ★ BEHAVIOR LIVES HERE (MCP+REST share it)
│   │   │   │   ├── time-entry.service.ts
│   │   │   │   ├── timer.service.ts   # one-running-timer rule, server elapsed
│   │   │   │   ├── project.service.ts · task.service.ts · client.service.ts
│   │   │   │   ├── user.service.ts · assignment.service.ts
│   │   │   │   ├── timesheet.service.ts   # submit/approve (FR-15/16, Should)
│   │   │   │   ├── report.service.ts      # time / budget / capacity
│   │   │   │   └── authz.ts               # assertCan(actor, action, resource)
│   │   │   ├── domain/                # enums, state machines (approval, timer), AppError, decimal utils
│   │   │   ├── events/                # bus.ts, types.ts, handlers/{budget-alert,reminder,mcp-notify}.ts
│   │   │   ├── repositories/          # Prisma access (only place Prisma is imported)
│   │   │   └── lib/{logger.ts,format.ts}
│   │   ├── prisma/{schema.prisma,seed.ts,migrations/}
│   │   └── src/**/*.test.ts           # co-located unit/integration tests
│   └── web/
│       ├── index.html
│       ├── vite.config.ts
│       ├── src/
│       │   ├── main.tsx               # imports design-tokens/dist/tokens.css ONCE
│       │   ├── app/{router.tsx,query-client.ts,theme.ts}
│       │   ├── components/            # AppShell, Button, Field, StatusPill, AgentProvenanceChip (+ *.module.css)
│       │   ├── features/
│       │   │   ├── today/             # TimerInstrument, TodayEntries  (UJ-1)
│       │   │   ├── week/              # WeeklyGrid                     (UJ-2)
│       │   │   ├── projects/          # ProjectList, BudgetMeter       (UJ-3)
│       │   │   ├── reports/           # TimeReportTable, CapacityBar   (UJ-4)
│       │   │   └── team/              # users, assignments
│       │   └── api/                   # typed fetch client for /api (TanStack Query hooks)
│       └── e2e/                       # Playwright (optional)
└── docs/ -> (planning artifacts live in repo docs/)
```

### Boundaries
- **Adapter ↔ service:** adapters (mcp/, http/) only parse/validate input, call a service, and map results/errors. Zero behavior.
- **Service ↔ repository:** services orchestrate + enforce permissions + emit events; repositories are the only Prisma callers.
- **Server ↔ web:** contract is `/api` (REST) + shared Zod types in `packages/shared`. Web never imports server internals.
- **Agent ↔ system:** contract is `/mcp` (tool names + resource URIs + schemas) — the stable agent ABI.
- **Tokens ↔ everything visual:** `packages/design-tokens` is the only home of raw visual values.

### Requirements → structure mapping
| PRD area | Lives in |
|---|---|
| FR-1 Timer | `services/timer.service.ts` · `mcp/tools` · `features/today/TimerInstrument` |
| FR-2/3 manual + grid | `services/time-entry.service.ts` · `features/today`, `features/week` |
| FR-7–11 clients/projects/tasks | `services/{client,project,task,assignment}.service.ts` · `features/projects`,`team` |
| FR-12–14 users/roles/assignment | `services/{user,assignment}.service.ts` · `services/authz.ts` |
| FR-15/16 timesheet | `services/timesheet.service.ts` |
| FR-17–19 reports | `services/report.service.ts` · `features/reports` |
| FR-20/21 events | `events/` + handlers |
| FR-23–26 MCP | `mcp/` (tools + resources + notify bridge) |
| NFR-4 parity | `services/authz.ts` (shared by both adapters) |
| PRD §13 design | `packages/design-tokens` + web CSS Modules |

---

## 6. Validation (step 7)

**Coherence check:**
- ✅ Every PRD FR maps to a service + an adapter surface (table above).
- ✅ NFR-4 structurally guaranteed: there is no behavior path that bypasses `services/` — adapters are thin.
- ✅ NFR-1/NFR-2 honored by Prisma `Decimal` + server-derived elapsed.
- ✅ Design mandate enforceable: tokens isolated in one package + CI lint gate.
- ✅ Agent contract stable and decoupled from the LLM (NFR-7).

**Risks & mitigations:**
- *MCP SDK / spec drift* (fast-moving) → pin `@modelcontextprotocol/sdk` 1.29.x; isolate all SDK usage in `mcp/` so an upgrade is one-directory.
- *Permission divergence* → single `assertCan`; a test asserts the same forbidden action is refused on both REST and MCP (PRD SM-4).
- *Budget double-alert* → idempotent emission keyed on the crossing; covered by SM-3 test.
- *Inline-CSS creep* → CI lint gate is blocking, not advisory.
- *Scope creep past the demo* → build sequence front-loads the agent loop; §9.2 items are explicitly after it.

**Open technical questions (for the team):**
- AQ-1 — Express 5 vs Hono for the host (both fine; Express chosen for SDK-example parity).
- AQ-2 — Token build: thin `build.ts` (recommended for hackathon) vs Style Dictionary (mirrors UX-spec DQ-2).
- AQ-3 — Live updates: short polling (MVP) vs WebSocket now (couples to FR-26).

---

## 7. Completion & Handoff (step 8)

**Artifacts:** this `architecture.md` (authoritative tech contract). It consumes the PRD + addendum + UX spec + tokens + research, and updates the addendum's dated versions (§0.1).

**First implementation story (non-negotiable order):** scaffold the pnpm monorepo + Node/Express service + a `ping` MCP tool on `/mcp`, verified with `npx @modelcontextprotocol/inspector` — *before any domain logic* (addendum §F step 1).

**Downstream:** `bmad-create-epics-and-stories` — epics map cleanly to services/features (use the §5 mapping); each story carries the §4 patterns + relevant FR consequences as acceptance criteria. Then `bmad-check-implementation-readiness`.

**Stack of record (verified 2026-05-22):** Node 24 LTS · TypeScript · `@modelcontextprotocol/sdk` 1.29.x (MCP spec 2025-11-25, Streamable HTTP) · Express 5 · Zod · Prisma 7 · PostgreSQL 18 · Vite 8 · React 19 · TanStack Query · React Hook Form · CSS Modules + design tokens · Vitest · pino · Docker Compose / Azure Container Apps.

---

### Sources (version verification, 2026-05-22)
- [@modelcontextprotocol/sdk — npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk) · [TypeScript SDK releases](https://github.com/modelcontextprotocol/typescript-sdk/releases)
- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25) · [2026 MCP Roadmap](https://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/)
- [Node.js releases](https://nodejs.org/en/about/previous-releases)
- [Prisma 7 release](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0)
- [PostgreSQL 18.x release news](https://www.postgresql.org/about/news/postgresql-183-179-1613-1517-and-1422-released-3246/)
- [Vite releases](https://vite.dev/releases)
