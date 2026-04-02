# Authentication and Roles

This guide explains how app developers authenticate and protect endpoints.

## 1) Register and login

Identity endpoints run on `IDENTITY_PORT` (default `3001`).

The shared login app at `/auth/` includes a basic UI that calls the endpoints below.

### Register account + first admin user

`POST /auth/register`

Body:

```json
{
  "accountName": "Acme",
  "email": "admin@acme.com",
  "password": "Password1!"
}
```

Response includes:

- `accessToken`
- `refreshToken`
- `user` (`id`, `email`, `accountId`, `roles`)

### Login existing user

`POST /auth/login`

Body:

```json
{
  "email": "admin@acme.com",
  "password": "Password1!"
}
```

Also supported:

```json
{
  "accountId": "<account-id>",
  "password": "Password1!"
}
```

### Refresh token

`POST /auth/refresh`

Body:

```json
{
  "refreshToken": "<refresh-token>"
}
```

## 2) Using access tokens in app requests

For protected gateway routes (`auth: true`), include:

- `Authorization: Bearer <access-token>`

If missing/invalid, gateway returns `401` with `GW_UNAUTHORIZED`.

## 3) Roles and route protection

In `platform.config.js`, use `roles` to restrict access:

```js
{
  app: 'example-app',
  path: '/admin/report',
  method: 'GET',
  function: 'admin-report',
  auth: true,
  roles: ['admin']
}
```

Behavior:

- User must be authenticated
- User must have at least one listed role
- `api:*` permission bypasses role check
- Route role checks happen in `platform/api-gateway/index.js` as the central authorization layer for app routes. Keep app handlers focused on business validation (for example enrollment or game-state checks), not duplicated role checks.

Cranked gameplay routes use this model and require `admin` or `cranked-player` in `platform.config.js`.

## 4) Identity role management endpoints

Protected identity endpoints:

- `GET /roles`
- `POST /roles`
- `POST /users/:userId/roles`

These require permission checks from token claims.

## 5) Response envelope patterns

Identity service:

- success: `{ "ok": true, "data": ... }`
- failure: `{ "ok": false, "error": { "code": "...", "message": "..." } }`

Gateway protected route failures include `requestId` for troubleshooting.

## 6) Practical developer flow

1. Register once to create account/admin user.
2. Login with `email + password` (or `accountId + password`).
3. Add app routes with `auth` and optional `roles`.
4. Use `context.db` in handlers for account-scoped persistence (`data:read` / `data:write`).
5. Call gateway with bearer token.
6. Use `requestId` from errors/logs for debugging.
