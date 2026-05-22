---
title: TimeKeeper
status: final
created: 2026-05-22
updated: 2026-05-22
owner: Product (John, PM) — on behalf of the MC Foundry hackathon team
source_inputs:
  - research/findings.md
  - research/product-scope.md
  - research/data-model.md
  - research/mcp-server.md
---

# PRD: TimeKeeper
*Working title — an agent-native, internal rebuild of Harvest's time-tracking core. Confirm the name (see §11 Open Questions, OQ-1).*

## 0. Document Purpose

This PRD defines **TimeKeeper**, the product the MC Foundry hackathon team will build: an internal, single-tenant time-tracking application that rebuilds the *core* of Harvest and exposes a first-class **MCP Server** so AI agents can operate it. It is written for the hackathon build team (engineers, the agent author) and reviewers, and it is the source for the downstream UX, architecture, and epic/story workflows. Vocabulary is anchored in §3 Glossary and used verbatim throughout; features are grouped with globally numbered Functional Requirements (FR-N) nested under them; inferences carry inline `[ASSUMPTION]` tags collected in §13. Technical *how* — stack, transport, the full MCP tool/resource surface, the database schema — lives in `addendum.md` beside this file, not here; this PRD states capabilities. The research this PRD builds on lives in `research/` (findings, product-scope, data-model, mcp-server) and is not duplicated.

One framing note. The hackathon has **two agent layers**: *build-time* agents that generate this codebase (the "agentic framework" / SDLC concern), and *run-time* agents that operate TimeKeeper through its MCP Server. This PRD scopes **the product and its run-time agent surface only**. The build-time agentic framework is a separate concern and is an explicit Non-Goal of this document (§8).

## 1. Vision

Professional-services teams live or die by where their hours go, but the tools that capture those hours were built for humans clicking buttons — not for the AI assistants that increasingly do the clicking. TimeKeeper rebuilds the part of Harvest that actually matters every day — log time against a client's project and task, watch budget burn in real time, report on it — and makes that loop **operable by an AI agent as a first-class user**, not an afterthought bolted on through a brittle REST integration.

The bet is simple and specific: the real Harvest has **no event layer and no agent interface** — integrators can only poll its REST API. TimeKeeper inverts that. It is **MCP-native** (agents discover and invoke its capabilities through a Model Context Protocol server) and **event-native** (the system emits domain events as work happens). An agent can start a timer, log an afternoon's work, and answer "how many hours did we burn on Project Alpha this week versus budget?" — through one standard protocol, with no scraping and no polling.

For the hackathon, success is a working internal time tracker whose signature demo is an agent doing exactly that, end to end, against real data. TimeKeeper is deliberately *not* a billing product; it nails the time-tracking core that is genuinely useful on its own, and proves that core can be driven by both people and agents.

## 2. Target User

TimeKeeper serves a small internal services team plus the agents that act on its behalf. Four personas drive the requirements; each one shapes decisions in this PRD.

### 2.1 Primary Personas

- **Member** — a team member (employee or contractor) who logs their own hours. Wants to record time with the least friction possible (a timer when working live; a grid on Friday when catching up) and rarely thinks about TimeKeeper otherwise. Sees only their own time and the projects they're assigned to.
- **Project Manager (PM)** — a Member additionally responsible for one or more projects. Watches budget burn, reviews and approves their team's submitted time, and needs to catch scope creep before it becomes a problem. Sees their managed projects' data; not the whole account.
- **Administrator** — runs the account: creates clients, projects, tasks, and users; assigns people to projects; sets budgets; pulls reports across everyone. The only role that sees everything.
- **AI Agent (run-time)** — an MCP client (Claude Code, the team's custom agent on Azure AI Foundry, MCP Inspector, VS Code, etc.) that operates TimeKeeper *on behalf of an authenticated identity*, through the MCP Server. It performs the same operations a human would — track time, query reports, manage projects — but discovers capabilities programmatically via the protocol. The Agent is a peer interface to the web UI, not a bridge over it.

### 2.2 Jobs To Be Done

- *When I'm doing client work right now,* I want to capture the time without arithmetic, *so that* my logged hours are accurate.
- *When I forgot to track during the week,* I want to fill in a weekly grid quickly, *so that* Friday's reconstruction takes minutes, not an hour.
- *When I'm accountable for a project's budget,* I want to see burn-vs-budget without asking anyone, *so that* I can act before the budget is gone.
- *When I'm running the account,* I want to slice tracked hours by person, project, and date, *so that* I can answer questions for finance, clients, and planning.
- *When I'm an agent asked to "log my afternoon" or "report on Project Alpha,"* I want to discover and call the right operations through one protocol, *so that* I can complete the task without bespoke integration code.

### 2.3 Non-Users (v1)

- **Clients / external billing recipients.** TimeKeeper is internal; there is no client-facing portal, invoice, or payment surface (§8).
- **Finance / AR.** No invoicing, estimates, or accounting sync means no AR workflow in v1.
- **Build-time coding agents** as *users of the product*. They build TimeKeeper; they are not a run-time persona it serves.

### 2.4 Key User Journeys

Journeys are numbered globally (UJ-1…UJ-5). FRs reference them inline ("realizes UJ-3"). UJ-5 is the **signature demo** and the highest-priority journey for the hackathon.

- **UJ-1. Maya starts a timer the moment she picks up client work.**
  Maya (Member), authenticated in the web app, opens her day view, picks Project Alpha and the "Development" task, and presses **Start**. A running timer appears and counts up. Two hours later she presses **Stop**; the entry lands in her day view at 2.00h with a notes box she fills in. **Edge case:** she starts a second timer without stopping the first — TimeKeeper stops the first automatically (one running timer per user) and tells her it did.

- **UJ-2. Devon reconstructs the week in the Friday grid.**
  Devon (Member) opens the week view: a 7-column grid, one row per project/task he's assigned to. He types `3`, `2`, `4` across Tuesday–Thursday for "Design," tabs away, and each cell saves as a time entry; row and column totals update live. Typing `0` into a filled cell clears that entry. A row that's already been approved shows a lock icon and is read-only.

- **UJ-3. Priya catches a project going over before it blows up.**
  Priya (PM) opens Project Alpha's detail and sees a budget bar: 64 of 80 budgeted hours used. Her team logs more during the day; when the total crosses the 80% threshold, TimeKeeper sends her one alert (not one per entry afterwards). She opens the time report filtered to Alpha to see who's burning hours and on what.

- **UJ-4. Sam pulls the weekly hours report.**
  Sam (Admin) opens Reports → Time, filters to last week and the whole team, and sees rows of date/user/client/project/task/hours/billable/notes with a totals row, then exports to CSV for the ops review. Filtering to a single Member or project narrows it instantly.

- **UJ-5. An agent logs an afternoon and answers the budget question. *(signature demo)***
  An AI Agent connected to the MCP Server is told: *"Log 2 hours on Project Alpha for the Design task today, then tell me how many hours we've burned on Alpha this week versus budget."* The agent discovers the available tools, calls the one that creates a time entry (resolving Alpha and Design from the project/task lookups), then calls the time-report and budget tools, and answers in prose: *"Logged. Alpha is at 41 of 80 hours this week — 51% of budget."* **Edge case:** the agent is asked to log against a project the authenticated identity isn't assigned to — the operation is refused with a clear, machine-readable reason, and the agent relays it.

## 3. Glossary

Downstream workflows and readers use these terms exactly. FRs, UJs, and SMs use them verbatim; no synonyms appear elsewhere in this PRD.

- **Client** — an organization (or internal department) work is done for. Top of the hierarchy; owns Projects. Has a name and active/archived state.
- **Project** — a unit of work belonging to exactly one Client. Carries a name, optional code, billable flag, active/archived state, an optional **Hours Budget**, and optional start/end dates. Time is logged against Projects (through Tasks).
- **Task** — a *type* of work (e.g. "Design," "Development," "Meeting"), defined once at the account level and reused across Projects via a **Task Assignment**.
- **Task Assignment** — the link that makes a Task available on a Project, with a per-Project active flag and billable default. The set of Task Assignments defines what a Member can log against on that Project.
- **User Assignment** — the link that grants a User access to log time on a Project, optionally marking them **Project Manager** for that Project. A User can only log time on Projects they are assigned to (Admins excepted).
- **Time Entry** — the atomic record of work: a User's hours on a Project + Task for a **Spent Date**, with notes, a billable flag, an **Approval Status**, and (when timed) timer state. The core entity of the system.
- **Timer** — the running state of a Time Entry being tracked live. At most one Timer is running per User at any time.
- **Spent Date** — the calendar date a Time Entry's work is attributed to.
- **Hours Budget** — a Project's budgeted hours, against which logged hours are compared. May reset monthly. Has an over-budget alert threshold (a percentage).
- **Weekly Capacity** — a User's available hours per week, used by the Capacity Report.
- **Timesheet** — the set of a User's Time Entries for a date range, viewed and acted on as a unit (submitted for approval).
- **Approval Status** — a Time Entry's lifecycle state: **unsubmitted → submitted → approved**. Approved entries are locked from editing.
- **Access Role** — a User's account-level permission level: **Administrator**, **Project Manager**, or **Member**. (Project Manager is conferred per-Project via a User Assignment's PM flag; "PM" as an Access Role means a Member who manages at least one Project.)
- **MCP Server** — the Model Context Protocol server TimeKeeper exposes, through which an AI Agent discovers and invokes capabilities.
- **Tool** — an MCP capability an Agent can *invoke* to take an action or run a query (e.g. create a Time Entry, run a report).
- **Resource** — read-only MCP context an Agent can *read* (e.g. the current User, the list of active Projects) identified by a `harvest://` URI.
- **Domain Event** — a record that something happened in the system (a Timer started, a Time Entry created, a budget threshold crossed), emitted as work occurs.
- **AI Agent** — an MCP client operating TimeKeeper on behalf of an authenticated identity (see §2.1).

## 4. Features

Each feature gives a behavioral description, then nested FRs with testable consequences. FRs are numbered globally (FR-1…FR-26) so downstream artifacts have stable references. Items deferred past MVP are marked `[DEFERRED — Should/Stretch]` inline and consolidated in §9.2; capabilities that are hard non-goals (never in scope) are marked `[NON-GOAL for MVP]` and consolidated in §8.

### 4.1 Time Tracking

**Description:** The core loop — Members record hours against a Project + Task in whichever of three modes fits the moment: a **live Timer** while working, **manual day entry** after the fact, or a **weekly grid** to reconstruct a week. Every Time Entry carries free-text notes and a billable flag. A Member can only track against Projects they hold a User Assignment for, and only Tasks with an active Task Assignment on that Project. Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-1: Start and stop a live Timer
A Member can start a Timer on a Project + Task, and stop it, from the web app. Realizes UJ-1.

**Consequences (testable):**
- Starting a Timer creates a running Time Entry with `is_running = true` and a server-side start timestamp set to the current UTC time.
- At most one Timer runs per User: starting a second Timer stops the currently running one first, in the same operation, and the response indicates the prior Timer was stopped.
- Stopping a Timer sets `is_running = false` and writes elapsed time, converted to decimal hours, into the entry's hours; the start timestamp is cleared.
- Elapsed time is computed **server-side**: if the browser closes with a Timer running, the Timer is still running on next login and shows correct elapsed time.
- A Timer stopped after under one minute still produces a valid entry (hours ≥ 0, rounded per the configured precision).

#### FR-2: Manual duration entry (day view)
A Member can enter hours directly for a Project + Task on a given Spent Date without a Timer. Realizes UJ-1.

**Consequences (testable):**
- Submitting a Project + Task + Spent Date + hours creates a Time Entry with those values and `is_running = false`.
- Hours accept decimal values (e.g. `1.5`); invalid (negative, non-numeric) values are rejected with a field-level error.

#### FR-3: Weekly timesheet grid entry
A Member can enter hours across a week in a grid (one row per Project/Task, one column per day). Realizes UJ-2.

**Consequences (testable):**
- Entering a value in a day cell creates a Time Entry for that User/Project/Task/date, or updates the existing one if present (no duplicate entry for the same cell).
- Entering `0` (or clearing) a cell that has an entry deletes that entry.
- Row totals (per Project/Task) and column totals (per day) reflect saved values after each save.
- A cell whose entry has Approval Status `approved` is read-only and visibly locked; attempting to edit it is refused.
- A daily column total exceeding 24 hours is permitted but flagged with a non-blocking warning. `[ASSUMPTION: TimeKeeper mirrors Harvest in allowing >24h/day to support multi-shift logging.]`

**Notes:** the read-only lock on `approved` cells depends on the approval workflow (FR-16). If FR-15/FR-16 are deferred (§9.2), no entry ever reaches `approved`, so this lock stays dormant but should remain coded. `[NOTE FOR PM: FR-3 cell-lock is inert unless FR-16 ships.]`

#### FR-4: Notes on a Time Entry
A Member can attach free-text notes to any Time Entry. Realizes UJ-1, UJ-4.

**Consequences (testable):**
- Notes are saved with the entry and returned wherever the entry is read (day view, week grid, reports, MCP responses).
- Notes are optional by default and may be empty.

#### FR-5: Billable / non-billable flag per Time Entry
Each Time Entry carries a billable flag, defaulting from the Task Assignment and overridable by the logger.

**Consequences (testable):**
- A new entry's billable flag defaults to the Task Assignment's billable default for that Project.
- The logger can toggle the flag on their own entry; the chosen value persists and appears in reports' billable totals (FR-17).

#### FR-6: Edit and delete own Time Entries
A Member can edit or delete their own Time Entries unless locked by approval.

**Consequences (testable):**
- A Member can change the Project, Task, Spent Date, hours, notes, and billable flag of their own `unsubmitted` entry.
- Editing or deleting an `approved` (locked) entry is refused with a clear reason.
- Members cannot edit other Members' entries (PM/Admin scope is governed by FR-13).

**Notes:** the "`approved` blocks editing" rule depends on the approval workflow (FR-16); if approval is deferred (§9.2), entries never lock via approval and this guard is dormant. `[NOTE FOR PM: revisit if FR-16 is cut.]`

### 4.2 Clients, Projects & Tasks

**Description:** The structure time is logged against. An Administrator manages Clients, Projects, the account-level Task library, and which Tasks are available on which Projects. Archiving (not deleting) preserves historical Time Entries. Realizes UJ-3, UJ-4.

**Functional Requirements:**

#### FR-7: Client management
An Administrator can create, edit, and archive Clients.

**Consequences (testable):**
- A Client requires a name; created Clients default to active.
- Archiving a Client (active = false) hides it from selectors for new work but preserves its Projects and their historical Time Entries.

#### FR-8: Project management
An Administrator can create and edit a Project under a Client, including its name, optional code, billable flag, active state, optional Hours Budget (with monthly-reset and alert-threshold settings), and optional start/end dates. Realizes UJ-3.

**Consequences (testable):**
- A Project requires a Client and a name; created Projects default to active and billable.
- Setting an Hours Budget enables budget tracking (FR-18) and over-budget alerts (FR-20) for that Project.
- `[NON-GOAL for MVP]` Cost/monetary budgets, fixed-fee, `bill_by`/`budget_by` rate modes, and rate configuration are deferred (§9.2) — MVP budgets are **hours** only.

#### FR-9: Task library
An Administrator can create and archive account-level Tasks reused across Projects.

**Consequences (testable):**
- A Task requires a name and carries a billable-by-default flag.
- Archiving a Task removes it from the list offered for new Task Assignments but does not alter existing assignments or entries.

#### FR-10: Task Assignment to a Project
An Administrator can make Tasks available on a Project and set their per-Project active flag and billable default.

**Consequences (testable):**
- A Member can only log a Time Entry against a Task that has an active Task Assignment on that Project (enforced in the selector and on write).
- Deactivating a Task Assignment hides the Task on that Project for new entries without affecting existing entries.

#### FR-11: Archive a Project
An Administrator can archive a Project to remove it from active views while preserving its history.

**Consequences (testable):**
- An archived Project does not appear in Members' Project selectors and cannot receive new Time Entries.
- Its historical Time Entries remain queryable in reports (FR-17).

### 4.3 Team & Access

**Description:** Who can do what. Administrators manage Users and assign them to Projects; the three Access Roles (Administrator, Project Manager, Member) define the permission boundaries that every other feature enforces. Realizes UJ-3, UJ-4, UJ-5.

**Functional Requirements:**

#### FR-12: User management
An Administrator can create, edit, and archive Users (name, email, active state, Weekly Capacity, employee/contractor flag).

**Consequences (testable):**
- A User requires a name and a unique email; created Users default to active and Member role.
- Archiving a User preserves their historical Time Entries and removes them from active selectors.
- Weekly Capacity is stored in a single documented unit and powers the Capacity Report (FR-19). `[ASSUMPTION: TimeKeeper stores Weekly Capacity in hours and converts at any Harvest-compatible boundary, where Harvest uses seconds.]`

#### FR-13: Access Roles and permission enforcement
The system enforces a three-level Access Role model — Administrator, Project Manager, Member — across all features and both interfaces (web and MCP).

**Consequences (testable):**
- A **Member** can read/write only their own Time Entries and read only Projects they're assigned to.
- A **Project Manager** can additionally read and approve Time Entries of Members on Projects they manage, and read those Projects' budget/report data; they cannot reach Projects they don't manage.
- An **Administrator** can read/write all entities and all Time Entries, and configure the account.
- A permission check failure returns a clear, machine-readable refusal (same semantics over web and MCP); raw IDs supplied to bypass the UI (e.g. an unmanaged Project's ID) are still refused.

#### FR-14: User Assignment to Projects
An Administrator can assign Users to Projects and mark a User as Project Manager for a Project.

**Consequences (testable):**
- Only assigned Users (plus Administrators) appear as eligible loggers and can create Time Entries on a Project.
- Setting the PM flag on a User Assignment grants that User the Project-Manager permissions in FR-13 for that Project only.

### 4.4 Timesheets & Approval

**Description:** Lightweight governance. A Member submits their Timesheet for a period; a PM or Administrator approves it, which locks the entries. Realizes UJ-3. `[ASSUMPTION: an internal tracker benefits from submit/approve even though it's an Enterprise-tier feature in Harvest; included as a Should for MVP.]`

**Functional Requirements:**

#### FR-15: Submit a Timesheet for approval
A Member can submit their Time Entries for a date range, moving them to Approval Status `submitted`.

**Consequences (testable):**
- Submitting transitions all `unsubmitted` entries in the range for that User to `submitted` and reports how many were submitted.
- `submitted` entries remain editable by the owner only until approved. `[ASSUMPTION: edits are allowed in submitted state and reset nothing; lock happens at approval. Confirm — OQ-6.]`

#### FR-16: Approve or reject a submitted Timesheet
A PM (for their Projects) or Administrator can approve or reject submitted entries.

**Consequences (testable):**
- Approving transitions entries to `approved` and locks them (FR-3, FR-6 enforce the lock).
- Rejecting returns entries to `unsubmitted` with the actor recorded.
- A PM can only act on entries belonging to Projects they manage (FR-13).

### 4.5 Reporting

**Description:** The analytical payoff — the output that proves the system works and answers the questions Admins, PMs, and Agents ask. Three reports: filtered time, project budget, and team capacity. Realizes UJ-3, UJ-4, UJ-5.

**Functional Requirements:**

#### FR-17: Filtered time report
An Administrator or PM can produce a report of Time Entries filtered by date range and any of user, project, client, task, and billable status, with totals and CSV export. Realizes UJ-4, UJ-5.

**Consequences (testable):**
- The report returns rows with date, user, client, project, task, hours, billable, and notes, plus a summary of total hours and total billable hours for the filtered set.
- A PM running the report sees only entries on Projects they manage, even if they pass another Project's filter value (FR-13).
- The result is exportable to CSV with the same columns.
- An empty result returns zero rows and an explicit "no time tracked for these filters" state, not an error.

#### FR-18: Project budget tracking
An Administrator or PM can see hours budgeted vs. consumed for a Project, as a total and a percentage. Realizes UJ-3.

**Consequences (testable):**
- Consumed hours equal the sum of the Project's Time Entries' hours; the figure reflects newly logged time within 60 seconds (or live).
- The view shows budgeted hours, consumed hours, and percentage consumed.
- When a Project's `budget_is_monthly` is set, consumption is computed against the current calendar month only.
- If a Project is configured to show budget to all, assigned Members can also see the bar; otherwise only PM/Admin can. `[ASSUMPTION: a show-budget-to-all flag exists per Project, mirroring Harvest.]`

#### FR-19: Team capacity report
An Administrator can see each User's logged hours vs. their Weekly Capacity for a week. Realizes UJ-5 (supports agent capacity questions).

**Consequences (testable):**
- For a given week, the report lists each active User with logged hours, Weekly Capacity, and remaining/over capacity.
- Users with no logged time appear with zero logged hours, not omitted.

### 4.6 Events & Notifications (event-native)

**Description:** TimeKeeper's differentiator over Harvest: the system **emits Domain Events as work happens** and acts on them, rather than forcing consumers to poll. Events drive over-budget alerts and log-time reminders in MVP, and are the substrate for surfacing live activity to Agents (FR-26).

**Functional Requirements:**

#### FR-20: Over-budget threshold alert
When logged hours cross a Project's configured over-budget threshold, the responsible PM/Admin is alerted exactly once per crossing. Realizes UJ-3.

**Consequences (testable):**
- The alert fires on the entry whose save pushes consumed hours to or past the threshold percentage of the Hours Budget.
- It fires **once per crossing**, not on every subsequent entry while still over.
- Deleting entries back under the threshold does not send a "back under budget" alert and re-arms the single alert for the next crossing.
- For monthly budgets, the threshold is evaluated against the monthly total.

#### FR-21: Emit Domain Events
The system emits Domain Events for the meaningful state changes in the time-tracking core.

**Consequences (testable):**
- At minimum, events are emitted for: Timer started, Timer stopped, Time Entry created/updated/deleted, budget threshold crossed, Timesheet submitted, Timesheet approved.
- Each event carries the entity id(s) it concerns, the acting user, and a timestamp — the payload a consumer needs to act without a follow-up read.
- Event emission is idempotent per state change (one logical change produces one event; retries do not duplicate it).

#### FR-22: Reminders to log time
The system can remind a Member to log time on a schedule. `[DEFERRED — Should, see §9.2]`

**Consequences (testable):**
- An Administrator can enable a scheduled reminder (e.g. daily/weekly) that notifies Members who have not logged for the period.
- A reminder is not sent to a Member who has already met the period's expectation. `[ASSUMPTION: "expectation" = at least one entry for the day/week; refine later.]`

### 4.7 Agent Interface (MCP Server)

**Description:** The reason TimeKeeper exists in this hackathon: an **MCP Server** that exposes the time-tracking core to AI Agents as a peer interface to the web UI. Agents discover capabilities through the protocol and invoke them on behalf of an authenticated identity, with the **same permission rules** as humans (FR-13). This section states the *capability*; the exact tool and resource catalogue, transport, and schemas are in `addendum.md`. Realizes UJ-5.

**Functional Requirements:**

#### FR-23: Tool discovery and invocation over MCP
The MCP Server exposes the time-tracking operations as MCP **Tools** that an Agent can discover and invoke. Realizes UJ-5.

**Consequences (testable):**
- An MCP client can list available Tools and receive, per Tool, a name, description, and input schema sufficient to call it without out-of-band documentation.
- The Tool set covers, at minimum for MVP: create/list/get/update/delete Time Entry; start/stop Timer; list Projects, Tasks, Clients, and the current User; run the time report and the budget report. *(Full catalogue: `addendum.md`.)*
- Invoking a Tool performs the same operation, with the same validation and permission checks, as the equivalent human action; results are returned in a structured, machine-readable form.
- A Tool invocation that violates a permission or validation rule returns a structured error with a reason, not a silent failure (realizes the UJ-5 edge case).

#### FR-24: Read-only context Resources over MCP
The MCP Server exposes read-only **Resources** (`harvest://…` URIs) so an Agent can load current state as context.

**Consequences (testable):**
- At minimum, Resources exist for: the current User, active Projects, active Clients, the Task catalogue, and the current User's current-week Timesheet.
- Reading a Resource returns current data scoped to the authenticated identity's permissions (FR-13).

#### FR-25: Agent authentication and identity scoping
Every MCP request is authenticated, and operations are scoped to the authenticated identity's Access Role.

**Consequences (testable):**
- A request without a valid credential is rejected before any operation runs.
- The credential resolves to a User identity; Tools and Resources then apply that identity's permissions (a Member-scoped Agent cannot read another Member's entries).
- `[ASSUMPTION: MVP uses a static bearer token mapped to a User; OAuth 2.1 per the MCP spec is the productionization path — OQ-4.]`

#### FR-26: Surface Domain Events to Agents
The MCP Server can surface Domain Events (FR-21) to connected Agents as notifications. `[DEFERRED — Stretch, see §9.2]`

**Consequences (testable):**
- A connected Agent can receive a notification when a subscribed Domain Event occurs (e.g. budget threshold crossed) without polling.
- Notifications respect the identity's permission scope.

## 5. Cross-Cutting Non-Functional Requirements

System-wide qualities not tied to one feature. Thresholds are hackathon-calibrated and meant to be honest, not aspirational.

- **NFR-1 Numeric correctness.** All hours and any monetary values are stored and computed as decimal/`numeric`, never floating point. Hours rounding uses a single configured precision applied consistently across entry, reports, and MCP responses.
- **NFR-2 Server-authoritative timers.** Timer elapsed time is derived from server timestamps, not client clocks, so a closed browser or clock skew never corrupts an entry (supports FR-1).
- **NFR-3 Concurrent agent clients.** The MCP Server supports multiple concurrent client connections (e.g. the custom agent, Claude Code, and MCP Inspector at once) without cross-session state leakage.
- **NFR-4 Consistent semantics across interfaces.** Web UI and MCP go through one service/permission layer; a rule enforced for humans is enforced identically for Agents (no privilege path that exists only on one surface).
- **NFR-5 Events as the observability backbone.** Domain Events (FR-21) double as the activity/audit trail; the system records who did what and when via the event stream.
- **NFR-6 Responsiveness (soft target).** On seeded demo-scale data, a Tool call or report query returns within ~500 ms p95. This is a demo-quality target, not a production SLA.
- **NFR-7 Model-agnostic server.** The MCP Server has no dependency on any specific LLM; any MCP-compatible client can connect. (The team's *agent application* may target `claude-opus-4-7` on Azure AI Foundry, but that coupling lives in the agent, not the server.)

## 6. Constraints & Guardrails

- **Time-box.** One hackathon sprint (~2 days). Scope decisions favor a working signature demo (UJ-5) over breadth; see the build sequence in `addendum.md`.
- **Single-tenant.** TimeKeeper runs for one internal account; no `company_id` multi-tenancy plumbing in v1 (§8, OQ-3).
- **Auth posture.** Static bearer token for both the MCP Server and any web session in v1; OAuth 2.1 is documented as the path, not built (FR-25, OQ-4).
- **Data sensitivity.** Internal data only — User names/emails, project structure, hours. No client PII, no payment data, no receipts. Agent actions are constrained to the authenticated identity's permissions (NFR-4); an Agent cannot exceed the human it acts for.
- **Cost.** Run-time agent demos consume Azure AI Foundry tokens; keep demo scripts bounded. The MCP Server itself incurs no model cost.
- **Demo shape (committed default).** The signature demo (UJ-5) runs through an MCP client + MCP Inspector against a **locally-run** server; a human web UI for UJ-1–UJ-4 is desirable but **not required** to demo. Override via OQ-5 (web UI) / OQ-7 (deploy).
- **Design mandate.** All UI styling goes through the **design token system** (`design/tokens.json` → `tokens.css`); **inline CSS is forbidden**. Lint-enforced. See §13 and `ux-design-specification.md`.

## 7. Agent / MCP Public Surface (summary)

This is a capability summary; the authoritative catalogue (exact Tool names, parameters, outputs, Resource URIs, transport, and schemas) is in **`addendum.md` §A–§B**, sourced from `research/mcp-server.md`.

- **Transport:** a single network endpoint speaking MCP, supporting multiple concurrent clients (FR-23, NFR-3).
- **Tools (~25 across the catalogue; MVP subset per FR-23):** Time Entries (list/get/create/update/delete, start/stop/restart Timer), Projects (list/get/create/update), Tasks (list/create, list project task assignments), Clients (list/get/create), Users (current user, list, project assignments), Timesheets (get, submit), Reports (time report, budget report).
- **Resources (~9):** current user, active projects, project detail, active clients, task catalogue, user directory, current timesheet, a user's timesheet for a week, time report for a range.
- **Stability:** Tool names and input schemas are the Agent contract; treat changes to them as breaking and version the surface. *(Detail in addendum.)*

## 8. Non-Goals (Explicit)

TimeKeeper is an **internal time tracker**, not a billing platform or a general SaaS. In v1 it will **not**:

- **Invoice clients, create estimates/quotes, take payments, or sync to accounting** (QuickBooks/Xero). The entire billing/finance cluster is out — this is the single largest deferral and the clearest scope line.
- **Track expenses** (non-time costs, receipts, expense categories).
- **Be a client-facing product** — no client portal, public invoice/estimate URLs, or external recipients.
- **Be multi-tenant** — one internal account only.
- **Offer SSO/SAML, mobile-native apps, offline tracking, or calendar/third-party-tool import** (Asana/Jira/Trello/Slack, etc.).
- **Implement Harvest's full rate engine** — `bill_by`/`budget_by` modes, per-task/per-person rate overrides, fixed-fee, rate history, cost-rate/profitability. MVP budgets are hours-only.
- **Be the build-time agentic SDLC framework.** That framework (how TimeKeeper is generated by agents, and the living-docs subsystem) is a separate initiative and is out of scope for *this* PRD.

## 9. MVP Scope

### 9.1 In Scope (the signature loop, human + agent)

- Time tracking: live Timer, day entry, weekly grid, notes, billable flag, edit/delete own (FR-1–FR-6).
- Structure: Client, Project (with hours budget), account Task library, Task Assignments, archiving (FR-7–FR-11).
- Team & access: User management, Admin/PM/Member roles enforced, User Assignment with PM flag (FR-12–FR-14).
- Reporting: filtered time report with CSV, project hours budget tracking, capacity report (FR-17–FR-19).
- Events: over-budget single-fire alert, Domain Event emission for the core state changes (FR-20, FR-21).
- **Agent interface: MCP Tools + Resources + authenticated identity scoping covering the loop above (FR-23–FR-25).** This is the point of the hackathon.

### 9.2 Out of Scope for MVP (deferred, not abandoned)

- **Timesheet submit/approve (FR-15, FR-16)** — *Should.* High value for governance; include if time allows after the agent loop works. `[NOTE FOR PM: approval lock is referenced by FR-3/FR-6; if approval is cut, those lock behaviors become inert but should remain coded.]`
- **Log-time reminders (FR-22)** — *Should.* Straightforward scheduled job; not on the demo path.
- **Domain Events surfaced to Agents as MCP notifications (FR-26)** — *Stretch.* The headline "agents react, not poll" capability; demo if the core loop lands early.
- **Timestamp (start/end) tracking mode** — duration + Timer only for MVP (OQ-2).
- **Cost rates, profitability, monetary budgets, the rate engine** — deferred with the billing cluster (§8).
- **Web UI breadth** — the demo can run through an MCP client + Inspector; a minimal web UI for human journeys (UJ-1–UJ-4) is desirable but secondary to the agent loop. `[NOTE FOR PM: confirm whether a human web UI is required for the demo or whether agent + Inspector suffices — OQ-5.]`

## 10. Success Metrics

Metrics are operational/demo-oriented (this is an internal tool with a hackathon outcome), and each cross-references the FR(s) it validates.

**Primary**
- **SM-1 — Signature demo completes end-to-end.** An AI Agent, via the MCP Server, starts/stops a Timer, creates a Time Entry against a Project+Task, and answers "hours on Project Alpha this week vs budget" in one session, against real seeded data, with correct numbers. Validates FR-1, FR-23, FR-17, FR-18 (and UJ-5). *Target: demonstrated live.*
- **SM-2 — Three-mode entry round-trips into reporting.** A Time Entry created via Timer, day view, and week grid each appears correctly in the filtered time report and budget total. Validates FR-1–FR-3, FR-17, FR-18. *Target: 3/3 modes correct.*

**Secondary**
- **SM-3 — Budget alert fires exactly once per crossing.** Crossing the threshold sends one alert/event; subsequent over-budget entries send none; dropping under and re-crossing sends one again. Validates FR-20, FR-21. *Target: exactly-once across a scripted sequence.*
- **SM-4 — Permission parity across interfaces.** An identical out-of-scope action (e.g. a Member reading another Member's entries) is refused on both web and MCP with a clear reason. Validates FR-13, FR-25, NFR-4. *Target: 0 privilege paths that differ by interface.*
- **SM-5 — Tool self-sufficiency.** An Agent completes "log my afternoon on Project Alpha" using only `tools/list` metadata, with zero schema/validation errors on the happy path. Validates FR-23. *Target: 0 errors on the happy path.*

**Counter-metrics (do not optimize)**
- **SM-C1 — Tool count is not a goal.** More Tools is *worse* if it dilutes the surface; keep it tight and well-described. Counterbalances SM-5. *Watch: don't pad the catalogue to look capable.*
- **SM-C2 — Feature breadth is not the win.** Don't trade core-loop reliability (SM-1/SM-2) for additional features. Counterbalances the temptation to chase §9.2 items early.
- **SM-C3 — Event volume is not value.** Don't emit noisy/duplicate events to look "event-native"; emission must stay idempotent and meaningful. Counterbalances SM-3/FR-21.

## 11. Open Questions

Items tagged **[Decided — default]** are resolved with a sensible default and listed only so the team can consciously override them; the rest are genuinely open and need a human decision.

1. **OQ-1 — Product name.** "TimeKeeper" is a working title; confirm or replace (avoid trademark collision with Harvest). *Owner: PM. Blocks: branding only.*
2. **OQ-2 — Tracking mode for MVP. [Decided — default: duration + Timer]** Timestamp (start/end) mode deferred (§9.2). Listed for override only. *Owner: build team.*
3. **OQ-3 — Multi-tenancy. [Decided — default: single-tenant]** No `company_id` plumbing in v1 (§6). Override only if the tool outgrows the hackathon. *Owner: build team.*
4. **OQ-4 — Agent auth. [Decided — default: static bearer token]** OAuth 2.1 per MCP spec is the productionization path (§6, FR-25). *Owner: build team.*
5. **OQ-5 — Human web UI. [Resolved — web UI is in scope]** UJ-1–UJ-4 have designed screens (§13 + `ux-design-specification.md`); the agent loop (UJ-5) stays the demo headline and is made visible in the UI via provenance. *Resolved by the UX design step, 2026-05-22.*
6. **OQ-6 — Edit rights in `submitted` state.** Can owners still edit `submitted` (pre-approval) entries, or does submit also lock? *Affects FR-15.*
7. **OQ-7 — Deployment for the demo.** Local + Inspector (recommended for reliability) vs. deploy the MCP Server to Azure alongside Foundry. *Recommendation: local for the demo; Azure if time permits.*
8. **OQ-8 — API shape.** Mirror Harvest's REST contract, or design a fresh MCP-first service? *Recommendation: reuse Harvest's data model as the schema baseline; the service/MCP layer is our own — do not reimplement Harvest's REST verbatim.*

## 12. Assumptions Index

Every inline `[ASSUMPTION]` surfaced for explicit confirmation:

- **§4.1 / FR-3** — TimeKeeper allows >24h/day (non-blocking warning), mirroring Harvest's multi-shift support.
- **§4.3 / FR-12** — Weekly Capacity stored in hours; convert at any Harvest-compatible boundary (Harvest uses seconds).
- **§4.4 (feature)** — Submit/approve included as a Should for an internal tracker, despite being Enterprise-tier in Harvest.
- **§4.4 / FR-15** — Owners may edit `submitted` entries until approval; lock occurs at approval (see OQ-6).
- **§4.5 / FR-18** — A per-Project "show budget to all" flag exists, mirroring Harvest.
- **§4.7 / FR-25** — MVP uses a static bearer token mapped to a User identity; OAuth 2.1 is the productionization path (see OQ-4).
- **§4.6 / FR-22** — Reminder "expectation" = at least one entry for the day/week; to be refined.
- **§7 / §8** — Hours-only budgets in MVP; Harvest's full rate/billing engine is deferred.
- **§13** — Design direction "Ledger & Dial", token-only styling, and no-inline-CSS are team mandates applied to all UI.

## 13. Design & UX

Full specification: **`docs/planning-artifacts/ux-design-specification.md`** (BMAD UX design step). Tokens: **`docs/planning-artifacts/design/tokens.json`** (DTCG source of truth) → **`tokens.css`** (consumable layer). This section states the design intent and binding constraints; the spec holds the components, screens, and patterns.

### 13.1 Design Mandate (binding)
- **Token system only.** Every UI value — color, typography, spacing, radius, motion, elevation, focus — is a design token from the token pipeline. No raw values live in components.
- **No inline CSS.** The `style` attribute and inline style objects/`cssText` are forbidden; styling is class-based and token-referenced. Both rules are **lint-enforced** in CI (UX spec §13).

### 13.2 Aesthetic & Tone
**"Ledger & Dial"** — TimeKeeper as a precision instrument over a warm editorial ledger. Warm paper/ink neutrals; a single **teal** brand accent (the "live dial"); **red reserved exclusively for over-budget/danger** so "running" and "over budget" can never be confused. Typography pairs a serif display (Fraunces) with a humanist UI sans (IBM Plex Sans) and **monospaced tabular numerals (IBM Plex Mono) for every hour, percent, and amount**. Tone: precise, trustworthy, unfussy — never generic-SaaS, never nagging. Signature moment: the running **Timer Instrument** with its softly pulsing teal dial. Light default, first-class dark theme.

### 13.3 Information Architecture
Fixed left rail → **Today** (timer + day entries) · **This Week** (timesheet grid) · **Projects** (list + budget detail) · **Reports** (filtered time, capacity) · **Team** (users, assignments). Header carries date, theme toggle, and identity. Capture is **inline** for the core loop (no modals); modals only for destructive confirms and admin CRUD. Agent actions surface in place via a **provenance chip**.

### 13.4 Platform & Accessibility
Responsive web, **desktop-first**, degrading to tablet/phone for high-frequency Member tasks (start/stop a timer, add an entry). **WCAG 2.1 AA**: full keyboard operability, visible focus, ≥44px targets, color-never-the-sole-signal, and `prefers-reduced-motion` honored — all encoded in tokens and verified in CI (UX spec §12).

### 13.5 Maps to
Realizes the UI of UJ-1–UJ-4 and makes UJ-5 (agent) visible. Key surfaces: Timer Instrument (FR-1), Weekly Timesheet Grid (FR-3), Report Table (FR-17), Budget Meter (FR-18/FR-20), permission-aware + provenance UI (FR-13/NFR-4).

---
*Downstream: the UX design step is **complete** — see §13, `ux-design-specification.md`, and `design/tokens.*`. Next: `bmad-create-architecture` (uses `addendum.md` + the token pipeline + `research/`) and `bmad-create-epics-and-stories` (the UX spec's component roadmap maps to build epics). Technical decisions, the full MCP surface, the data model, and the build sequence are in `addendum.md`.*
