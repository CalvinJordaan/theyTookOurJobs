---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - docs/planning-artifacts/prds/prd-timekeeper-2026-05-22/prd.md
  - docs/planning-artifacts/prds/prd-timekeeper-2026-05-22/addendum.md
  - docs/planning-artifacts/architecture.md
  - docs/planning-artifacts/ux-design-specification.md
status: final
---

# TimeKeeper - Epic Breakdown

## Overview

This document decomposes the TimeKeeper PRD (FR-1…FR-26), the architecture decisions, and the UX design into implementable epics and stories. Epics are organized by **user value**, not technical layers; each epic is standalone (delivers complete value for its domain and does not require a *future* epic to function); each story is sized for a single dev-agent session and depends only on prior stories. Acceptance criteria are written Given/When/Then and carry the architecture's consistency patterns (§4) and the design mandate (token-only, no inline CSS) as testable conditions.

**Sequencing intent:** Epics 1–2 together deliver the **signature demo (UJ-5)** — an AI agent logs time and answers "hours on Project Alpha this week vs budget." Epic 3 makes the seeded workspace real (admin + access). Epic 4 adds governance + the event-native differentiator (PRD §9.2 Should/Stretch).

## Requirements Inventory

### Functional Requirements

- **FR-1** Start/stop a live Timer (one running per user, server-authoritative).
- **FR-2** Manual duration entry (day view).
- **FR-3** Weekly timesheet grid entry.
- **FR-4** Notes on a Time Entry.
- **FR-5** Billable/non-billable flag per Time Entry (defaults from Task Assignment).
- **FR-6** Edit/delete own Time Entries (unless approval-locked).
- **FR-7** Client management (create/edit/archive).
- **FR-8** Project management (name, code, billable, active, hours budget, dates).
- **FR-9** Task library (account-level tasks, archive).
- **FR-10** Task Assignment to a Project (per-project active/billable).
- **FR-11** Archive a Project (preserve history).
- **FR-12** User management (name, email, active, weekly capacity, contractor).
- **FR-13** Access Roles (Admin/PM/Member) enforced across web + MCP.
- **FR-14** User Assignment to Projects (+ PM flag).
- **FR-15** Submit a Timesheet for approval.
- **FR-16** Approve/reject a submitted Timesheet (lock on approve).
- **FR-17** Filtered time report (filters, totals, CSV).
- **FR-18** Project hours budget tracking (consumed vs budget).
- **FR-19** Team capacity report (logged vs weekly capacity).
- **FR-20** Over-budget threshold alert (single-fire per crossing).
- **FR-21** Emit Domain Events for core state changes.
- **FR-22** Reminders to log time (scheduled). *[Should]*
- **FR-23** MCP Tool discovery + invocation over Streamable HTTP.
- **FR-24** Read-only MCP Resources (`harvest://…`).
- **FR-25** Agent authentication + identity scoping.
- **FR-26** Surface Domain Events to Agents via MCP notifications. *[Stretch]*

### NonFunctional Requirements

- **NFR-1** Decimal hours/money (never float); consistent rounding.
- **NFR-2** Server-authoritative timer elapsed.
- **NFR-3** Concurrent MCP clients, no cross-session leakage.
- **NFR-4** Consistent semantics across web + MCP (one service/permission layer).
- **NFR-5** Domain events double as observability/audit backbone.
- **NFR-6** Responsiveness ~500ms p95 on seed data (demo target).
- **NFR-7** Model-agnostic MCP server (no LLM dependency).

### Additional Requirements

- **AR-1** Single-tenant (no `company_id`).
- **AR-2** Static bearer-token auth → User identity (OAuth 2.1 deferred).
- **AR-3** Stack of record (architecture §0.1/§7): Node 24 LTS · `@modelcontextprotocol/sdk` 1.29.x (MCP spec 2025-11-25, Streamable HTTP) · Express 5 · Zod · Prisma 7 · PostgreSQL 18 · Vite 8 + React 19 · CSS Modules + design tokens.
- **AR-4** Modular monolith, one process; behavior lives in the service layer; adapters (MCP/REST) are thin (architecture §3.1).
- **AR-5** Local Docker Compose demo default (OQ-7); Azure Container Apps optional.
- **AR-6** Consistency patterns (architecture §4): DB snake_case / API camelCase / MCP snake_case tool names / `domain.entity.action` events / uniform error envelope / Zod-at-boundary.

### UX Design Requirements

- **UX-DR-1** All styling via the design token system (`tokens.json`→`tokens.css`); **no inline CSS** — lint-gated in CI.
- **UX-DR-2** "Ledger & Dial" system: warm neutrals, teal accent, **red reserved for danger/over-budget only**; Fraunces/IBM Plex Sans/IBM Plex Mono (tabular numerals for all time/money).
- **UX-DR-3** WCAG 2.1 AA: keyboard operability, visible focus, ≥44px targets, color-never-sole-signal, `prefers-reduced-motion`.
- **UX-DR-4** Light default + first-class dark theme via `data-theme` + system pref.
- **UX-DR-5** Custom components per UX spec §10: App Shell, Timer Instrument, Weekly Grid, Budget Meter, Report Table, Capacity Bar, Status Pill, Agent Provenance Chip.
- **UX-DR-6** Inline-over-modal capture for the core loop; honest empty states; provenance shown on every entry/timer.

### FR Coverage Map

- **FR-1** → Epic 1 (timer, service+MCP+Timer Instrument)
- **FR-2** → Epic 1 (day-view manual entry)
- **FR-3** → Epic 1 (weekly grid)
- **FR-4** → Epic 1 (notes)
- **FR-5** → Epic 1 (billable flag)
- **FR-6** → Epic 1 (edit/delete own)
- **FR-7** → Epic 3 (clients)
- **FR-8** → Epic 3 (projects + hours budget config)
- **FR-9** → Epic 3 (task library)
- **FR-10** → Epic 3 (task assignments)
- **FR-11** → Epic 3 (project archive)
- **FR-12** → Epic 3 (users + capacity)
- **FR-13** → Epic 3 (full role enforcement; *own-data scoping baseline established in Epic 1 Story 1.2/1.3*)
- **FR-14** → Epic 3 (user assignments + PM flag)
- **FR-15** → Epic 4 (submit timesheet) *[Should]*
- **FR-16** → Epic 4 (approve/reject + lock) *[Should]*
- **FR-17** → Epic 2 (filtered time report + CSV)
- **FR-18** → Epic 2 (budget tracking + Budget Meter)
- **FR-19** → Epic 2 (capacity report)
- **FR-20** → Epic 4 (over-budget alert) *[Should]*
- **FR-21** → Epic 4 (domain events)
- **FR-22** → Epic 4 (reminders) *[Should]*
- **FR-23** → Cross-cutting, realized progressively in Epics 1–3 (each capability adds its MCP tools); transport + discovery established in Epic 1 Story 1.1/1.3
- **FR-24** → Cross-cutting (resources added alongside tools); core `harvest://` resources in Epic 1
- **FR-25** → Epic 1 (bearer auth → identity; applied by every subsequent tool/route)
- **FR-26** → Epic 4 (MCP notifications) *[Stretch]*

*NFR coverage:* NFR-1/2/3/4/7 established in Epic 1 and upheld throughout; NFR-5 in Epic 4; NFR-6 a cross-cutting AC on data views. *UX-DR coverage:* UX-DR-1/3/4 cross-cutting on every UI story; UX-DR-5 components land with their feature epics; UX-DR-2/6 throughout.

## Epic List

### Epic 1: Time Capture & the Agent Loop
A Member — and an AI Agent via MCP — can log time against a (seeded) project and task three ways (live timer, day entry, weekly grid), with notes and a billable flag, and see entries land. Establishes the walking skeleton, the shared service layer, bearer-token identity, the MCP transport + core tools/resources, and the themed app shell. Delivers UJ-1 and the **minimal viable agent demo**.
**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6 (+ FR-23/24/25 baseline; NFR-1/2/3/4/7; UX-DR-1–6).

### Epic 2: Reporting & Budgets
An Administrator/PM — and an Agent — can produce a filtered, exportable time report, watch a project's hours budget burn, and see team capacity. Completes the **signature demo (UJ-5)** plus UJ-3/UJ-4.
**FRs covered:** FR-17, FR-18, FR-19 (+ report MCP tools under FR-23/24).

### Epic 3: Workspace Management & Access
An Administrator can manage clients, projects (incl. hours-budget config), the task library, task assignments, users, and project user-assignments — and the three Access Roles are fully enforced identically across web and MCP. Turns the seeded workspace into a real, governed one.
**FRs covered:** FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-13, FR-14 (+ CRUD MCP tools under FR-23/24).

### Epic 4: Governance & Event-Native *(Should/Stretch — PRD §9.2)*
TimeKeeper emits domain events as work happens (the differentiator), fires a single over-budget alert per crossing, supports timesheet submit/approve, surfaces events to agents as MCP notifications, and reminds members to log time.
**FRs covered:** FR-21, FR-20, FR-15, FR-16, FR-26, FR-22 (+ NFR-5).

---

## Epic 1: Time Capture & the Agent Loop

**Goal:** Deliver the core "capture an hour → see it land" loop for both humans and agents, on a thin but real foundation. By the end, an AI agent can create and read time entries via MCP, a Member can run a live timer and log time in the Today screen, and the themed app shell renders — all through one service layer with decimal-correct, server-authoritative behavior.

### Story 1.1: Walking skeleton — MCP `ping` tool and themed app shell

As an **AI Agent** (and the dev team),
I want to connect to TimeKeeper's MCP server and call a tool, while the web app shell renders with the design system,
So that the end-to-end integration surface is proven before any domain logic.

**Acceptance Criteria:**

**Given** the pnpm monorepo is scaffolded per architecture §5 (`apps/server`, `apps/web`, `packages/{design-tokens,shared}`)
**When** the server starts (Node 24, Express 5) and exposes the MCP server at `/mcp` (Streamable HTTP, `@modelcontextprotocol/sdk` 1.29.x) with a single `ping` tool
**Then** `npx @modelcontextprotocol/inspector` can connect, list tools, and call `ping` to receive a `pong` result
**And** two MCP clients can connect concurrently without error (NFR-3).

**Given** the web app (Vite 8 + React 19)
**When** it loads
**Then** the App Shell renders (left rail + header + content) styled exclusively through `design-tokens` (`tokens.css` imported once)
**And** a repository-wide check finds **zero** inline `style=` / `style={{}}` usages and zero raw hex/px in component CSS (UX-DR-1) — the CI lint gate (ESLint + Stylelint + grep) passes.

**Given** the dark theme
**When** `data-theme="dark"` is set (or system prefers dark)
**Then** the shell re-themes using semantic tokens only, with no component logic branching on theme (UX-DR-4).

### Story 1.2: Core domain schema, seed data & bearer-token identity

As a **developer/agent integrator**,
I want the core entities, seed data, and authenticated identity in place,
So that time can be logged against real projects/tasks by an identified user.

**Acceptance Criteria:**

**Given** Prisma 7 + PostgreSQL 18
**When** migrations run
**Then** tables exist for User, Client, Project, Task, TaskAssignment, UserAssignment, TimeEntry (snake_case, plural; `time_entries.id` BigInt) with **no `company_id`** (AR-1), hours/budget columns typed `Decimal` (NFR-1), and `approval_status` modeled as an enum (no `is_closed`).
**And** `client` on a time entry is derived via project, not stored.

**Given** the seed script
**When** it runs
**Then** one account's demo data exists: ≥1 admin + ≥2 members, ≥2 clients, ≥3 projects (one with an hours budget), ≥4 tasks with task assignments, user assignments, and sample entries — enough to run UJ-5.

**Given** a request to `/mcp` or `/api` with `Authorization: Bearer <token>`
**When** the token maps to a seeded User
**Then** the request resolves to that User identity; a missing/invalid token is rejected before any operation runs (FR-25)
**And** the same auth middleware serves both surfaces (NFR-4).

### Story 1.3: Log and list time entries via the service layer and MCP tools

As an **AI Agent**,
I want to create, read, and list time entries through MCP tools,
So that I can log work and report what was logged on behalf of my identity. *(Minimal viable agent demo.)*

**Acceptance Criteria:**

**Given** the shared `TimeEntryService` with permission checks (`authz.assertCan`)
**When** the MCP tools `create_time_entry`, `get_time_entry`, `list_time_entries`, and lookups `list_projects`, `list_tasks`, `get_current_user` are invoked
**Then** they perform the operation via the service (no behavior in the tool handler, AR-4) and return structured, camelCase JSON results (AR-6)
**And** tool names and input schemas (Zod) match the catalogue exactly (FR-23) and are discoverable via `tools/list`.

**Given** a `create_time_entry` for a project/task the identity is assigned to
**When** it includes `spentDate` + decimal `hours` (+ optional notes, billable)
**Then** a TimeEntry is persisted with those values and returned; `hours` is stored/serialized as decimal (NFR-1).

**Given** a `create_time_entry` for a project the identity is **not** assigned to
**When** it is invoked
**Then** it returns a structured error with a clear reason (not a silent failure), realizing the UJ-5 edge case (FR-23, FR-25).

**Given** the core read-only resources
**When** an agent reads `harvest://users/me` and `harvest://projects`
**Then** current, identity-scoped data is returned (FR-24).

### Story 1.4: Live timer — start/stop, server-authoritative + Timer Instrument

As a **Member**,
I want to start and stop a live timer for a project/task,
So that I capture time precisely while I work. *(Realizes UJ-1, FR-1.)*

**Acceptance Criteria:**

**Given** `TimerService` and the MCP tools `start_timer`/`stop_timer` (+ REST equivalents)
**When** a timer is started
**Then** a running TimeEntry is created (`isRunning=true`, server `timer_started_at`); starting a second timer **auto-stops the first in the same operation** and the response says so (FR-1).

**Given** a running timer
**When** it is stopped
**Then** elapsed time is computed **server-side** and written as decimal `hours`, `isRunning=false`, timestamp cleared (NFR-2); a sub-minute stop still yields a valid entry.

**Given** the Today screen
**When** a timer runs
**Then** the **Timer Instrument** shows a mono tabular elapsed readout and the teal "live dial" pulse (UX-DR-2/5), exposes elapsed via `aria-live` at minute cadence, and stops pulsing under `prefers-reduced-motion` (UX-DR-3); reloading mid-run shows correct elapsed (NFR-2).

**Given** a timer started by an agent
**When** the Today screen renders it
**Then** an **Agent Provenance Chip** indicates it was started by an Agent (UX-DR-6).

### Story 1.5: Day-view manual entry — notes, billable, edit/delete own

As a **Member**,
I want to add, edit, and delete my own time entries for a day with notes and a billable flag,
So that I can log time after the fact and keep it accurate. *(FR-2, FR-4, FR-5, FR-6.)*

**Acceptance Criteria:**

**Given** the Today screen and `/api` routes over `TimeEntryService`
**When** a Member enters a project/task + decimal hours for a date
**Then** a TimeEntry is created and appears in the day list with row + day totals in mono tabular figures (FR-2; UX-DR-2).

**Given** a new entry
**When** it is created
**Then** its billable flag defaults from the Task Assignment and is toggleable; notes are optional and persist and appear wherever the entry is read (FR-4, FR-5).

**Given** a Member's own `unsubmitted` entry
**When** they edit or delete it
**Then** the change is applied; a Member cannot edit another Member's entry (own-data scoping baseline for FR-13); an approval-locked entry refuses edit/delete with a clear reason (FR-6).

**Given** any data view
**When** there are no entries
**Then** an explicit empty state shows (not a blank or error) (UX-DR-6).

### Story 1.6: Weekly timesheet grid entry

As a **Member**,
I want to fill in my week in a keyboard-first grid,
So that I can reconstruct hours quickly without per-entry forms. *(Realizes UJ-2, FR-3.)*

**Acceptance Criteria:**

**Given** the week view with a 7-column grid (one row per assigned project/task)
**When** a Member types decimal hours into a day cell and moves focus
**Then** a TimeEntry is created — or updated if one exists for that user/project/task/date (no duplicates); row and day totals update (FR-3).

**Given** a filled cell
**When** the Member enters `0` or clears it
**Then** the corresponding TimeEntry is deleted (FR-3).

**Given** the grid
**When** navigated by keyboard
**Then** it uses grid semantics (`role="grid"`/`gridcell`), arrow-key movement, and visible focus (UX-DR-3); an `approved` cell is read-only/locked with a lock indicator; a daily total >24h is allowed but flagged with a non-blocking, politely-announced warning (FR-3).

---

## Epic 2: Reporting & Budgets

**Goal:** Turn captured time into the answers the product exists to give. By the end, an Admin/PM (and an agent) can run a filtered, exportable time report, see hours-budget burn on a project with the Budget Meter, and read team capacity — completing the signature demo's "how many hours on Project X this week vs budget?" question.

### Story 2.1: Filtered time report with CSV export

As an **Administrator or Project Manager** (or an **Agent**),
I want a report of time entries filtered by date/user/project/client/task/billable with totals,
So that I can review tracked time and export it. *(Realizes UJ-4, UJ-5; FR-17.)*

**Acceptance Criteria:**

**Given** `ReportService.runTimeReport` exposed via the MCP tool `run_time_report` and `/api`
**When** filters (date range + any of user/project/client/task/billable) are applied
**Then** rows return with date, user, client, project, task, hours, billable, notes, plus total hours and total billable hours for the set (FR-17).

**Given** a Project Manager runs the report
**When** they pass a project they do not manage
**Then** results are still scoped to their managed projects only — identical refusal on web and MCP (NFR-4; baseline FR-13).

**Given** a result set
**When** the user exports
**Then** a CSV with the same columns downloads; an empty result shows "No time tracked for these filters" (FR-17; UX-DR-6).

**Given** the Reports UI
**When** the table renders
**Then** numeric columns use mono tabular figures and a totals row in primary text (UX-DR-2), styled via tokens only (UX-DR-1).

### Story 2.2: Project hours-budget tracking + Budget Meter

As a **Project Manager** (or an **Agent**),
I want to see hours budgeted vs consumed for a project,
So that I can catch overruns early. *(Realizes UJ-3; FR-18.)*

**Acceptance Criteria:**

**Given** a project with an hours budget and `ReportService` / MCP `run_project_budget_report`
**When** time is logged
**Then** consumed hours = sum of the project's entries, and budgeted/consumed/percentage are returned; the figure reflects newly logged time within 60s (FR-18, NFR-6).

**Given** a monthly-budget project
**When** budget is computed
**Then** consumption is evaluated against the current calendar month only (FR-18).

**Given** the Budget Meter UI
**When** consumption is under / nearing (≥ threshold) / over budget
**Then** it shows success / warning / danger states by **color + label + bar position** (never color alone), with `role="progressbar"` and aria values (UX-DR-2/3); over-budget uses the reserved red.

**Given** `show_budget_to_all` is set on a project
**When** an assigned Member views it
**Then** they can see the budget bar; otherwise only PM/Admin can (FR-18).

### Story 2.3: Team capacity report + Capacity Bar

As an **Administrator**,
I want each user's logged hours vs their weekly capacity for a week,
So that I can see who is overloaded or has bandwidth. *(FR-19.)*

**Acceptance Criteria:**

**Given** `ReportService.runCapacityReport` (+ MCP tool/REST)
**When** a week is selected
**Then** every active user is listed with logged hours, weekly capacity, and remaining/over capacity; users with no logged time appear with zero, not omitted (FR-19).

**Given** the Capacity Bar UI
**When** a user is over capacity
**Then** it is shown in **warning** (not danger — over-capacity is not an error), styled via tokens (UX-DR-2).

---

## Epic 3: Workspace Management & Access

**Goal:** Replace seeded structure with admin-managed structure and enforce the full permission model. By the end, an Administrator can manage the whole workspace via web and MCP, and Admin/PM/Member boundaries are enforced identically on both surfaces.

### Story 3.1: Manage clients

As an **Administrator**,
I want to create, edit, and archive clients,
So that projects have an owning client. *(FR-7.)*

**Acceptance Criteria:**

**Given** `ClientService` (+ MCP `create_client`/`list_clients`/`get_client`, REST, UI)
**When** an Admin creates a client with a name
**Then** it is created active; archiving sets it inactive, hides it from new-work selectors, and preserves its projects/history (FR-7).
**And** a non-Admin attempting client management is refused identically on web and MCP (NFR-4, FR-13).

### Story 3.2: Manage projects with hours-budget configuration

As an **Administrator**,
I want to create and edit projects including the hours budget settings,
So that work can be tracked and budgeted. *(FR-8, FR-11.)*

**Acceptance Criteria:**

**Given** `ProjectService` (+ MCP `create_project`/`update_project`/`list_projects`/`get_project`, UI)
**When** an Admin creates a project under a client with a name
**Then** it is created active + billable; optional code, hours budget, `budget_is_monthly`, over-budget threshold %, `show_budget_to_all`, and start/end dates can be set (FR-8).

**Given** a project
**When** an Admin archives it (FR-11)
**Then** it disappears from Members' selectors and accepts no new entries, while its historical entries remain queryable in reports (FR-11).
**And** monetary/rate/`bill_by`/`budget_by` config is **out of scope** (PRD §8) — hours budget only.

### Story 3.3: Task library and per-project task assignments

As an **Administrator**,
I want an account-level task library and control over which tasks apply to each project,
So that members log against the right, project-appropriate tasks. *(FR-9, FR-10.)*

**Acceptance Criteria:**

**Given** `TaskService` (+ MCP `create_task`/`list_tasks`, UI)
**When** an Admin creates a task with a name + billable-by-default flag
**Then** it joins the library; archiving removes it from new-assignment lists without altering existing assignments/entries (FR-9).

**Given** task assignments (+ MCP `list_project_task_assignments`)
**When** an Admin activates/deactivates a task on a project and sets its billable default
**Then** a Member can only log against tasks with an active assignment on that project (enforced in selector and on write) (FR-10).

### Story 3.4: Manage users and weekly capacity

As an **Administrator**,
I want to create, edit, and archive users with their weekly capacity,
So that the right people can log time and capacity reporting works. *(FR-12.)*

**Acceptance Criteria:**

**Given** `UserService` (+ MCP `list_users`/`get_current_user`, UI)
**When** an Admin creates a user with name + unique email
**Then** the user is created active with Member role; weekly capacity is stored in a single documented unit (hours) and powers FR-19 (FR-12).

**Given** a user with history
**When** archived
**Then** their entries are preserved and they leave active selectors (FR-12).

### Story 3.5: Project user-assignments and PM flag

As an **Administrator**,
I want to assign users to projects and optionally mark them project manager,
So that only assigned people log time and PMs gain project-scoped authority. *(FR-14.)*

**Acceptance Criteria:**

**Given** `AssignmentService` (+ MCP `list_user_project_assignments`, UI)
**When** an Admin assigns a user to a project
**Then** only assigned users (plus Admins) appear as eligible loggers and can create entries on that project (FR-14).

**Given** a user assignment
**When** the PM flag is set
**Then** that user gains Project-Manager permissions for that project only (used by FR-13) (FR-14).

### Story 3.6: Access-role enforcement across web and MCP

As an **Administrator**,
I want Admin/PM/Member boundaries enforced identically on both the web app and the MCP server,
So that no one — human or agent — can exceed their role. *(FR-13, NFR-4; validates SM-4.)*

**Acceptance Criteria:**

**Given** the shared `authz.assertCan(actor, action, resource)` used by every service
**When** a Member acts
**Then** they can read/write only their own entries and read only assigned projects; a PM can additionally read/approve entries and read budget/reports for managed projects only; an Admin can do everything (FR-13).

**Given** an identical out-of-scope action (e.g., a Member reading another Member's entries)
**When** attempted via the web REST API and via the MCP tool
**Then** **both** refuse with the same machine-readable reason — proven by a test asserting parity (NFR-4, SM-4); raw IDs that bypass the UI are still refused.

---

## Epic 4: Governance & Event-Native *(Should/Stretch — PRD §9.2)*

**Goal:** Add the event-native differentiator and lightweight governance. By the end, the system emits domain events as work happens (audit backbone), fires exactly one over-budget alert per crossing, supports timesheet submit/approve with locking, can push events to agents as MCP notifications, and reminds members to log.

### Story 4.1: Emit domain events + persisted event log

As an **operator/auditor**,
I want the system to emit and persist domain events for core state changes,
So that activity is observable and downstream reactions are possible. *(FR-21, NFR-5; enables 4.2, 4.5.)*

**Acceptance Criteria:**

**Given** the in-process event bus (architecture §3.4)
**When** core state changes occur
**Then** events are emitted for at least: `timer.started`, `timer.stopped`, `time_entry.created`, `time_entry.updated`, `time_entry.deleted`, `budget.threshold_crossed`, `timesheet.submitted`, `timesheet.approved` (FR-21).

**Given** a single logical state change
**When** the operation (and any retry) runs
**Then** exactly one event is emitted (idempotent), each carrying entity id(s), actor `userId`, and a timestamp (FR-21).

**Given** persisted events
**When** an Admin reviews activity
**Then** the event log serves as the who-did-what-when audit trail (NFR-5).

### Story 4.2: Over-budget threshold alert (single-fire)

As a **Project Manager**,
I want one alert when a project crosses its over-budget threshold,
So that I'm warned without being nagged. *(Realizes UJ-3; FR-20.)*

**Acceptance Criteria:**

**Given** a handler on `budget.threshold_crossed`
**When** an entry pushes consumed hours to/over the threshold % of the hours budget
**Then** the responsible PM/Admin is alerted **once per crossing**, never on subsequent over-budget entries (FR-20).

**Given** entries are deleted back under threshold
**When** the total later crosses again
**Then** no "back under budget" alert is sent, and the single alert re-arms for the next crossing (FR-20); monthly budgets evaluate against the monthly total.

### Story 4.3: Submit a timesheet for approval

As a **Member**,
I want to submit my entries for a date range for approval,
So that my time can be reviewed. *(FR-15.)*

**Acceptance Criteria:**

**Given** `TimesheetService.submit` (+ MCP `submit_timesheet`, UI)
**When** a Member submits a date range
**Then** all their `unsubmitted` entries in range become `submitted` and the count is reported; a `timesheet.submitted` event fires (FR-15, FR-21).

### Story 4.4: Approve or reject a submitted timesheet

As a **Project Manager or Administrator**,
I want to approve or reject submitted entries,
So that time is verified and locked. *(FR-16.)*

**Acceptance Criteria:**

**Given** approval actions over `TimesheetService` (scoped by FR-13)
**When** a PM/Admin approves submitted entries on a project they manage
**Then** entries become `approved` and lock (edit/delete refused per FR-6, grid cells read-only per FR-3); a `timesheet.approved` event fires (FR-16, FR-21).

**Given** a rejection
**When** applied
**Then** entries return to `unsubmitted` with the actor recorded; a PM cannot act on projects they don't manage (FR-16, FR-13).

### Story 4.5: Surface domain events to agents via MCP notifications *(Stretch)*

As an **AI Agent**,
I want to receive notifications when subscribed domain events occur,
So that I can react without polling — the event-native payoff. *(FR-26.)*

**Acceptance Criteria:**

**Given** the MCP notification bridge over the event bus
**When** a subscribed event (e.g., `budget.threshold_crossed`) occurs
**Then** a connected agent receives a notification without polling, scoped to the identity's permissions (FR-26, NFR-4).

### Story 4.6: Scheduled reminders to log time *(Should)*

As a **Member**,
I want a scheduled reminder when I haven't logged time,
So that I don't forget to record work. *(FR-22.)*

**Acceptance Criteria:**

**Given** an Admin-enabled schedule (e.g., daily/weekly)
**When** the schedule runs
**Then** members who have not met the period's expectation (≥1 entry for the period) are reminded; those who have are not (FR-22).
