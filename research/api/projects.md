# Harvest API v2 — Projects, Task Assignments, User Assignments

Sources:
- https://help.getharvest.com/api-v2/projects-api/projects/projects/
- https://help.getharvest.com/api-v2/projects-api/projects/task-assignments/
- https://help.getharvest.com/api-v2/projects-api/projects/user-assignments/

Write operations require Administrator (or, for some, Manager) permission.

---

## Projects

### Project object fields
| Field | Type | Notes |
|---|---|---|
| `id` | integer | |
| `client` | object | Nested `{ id, name, currency }` |
| `name` | string | |
| `code` | string | Project code/abbreviation |
| `is_active` | boolean | |
| `is_billable` | boolean | Whether the project is billable |
| `is_fixed_fee` | boolean | Whether it's a fixed-fee project |
| `bill_by` | string | How to bill: `Project`, `Tasks`, `People`, `none` |
| `hourly_rate` | decimal | Rate when `bill_by` is `Project` |
| `budget` | decimal | Budget value (hours or amount, per `budget_by`) |
| `budget_by` | string | `project`, `project_cost`, `task`, `task_fees`, `person`, `none` |
| `budget_is_monthly` | boolean | Budget resets monthly |
| `notify_when_over_budget` | boolean | |
| `over_budget_notification_percentage` | decimal | Percentage at which to warn |
| `over_budget_notification_date` | date | Date of last over-budget notification |
| `show_budget_to_all` | boolean | Show budget to assigned users |
| `cost_budget` | decimal | Budget in terms of cost |
| `cost_budget_include_expenses` | boolean | Whether expenses count toward cost budget |
| `fee` | decimal | Fixed fee amount |
| `notes` | string | |
| `starts_on` | date | |
| `ends_on` | date | |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### List all projects
`GET /v2/projects`

| Param | Type | Req | Notes |
|---|---|---|---|
| `is_active` | boolean | optional | |
| `client_id` | integer | optional | Filter by client |
| `updated_since` | datetime | optional | |
| `page` | integer | optional | Deprecated |
| `per_page` | integer | optional | 1–2000, default 2000 |

### Retrieve a project
`GET /v2/projects/{PROJECT_ID}`

### Create a project
`POST /v2/projects`

**Required:**
| Param | Type | Notes |
|---|---|---|
| `client_id` | integer | |
| `name` | string | |
| `is_billable` | boolean | |
| `bill_by` | string | `Project`, `Tasks`, `People`, or `none` |
| `budget_by` | string | `project`, `project_cost`, `task`, `task_fees`, `person`, or `none` |

**Optional:** `code`, `is_active`, `is_fixed_fee`, `hourly_rate`, `budget_is_monthly`, `budget`, `cost_budget`, `cost_budget_include_expenses`, `notify_when_over_budget`, `over_budget_notification_percentage`, `show_budget_to_all`, `fee`, `notes`, `starts_on`, `ends_on`.

Returns `201 Created`.

### Update a project
`PATCH /v2/projects/{PROJECT_ID}` — all Create params, all optional.

### Delete a project
`DELETE /v2/projects/{PROJECT_ID}` — deletes the project and all associated time entries and expenses. Returns `200 OK`. (To keep historical data, set `is_active=false` instead.)

---

## Project Task Assignments

Links a Task to a Project, with project-specific billable flag, rate, and budget.

### Task assignment object fields
| Field | Type | Notes |
|---|---|---|
| `id` | integer | |
| `project` | object | Nested `{ id, name, code }` |
| `task` | object | Nested `{ id, name }` |
| `is_active` | boolean | |
| `billable` | boolean | |
| `hourly_rate` | decimal | |
| `budget` | decimal | |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### List all task assignments (account-wide)
`GET /v2/task_assignments`
Params: `is_active`, `updated_since`, `page` (deprecated), `per_page` (1–2000, default 2000).

### List task assignments for a project
`GET /v2/projects/{PROJECT_ID}/task_assignments`
Same params as above.

### Retrieve a task assignment
`GET /v2/projects/{PROJECT_ID}/task_assignments/{TASK_ASSIGNMENT_ID}`

### Create a task assignment
`POST /v2/projects/{PROJECT_ID}/task_assignments`

| Param | Type | Req | Default |
|---|---|---|---|
| `task_id` | integer | **required** | |
| `is_active` | boolean | optional | `true` |
| `billable` | boolean | optional | `false` |
| `hourly_rate` | decimal | optional | `null` when billing by task hourly rate, else `0` |
| `budget` | decimal | optional | |

Returns `201 Created`.

### Update a task assignment
`PATCH /v2/projects/{PROJECT_ID}/task_assignments/{TASK_ASSIGNMENT_ID}` — params: `is_active`, `billable`, `hourly_rate`, `budget`.

### Delete a task assignment
`DELETE /v2/projects/{PROJECT_ID}/task_assignments/{TASK_ASSIGNMENT_ID}` — only possible if it has **no time entries**. Returns `200 OK`.

---

## Project User Assignments

Links a User to a Project, controlling who can track time and at what rate.

### User assignment object fields
| Field | Type | Notes |
|---|---|---|
| `id` | integer | |
| `project` | object | Nested `{ id, name, code }` |
| `user` | object | Nested `{ id, name }` |
| `is_active` | boolean | |
| `is_project_manager` | boolean | |
| `use_default_rates` | boolean | Use the user's default rate vs `hourly_rate` |
| `hourly_rate` | decimal | |
| `budget` | decimal | |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### List all user assignments (account-wide)
`GET /v2/user_assignments`
Params: `user_id`, `is_active`, `updated_since`, `page` (deprecated), `per_page` (1–2000, default 2000).

### List user assignments for a project
`GET /v2/projects/{PROJECT_ID}/user_assignments`
Same params.

### Retrieve a user assignment
`GET /v2/projects/{PROJECT_ID}/user_assignments/{USER_ASSIGNMENT_ID}`

### Create a user assignment
`POST /v2/projects/{PROJECT_ID}/user_assignments`

| Param | Type | Req | Default |
|---|---|---|---|
| `user_id` | integer | **required** | |
| `is_active` | boolean | optional | `true` |
| `is_project_manager` | boolean | optional | |
| `use_default_rates` | boolean | optional | `true` |
| `hourly_rate` | decimal | optional | `0` |
| `budget` | decimal | optional | |

Returns `201 Created`.

### Update a user assignment
`PATCH /v2/projects/{PROJECT_ID}/user_assignments/{USER_ASSIGNMENT_ID}` — params: `is_active`, `is_project_manager`, `use_default_rates`, `hourly_rate`, `budget`.

### Delete a user assignment
`DELETE /v2/projects/{PROJECT_ID}/user_assignments/{USER_ASSIGNMENT_ID}` — only possible if it has **no time entries or expenses**. Returns `200 OK`.
