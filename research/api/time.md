# Harvest API v2 — Time Entries (core)

Source: https://help.getharvest.com/api-v2/timesheets-api/timesheets/time-entries/

Time Entries are the heart of the product. An account is configured to track time either by **duration** (decimal hours) or by **start/end time** (timestamps). Use the matching create method for the account's tracking mode.

---

## Time Entry object fields
| Field | Type | Notes |
|---|---|---|
| `id` | bigint | Unique identifier |
| `spent_date` | date | Date the time was tracked (`YYYY-MM-DD`) |
| `user` | object | `{ id, name }` |
| `client` | object | `{ id, name }` |
| `project` | object | `{ id, name }` |
| `task` | object | `{ id, name }` |
| `user_assignment` | object | The project user-assignment in effect (see projects.md) |
| `task_assignment` | object | The project task-assignment in effect (see projects.md) |
| `external_reference` | object | `{ id, group_id, account_id, permalink, service, service_icon_url }` — links the entry to an external system (e.g. Trello card, GitHub issue) |
| `invoice` | object | `{ id, number }`; `null` until the entry is invoiced |
| `hours` | decimal | Total tracked time in decimal hours |
| `hours_without_timer` | decimal | Hours accrued before the current running timer started |
| `rounded_hours` | decimal | `hours` rounded per the account's Time Rounding preference (used in reports/invoicing) |
| `notes` | string | Free-text notes |
| `is_locked` | boolean | Locked (e.g. invoiced or in a closed timesheet) |
| `locked_reason` | string | Why it's locked |
| `is_closed` | boolean | **Deprecated** — use `approval_status` |
| `approval_status` | string | `unsubmitted`, `submitted`, or `approved` |
| `is_billed` | boolean | Whether it has been invoiced |
| `timer_started_at` | datetime | ISO 8601; `null` if not running |
| `started_time` | time | Start time (timestamp-based accounts), e.g. `8:00am` |
| `ended_time` | time | End time; `null` while running |
| `is_running` | boolean | Whether the timer is actively running |
| `billable` | boolean | Whether the entry is billable to the client |
| `budgeted` | boolean | Whether it counts toward the project budget |
| `billable_rate` | decimal | Rate used to bill; `null` if non-billable |
| `cost_rate` | decimal | Internal cost rate for the user |
| `created_at` | datetime | |
| `updated_at` | datetime | |

---

## Endpoints

### List time entries
`GET /v2/time_entries`

All query params optional:
| Param | Type | Notes |
|---|---|---|
| `user_id` | integer | |
| `client_id` | integer | |
| `project_id` | integer | |
| `task_id` | integer | |
| `external_reference_id` | string | Filter by linked external item |
| `is_billed` | boolean | |
| `is_running` | boolean | |
| `approval_status` | string | `unsubmitted`, `submitted`, `approved` |
| `updated_since` | datetime | ISO 8601 |
| `from` | date | Start of `spent_date` range |
| `to` | date | End of `spent_date` range |
| `page` | integer | Deprecated, default 1 |
| `per_page` | integer | 1–2000, default 2000 |

### Retrieve a time entry
`GET /v2/time_entries/{TIME_ENTRY_ID}`

### Create via duration
`POST /v2/time_entries` — for **duration-tracking** accounts.

| Param | Type | Req | Notes |
|---|---|---|---|
| `project_id` | integer | **required** | |
| `task_id` | integer | **required** | |
| `spent_date` | date | **required** | ISO 8601 |
| `user_id` | integer | optional | Defaults to authenticated user |
| `hours` | decimal | optional | If omitted, a **running** timer is started at `0.0` (`is_running=true`) |
| `notes` | string | optional | |
| `external_reference` | object | optional | `{ id, group_id, account_id, permalink }` |

Returns `201 Created`.

### Create via start and end time
`POST /v2/time_entries` — for **timestamp-tracking** accounts.

| Param | Type | Req | Notes |
|---|---|---|---|
| `project_id` | integer | **required** | |
| `task_id` | integer | **required** | |
| `spent_date` | date | **required** | ISO 8601 |
| `user_id` | integer | optional | Defaults to authenticated user |
| `started_time` | time | optional | e.g. `8:00am`; defaults to current time |
| `ended_time` | time | optional | If omitted, the entry **runs continuously** (running timer) |
| `notes` | string | optional | |
| `external_reference` | object | optional | |

Returns `201 Created`.

### Update a time entry
`PATCH /v2/time_entries/{TIME_ENTRY_ID}` — all optional: `project_id`, `task_id`, `spent_date`, `started_time`, `ended_time`, `hours`, `notes`, `external_reference`.

### Delete a time entry's external reference
`DELETE /v2/time_entries/{TIME_ENTRY_ID}/external_reference` — removes only the linked external reference. Returns `200 OK`.

### Delete a time entry
`DELETE /v2/time_entries/{TIME_ENTRY_ID}` — returns `200 OK`. Constraints: cannot delete entries that have been invoiced or are part of a closed/locked timesheet (admins have wider latitude on closed entries); the project/task cannot be archived.

### Restart a stopped timer
`PATCH /v2/time_entries/{TIME_ENTRY_ID}/restart` — no params. The entry must **not** currently be running. Sets `is_running=true` and a new `timer_started_at`. Returns `200 OK`.

### Stop a running timer
`PATCH /v2/time_entries/{TIME_ENTRY_ID}/stop` — no params. The entry must currently be running. Sets `is_running=false`, finalizes `hours`. Returns `200 OK`.

---

## How billable / hours / rounding / timers work

- **Tracking mode is account-wide.** Either duration or start/end time. Posting `started_time`/`ended_time` to a duration account (or `hours` to a timestamp account) is the wrong method for that account.
- **Running timer:** an entry with no `hours` (duration mode) or no `ended_time` (timestamp mode) starts running. `is_running=true` and `timer_started_at` is set. `hours_without_timer` holds the accumulated hours from before the current run; `hours` reflects elapsed time including the running portion.
- **Only one timer per user runs at a time** — starting/restarting a timer stops any other running entry for that user.
- **Billable:** `billable` is inherited from the project task assignment (`billable` flag) at creation time but can be overridden. `billable_rate` is resolved from the project/task/user rate config and is `null` for non-billable entries. `cost_rate` reflects the user's internal cost rate.
- **Rounding:** `hours` is the raw tracked time; `rounded_hours` applies the account's Time Rounding preference and is what reports and invoices use.
- **Budgeted:** `budgeted` indicates whether the entry counts against the project budget (depends on project `budget_by` config).
- **Approval:** `approval_status` (`unsubmitted` → `submitted` → `approved`) replaces the deprecated `is_closed`. Locked/invoiced entries (`is_locked`, `is_billed`) generally cannot be edited or deleted.
