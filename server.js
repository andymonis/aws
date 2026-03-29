/**
 * server.js — single-process entry point for Phase 1.
 *
 * Boots identity-service and api-gateway in the same process.
 * Each service listens on its own port.
 *
 * Usage:
 *   PLATFORM_JWT_SECRET=your-secret-here node server.js
 */

import { createLogger } from './platform/shared/logger.js';
import { startIdentityService } from './platform/identity-service/index.js';
import { startGateway } from './platform/api-gateway/index.js';
import { runDevSeed } from './platform/identity-service/dev-seed.js';
import config from './platform.config.js';

const log = createLogger('server');

const IDENTITY_PORT = parseInt(process.env.IDENTITY_PORT ?? '3001', 10);
const GATEWAY_PORT = parseInt(process.env.PORT ?? '3000', 10);

// Fail fast if required environment variables are absent
if (!process.env.PLATFORM_JWT_SECRET) {
  log.error('PLATFORM_JWT_SECRET environment variable must be set. Exiting.');
  process.exit(1);
}

async function main() {
  await Promise.all([
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
      log.info(`  [${u.roles.join(', ')}]  ${u.email}  /  ${u.password}  (accountId: ${u.accountId})`);
    }
  }

  log.info('');
  log.info('Quick start:');
  log.info(`  Register   POST http://localhost:${IDENTITY_PORT}/auth/register`);
  log.info(`  Login      POST http://localhost:${IDENTITY_PORT}/auth/login`);
  log.info(`  Hello      GET  http://localhost:${GATEWAY_PORT}/hello`);
}

main().catch((err) => {
  log.error({ err }, 'Failed to start platform');
  process.exit(1);
});
