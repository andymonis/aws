/**
 * server.js — single-process entry point for Phase 2.
 *
 * Boots identity-service, data-service, and api-gateway in the same process.
 * Each service listens on its own port.
 *
 * Usage:
 *   PLATFORM_JWT_SECRET=your-secret-here node server.js
 */

import { createLogger } from './platform/shared/logger.js';
import { startIdentityService } from './platform/identity-service/index.js';
import { startGateway } from './platform/api-gateway/index.js';
import { startDataService, stopDataService } from './platform/data-service/index.js';
import { runDevSeed } from './platform/identity-service/dev-seed.js';
import config from './platform.config.js';
import path from 'path';

const log = createLogger('server');

const IDENTITY_PORT = parseInt(process.env.IDENTITY_PORT ?? '3001', 10);
const GATEWAY_PORT = parseInt(process.env.PORT ?? '3000', 10);
const IDENTITY_DB_PATH = process.env.IDENTITY_DB_PATH ?? './platform/identity-service/identity.db';
const DATA_DB_PATH = process.env.DATA_DB_PATH ?? './platform/data-service/data.db';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

let identityServer = null;
let gatewayServer = null;
let shuttingDown = false;

// Fail fast if required environment variables are absent
if (!process.env.PLATFORM_JWT_SECRET) {
  log.error('PLATFORM_JWT_SECRET environment variable must be set. Exiting.');
  process.exit(1);
}

if (IS_PRODUCTION) {
  const corsOrigin = process.env.CORS_ORIGIN?.trim();

  if (!corsOrigin) {
    log.error('CORS_ORIGIN must be set in production. Exiting.');
    process.exit(1);
  }

  if (corsOrigin === '*') {
    log.error('CORS_ORIGIN cannot be wildcard (*) in production. Exiting.');
    process.exit(1);
  }

  if (process.env.DEV_SEED === 'true') {
    log.error('DEV_SEED=true is not allowed in production. Exiting.');
    process.exit(1);
  }
}

function logPersistenceConfig() {
  const resolvedIdentity = path.resolve(IDENTITY_DB_PATH);
  const resolvedData = path.resolve(DATA_DB_PATH);

  log.info({ identityDbPath: resolvedIdentity, dataDbPath: resolvedData }, 'SQLite persistence paths');

  if (process.env.RAILWAY_ENVIRONMENT) {
    if (!process.env.IDENTITY_DB_PATH || !process.env.DATA_DB_PATH) {
      log.warn(
        'Railway environment detected without IDENTITY_DB_PATH or DATA_DB_PATH. Data may be ephemeral without a mounted volume.'
      );
    }
  }
}

async function main() {
  logPersistenceConfig();
  startDataService(config);

  [identityServer, gatewayServer] = await Promise.all([
    startIdentityService(IDENTITY_PORT),
    startGateway(config, GATEWAY_PORT),
  ]);

  log.info('Platform is running.');
  log.info(`  API Gateway    → http://localhost:${GATEWAY_PORT}`);
  log.info(`  Identity       → http://localhost:${IDENTITY_PORT}`);

  if (process.env.DEV_SEED === 'true') {
    const devUsers = await runDevSeed();
    log.info('');
    log.info('Dev seed users:');
    for (const u of devUsers) {
      log.info(`  [${u.roles.join(', ')}]  ${u.email}  (accountId: ${u.accountId})`);
    }
  }

  log.info('');
  log.info('Quick start:');
  log.info(`  Register   POST http://localhost:${IDENTITY_PORT}/auth/register`);
  log.info(`  Login      POST http://localhost:${IDENTITY_PORT}/auth/login`);
  log.info(`  Hello      GET  http://localhost:${GATEWAY_PORT}/hello`);
  log.info(`  Notes list GET  http://localhost:${GATEWAY_PORT}/notes`);
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  log.info({ signal }, 'Shutdown requested');

  const closeTasks = [];
  if (gatewayServer) closeTasks.push(gatewayServer.close());
  if (identityServer) closeTasks.push(identityServer.close());

  await Promise.allSettled(closeTasks);
  stopDataService();

  log.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGINT', () => {
  shutdown('SIGINT').catch((err) => {
    log.error({ err }, 'Error during SIGINT shutdown');
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM').catch((err) => {
    log.error({ err }, 'Error during SIGTERM shutdown');
    process.exit(1);
  });
});

main().catch((err) => {
  log.error({ err }, 'Failed to start platform');
  process.exit(1);
});
