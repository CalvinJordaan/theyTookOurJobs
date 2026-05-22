# Harvest API v2 — Clients & Client Contacts

Sources:
- https://help.getharvest.com/api-v2/clients-api/clients/clients/
- https://help.getharvest.com/api-v2/clients-api/clients/contacts/

Permissions: Client and Contact write operations require Administrator, or Manager with client-edit permission.

---

## Clients

### Client object fields
| Field | Type | Notes |
|---|---|---|
| `id` | integer | Unique ID |
| `name` | string | Client name |
| `is_active` | boolean | Active flag |
| `address` | string | Physical address (may contain line breaks) |
| `statement_key` | string | Key used in the client statement URL |
| `currency` | string | ISO currency code |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### List all clients
`GET /v2/clients`

| Param | Type | Req | Notes |
|---|---|---|---|
| `is_active` | boolean | optional | `true` = active only, `false` = inactive only |
| `updated_since` | datetime | optional | Only clients updated after this time |
| `page` | integer | optional | Deprecated — use `links` |
| `per_page` | integer | optional | 1–2000, default 2000 |

Returns paginated `clients` array plus pagination metadata.

### Retrieve a client
`GET /v2/clients/{CLIENT_ID}` — returns the client object.

### Create a client
`POST /v2/clients`

| Param | Type | Req | Notes |
|---|---|---|---|
| `name` | string | **required** | Client name |
| `is_active` | boolean | optional | Default `true` |
| `address` | string | optional | |
| `currency` | string | optional | ISO currency code |

Returns `201 Created` with the client object.

### Update a client
`PATCH /v2/clients/{CLIENT_ID}`

| Param | Type | Req |
|---|---|---|
| `name` | string | optional |
| `is_active` | boolean | optional |
| `address` | string | optional |
| `currency` | string | optional |

### Delete a client
`DELETE /v2/clients/{CLIENT_ID}`

Constraint: only possible if the client has **no projects, invoices, or estimates** associated. Returns `200 OK`.

---

## Client Contacts

### Contact object fields
| Field | Type | Notes |
|---|---|---|
| `id` | integer | |
| `client` | object | Nested `{ id, name }` |
| `title` | string | |
| `first_name` | string | |
| `last_name` | string | |
| `email` | string | |
| `phone_office` | string | |
| `phone_mobile` | string | |
| `fax` | string | |
| `invoice_recipient_status` | string | One of `none`, `recipient`, `cc`, `bcc` |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### List all contacts
`GET /v2/contacts`

| Param | Type | Req | Notes |
|---|---|---|---|
| `client_id` | integer | optional | Filter by client |
| `updated_since` | datetime | optional | |
| `page` | integer | optional | Deprecated |
| `per_page` | integer | optional | 1–2000, default 2000 |

### Retrieve a contact
`GET /v2/contacts/{CONTACT_ID}` — returns the contact object.

### Create a contact
`POST /v2/contacts`

| Param | Type | Req |
|---|---|---|
| `client_id` | integer | **required** |
| `first_name` | string | **required** |
| `title` | string | optional |
| `last_name` | string | optional |
| `email` | string | optional |
| `phone_office` | string | optional |
| `phone_mobile` | string | optional |
| `fax` | string | optional |
| `invoice_recipient_status` | string | optional |

Returns `201 Created`.

### Update a contact
`PATCH /v2/contacts/{CONTACT_ID}` — all params optional: `client_id`, `title`, `first_name`, `last_name`, `email`, `phone_office`, `phone_mobile`, `fax`, `invoice_recipient_status`.

### Delete a contact
`DELETE /v2/contacts/{CONTACT_ID}` — returns `200 OK`.
