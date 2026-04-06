# Developer Documentation

This folder is for app developers building APIs on top of this platform.

Phase 2 supports multiple isolated apps under `apps/*`, route-to-app binding in `platform.config.js`, and persistent account-scoped data via `context.db`.

Current sample apps include `example-app`, `auth`, `login`, and `cranked` (mobile player app at `/cranked/` plus single-file test harness at `/cranked/test.html`).

## Docs in this folder

- [Getting started](getting-started.md)
- [Building API features](building-api-features.md)
- [Authentication and roles](authentication-and-roles.md)
- [Data service](data-service.md)
- [Static hosting](static-hosting.md)

## Platform shape (Phase 2)

- `identity-service`: register/login/JWT/roles
- `api-gateway`: routes/auth/handler invocation
- `function-runtime`: loads and executes handlers
- `data-service`: persistent account-scoped document storage

For platform internals and design decisions, see [../architecture.md](../architecture.md).
