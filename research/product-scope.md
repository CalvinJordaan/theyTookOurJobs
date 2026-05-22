# Harvest — Product Scope

> Purpose: catalogue what Harvest *does as a product* so the hackathon team can
> rebuild an internal version. Every claim below is grounded in content retrieved
> from getharvest.com, the Harvest Forecast page, the Zapier integration surface,
> and the data model reverse-engineered from the Harvest API v2. Where a feature
> is inferred rather than explicitly stated on those sources, it is marked
> **(inferred)**.
>
> Last updated: 2026-05-21

---

## 1. Product Summary

**What it is.** Harvest is a cloud-based time-tracking and invoicing platform aimed
at professional services teams. The core loop is: team members log hours against
client projects and tasks → managers monitor budgets and team utilization in
real time → admins generate invoices directly from the tracked time and expenses.

**Who uses it.** Harvest serves over 70,000 companies across professional services
industries: advertising agencies, architecture, consulting, design, law, accounting,
construction, and software development. Team sizes range from a single freelancer
(the free tier is one seat) to enterprise (the "Enterprise" plan is used by 50+
seat organisations).

**Core value proposition.** "Turn hours into profit." Harvest reduces the overhead
of moving from time-tracking to billing: every hour logged is automatically
available to pull into an invoice, and budget burn is visible in real time as work
happens.

**Two products, one brand.**
- **Harvest** — time tracking, reporting, invoicing, expenses.
- **Harvest Forecast** — team scheduling and capacity planning; a separate product
  that integrates with Harvest to compare scheduled vs. actual hours.

---

## 2. Feature Catalogue

### 2.1 Time Tracking

| Feature | Description | Source |
|---|---|---|
| One-click live timers | Start/stop a running timer from any device; elapsed time accumulates in real time. One active timer at a time per user. | getharvest.com/features |
| Manual duration entry (day view) | Type in an hours value directly on a day-by-day grid without starting a timer. | getharvest.com/features |
| Manual duration entry (week view) | Enter hours for an entire week from a grid — one row per project/task, one column per day. | getharvest.com/features |
| Start/end time entry | Log a time entry with an explicit start time and end time rather than a duration (controlled by a company-level setting `wants_timestamp_timers`). | API data model |
| Notes per entry | Free-text notes field on every time entry for describing the work done. Required on all entries if the "require notes" account setting is enabled (Enterprise tier). | getharvest.com/features + pricing |
| Billable / non-billable flag | Each entry carries a billable boolean. The default comes from the task assignment; the person logging can toggle it. | API data model |
| Browser, desktop, and mobile apps | Web app (all browsers), Mac desktop app, iOS app, Android app. | getharvest.com/features |
| Offline time tracking | Time can be entered while offline; syncs on reconnect. | getapp.com feature listing |
| Calendar integration | Time entries can be populated from Google Calendar or Outlook calendar events. | getharvest.com/integrations |
| External tool integration for entries | Browser extensions (Chrome, Firefox, Edge) let users start a Harvest timer from within Asana, Trello, JIRA, GitHub, etc. (`external_reference` on the TimeEntry entity links back to the source task). | API data model + integrations page |
| Automated reminders | Account admins configure automated reminders that prompt team members to log time on a defined schedule (daily, weekly). | getharvest.com/features |
| Timesheet approval workflow | Team members submit their timesheet for a period; managers/admins approve or reject. Entries gain an `approval_status` of `unsubmitted → submitted → approved`. Approved timesheets lock entries. Available on the Enterprise tier. | getharvest.com/features + pricing |
| Activity log | Audit trail of every time entry creation and edit, visible to admins. Useful for spotting irregular or missing entries. Available on Enterprise. | getharvest.com/features + pricing |
| Lock entries on invoice | When a time entry is billed onto an invoice, `is_billed` is set and the entry is locked from further editing. | API data model |

---

### 2.2 Projects and Tasks

| Feature | Description | Source |
|---|---|---|
| Client → Project hierarchy | Every project belongs to exactly one client. Clients are the top-level grouping. | API data model |
| Project codes | Optional short reference code on a project for reporting and search. | API data model |
| Billable / non-billable project flag | Entire project can be marked non-billable (e.g. internal projects), which overrides individual entry billing. | API data model |
| Billing mode — bill by project / task / person / none | Controls which hourly rate is applied to time entries. `Project` uses a single project rate; `Tasks` uses per-task rates; `People` uses per-person rates. `none` means fixed-fee or not billing at all. | API data model |
| Fixed-fee projects | A project can be `is_fixed_fee = true` with a set `fee`, meaning the project is billed at a flat amount rather than hourly. | API data model |
| Hourly rate configuration | Rate can be set at the project level, per task assignment, or per user assignment, depending on `bill_by` setting. | API data model |
| Budget by hours or cost | Budget tracked as hours (`project`, `task`, `person` modes) or monetary value (`project_cost`, `task_fees`). | API data model |
| Monthly budget reset | `budget_is_monthly` flag causes budget tracking to reset at the start of each month. | API data model |
| Over-budget notifications | When tracked time/cost reaches a configured percentage of the budget, an automated email alert fires. | API data model + getharvest.com/features |
| Show budget to all team members | `show_budget_to_all` allows non-admin users to see real-time budget progress on their projects. | API data model |
| Project start/end dates | Optional `starts_on` and `ends_on` dates on the project. | API data model |
| Task library | Tasks (e.g. "Design", "Development", "Meetings") are defined at the account level once and reused across projects via Task Assignments. | API data model |
| Default tasks (auto-add to new projects) | Tasks marked `is_default` are automatically assigned to every new project created. | API data model |
| Per-project task activation | A Task Assignment can be marked inactive on a specific project to hide it from time entry without deleting the task globally. | API data model |
| Per-project task billable override | The task's `billable_by_default` flag can be overridden for each project via the Task Assignment. | API data model |
| Project start/end date constraints | Projects have optional start and end dates (inferred: Harvest shows these on the project detail page). | API data model |
| Project archive | Projects can be archived (`is_active = false`) to remove them from active views without deleting historical data. | API data model |
| Cost budget with expense inclusion | The `cost_budget_include_expenses` flag controls whether expenses count toward the monetary budget. | API data model |

---

### 2.3 Team Management

| Feature | Description | Source |
|---|---|---|
| User accounts | Each person has a User record with name, email, timezone, and avatar. | API data model |
| Employee vs. contractor flag | `is_contractor` boolean on User distinguishes employees from contractors for reporting. | API data model |
| Weekly capacity | Each user has a configurable weekly capacity (hours/week) used in capacity reports. | API data model + getharvest.com/features |
| Default billable rate | A default hourly billable rate per user, used when no project-level or task-level override exists. | API data model |
| Cost rate | Internal cost rate per user, used to calculate project profitability (revenue vs cost). | API data model |
| Project assignment | Users are explicitly assigned to projects via User Assignments. Only assigned users can log time against a project (except admins and those with `has_access_to_all_future_projects`). | API data model |
| Project Manager flag per project | A user's User Assignment can carry `is_project_manager = true`, granting PM-level permissions on that specific project. | API data model |
| Auto-assign to all future projects | `has_access_to_all_future_projects` on User means the person is automatically added to every new project. | API data model |
| Roles (business/team roles) | Account-level named roles (e.g. "Designer", "Engineer") that group users. These are descriptive labels, not permission levels. Multiple roles per user. | API data model |
| Access roles (permission levels) | The `access_roles` field on User controls system-level permissions. See Section 3. | API data model |
| Capacity visualisation | The "Capacity" report shows who is over- and under-utilised across the team at a glance. Available on Teams and Enterprise tiers. | getharvest.com/features + pricing |
| Bulk import of people and projects | Admins can bulk-import users and projects via CSV. Available on Teams tier. | getharvest.com/pricing |
| User archive | Users can be archived rather than deleted, preserving historical time entry data. | API data model |
| SAML SSO | SAML-based SSO with Microsoft (Azure AD) and Okta. Enterprise tier only. | getharvest.com/features + pricing |

---

### 2.4 Reporting and Analytics

| Feature | Description | Source |
|---|---|---|
| Time report (by project/task/team) | Filter tracked hours by date range, client, project, task, team member, or billable status. Export to CSV. | getharvest.com/features + getapp.com |
| Budget tracking report | Real-time view of hours or cost budget consumed vs. remaining for each project. Updates as entries are logged. | getharvest.com/features |
| Capacity report | Team utilisation — who is overworked and who is under-utilised based on weekly capacity vs. logged hours. Teams and Enterprise. | getharvest.com/features + pricing |
| Cost analysis report | Compares internal cost (hours × cost rate) to billable value for projects and clients. Enterprise. | getharvest.com/features + pricing |
| Profitability report | Revenue (billable amount) minus cost for clients, projects, tasks, and team members. Enterprise only. | getharvest.com/pricing |
| Time analysis report | Shows which projects and tasks are consuming the most resource over time. | getharvest.com/features |
| Custom reports with saved filters | Reports can be filtered on multiple dimensions and saved; saved reports can be scheduled to run and email automatically at a configured cadence. Enterprise. | getharvest.com/features + pricing |
| Custom report exports | Export saved/filtered reports in custom formats. Enterprise. | getharvest.com/pricing |
| Activity log (audit view) | Chronological list of all entry creations and edits, with change detail, for admin review. Enterprise. | getharvest.com/features + pricing |
| Multi-currency display | Projects and clients can hold different currencies; reports and invoices respect per-client currency. | slashdot feature listing (inferred from data model `Client.currency`) |

---

### 2.5 Invoicing and Estimates

| Feature | Description | Source |
|---|---|---|
| Invoice generation from tracked time | Pull unbilled time entries (and expenses) for a client into an invoice automatically; line items are populated from project/task detail. | getharvest.com/features |
| Invoice states | `draft → open → paid → closed`. Drafts are editable; open invoices have been sent; closed invoices are written off. | API data model |
| Invoice line items | Configurable line items on the invoice (`kind`, `description`, `quantity`, `unit_price`). Can be edited before sending. | API data model |
| Tax and discount | Primary and secondary tax rates plus a discount percentage per invoice. | API data model |
| Online payment (Stripe and PayPal) | Clients receive a link to pay the invoice online via Stripe or PayPal. | getharvest.com/features |
| Accounting sync (QuickBooks Online and Xero) | Invoices and payments automatically sync to the connected accounting package. | getharvest.com/features |
| Invoice reminders | Scheduled payment reminders sent to clients via InvoiceMessage events. | API data model |
| Recurring invoices | Invoices can be set up to recur; `recurring_invoice_id` links generated copies back to the template. | API data model |
| Client-facing invoice portal | Each invoice has a public URL (`client_key`) where the client can view and pay without logging in. | API data model |
| Estimates (quotes) | Create a pre-project estimate with line items; send to client for acceptance/decline. States: `draft → sent → accepted / declined`. | API data model |
| Convert estimate to invoice | An accepted estimate can be converted into an invoice; `Invoice.estimate` FK tracks the origin. | API data model |
| Customisable invoice templates | Customisable invoice layout and branding (inferred from "customizable templates" feature listing). | slashdot listing (inferred) |
| Purchase order numbers | PO number field on both invoices and estimates. | API data model |

---

### 2.6 Expenses

| Feature | Description | Source |
|---|---|---|
| Expense logging | Team members log non-time costs (mileage, materials, software, meals) against a project on a given date. | API data model |
| Expense categories | Account-level categories (e.g. "Mileage", "Meals") with optional unit name and unit price (e.g. "mile" at $0.67). | API data model |
| Billable expense flag | Each expense can be marked billable; billable expenses can be pulled onto a client invoice alongside time. | API data model |
| Receipt attachment | Photo or file receipt can be attached to an expense record (`receipt.url`, `receipt.file_name`). | API data model |
| Expense approval workflow | Expenses follow the same `unsubmitted → submitted → approved` lifecycle as time entries. | API data model |
| Expense reporting | Expenses appear in time/cost reports and are included in the budget when `cost_budget_include_expenses = true`. | API data model |
| Reimbursement tracking | Expenses can be marked as reimbursable; `is_locked` prevents editing once processed (inferred from field presence). | slashdot listing + API data model (inferred) |

---

### 2.7 Integrations

**Native / first-party**

| Integration | What it does |
|---|---|
| Harvest Forecast | Separate scheduling product. Assign team members to future projects; compare scheduled vs. actual hours. Shares user/project data with Harvest. |
| QuickBooks Online | Auto-sync invoices and payments to QBO. Teams and Enterprise tiers. |
| Xero | Auto-sync invoices and payments to Xero. Teams and Enterprise tiers. |
| Stripe | Accept invoice payments online. |
| PayPal | Accept invoice payments online. |
| Deel | Contractor payroll integration. Teams and Enterprise tiers. |

**Project management (via browser extension or direct integration)**
Asana, Jira, Trello, Monday.com, Linear, ClickUp, Basecamp, Nifty, Height, Notion

**Calendar**
Google Calendar, Outlook.com, Google Workspace (import calendar events as time entries)

**Communication**
Slack, Zendesk

**Analytics / BI**
Databox, eazyBI, Klipfolio, Plecto, Parallax, heroBI, Metric AI, BlinkMetrics

**Development tools**
GitHub, Harvest API (REST), Python client library

**Automation platforms**
Zapier, Make, IFTTT, Integrately, Relay, Skyvia, Coupler.io

**Browser extensions**
Chrome, Firefox, Edge (start Harvest timers from third-party web apps)

---

## 3. User Roles and Permissions

Harvest has three system-level access roles (`access_roles` on the User entity).
The data model confirms the field; the specific permissions below are sourced
from the Harvest features page and the 403-gated help center articles as described
in public documentation. Where the exact boundary between Manager and Member is
inferred it is noted.

### Administrator
Full account access. There is exactly one owner-level account but multiple admins
can exist.

- Create, edit, archive, and delete clients, projects, tasks, users.
- View and edit **all** time entries across the account.
- Configure billing rates (default, per-project, per-task, per-person).
- Generate, send, and manage invoices and estimates.
- Approve or reject timesheets (Enterprise).
- Access all reports including profitability and cost analysis.
- Access the activity log (Enterprise).
- Configure account settings (company name, week start, time format, SSO, etc.).
- Manage integrations and API access.
- Create and manage expense categories.

### Manager (Project Manager)
A Member who has been granted Project Manager status on one or more specific
projects via the User Assignment. PMs can also be designated at the account level
**(inferred: Harvest's help docs refer to both account-level managers and
project-level PMs; the API `is_project_manager` flag lives on UserAssignment)**.

- View and edit time entries logged by **team members assigned to their projects**.
- Add/remove task assignments and user assignments on managed projects.
- View budget and reporting data for managed projects.
- Submit or approve timesheets for their project team (Enterprise — inferred).
- Cannot create new clients or projects (unless also an Admin).
- Cannot access invoicing or account-level settings.

### Member (regular team member)
Default role for everyone who is not an Admin or PM.

- Log time entries against projects they are assigned to.
- Edit their **own** time entries (subject to approval-lock rules).
- View their own tracked hours and basic project information.
- Submit their own timesheet for approval (Enterprise).
- Cannot see other team members' time entries.
- Cannot view profitability or cost reports.
- Cannot create or send invoices.

> Note: A user's `roles` array (the "teammate roles" like "Designer", "Engineer")
> is entirely separate from `access_roles`. Teammate roles are grouping/labelling
> constructs; they do not grant or restrict permissions.

---

## 4. Prioritised Rebuild Backlog (Internal Time Tracker MVP)

Context: the rebuild target is an **internal time tracker** (not a client-billing
product). The hackathon must produce a working demo in a single sprint. Priority
is therefore: nail the "log time against a project/task" loop and basic reporting;
defer anything that exists only to support client invoicing.

| # | Feature | Area | MoSCoW | Rationale |
|---|---|---|---|---|
| 1 | Live timer (start/stop) | Time tracking | Must | The signature feature of Harvest; high visibility in a demo. |
| 2 | Manual hour entry — day view | Time tracking | Must | Essential fallback; most users log time after the fact. |
| 3 | Manual hour entry — week view / timesheet grid | Time tracking | Must | Power users prefer the weekly grid; covers the common "fill in Friday" workflow. |
| 4 | Notes per time entry | Time tracking | Must | Required for any meaningful reporting or searchability. |
| 5 | Billable / non-billable flag per entry | Time tracking | Must | Needed even for internal use (distinguishes client work from overhead). |
| 6 | Client entity | Projects | Must | Top of the hierarchy; projects are meaningless without a client/department context. |
| 7 | Project CRUD (name, code, billable flag, active) | Projects | Must | Without projects there is nothing to log time against. |
| 8 | Task library + task assignment to projects | Projects | Must | Tasks categorise work; essential for useful reporting. |
| 9 | User assignment to projects | Team | Must | Gate who can log on which project; source of PM permission. |
| 10 | User CRUD (name, email, is_active, weekly_capacity) | Team | Must | The people logging time; also needed for capacity reporting. |
| 11 | Admin and Member access roles | Team | Must | Minimum viable permission model; without it anyone can edit anyone's time. |
| 12 | Time report (filter by user / project / date range) | Reporting | Must | The primary analytical output; validates the system is working. |
| 13 | Budget tracking (hours) per project | Reporting | Must | Core value add over a plain spreadsheet; shows burn vs. budget in real time. |
| 14 | Project Manager role (per-project) | Team | Should | Useful for realistic demos; PM can approve team members' time without being full Admin. |
| 15 | Automated email reminders to log time | Time tracking | Should | High-value habit-formation feature; straightforward to implement as a cron job. |
| 16 | Capacity report (weekly hours vs. capacity per user) | Reporting | Should | Differentiates the product from a simple timesheet; needed for the AI/MCP agent demo. |
| 17 | Over-budget notification (% threshold alert) | Projects | Should | One webhook/email when a project exceeds N% of budget. |
| 18 | Weekly capacity per user | Team | Should | Powers the capacity report; trivial to add to the User record. |
| 19 | Timesheet approval workflow (submit → approve) | Time tracking | Should | Adds governance; straightforward state machine on TimeEntry. |
| 20 | Cost rate per user + cost analysis report | Reporting | Could | Useful for profitability but requires finance-sensitive data that internal teams may not want visible. |
| 21 | Calendar sync for time entry pre-population | Time tracking | Could | Nice productivity feature; depends on OAuth to Google/Outlook. |
| 22 | Profitability report (revenue − cost) | Reporting | Could | Meaningful only once cost rates are populated. |
| 23 | Expense logging (non-time costs) | Expenses | Could | Orthogonal to the core loop; defer unless the demo specifically needs it. |
| 24 | Activity log / audit trail | Time tracking | Could | Useful for compliance; lower priority for a hackathon demo. |
| 25 | Harvest Forecast integration (scheduling) | Integrations | Could | Separate product surface; the MCP server can surface planned vs. actual data. |
| 26 | Invoice generation from tracked time | Invoicing | Won't | The rebuild is an internal tracker; billing clients is out of scope for the hackathon. |
| 27 | Estimates / quotes | Invoicing | Won't | Pre-sales quoting is not needed in an internal tool. |
| 28 | Online payments (Stripe/PayPal) | Invoicing | Won't | No client billing in scope. |
| 29 | QuickBooks / Xero sync | Invoicing | Won't | Finance system sync requires invoicing first. |
| 30 | SAML SSO | Team | Won't | Enterprise feature; hackathon demo will use simple email/password or API key auth. |
| 31 | Recurring invoices | Invoicing | Won't | Invoicing is out of scope. |
| 32 | Client-facing invoice portal | Invoicing | Won't | Invoicing is out of scope. |

---

## 5. Key User Stories

### All Stories

**US-01** — As a **team member**, I want to start a timer for a project and task, so that my time is captured accurately without manual calculation.

**US-02** — As a **team member**, I want to fill in my timesheet for the week in a grid view, so that I can log all my hours efficiently on Friday without remembering exact start/stop times.

**US-03** — As a **project manager**, I want to see a real-time view of hours logged vs. budget for my projects, so that I can flag scope creep before it becomes a billing or resourcing problem.

**US-04** — As an **administrator**, I want to receive an automated alert when a project reaches 80% of its hour budget, so that I can act before the budget is exhausted.

**US-05** — As an **administrator**, I want to generate a time report filtered by team member and date range, so that I can review individual productivity and prepare payroll or client summaries.

**US-06** — As a **project manager**, I want to approve or reject submitted timesheets for my team, so that I can verify accuracy before the hours are used in reports or invoicing.

**US-07** — As an **administrator**, I want to assign users to specific projects with optional project-manager permissions, so that each person only logs time against the work they are involved in.

**US-08** — As a **team member**, I want to receive an automated reminder to log my hours at the end of each day, so that I do not forget to record work I completed.

**US-09** — As an **administrator**, I want to view a capacity report showing each team member's logged hours versus their weekly capacity, so that I can identify who is overloaded and who has bandwidth for new work.

**US-10** — As a **team member**, I want to add a text note to each time entry, so that future reviewers (and my own reports) have context for what work was actually done.

---

### Acceptance Criteria — Top 4 Stories

#### US-01: Start a live timer

**GIVEN** a logged-in team member is viewing their day or week view  
**WHEN** they select a project, select a task, and press "Start timer"  
**THEN** a running timer appears showing elapsed time in hours and minutes  
**AND** only one timer is active at a time (starting a second timer stops the first)  
**AND** the time entry is saved to the database with `is_running = true` and `timer_started_at` set to the current UTC timestamp  

**GIVEN** a running timer is active  
**WHEN** the user presses "Stop timer"  
**THEN** `is_running` is set to `false`, elapsed seconds are converted to hours (decimal) and stored in `hours`, and `timer_started_at` is cleared  
**AND** the entry appears in the day view with the final duration

**Edge cases:**
- Stopping a timer that has been running for less than 1 minute still creates a valid entry (0.00 or 0.02 hours depending on rounding).
- If the browser is closed with a timer running, the timer continues server-side and the elapsed time is retrievable on next login.
- A user cannot start a timer against a project they are not assigned to; the project is not shown in their project selector.

**Complexity: M** — Timer state is a pair of columns on TimeEntry (`is_running`, `timer_started_at`). Real-time display is client-side polling or WebSocket.

---

#### US-02: Weekly timesheet grid entry

**GIVEN** a logged-in team member navigates to the week view  
**WHEN** they see the current week displayed as a 7-column grid with one row per project/task combination they have previously used or are assigned to  
**THEN** they can type an hour value into any cell  
**AND** pressing Tab or clicking another cell saves the entry immediately  
**AND** the weekly total per row and per day column updates in real time

**GIVEN** the user enters an hour value into a day column for a project/task row  
**WHEN** they submit (Tab or click away)  
**THEN** a TimeEntry record is created (or updated if one already exists for that user/project/task/date) with the entered `hours` value and `spent_date` set to that column's date

**Edge cases:**
- Entering zero (0) deletes the time entry for that cell if one exists.
- Entering a value that would push total daily hours above 24 shows a validation warning but does not block submission (Harvest allows > 24 h/day to support overnight/multi-shift scenarios).
- An entry that has been approved and locked cannot be edited in the grid; the cell is read-only and shows a lock icon.

**Complexity: M** — Grid rendering is the main front-end complexity; the backend is standard create/update of TimeEntry records.

---

#### US-03: Real-time budget tracking

**GIVEN** an administrator or project manager views a project's detail page  
**WHEN** team members log time against the project  
**THEN** the "Budget used" figure updates to reflect the new total without a page refresh (or on next page load within 60 seconds)  
**AND** the budget display shows both total hours budgeted and hours consumed as a percentage bar

**GIVEN** tracked hours reach the project's `over_budget_notification_percentage` threshold  
**WHEN** a new time entry is saved that pushes the total over the threshold  
**THEN** an email notification is sent to the project manager(s) and/or administrator(s) assigned to that project  
**AND** the notification is sent only once per crossing event (not on every subsequent entry)

**Edge cases:**
- If `budget_is_monthly = true`, the budget resets to 0 at the start of each calendar month; the notification threshold is evaluated against the monthly total only.
- If `show_budget_to_all = true`, team members also see the budget bar on their project view.
- Deleting a time entry reduces the consumed total and may move the project back below the notification threshold (but does not resend a "you're back under budget" notification).

**Complexity: M** — Budget aggregation is a sum query; the over-threshold notification is a post-insert trigger/job.

---

#### US-05: Filtered time report

**GIVEN** an administrator or project manager navigates to Reports → Time  
**WHEN** they apply filters for one or more of: date range, team member(s), project(s), client(s), billable status  
**THEN** the report displays a list of matching time entries with columns: date, user, client, project, task, hours, billable, notes  
**AND** a summary row shows total hours and total billable hours for the filtered set  
**AND** the report can be exported to CSV

**GIVEN** an administrator saves a report filter configuration  
**WHEN** they open Reports on a subsequent visit  
**THEN** the saved filter is available in a "Saved reports" list and re-runs the query with current data

**Edge cases:**
- A project manager applying the filter only sees entries for projects they manage; they cannot access other projects' data even if they manually enter a project ID.
- A date range spanning more than 366 days is permitted but the export may be paginated (2 000 rows per page, consistent with the API pagination model).
- If no entries match the filter, the report shows zero rows and a "No time tracked for these filters" message rather than an error.

**Complexity: L** — The query is a filtered join across TimeEntry, User, Project, Task, Client. The saved/scheduled report feature adds state management and a background job.

---

## Sources

| Claim type | Primary source |
|---|---|
| Feature names and descriptions (time tracking, reporting, invoicing) | https://www.getharvest.com/features and sub-pages |
| Pricing tiers and feature gates (Free / Teams / Enterprise) | https://www.getharvest.com/pricing |
| Entity fields, relationships, and flag semantics | Harvest API v2 data model (research/data-model.md) — reverse-engineered from API docs |
| Integrations list | https://www.getharvest.com/integrations |
| Zapier triggers and actions (entity operations) | https://zapier.com/apps/harvest/integrations |
| Feature cross-check list | https://www.getapp.com/project-management-planning-software/a/harvest/features/ |
| Harvest Forecast capabilities | https://www.getharvest.com/forecast |
| Role permissions | Partially inferred from `access_roles` / `is_project_manager` fields in the API data model; help center returned HTTP 403 during research |
