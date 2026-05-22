# Harvest API v2 — Users, Current User, Roles, Teammates, Billable/Cost Rates, Project Assignments

Sources:
- https://help.getharvest.com/api-v2/users-api/users/users/
- https://help.getharvest.com/api-v2/roles-api/roles/roles/
- https://help.getharvest.com/api-v2/users-api/users/teammates/
- https://help.getharvest.com/api-v2/users-api/users/billable-rates/
- https://help.getharvest.com/api-v2/users-api/users/cost-rates/
- https://help.getharvest.com/api-v2/users-api/users/project-assignments/

Most write operations require Administrator. Some rate operations allow a Manager with the right permission.

---

## Users

### User object fields
| Field | Type | Notes |
|---|---|---|
| `id` | integer | |
| `first_name` | string | |
| `last_name` | string | |
| `email` | string | |
| `telephone` | string | |
| `timezone` | string | |
| `has_access_to_all_future_projects` | boolean | Auto-assigned to new projects |
| `is_contractor` | boolean | |
| `is_active` | boolean | |
| `weekly_capacity` | integer | Expected weekly hours, in **seconds** |
| `default_hourly_rate` | decimal | |
| `cost_rate` | decimal | |
| `roles` | array of strings | Custom role names |
| `access_roles` | array of strings | Access roles (e.g. `administrator`, `manager`, `member`, `people_manager`, `project_creator`, `billable_rates_manager`, `time_and_expenses_manager`) |
| `avatar_url` | string | |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### List users
`GET /v2/users` — params: `is_active` (boolean), `updated_since` (datetime), `page` (deprecated), `per_page` (1–2000, default 2000).

### Retrieve the current (authenticated) user
`GET /v2/users/me` — returns the user object for the token's owner. No params.

### Retrieve a user
`GET /v2/users/{USER_ID}`

### Create a user
`POST /v2/users`

| Param | Type | Req |
|---|---|---|
| `first_name` | string | **required** |
| `last_name` | string | **required** |
| `email` | string | **required** |
| `timezone` | string | optional |
| `has_access_to_all_future_projects` | boolean | optional |
| `is_contractor` | boolean | optional |
| `is_active` | boolean | optional |
| `weekly_capacity` | integer | optional (seconds) |
| `default_hourly_rate` | decimal | optional |
| `cost_rate` | decimal | optional |
| `roles` | array | optional |
| `access_roles` | array | optional |

Returns `201 Created`. Admin-only.

### Update a user
`PATCH /v2/users/{USER_ID}` — same fields as create, all optional.

### Delete a user
`DELETE /v2/users/{USER_ID}` — only possible if the user has no time entries or expenses; otherwise deactivate instead. Returns `200 OK`.

---

## Roles

Admin-only. Uses cursor-based pagination (the `page` param is deprecated).

### Role object fields
| Field | Type |
|---|---|
| `id` | integer |
| `name` | string |
| `user_ids` | array of integers |
| `created_at` | datetime |
| `updated_at` | datetime |

| Operation | Method + Path | Params |
|---|---|---|
| List | `GET /v2/roles` | `page` (deprecated), `per_page` (1–2000, default 2000) |
| Retrieve | `GET /v2/roles/{ROLE_ID}` | none |
| Create | `POST /v2/roles` | `name` (**required**), `user_ids` (optional) → `201 Created` |
| Update | `PATCH /v2/roles/{ROLE_ID}` | `name` (optional), `user_ids` (optional). `user_ids[]` **overwrites** the existing list |
| Delete | `DELETE /v2/roles/{ROLE_ID}` | unlinks the role from all users → `200 OK` |

---

## Teammates

Teammates are the direct reports assigned to a **Manager**. Admin-only; the target user must be a Manager (otherwise `422 Unprocessable Entity`).

### Endpoints
- `GET /v2/users/{USER_ID}/teammates` — list assigned teammates. Params: `page` (deprecated), `per_page` (1–2000, default 2000).
- `PATCH /v2/users/{USER_ID}/teammates` — set the full list.

| Param | Type | Req | Notes |
|---|---|---|---|
| `teammate_ids` | array of user IDs | **required** | Full replacement list; empty array unassigns all and removes the `people_manager` access role |

### Response
`teammates` array of `{ id, first_name, last_name, email }`. Assigning teammates grants the user the `people_manager` access role.

---

## Billable Rates

The history of a user's billable rates over time. Requires Administrator or Manager with permission to edit billable rates.

### Billable rate object fields
`id`, `amount` (decimal), `start_date` (date), `end_date` (date), `created_at`, `updated_at`.

| Operation | Method + Path | Params |
|---|---|---|
| List | `GET /v2/users/{USER_ID}/billable_rates` | `page` (deprecated), `per_page` (1–2000, default 2000) |
| Retrieve | `GET /v2/users/{USER_ID}/billable_rates/{BILLABLE_RATE_ID}` | none |
| Create | `POST /v2/users/{USER_ID}/billable_rates` | `amount` (**required**, decimal), `start_date` (optional, date — cannot be in the future) → `201 Created` |

Setting a new rate closes out the prior one (its `end_date` is set automatically).

---

## Cost Rates

History of a user's internal cost rates. Administrator-only (`403 Forbidden` otherwise).

### Cost rate object fields
`id`, `amount` (decimal), `start_date` (date), `end_date` (date), `created_at`, `updated_at`.

| Operation | Method + Path | Params |
|---|---|---|
| List | `GET /v2/users/{USER_ID}/cost_rates` | `page` (deprecated), `per_page` (1–2000, default 2000) |
| Retrieve | `GET /v2/users/{USER_ID}/cost_rates/{COST_RATE_ID}` | none |
| Create | `POST /v2/users/{USER_ID}/cost_rates` | `amount` (**required**, decimal), `start_date` (optional, date — cannot be in the future) → `201 Created` |

---

## User Project Assignments

Read-only views of which projects a user is assigned to (mirror of Project User Assignments in projects.md, but oriented around the user).

### Project assignment object fields
| Field | Type | Notes |
|---|---|---|
| `id` | integer | |
| `is_active` | boolean | |
| `is_project_manager` | boolean | |
| `use_default_rates` | boolean | |
| `budget` | decimal | |
| `hourly_rate` | decimal | |
| `created_at` | datetime | |
| `updated_at` | datetime | |
| `project` | object | `{ id, name, code }` |
| `client` | object | `{ id, name }` |
| `task_assignments` | array | Task assignment objects for the project |

### Endpoints
- `GET /v2/users/me/project_assignments` — active assignments for the current user. Params: `page` (default 1), `per_page` (1–2000, default 2000).
- `GET /v2/users/{USER_ID}/project_assignments` — active assignments for a specific user. Params: `updated_since`, `page`, `per_page`.
