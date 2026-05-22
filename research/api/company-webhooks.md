# Harvest API v2 — Company & Webhooks/Notifications

Sources:
- https://help.getharvest.com/api-v2/company-api/company/company/
- https://help.getharvest.com/api-v2/ (top-level section index — checked for a Webhooks/Notifications/Events section)
- Webhook support confirmed absent via Harvest docs index + community/integration guidance.

---

## Company

The Company resource exposes the account's settings and feature flags. There is a single company per account.

### Company object fields
| Field | Type | Notes |
|---|---|---|
| `id` | integer | |
| `base_uri` | string | API base URI for the account |
| `full_domain` | string | The account's Harvest domain (e.g. `myco.harvestapp.com`) |
| `name` | string | Company name |
| `is_active` | boolean | Whether the account is active |
| `week_start_day` | string | e.g. `Monday` |
| `wants_timestamp_timers` | boolean | **Tracking mode**: `true` = start/end time, `false` = duration. Determines which Time Entry create method to use |
| `time_format` | string | `decimal` or `hours_minutes` |
| `date_format` | string | Account date format |
| `plan_type` | string | Subscription plan |
| `clock` | string | `12h` or `24h` |
| `currency_code_display` | string | |
| `currency_symbol_display` | string | |
| `decimal_symbol` | string | |
| `thousands_separator` | string | |
| `color_scheme` | string | |
| `weekly_capacity` | integer | Default weekly capacity, in **seconds** |
| `expense_feature` | boolean | Whether Expenses are enabled |
| `invoice_feature` | boolean | Whether Invoices are enabled |
| `estimate_feature` | boolean | Whether Estimates are enabled |
| `approval_feature` | boolean | Whether timesheet/expense Approval is enabled |

### Retrieve company
`GET /v2/company` — no params. Returns the company object for the authenticated account.

### Update company
`PATCH /v2/company` — updatable params:
| Param | Type |
|---|---|
| `wants_timestamp_timers` | boolean |
| `weekly_capacity` | integer (seconds) |

Any params not provided are left unchanged. Returns the full company object.

> Practical note: read `wants_timestamp_timers` at startup to decide whether to create time entries by duration (`hours`) or by start/end time (`started_time`/`ended_time`). Read the `*_feature` flags to know whether to surface Invoices/Estimates/Expenses/Approval UI. `weekly_capacity` is in seconds (e.g. 126000 = 35h).

---

## Webhooks / Notifications / Events

**Harvest API v2 has NO native webhooks, notifications, or events API.**

- The official API v2 documentation index (https://help.getharvest.com/api-v2/) contains these sections only: Introduction, Authentication, Clients, Company, Invoices, Estimates, Expenses, Tasks, Timesheets, Projects, Roles, Users, Reports.
- There is **no** "Webhooks", "Notifications", or "Events" section, and no endpoint to register, list, or receive callbacks.
- Confirmed as of May 2026.

### Implications for the rebuild
Because Harvest cannot push change notifications, integrations rely on **polling**:
- Most list endpoints accept `updated_since` (ISO 8601 datetime). Poll on an interval and pass the last-seen timestamp to fetch only changed records. This is the canonical Harvest sync pattern.
- For running timers, poll `GET /v2/time_entries?is_running=true` (optionally per `user_id`).
- Third-party automation platforms (Zapier, n8n, Make/Integrately) provide webhook-like triggers, but they are themselves built on polling the Harvest API — not on a Harvest-provided webhook.

If the rebuilt internal product needs real-time push, it must implement its own webhook/event layer; it cannot proxy a Harvest webhook because none exists.
