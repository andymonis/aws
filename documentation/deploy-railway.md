# Deploying to Railway

This checklist covers a single-service deployment where api-gateway is public and identity is accessed by browser clients through `/identity/*` proxy routes.

## 1) Service settings

- Root directory: repository root
- Build command: `npm install`
- Start command: `npm run start`
- Healthcheck path: `/health`

## 2) Required environment variables

- `PLATFORM_JWT_SECRET` (required, long random value)
- `PORT` (Railway injects this automatically)

## 3) Recommended environment variables

- `IDENTITY_PORT=3001`
- `CORS_ORIGIN=https://<your-railway-domain>`
- `DEV_SEED=false`
- `LOG_LEVEL=info`

## 4) Persistent storage (SQLite)

Create a Railway volume and mount it to `/data`, then set:

- `IDENTITY_DB_PATH=/data/identity.db`
- `DATA_DB_PATH=/data/data.db`

Without this, identity/data records are ephemeral on restart.

## 5) Browser auth routing

Browser apps should use gateway-relative identity routes:

- `/identity/auth/login`
- `/identity/auth/refresh`
- `/identity/auth/verify`

Do not hardcode `:3001` in browser clients for production.

## 6) Smoke test after deploy

1. Open `/health` and verify `ok: true`.
2. Open `/login/?redirect=/cranked/` and log in.
3. Confirm `/cranked/` loads and session verification succeeds.
4. Submit `/cranked/play` with `eventId` + cards.
5. Restart deployment and confirm data persists.

## 7) Rollback guardrails

Before production rollout:

- Keep `DEV_SEED` disabled.
- Confirm `CORS_ORIGIN` is restricted.
- Verify logs do not include plaintext secrets.
