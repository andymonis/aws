# Platform Architecture

> **This document is the single source of truth.**
> Before writing or modifying any code, read the relevant sections here.
> After making any structural decision, update this document.
> Its purpose is to prevent drift, hallucination, and inconsistency across sessions.

---

## 1. Project Identity

| Property | Value |
|---|---|
| Project name | `platform` (internal "micro-AWS") |
| Language | JavaScript ES6 modules (`"type": "module"`) |
| Runtime | Node.js — no transpilation, no TypeScript |
| Target deployment | Standard Node.js hosting (single process or multiple HTTP services) |
| Current phase | **Phase 1** — Core platform (identity, gateway, function runtime) |

---

## 2. Guiding Principles

1. **Mental model over API compatibility.** Mirror the *concepts* of AWS (identity, gateway, functions, data), not the wire API. The goal is developer familiarity and a future migration path, not emulation.
2. **Hard service boundaries.** Each service is an isolated Node module. One service must never directly `import` internals of another. Cross-service calls go via HTTP or an internal event bus.
3. **Identity is the foundation.** Every request, resource, and data record is scoped to an `account_id`. No service is built before identity is solid.
4. **Stateless compute.** Function handlers receive a context object and must not hold state between invocations.
5. **Declarative configuration.** APIs, functions, and tables are declared in `platform.config.js`. The platform reads config at boot — not at request time.
6. **Local first.** The entire platform must run with `node server.js` on a developer laptop with no containers, no cloud, no Docker.
7. **Minimal dependencies.** Only pull in a package when the cost of writing it yourself outweighs the maintenance burden of the dependency.
8. **App isolation by configuration.** Multiple apps under `apps/*` must be supported in Phase 1, with routes explicitly bound to an app so handlers and static assets remain isolated.

---

## 3. Repository Layout

```
/
├── architecture.md          ← this file
├── platform.config.js       ← root app config (apps, routes, tables)
├── server.js                ← single-process entry point (Phase 1)
├── platform/
│   ├── identity-service/    ← Cognito analogue
│   ├── api-gateway/         ← API Gateway analogue
│   └── function-runtime/    ← Lambda analogue
└── apps/
  ├── example-app/
  │   ├── functions/       ← handler files loaded by function-runtime
  │   └── static/          ← plain static assets served by api-gateway
  └── another-app/
    ├── functions/
    └── static/
```

> **Phase 2** will add `platform/data-service/`.
> `apps/` holds user-land code. Platform code never imports from `apps/`.

---

## 4. Module System

- All files use ES6 `import`/`export`. No `require()`.
- All `package.json` files set `"type": "module"`.
- Dynamic handler loading uses `import(filePath)` (not `require`).
- File extensions must be explicit in import paths: `import x from './x.js'`.

---

## 5. Service Catalogue

### 5.1 identity-service

**AWS analogue:** Cognito  
**Responsibility:** Users, accounts, roles, permissions, token issuance and verification.

#### Data model

```
Account
  id          UUID
  name        string
  createdAt   ISO timestamp

User
  id          UUID
  accountId   UUID  → Account.id
  email       string (unique within account)
  passwordHash string
  roles       string[]   names of roles assigned
  createdAt   ISO timestamp

Role
  id          UUID
  accountId   UUID  → Account.id
  name        string (unique within account)
  permissions string[]   e.g. ["function:invoke", "data:read", "api:*"]
```

#### Storage (Phase 1)

SQLite via `better-sqlite3`. Single file: `platform/identity-service/identity.db`.  
Schema is created on first boot if the file does not exist.

#### JWT

- Library: `jsonwebtoken`
- Algorithm: `HS256`
- Secret: read from environment variable `PLATFORM_JWT_SECRET`. Hard-fail on boot if not set.
- Access token expiry: `15m`
- Refresh token expiry: `7d`

JWT payload shape:
```json
{
  "sub": "<user_id>",
  "accountId": "<account_id>",
  "roles": ["admin"],
  "permissions": ["api:*", "data:*", "function:*"],
  "iat": 0,
  "exp": 0
}
```

#### Password hashing

- Library: `bcrypt`, cost factor `12`.

#### Endpoints

| Method | Path | Auth required | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Create account + first admin user |
| POST | `/auth/login` | No | Returns `accessToken` + `refreshToken` |
| POST | `/auth/refresh` | No (refresh token in body) | Returns new `accessToken` |
| GET | `/users/me` | Yes | Returns calling user profile |
| GET | `/roles` | Yes (admin) | List roles for the account |
| POST | `/roles` | Yes (admin) | Create a role |
| POST | `/users/:userId/roles` | Yes (admin) | Assign a role to a user |

#### Response envelope

All responses from identity-service follow:
```json
{ "ok": true, "data": { ... } }
{ "ok": false, "error": { "code": "AUTH_INVALID_CREDENTIALS", "message": "..." } }
```

---

### 5.2 api-gateway

**AWS analogue:** API Gateway  
**Responsibility:** Single HTTP entry point. Reads route definitions from `platform.config.js`, enforces authentication and permissions, delegates execution to function-runtime, and optionally serves static assets.

#### Request pipeline (ordered)

```
Incoming HTTP Request
  → CORS headers
  → Request ID assigned (uuid, added to headers + log context)
  → Static asset check (if static hosting is configured)
  → Auth middleware (verify JWT from Authorization: Bearer <token>)
  → Route lookup (match method + path)
  → Permission check (roles/permissions from JWT vs route requirements)
  → Rate limiter (stub in Phase 1, enforced in Phase 4)
  → Invoke function-runtime
  → Normalise response
  → Return HTTP response
```

#### Route definition schema (in platform.config.js)

```js
{
  app: "example-app",      // key in config.apps
  path: "/orders",          // string, must start with /
  method: "POST",           // uppercase HTTP verb
  function: "createOrder",  // filename stem in apps/<app>/functions/
  auth: true,               // boolean — require valid JWT
  roles: ["user", "admin"]  // optional — if present, user must have at least one
}
```

`app` is required when multiple apps are configured.

#### Auth mechanics

- JWT extracted from `Authorization: Bearer <token>` header.
- Verification delegated to a shared `identity-service/verifyToken.js` utility (imported directly — this is the one permitted cross-service import because it is a pure function with no I/O).
- If `auth: false` on the route, JWT is still parsed if present (for optional identity), but a missing token is not an error.

#### Error codes returned by gateway

| HTTP status | Code |
|---|---|
| 401 | `GW_UNAUTHORIZED` |
| 403 | `GW_FORBIDDEN` |
| 404 | `GW_ROUTE_NOT_FOUND` |
| 429 | `GW_RATE_LIMITED` |
| 500 | `GW_INTERNAL_ERROR` |

#### Static hosting (Phase 1)

- Static hosting is configured per app in `platform.config.js` under `apps.<appName>.staticDir`.
- Mount path is configured per app via `apps.<appName>.staticPrefix`.
- Supported assets are plain HTML/CSS/JS files (no build step or bundler required).

---

### 5.3 function-runtime

**AWS analogue:** Lambda  
**Responsibility:** Load and execute handler modules. Inject context. Return a normalised result.

#### Handler contract

Every handler file must export a named `handler` function:

```js
export async function handler(event, context) {
  return {
    statusCode: 200,
    body: { ... }   // plain object — runtime will JSON-serialise
  };
}
```

`statusCode` is optional — defaults to `200`.  
`body` must be a plain serialisable object or `null`.

#### `event` object shape

```js
{
  method: "POST",
  path: "/orders",
  params: {},          // path params
  query: {},           // query string
  body: {},            // parsed JSON body
  headers: {}          // raw request headers
}
```

#### `context` object shape

```js
{
  app: "example-app",      // route-bound app key
  user: {              // null if unauthenticated route
    id, accountId, roles, permissions
  },
  logger,              // pino child logger with requestId bound
  config,              // the full platform.config.js object
  requestId            // uuid string
}
```

> **Phase 2** will add `context.db` — the data-service client.

#### Handler resolution

- Functions directory: resolved from `apps[route.app].functionsDir` in `platform.config.js`.
- Resolved path: `<functionsDir>/<functionName>.js`
- Loaded via `import()` on first call, cached in a `Map` keyed by absolute file path for subsequent calls.
- If the module does not export `handler`, the runtime throws `RUNTIME_INVALID_HANDLER`.

#### Error codes

| Code | Meaning |
|---|---|
| `RUNTIME_HANDLER_NOT_FOUND` | File does not exist |
| `RUNTIME_INVALID_HANDLER` | File exists but no `handler` export |
| `RUNTIME_EXECUTION_ERROR` | Handler threw an unhandled exception |

---

## 6. Shared Utilities

Located in `platform/shared/`:

| File | Purpose |
|---|---|
| `logger.js` | Pino instance factory — `createLogger(name)` |
| `errors.js` | Standard error class `PlatformError(code, message, httpStatus)` |
| `verifyToken.js` | Pure JWT verification — returns decoded payload or throws |

All services import from `platform/shared/`. No other cross-service imports are permitted.

---

## 7. Configuration File — `platform.config.js`

Lives at the project root. Loaded once at boot by the gateway and runtime.

```js
export default {
  apps: {
    "example-app": {
      functionsDir: "./apps/example-app/functions",
      staticDir: "./apps/example-app/static",
      staticPrefix: "/app/"
    },
    "another-app": {
      functionsDir: "./apps/another-app/functions",
      staticDir: "./apps/another-app/static",
      staticPrefix: "/another-app/"
    }
  },

  routes: [
    {
      app: "example-app",
      path: "/hello",
      method: "GET",
      function: "hello",
      auth: false
    }
  ],

  tables: []   // Phase 2
};
```

---

## 8. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PLATFORM_JWT_SECRET` | **Yes** | Secret used to sign/verify JWTs. Min 32 chars. |
| `IDENTITY_DB_PATH` | No | Path to SQLite file. Default: `./platform/identity-service/identity.db` |
| `PORT` | No | HTTP port for api-gateway. Default: `3000` |
| `IDENTITY_PORT` | No | HTTP port for identity-service. Default: `3001` |
| `LOG_LEVEL` | No | Pino log level. Default: `info` |
| `DEV_SEED` | No | Set to `true` to seed dev fixtures on startup. See §15. |

---

## 9. Dependency List

| Package | Used by | Purpose |
|---|---|---|
| `fastify` | api-gateway, identity-service | HTTP server |
| `@fastify/cors` | api-gateway | CORS headers |
| `@fastify/static` | api-gateway | Static file hosting |
| `better-sqlite3` | identity-service | SQLite storage |
| `jsonwebtoken` | identity-service, shared | JWT sign/verify |
| `bcrypt` | identity-service | Password hashing |
| `pino` | all | Structured logging |
| `uuid` | all | UUID generation |
| `zod` | all | Request body validation |

No test framework is included in Phase 1. Add `node:test` (built-in) in Phase 3.

---

## 10. Security Constraints

These are non-negotiable and must not be weakened:

1. `PLATFORM_JWT_SECRET` must never be hard-coded. Boot fails if absent.
2. Passwords are never stored or logged in plain text.
3. Every data record must carry `accountId`. Queries must always filter by it.
4. The api-gateway must reject requests where the JWT `accountId` does not match the resource's `accountId`.
5. Rate limiting hooks must exist in Phase 1 even if not enforced (they will be filled in Phase 4).
6. CORS origins must be configurable — `*` is only acceptable in development.

---

## 11. What Is Explicitly Out of Scope (Phase 1)

- OAuth / social login
- data-service / `context.db`
- Platform CLI
- Developer SDK (`@platform/sdk`)
- Function timeouts
- Audit logs
- Indexes, TTL, DynamoDB Streams equivalent
- Multiple processes / inter-service HTTP (services are co-located in Phase 1)
- Front-end frameworks/build pipelines (plain static assets only in Phase 1)

---

## 12. Development Phases Summary

| Phase | Services | Storage | Key additions |
|---|---|---|---|
| **1** | identity, api-gateway, function-runtime | SQLite (identity only) | Core auth + routing + handlers + static asset hosting |
| **2** | + data-service | SQLite → Postgres | `context.db`, document API |
| **3** | all | Postgres | SDK, CLI, scaffolding |
| **4** | all | Postgres | Rate limits, timeouts, audit logs, monitoring |

---

## 13. Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `verify-token.js` → exception: exported as `verifyToken.js` to match function name |
| Functions / variables | camelCase | `createUser`, `accountId` |
| Constants | SCREAMING_SNAKE | `JWT_SECRET` |
| Database columns | snake_case | `account_id`, `created_at` |
| Error codes | SCREAMING_SNAKE with service prefix | `AUTH_INVALID_CREDENTIALS`, `GW_UNAUTHORIZED` |
| HTTP paths | kebab-case | `/auth/refresh`, `/users/me` |

---

## 14. Change Log

| Date | Change |
|---|---|
| 2026-03-17 | Document created. Phase 1 architecture defined. |
| 2026-03-23 | Phase 1 updated to include optional static asset hosting via api-gateway (`staticDir` + `staticPrefix`). |
| 2026-03-23 | Phase 1 updated for app-aware configuration (`apps` map + route `app` binding) to support multiple isolated apps. |
| 2026-03-29 | Dev seeding mechanism added (`DEV_SEED=true`, `platform/identity-service/dev-seed.js`). |

---

## 15. Development Seeding

**File:** `platform/identity-service/dev-seed.js`

Provides a consistent set of accounts, roles, and users for local development. Seeding is idempotent — records that already exist are left untouched, so it is safe to run on every server restart.

### Activation

```bash
DEV_SEED=true PLATFORM_JWT_SECRET=... node server.js
```

When `DEV_SEED=true`, `server.js` calls `runDevSeed()` after both services are listening and prints the dev credentials to the log.

### Fixture definition

Fixtures are declared in the exported `DEV_FIXTURES` array inside `dev-seed.js`. Each entry defines an account with its roles and users:

```js
{
  accountName: 'dev-account',
  roles: [
    { name: 'admin', permissions: ['api:*', 'data:*', 'function:*'] },
    { name: 'user',  permissions: ['function:invoke'] },
  ],
  users: [
    { email: 'admin@dev.local', password: 'admin-dev-password', roles: ['admin'] },
    { email: 'user@dev.local',  password: 'user-dev-password',  roles: ['user'] },
  ],
}
```

### Default dev credentials

| Email | Password | Role |
|---|---|---|
| `admin@dev.local` | `admin-dev-password` | `admin` |
| `user@dev.local` | `user-dev-password` | `user` |

The `accountId` for `dev-account` is printed in the startup log on first seed.
