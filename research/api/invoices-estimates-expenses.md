# Harvest API v2 — Invoices, Estimates, Expenses

Sources:
- https://help.getharvest.com/api-v2/invoices-api/invoices/invoices/
- https://help.getharvest.com/api-v2/invoices-api/invoices/invoice-messages/
- https://help.getharvest.com/api-v2/invoices-api/invoices/invoice-payments/
- https://help.getharvest.com/api-v2/invoices-api/invoices/invoice-item-categories/
- https://help.getharvest.com/api-v2/estimates-api/estimates/estimates/
- https://help.getharvest.com/api-v2/estimates-api/estimates/estimate-messages/
- https://help.getharvest.com/api-v2/estimates-api/estimates/estimate-item-categories/
- https://help.getharvest.com/api-v2/expenses-api/expenses/expenses/
- https://help.getharvest.com/api-v2/expenses-api/expenses/expense-categories/

All write operations require Administrator or a Manager with the relevant create/edit permission (`403 Forbidden` otherwise).

---

# INVOICES

### Invoice object fields
| Field | Type | Notes |
|---|---|---|
| `id` | integer | |
| `client` | object | `{ id, name }` |
| `creator` | object | `{ id, name }` |
| `estimate` | object | `{ id }` — source estimate if converted |
| `retainer` | object | `{ id }` |
| `line_items` | array | see below |
| `client_key` | string | Key used in the public invoice URL |
| `number` | string | Invoice number |
| `purchase_order` | string | |
| `amount` | decimal | Total |
| `due_amount` | decimal | Outstanding balance |
| `tax` | decimal | First tax % |
| `tax_amount` | decimal | First tax amount |
| `tax2` | decimal | Second tax % |
| `tax2_amount` | decimal | Second tax amount |
| `discount` | decimal | Discount % |
| `discount_amount` | decimal | Discount amount |
| `subject` | string | |
| `notes` | string | |
| `currency` | string | |
| `state` | string | `draft`, `open`, `paid`, `closed` |
| `period_start` | date | Period covered (when based on tracked time) |
| `period_end` | date | |
| `issue_date` | date | |
| `due_date` | date | |
| `payment_term` | string | |
| `payment_options` | array | `ach`, `credit_card`, `paypal` |
| `sent_at` | datetime | |
| `paid_at` | datetime | |
| `paid_date` | date | |
| `closed_at` | datetime | |
| `recurring_invoice_id` | integer | |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### Invoice line item fields
`id`, `kind` (string, required on create), `description`, `quantity` (decimal, default 1), `unit_price` (decimal, required), `amount` (decimal), `taxed` (boolean), `taxed2` (boolean), `project` (`{ id, name, code }`).

### List invoices
`GET /v2/invoices`
Params: `client_id`, `project_id`, `updated_since`, `from` (date), `to` (date), `state` (`draft|open|paid|closed`), `page` (default 1), `per_page` (1–2000; **note: this list's per_page default is 100, max 2000**).

### Retrieve an invoice
`GET /v2/invoices/{INVOICE_ID}`

### Create an invoice
`POST /v2/invoices`

Required: `client_id`.
Optional: `number`, `purchase_order`, `subject`, `notes`, `currency`, `issue_date`, `due_date`, `payment_term` (`upon receipt|net 15|net 30|net 45|net 60|custom`), `tax`, `tax2`, `discount`, `payment_options` (`ach|credit_card|paypal`), `line_items` (array), **or** `line_items_import` (object, mutually exclusive with `line_items`).

**Free-form** invoices supply `line_items`. **Based on tracked time/expenses** supply `line_items_import`:
- `project_ids` (array, required)
- `time` (object, optional): `summary_type` (`project|task|people|detailed`), `from`, `to`
- `expenses` (object, optional): `summary_type` (`project|category|people|detailed`), `from`, `to`, `attach_receipts`

Returns `201 Created`.

### Update an invoice
`PATCH /v2/invoices/{INVOICE_ID}` — same params as create. For line items: include `id` to update an existing one; include `_destroy: true` to remove one.

### Delete an invoice
`DELETE /v2/invoices/{INVOICE_ID}` — returns `200 OK`.

---

## Invoice Messages

Used to email invoices and to drive state changes (send/close/reopen/draft).

### Message object fields
`id`, `sent_by`, `sent_by_email`, `sent_from`, `sent_from_email`, `recipients` (array of `{ name, email }`), `subject`, `body`, `include_link_to_client_invoice` (deprecated), `attach_pdf`, `send_me_a_copy`, `thank_you`, `reminder`, `event_type`, `send_reminder_on`, `created_at`, `updated_at`.

### List messages
`GET /v2/invoices/{INVOICE_ID}/messages` — params: `updated_since`, `page` (deprecated), `per_page` (default 2000).

### Retrieve a new-message template
`GET /v2/invoices/{INVOICE_ID}/messages/new` — params: `thank_you` (boolean), `reminder` (boolean). Returns `invoice_id`, `subject`, `body`, `reminder`, `thank_you` to prefill an email.

### Create / send a message
`POST /v2/invoices/{INVOICE_ID}/messages`
Params: `recipients` (array of `{ name (optional), email (required) }`), `subject`, `body`, `attach_pdf`, `send_me_a_copy`, `thank_you`, `include_link_to_client_invoice` (deprecated), `event_type`.
- Omit `event_type` to send a normal message.
- Provide `event_type` to change invoice state (see below).

### State management via messages
`POST /v2/invoices/{INVOICE_ID}/messages` with `event_type`:
| `event_type` | Effect |
|---|---|
| `send` | Mark a draft invoice as sent (→ `open`) |
| `close` | Close / write off an open invoice (→ `closed`) |
| `re-open` | Reopen a closed invoice |
| `draft` | Move an open invoice back to draft |

### Delete a message
`DELETE /v2/invoices/{INVOICE_ID}/messages/{MESSAGE_ID}` — `200 OK`.

---

## Invoice Payments

### Payment object fields
`id`, `amount`, `paid_at` (datetime), `paid_date` (date), `recorded_by`, `recorded_by_email`, `notes`, `transaction_id`, `payment_gateway` (`{ id, name }`), `created_at`, `updated_at`.

### List payments
`GET /v2/invoices/{INVOICE_ID}/payments` — params: `updated_since`, `page` (deprecated), `per_page` (1–2000, default 2000).

### Create a payment
`POST /v2/invoices/{INVOICE_ID}/payments`
| Param | Type | Req | Notes |
|---|---|---|---|
| `amount` | decimal | **required** | |
| `paid_at` | datetime | optional | Pass `paid_at` **or** `paid_date`, not both |
| `paid_date` | date | optional | |
| `notes` | string | optional | |
| `send_thank_you` | boolean | optional | Default `true` (if account enables thank-you emails) |

Returns `201 Created`.

### Delete a payment
`DELETE /v2/invoices/{INVOICE_ID}/payments/{PAYMENT_ID}` — `200 OK`.

---

## Invoice Item Categories

### Object fields
`id`, `name`, `use_as_service` (boolean), `use_as_expense` (boolean), `created_at`, `updated_at`.

| Operation | Method + Path | Params |
|---|---|---|
| List | `GET /v2/invoice_item_categories` | `updated_since`, `page` (deprecated), `per_page` (1–2000, default 2000) |
| Retrieve | `GET /v2/invoice_item_categories/{ID}` | none |
| Create | `POST /v2/invoice_item_categories` | `name` (**required**) → `201 Created` |
| Update | `PATCH /v2/invoice_item_categories/{ID}` | `name` (optional) |
| Delete | `DELETE /v2/invoice_item_categories/{ID}` | only if both `use_as_service` and `use_as_expense` are `false` → `200 OK` |

---

# ESTIMATES

### Estimate object fields
| Field | Type | Notes |
|---|---|---|
| `id` | integer | |
| `client` | object | `{ id, name }` |
| `creator` | object | `{ id, name }` |
| `line_items` | array | see below |
| `client_key` | string | |
| `number` | string | |
| `purchase_order` | string | |
| `amount` | decimal | |
| `tax` | decimal | |
| `tax_amount` | decimal | |
| `tax2` | decimal | |
| `tax2_amount` | decimal | |
| `discount` | decimal | |
| `discount_amount` | decimal | |
| `subject` | string | |
| `notes` | string | |
| `currency` | string | |
| `state` | string | `draft`, `sent`, `accepted`, `declined` |
| `issue_date` | date | |
| `sent_at` | datetime | |
| `accepted_at` | datetime | |
| `declined_at` | datetime | |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### Estimate line item fields
`id`, `kind` (string, required on create), `description`, `quantity` (default 1), `unit_price` (decimal, required), `amount`, `taxed` (boolean, default false), `taxed2` (boolean, default false), `_destroy` (boolean — set true to delete on update).

### List estimates
`GET /v2/estimates` — params: `client_id`, `updated_since`, `from` (date), `to` (date), `state` (`draft|sent|accepted|declined`), `page` (default 1), `per_page` (1–2000, default 2000).

### Retrieve an estimate
`GET /v2/estimates/{ESTIMATE_ID}`

### Create an estimate
`POST /v2/estimates`
Required: `client_id`. Optional: `number` (auto-generated if omitted), `purchase_order`, `tax`, `tax2`, `discount`, `subject`, `notes`, `currency`, `issue_date`, `line_items` (array). Returns `201 Created`.

### Update an estimate
`PATCH /v2/estimates/{ESTIMATE_ID}` — same params; line items use `id` to update and `_destroy: true` to delete.

### Delete an estimate
`DELETE /v2/estimates/{ESTIMATE_ID}` — `200 OK`.

---

## Estimate Messages

### Message object fields
`id`, `sent_by`, `sent_by_email`, `sent_from`, `sent_from_email`, `recipients` (array of `{ name, email }`), `subject`, `body`, `send_me_a_copy`, `event_type`, `created_at`, `updated_at`.

### List messages
`GET /v2/estimates/{ESTIMATE_ID}/messages` — params: `updated_since`, `page` (deprecated), `per_page` (1–2000, default 2000).

### Create a message / change state
`POST /v2/estimates/{ESTIMATE_ID}/messages`
Params: `recipients` (array of `{ name (optional), email (required) }`), `subject`, `body`, `send_me_a_copy`, `event_type`.

State changes via `event_type`:
| `event_type` | Effect |
|---|---|
| `send` | Mark estimate as sent |
| `accept` | Mark estimate as accepted |
| `decline` | Mark estimate as declined |
| `re-open` | Re-open a closed estimate |

### Delete a message
`DELETE /v2/estimates/{ESTIMATE_ID}/messages/{MESSAGE_ID}` — `200 OK`.

---

## Estimate Item Categories

### Object fields
`id`, `name`, `created_at`, `updated_at`.

| Operation | Method + Path | Params |
|---|---|---|
| List | `GET /v2/estimate_item_categories` | `updated_since`, `page` (deprecated), `per_page` (default 2000) |
| Retrieve | `GET /v2/estimate_item_categories/{ID}` | none |
| Create | `POST /v2/estimate_item_categories` | `name` (**required**) → `201 Created` |
| Update | `PATCH /v2/estimate_item_categories/{ID}` | `name` (optional) |
| Delete | `DELETE /v2/estimate_item_categories/{ID}` | → `200 OK` |

---

# EXPENSES

### Expense object fields
| Field | Type | Notes |
|---|---|---|
| `id` | integer | |
| `client` | object | `{ id, name, currency }` |
| `project` | object | `{ id, name, code }` |
| `expense_category` | object | `{ id, name, unit_price, unit_name }` |
| `user` | object | `{ id, name }` |
| `user_assignment` | object | The project user assignment in effect |
| `receipt` | object | `{ url, file_name, file_size, content_type }` |
| `invoice` | object | `{ id, number }`; `null` until invoiced |
| `notes` | string | |
| `units` | decimal | For unit-based categories |
| `total_cost` | decimal | |
| `billable` | boolean | |
| `is_closed` | boolean | **Deprecated** — use `approval_status` |
| `approval_status` | string | `unsubmitted`, `submitted`, `approved` |
| `is_locked` | boolean | |
| `locked_reason` | string | |
| `is_billed` | boolean | |
| `spent_date` | date | |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### List expenses
`GET /v2/expenses` — params: `user_id`, `client_id`, `project_id`, `is_billed`, `approval_status` (`unsubmitted|submitted|approved`), `updated_since`, `from` (date), `to` (date), `page`, `per_page` (1–2000, default 2000).

### Retrieve an expense
`GET /v2/expenses/{EXPENSE_ID}`

### Create an expense
`POST /v2/expenses`
Required: `project_id`, `expense_category_id`, `spent_date`.
Optional: `user_id` (defaults to authenticated user), `units`, `total_cost`, `notes`, `billable`, `receipt` (file).
- Provide `units` for unit-based categories (cost computed from category `unit_price`), otherwise provide `total_cost`.
- To attach a receipt, send the request as **`multipart/form-data`** with the `receipt` file part.

Returns `201 Created`.

### Update an expense
`PATCH /v2/expenses/{EXPENSE_ID}` — params: `project_id`, `expense_category_id`, `spent_date`, `units`, `total_cost`, `notes`, `billable`, `receipt` (multipart), `delete_receipt` (boolean). Changes to `project_id`/`expense_category_id` are silently ignored if the expense is locked.

### Delete an expense
`DELETE /v2/expenses/{EXPENSE_ID}` — `200 OK`.

---

## Expense Categories

### Object fields
`id`, `name`, `unit_name`, `unit_price` (decimal), `is_active` (boolean), `created_at`, `updated_at`.

| Operation | Method + Path | Params |
|---|---|---|
| List | `GET /v2/expense_categories` | `is_active`, `updated_since`, `page` (deprecated), `per_page` (1–2000, default 2000) |
| Retrieve | `GET /v2/expense_categories/{ID}` | none |
| Create | `POST /v2/expense_categories` | `name` (**required**), `unit_name`, `unit_price`, `is_active` (default `true`) → `201 Created` |
| Update | `PATCH /v2/expense_categories/{ID}` | same, all optional |
| Delete | `DELETE /v2/expense_categories/{ID}` | → `200 OK` |
