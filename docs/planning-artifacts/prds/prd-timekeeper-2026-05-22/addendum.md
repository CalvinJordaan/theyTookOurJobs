# PRD Addendum — TimeKeeper

Technical depth that supports `prd.md` but is implementation-how, not product capability. Per BMAD PRD discipline, tech choices, transport, the full MCP catalogue, the data model, and rejected alternatives live here. This addendum is the primary input for `bmad-create-architecture`. Source research: `research/findings.md`, `research/mcp-server.md`, `research/data-model.md`.

---

## A. Recommended Stack (proposed, for architecture to confirm)

> **Superseded for versions:** the architecture step verified current versions on 2026-05-22 — see `docs/planning-artifacts/architecture.md` §0.1. Notable updates: MCP spec **2025-11-25** (not 2025-06-18); **`@modelcontextprotocol/sdk` 1.29.x only** (Streamable HTTP is built in — the `@modelcontextprotocol/node` package below is obsolete); **Node 24 LTS**, **Prisma 7**, **PostgreSQL 18**; web UI = **Vite 8 + React 19**. The table below is the original 2026-05-21 proposal, kept for history.

| Decision | Value | Rationale |
|---|---|---|
| Language / runtime | TypeScript, Node.js 22+ | Native language of the MCP spec; team tooling. |
| MCP SDK | `@modelcontextprotocol/sdk` (+ `@modelcontextprotocol/node`) | Same-day spec updates, Zod schemas, first-class Streamable HTTP. |
| Transport | Streamable HTTP, single `/mcp` endpoint (spec `2025-06-18`) | Standalone networked service; multiple concurrent clients (NFR-3); aligns with Azure deploy. |
| HTTP framework | Express or Hono | SDK provides middleware helpers. |
| Database | PostgreSQL via Prisma ORM | Relational fit for the entity model; decimal support (NFR-1). |
| Auth (hackathon) | Static API key / bearer token in `Authorization` header, mapped to a User | FR-25; simplest path that still scopes identity. |
| Auth (production) | OAuth 2.1 per MCP spec (PKCE, RFC 9728/8414) | OQ-4 productionization path. |
| Agent application | Azure AI Foundry, deployment `claude-opus-4-7` | Run-time agent in UJ-5; the MCP **server** stays model-agnostic (NFR-7). |
| Deploy target | Local + MCP Inspector for the demo; Azure App Service / Container Apps if time permits | OQ-7. |

**Co-location decision:** for the hackathon, the MCP Server and the domain service layer run **in one process** — the MCP Server calls service functions directly rather than over HTTP. Splitting into a separate API tier is a later refactor. This keeps the surface area small and the demo reliable.

---

## B. Full MCP Surface (authoritative catalogue)

The `prd.md` §7 summary points here. Source: `research/mcp-server.md` (which carries full input/output parameter tables and a TypeScript quick-start). The MVP subset is called out in FR-23.

### B.1 Tools (~25)

| Category | Tools | Count | MVP? |
|---|---|---|---|
| Time Entries | `list_time_entries`, `get_time_entry`, `create_time_entry`, `update_time_entry`, `delete_time_entry`, `start_timer`, `stop_timer`, `restart_timer` | 8 | Yes (restart optional) |
| Projects | `list_projects`, `get_project`, `create_project`, `update_project` | 4 | list/get MVP; create/update Should |
| Tasks | `list_tasks`, `create_task`, `list_project_task_assignments` | 3 | list + assignments MVP |
| Clients | `list_clients`, `get_client`, `create_client` | 3 | list/get MVP |
| Users | `get_current_user`, `list_users`, `list_user_project_assignments` | 3 | `get_current_user` MVP |
| Timesheets | `get_timesheet`, `submit_timesheet` | 2 | with FR-15 (Should) |
| Reports | `run_time_report`, `run_project_budget_report` | 2 | Yes (signature demo) |
| **Total** | | **25** | |

Full parameter/return schemas: `research/mcp-server.md` §3.

### B.2 Resources (~9, read-only `harvest://` URIs)

`harvest://users/me`, `harvest://projects`, `harvest://projects/{project_id}` (template), `harvest://clients`, `harvest://tasks`, `harvest://users`, `harvest://timesheet/current`, `harvest://timesheet/{user_id}/{week_start}` (template), `harvest://reports/time/{from}/{to}` (template). Detail: `research/mcp-server.md` §4.

### B.3 Contract stability

Tool `name` + `inputSchema` and Resource URIs are the Agent contract (FR-23). Treat changes as breaking; version the surface (e.g. server `version` + a documented changelog). `tools/list_changed` notifications are emitted if the set changes at runtime.

---

## C. Data Model (MVP entity set)

Full schema with every field, types, relationships, and a Mermaid ERD: `research/data-model.md`. MVP entities and the trim applied:

| Entity | MVP role | MVP fields (trimmed) |
|---|---|---|
| **User** | Identity + capacity | `first_name`, `last_name`, `email`, `is_active`, `weekly_capacity`, `is_contractor`, `access_role`; rates deferred |
| **Client** | Top of hierarchy | `name`, `is_active` (drop address/currency/statement_key) |
| **Project** | What time is logged against | `client_id`, `name`, `code`, `is_active`, `is_billable`, `budget` (hours), `budget_is_monthly`, `over_budget_notification_percentage`, `show_budget_to_all`, `starts_on`, `ends_on`; defer `bill_by`/`budget_by`/cost/fee |
| **Task** | Work type | `name`, `is_active`, `billable_by_default`; defer `default_hourly_rate`, `is_default` |
| **TaskAssignment** | Project↔Task bridge | `project_id`, `task_id`, `is_active`, `billable`; defer rate/budget |
| **UserAssignment** | Project↔User bridge; gates logging; PM flag | `project_id`, `user_id`, `is_active`, `is_project_manager`; defer rate/budget |
| **TimeEntry** | Core record | `user_id`, `project_id`, `task_id`, `spent_date`, `hours`, `notes`, `billable`, `approval_status`, timer fields (`is_running`, `timer_started_at`); defer rate snapshots, `is_billed`, `invoice_id`, `external_reference` |

**Schema cautions (from research):** store `hours`/money as `decimal`/`numeric`, never float (NFR-1); `client` on TimeEntry is derivable from the project — can skip the denormalized column; `is_closed` is deprecated — model `approval_status` only; `weekly_capacity` is in *seconds* in Harvest — pick a unit and convert at the boundary (FR-12 assumption).

**Deferred clusters (phase 2):** Invoice/InvoiceLineItem/InvoiceMessage/InvoicePayment, Estimate/EstimateLineItem, Expense/ExpenseCategory, Contact, the rate-history tables, and `Company` multi-tenant plumbing. All map to §8 Non-Goals.

---

## D. Architecture sketch

Layering (detail + Mermaid in `research/mcp-server.md` §5 and `research/findings.md` §4):

```
AI Agent (Foundry claude-opus-4-7)  ──MCP client──┐
Claude Code / VS Code / Inspector   ──MCP client──┤
                                                   ▼
                              MCP Server (Streamable HTTP /mcp)
                                                   │ direct calls
                                          Domain service layer
                                                   │
                                            PostgreSQL (Prisma)
                                                   │ emits
                                          Domain Events ──► (FR-26 notifications, stretch)
Web UI (optional, OQ-5) ──REST──► same service layer
```

One service/permission layer behind both the MCP Server and any web UI guarantees NFR-4 (consistent semantics across interfaces).

---

## E. Options considered / rejected alternatives

- **Mirror Harvest's REST API verbatim** — *rejected.* We reuse Harvest's *data model* as the schema baseline but build our own MCP-first service; reimplementing Harvest's REST contract adds work with no demo value (OQ-8).
- **Polling integration (like real Harvest)** — *rejected* in favor of event-native emission (FR-21) + MCP notifications (FR-26). This is the product's differentiator, not an add-on.
- **Multi-tenant from day one** — *deferred.* Single-tenant removes `company_id` plumbing across every entity; revisit if the tool outgrows the hackathon (OQ-3).
- **OAuth 2.1 for agent auth now** — *deferred.* Static bearer token is enough to scope identity for the demo; OAuth is the documented productionization path (FR-25, OQ-4).
- **Timestamp (start/end) tracking mode in MVP** — *deferred.* Duration + Timer covers the common case with less UI/logic (OQ-2).
- **Separate API process from the MCP server** — *deferred.* Co-located in one process for the hackathon (§A); split later.

---

## F. Build sequence (from research/mcp-server.md §6 and findings §6)

1. **Prove MCP transport** — scaffold Node/TS, install SDK, expose a `ping` Tool on `/mcp`, verify with `npx @modelcontextprotocol/inspector`. No domain logic yet.
2. **Schema** — Prisma models for the 7 MVP entities; seed one company/user/client/project/task + sample entries.
3. **Service layer** — TimeEntry create/list/update/delete; start/stop Timer (server-authoritative elapsed, NFR-2).
4. **MCP Tools (time entry)** — wire the 8 time-entry Tools to the service layer → an agent can track time (**minimal viable demo**, end of this step).
5. **Lookups + reports** — `list_projects/tasks/clients`, `get_current_user`, `run_time_report`, `run_project_budget_report` → enough to answer the budget question (UJ-5/SM-1).
6. **Agent app on Foundry** — point a `claude-opus-4-7` agent at the **locally-run** MCP Server (demo default; OQ-7) and run the signature demo (UJ-5) through the agent + MCP Inspector — no human web UI required (OQ-5).
7. **(Stretch)** Domain Event layer → MCP notifications (FR-26); approval workflow (FR-15/16); reminders (FR-22); minimal web UI (OQ-5); Azure deploy (OQ-7).

**Single most important demo:** "An AI agent creates a Time Entry via MCP" — proves Agent → MCP client → MCP Server → DB. Everything else is incremental value on top.
