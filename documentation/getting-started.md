# Getting Started

This guide helps app developers run the platform and create a first endpoint.

## 1) Prerequisites

- Node.js 20+ recommended
- npm

## 2) Install dependencies

From project root:

- `npm install`

## 3) Set environment variables

Minimum required:

- `PLATFORM_JWT_SECRET` (32+ chars)

Example:

- `PLATFORM_JWT_SECRET=replace-with-long-random-secret`

Optional:

- `PORT` (default `3000`) for api-gateway
- `IDENTITY_PORT` (default `3001`) for identity-service
- `DATA_DB_PATH` (default `./platform/data-service/data.db`) for data-service
- `CORS_ORIGIN` (default `*`)
- `LOG_LEVEL` (default `info`)

## 4) Start the platform

- `npm run start`

Expected services:

- api-gateway on `http://localhost:3000`
- identity-service on `http://localhost:3001`
- data-service initialized with tables from `platform.config.js`

## 5) Verify with quick checks

- `GET /hello` via gateway: `http://localhost:3000/hello`
- `GET /notes` via gateway (requires auth + `data:read`): `http://localhost:3000/notes`
- `POST /cranked/enroll` via gateway (requires auth + `cranked-player` or `admin` role): `http://localhost:3000/cranked/enroll`
- Register user: `POST http://localhost:3001/auth/register`
- Static app example: `http://localhost:3000/app/`
- Shared login app: `http://localhost:3000/auth/`
- Redirect login app: `http://localhost:3000/login/?redirect=/cranked/`
- Cranked app (Phase 4 basic loop): `http://localhost:3000/cranked/`

## 6) Where to add your app functions

Add handler files under your app folder, for example:

- `apps/example-app/functions`

You can add multiple apps under `apps/*` (for example `apps/billing-app/functions`).

Then register each app in `platform.config.js` under `apps` and bind routes with `app: '<app-name>'`.

Each file must export:

- `handler(event, context)`

See [building-api-features.md](building-api-features.md).
