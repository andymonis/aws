# Developer Documentation

This folder is for app developers building APIs on top of this platform.

## Docs in this folder

- [Getting started](getting-started.md)
- [Building API features](building-api-features.md)
- [Authentication and roles](authentication-and-roles.md)
- [Static hosting](static-hosting.md)

## Platform shape (Phase 1)

- `identity-service`: register/login/JWT/roles
- `api-gateway`: routes/auth/handler invocation
- `function-runtime`: loads and executes handlers

For platform internals and design decisions, see [../architecture.md](../architecture.md).
