# Harvest API v2 — Overview

Sources:
- https://help.getharvest.com/api-v2/introduction/overview/general/
- https://help.getharvest.com/api-v2/introduction/overview/pagination/
- https://help.getharvest.com/api-v2/authentication-api/authentication/authentication/
- Rate limiting: the dedicated `/rate-limiting/` doc page 404'd at the expected path; figures below confirmed via Harvest official docs/search and the `/general/` page.

---

## Base URL

```
https://api.harvestapp.com/v2/
```

All endpoint paths in these files are relative to this base.

The authentication/identity service lives on a separate host:

```
https://id.getharvest.com/
```

---

## Required HTTP Headers

Every request to `api.harvestapp.com/v2` requires:

| Header | Value / format | Notes |
|---|---|---|
| `Authorization` | `Bearer $ACCESS_TOKEN` | Personal Access Token or OAuth2 access token |
| `Harvest-Account-Id` | `$ACCOUNT_ID` | Required on every request. Identifies which Harvest account |
| `User-Agent` | App name + contact, e.g. `MyApp (you@example.com)` | **Missing User-Agent returns `400 Bad Request`** |
| `Content-Type` | `application/json` | Required for POST/PATCH when sending JSON bodies |

Example:
```
Authorization: Bearer $ACCESS_TOKEN
Harvest-Account-Id: $ACCOUNT_ID
User-Agent: MyApp (you@example.com)
Content-Type: application/json
```

### Account ID
Personal Access Tokens are issued at https://id.getharvest.com/developers and come with a list of account IDs you can access. For OAuth2, fetch authorized accounts from `GET https://id.getharvest.com/api/v2/accounts`.

---

## Supported HTTP Methods

`GET`, `POST`, `PATCH`, `DELETE`.

- GET — parameters in URL query string
- POST / PATCH — parameters in request body (JSON or form-encoded)

---

## Authentication

### 1. Personal Access Tokens (PAT)
- Created at **https://id.getharvest.com/developers** — tied directly to your user.
- You receive a token plus a list of account IDs.
- Default scope is `all` (full access to all your accounts).

Two ways to authenticate:

**Header method (recommended):**
```
Authorization: Bearer $ACCESS_TOKEN
Harvest-Account-Id: $ACCOUNT_ID
User-Agent: MyApp (you@example.com)
```

**Query string method:**
```
https://api.harvestapp.com/v2/users/me?access_token=$ACCESS_TOKEN&account_id=$ACCOUNT_ID
```

### 2. OAuth2

Register an OAuth2 application at https://id.getharvest.com/developers. Provide: application name, redirect URL, Multi-Account support option, and products (Harvest / Forecast).

**Authorization Code flow (server-side, recommended):**

1. Redirect user to authorize:
   ```
   https://id.getharvest.com/oauth2/authorize?client_id={CLIENT_ID}&response_type=code
   ```
   Optional params: `state`, `redirect_uri`.

2. Exchange the returned `code` for tokens:
   ```
   POST https://id.getharvest.com/api/v2/oauth2/token
   ```
   Params: `code`, `client_id`, `client_secret`, `grant_type=authorization_code`.

   Response: `access_token`, `refresh_token`, `token_type: bearer`, `expires_in: 1209600` (14 days, in seconds).

3. Refresh an expired access token:
   ```
   POST https://id.getharvest.com/api/v2/oauth2/token
   ```
   Params: `refresh_token`, `client_id`, `client_secret`, `grant_type=refresh_token`.

**Implicit Grant flow (client-side / browser):**
```
https://id.getharvest.com/oauth2/authorize?client_id={CLIENT_ID}&response_type=token
```
Returns `access_token`, `token_type: bearer`, `expires_in` directly in the URL fragment. No refresh token.

**OAuth2 scopes:**
- `harvest:{ACCOUNT_ID}`
- `forecast:{ACCOUNT_ID}`
- `harvest:all`
- `forecast:all`
- `all`

### Identity / Accounts endpoint
```
GET https://id.getharvest.com/api/v2/accounts
```
Returns the authenticated user and the list of authorized accounts (IDs, names, product types). Use this to discover which `Harvest-Account-Id` values are valid for a token.

---

## Pagination

- `per_page` — **default and maximum is `2000`**. If omitted, the API returns the maximum supported number of records. A value above 2000 returns `422 Unprocessable Entity` with message `"Invalid per_page parameter"`.
- `page` and `cursor` are **mutually exclusive**. If both are supplied, `cursor` takes precedence.
- Best practice: do not construct page/cursor params yourself — follow the URLs in the `links` object.

**Pagination metadata fields on list responses:**

| Field | Meaning |
|---|---|
| `page` | Current page number |
| `total_pages` | Total number of pages |
| `total_entries` | Total record count |
| `next_page` | Next page number (`null` if none) |
| `previous_page` | Previous page number (`null` if none) |
| `per_page` | Records per page |
| `links` | Object of navigation URLs |

**`links` object:**

| Key | URL to |
|---|---|
| `first` | First page |
| `next` | Next page |
| `previous` | Previous page |
| `last` | Last page |

**Cursor-based pagination:** for performance, newer cursor pagination encodes a token in the URL. When cursor pagination is in effect, `page`, `next_page`, and `previous_page` return `null` for all but the first and last pages — rely on `links.next` / `links.previous`.

---

## Rate Limiting

| API | Limit |
|---|---|
| General API | **100 requests per 15 seconds** |
| Reports API | **100 requests per 15 minutes** |

- Exceeding the limit returns **HTTP `429 Too Many Requests`**.
- `Retry-After` response header gives the number of seconds until the throttle lifts.
- Additional tracking headers:
  - `X-RateLimit-Limit` — max requests allowed in the current window
  - `X-RateLimit-Remaining` — requests remaining in the current window
  - `X-RateLimit-Reset` — UTC epoch seconds at which the window resets
- The throttle resets on each call window; it lifts on its own within a few minutes.

---

## Error Format & Status Codes

| Status | Meaning |
|---|---|
| `200 OK` | Successful GET / PATCH |
| `201 Created` | Successful POST that creates a resource |
| `200 OK` | Successful DELETE typically returns `200` with empty body |
| `400 Bad Request` | Malformed request (e.g. missing `User-Agent`) |
| `401 Unauthorized` | Missing/invalid token |
| `403 Forbidden` | Authenticated but not permitted (e.g. non-admin on admin-only endpoint) |
| `404 Not Found` | Resource does not exist |
| `422 Unprocessable Entity` | Validation error (e.g. invalid `per_page`, missing required fields). Body contains a `message` describing the problem |
| `429 Too Many Requests` | Rate limit exceeded — see `Retry-After` |
| `500 Server Error` | Harvest-side error |

Validation errors return a JSON body with a `message` field (and may include validation detail). Always check the status code.

---

## Date / Time Formats

| Type | Format | Example |
|---|---|---|
| Date | ISO 8601 date | `2017-12-31` |
| DateTime | ISO 8601, UTC, `Z` suffix | `2017-12-31T14:59:22Z` |
| Time | 24-hour or 12-hour, per account setting | `14:59` or `2:59pm` |

JSON is the request/response format. Booleans are `true`/`false`; money/amounts are numbers; IDs are integers.

---

## Versioning

This is **API v2**, served under the `/v2/` path on `api.harvestapp.com`. v1 is legacy. There is no per-request version header — the version is in the URL path.
