# Copilot Instructions (Project Maintenance)

This file is for AI-assisted maintenance of this repository.
It defines non-negotiable project-specific rules to reduce drift and hallucinations.

## 1) Source of truth

1. Read `architecture.md` before implementing or changing anything.
2. If code and `architecture.md` disagree, update code to match architecture unless the user asks for an architectural change.
3. If an architectural change is made, update `architecture.md` in the same change set.

## 2) Current scope and phase

1. Current target is **Phase 1** unless explicitly requested otherwise.
2. In Phase 1, focus only on:
   - `identity-service`
   - `api-gateway`
   - `function-runtime`
3. Do not introduce Phase 2+ features (data-service, CLI, SDK, timeouts, audit logs) unless asked.

## 3) Runtime and language constraints

1. Plain Node.js + ES6 modules only.
2. No TypeScript, no transpilation, no build step.
3. Use explicit `.js` extensions in imports.
4. Keep deployment compatible with standard Node hosting.

## 4) Service boundary rules

1. Keep hard boundaries between services.
2. Prefer shared utilities in `platform/shared/` for cross-cutting code.
3. Do not create implicit coupling between app code and platform internals.
4. App handlers in `apps/*/functions` must remain stateless.

## 5) Auth and security rules

1. `PLATFORM_JWT_SECRET` must never be hardcoded.
2. Never log passwords or plaintext secrets.
3. Maintain `accountId` scoping for identity and authorization paths.
4. Preserve error envelope consistency:
   - success: `{ ok: true, data: ... }`
   - failure: `{ ok: false, error: { code, message } }`

## 6) API gateway behavior

1. Keep route definitions declarative in `platform.config.js`.
2. Preserve auth pipeline order: auth -> role/permission checks -> invocation.
3. Keep rate limiter as a Phase 1 stub unless user asks to implement limits.
4. Preserve requestId propagation into logs/context.
5. Bind each route to an app via `route.app` and resolve folders from `apps.<appName>` config.
6. If static hosting is enabled, keep it configured per app via `apps.<appName>.staticDir` + `apps.<appName>.staticPrefix`.

## 7) Function runtime behavior

1. Handler file must export named `handler`.
2. Invocation contract must remain:
   - input: `event`, `context`
   - output: `{ statusCode, body }`
3. Keep dynamic import and cache behavior unless asked to change.

## 8) Documentation maintenance rules

1. Keep developer docs in `/documentation` concise and actionable.
2. Whenever endpoints/config contracts change, update docs in the same task.
3. Prefer practical examples over long theory.

## 9) Editing policy

1. Make minimal, targeted changes.
2. Avoid broad refactors unless explicitly requested.
3. Validate startup paths when touching server bootstrap, auth, routing, or handler loading.

## 10) If uncertain

1. Choose the simplest implementation matching `architecture.md`.
2. Keep behavior explicit rather than clever.
3. Leave TODOs only for out-of-scope phase work.
