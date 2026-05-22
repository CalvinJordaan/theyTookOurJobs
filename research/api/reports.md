# Harvest API v2 — Reports

Sources:
- https://help.getharvest.com/api-v2/reports-api/reports/time-reports/
- https://help.getharvest.com/api-v2/reports-api/reports/expense-reports/
- https://help.getharvest.com/api-v2/reports-api/reports/project-budget-report/
- https://help.getharvest.com/api-v2/reports-api/reports/uninvoiced-report/

**Rate limit:** the Reports API is throttled at **100 requests per 15 minutes** (separate, stricter limit than the general 100/15 seconds). See `00-overview.md`.

Common conventions:
- `from` / `to` are dates. Time reports document the `YYYYMMDD` form (e.g. `20240101`); ISO `YYYY-MM-DD` is also accepted.
- The reporting window generally cannot exceed **365 days**.
- All return a `results` array plus pagination metadata.
- Money/billable fields are only visible to Administrators and Managers with the "View billable rates and amounts" permission.

---

## Time Reports

Required on all: `from`, `to`. Optional: `page`, `per_page` (1–2000, default 2000), `include_fixed_fee`. Projects/Team reports also accept `include_forecast`.

| Report | Method + Path |
|---|---|
| Clients | `GET /v2/reports/time/clients` |
| Projects | `GET /v2/reports/time/projects` (also `include_forecast`) |
| Tasks | `GET /v2/reports/time/tasks` |
| Team | `GET /v2/reports/time/team` (also `include_forecast`) |

**Result fields:** `client_id`, `client_name`, `project_id`, `project_name`, `task_id`, `task_name`, `user_id`, `user_name`, `is_contractor`, `total_hours`, `billable_hours`, `currency`, `billable_amount`. Team report adds `weekly_capacity`, `avatar_url`, and (with `include_forecast`) `scheduled_hours`. Only the fields relevant to each grouping appear (e.g. `task_id`/`task_name` only on the Tasks report; `user_id`/`user_name` only on the Team report).

---

## Expense Reports

Required on all: `from`, `to`. Optional: `page`, `per_page` (1–2000, default 2000).

| Report | Method + Path |
|---|---|
| Clients | `GET /v2/reports/expenses/clients` |
| Projects | `GET /v2/reports/expenses/projects` |
| Categories | `GET /v2/reports/expenses/categories` |
| Team | `GET /v2/reports/expenses/team` |

**Result fields:** `client_id`, `client_name`, `project_id`, `project_name`, `expense_category_id`, `expense_category_name`, `user_id`, `user_name`, `is_contractor`, `total_amount`, `billable_amount`, `currency`. Only fields relevant to each grouping appear (e.g. `user_id` only on Team).

---

## Project Budget Report

`GET /v2/reports/project_budget`

Params (all optional): `is_active` (boolean), `page` (default 1), `per_page` (1–2000, default 2000). No `from`/`to` — it reports current budget state.

**Result fields:** `project_id`, `project_name`, `client_id`, `client_name`, `budget_is_monthly`, `budget_by`, `is_active`, `budget`, `budget_spent`, `budget_remaining`.

Constraint: when a project is budgeted by money, `budget`, `budget_spent`, and `budget_remaining` are only visible to Administrators and Project Managers with the "View billable rates and amounts" permission.

---

## Uninvoiced Report

`GET /v2/reports/uninvoiced`

Required: `from` (only time entries/expenses with `spent_date` >= this date), `to` (<= this date). Optional: `page` (default 1), `per_page` (1–2000, default 2000). Timeframe cannot exceed 365 days.

**Result fields:** `client_id`, `client_name`, `project_id`, `project_name`, `currency`, `total_hours`, `uninvoiced_hours`, `uninvoiced_expenses`, `uninvoiced_amount`.
