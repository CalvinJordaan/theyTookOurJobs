# Harvest API v2 — Tasks

Source: https://help.getharvest.com/api-v2/tasks-api/tasks/tasks/

Tasks are the kinds of work that can be tracked (e.g. "Design", "Programming"). They are assigned to projects via Project Task Assignments (see `projects.md`). Write operations are Administrator-only.

### Task object fields
| Field | Type | Notes |
|---|---|---|
| `id` | integer | |
| `name` | string | Task name |
| `billable_by_default` | boolean | Whether new task assignments default to billable |
| `default_hourly_rate` | decimal | Default rate for this task |
| `is_default` | boolean | If `true`, auto-added to new projects |
| `is_active` | boolean | |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### List all tasks
`GET /v2/tasks`

| Param | Type | Req | Notes |
|---|---|---|---|
| `is_active` | boolean | optional | `true`/`false` filter |
| `updated_since` | datetime | optional | |
| `page` | integer | optional | Deprecated |
| `per_page` | integer | optional | 1–2000, default 2000 |

### Retrieve a task
`GET /v2/tasks/{TASK_ID}` — returns the task object.

### Create a task
`POST /v2/tasks`

| Param | Type | Req | Default |
|---|---|---|---|
| `name` | string | **required** | |
| `billable_by_default` | boolean | optional | `true` |
| `default_hourly_rate` | decimal | optional | `0` |
| `is_default` | boolean | optional | `false` |
| `is_active` | boolean | optional | `true` |

Returns `201 Created`.

### Update a task
`PATCH /v2/tasks/{TASK_ID}` — all params optional: `name`, `billable_by_default`, `default_hourly_rate`, `is_default`, `is_active`.

### Delete a task
`DELETE /v2/tasks/{TASK_ID}` — only possible if the task has **no time entries** associated. Returns `200 OK`.
