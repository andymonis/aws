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
- `CORS_ORIGIN` (default `*`)
- `LOG_LEVEL` (default `info`)

## 4) Start the platform

- `npm run start`

Expected services:

- api-gateway on `http://localhost:3000`
- identity-service on `http://localhost:3001`

## 5) Verify with quick checks

- `GET /hello` via gateway: `http://localhost:3000/hello`
- Register user: `POST http://localhost:3001/auth/register`
- Static app example: `http://localhost:3000/app/`

## 6) Where to add your app functions

Add handler files under:

- `apps/example-app/functions`

Each file must export:

- `handler(event, context)`

See [building-api-features.md](building-api-features.md).
