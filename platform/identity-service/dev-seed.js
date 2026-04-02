/**
 * dev-seed.js — Development fixture seeding for identity-service.
 *
 * Defines a consistent set of accounts, roles, and users for local development.
 * All operations are idempotent — existing records are left untouched.
 *
 * Triggered by setting DEV_SEED=true before starting the server:
 *   DEV_SEED=true PLATFORM_JWT_SECRET=... node server.js
 */

import bcrypt from 'bcrypt';
import { createLogger } from '../shared/logger.js';
import {
  getDb,
  createAccount,
  createUser,
  createRole,
  updateRolePermissions,
  assignRoleToUser,
  getUserByEmail,
  getRoleByName,
} from './db.js';

const log = createLogger('dev-seed');

// ---------------------------------------------------------------------------
// Fixture definitions — edit these to change your dev users
// ---------------------------------------------------------------------------

export const DEV_FIXTURES = [
  {
    accountName: 'dev-account',
    roles: [
      {
        name: 'admin',
        permissions: ['api:*', 'data:*', 'function:*'],
      },
      {
        name: 'user',
        permissions: ['function:invoke', 'data:read', 'data:write'],
      },
    ],
    users: [
      {
        email: 'admin@dev.local',
        password: 'admin-dev-password',
        roles: ['admin'],
      },
      {
        email: 'user@dev.local',
        password: 'user-dev-password',
        roles: ['user'],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Seed runner
// ---------------------------------------------------------------------------

export async function runDevSeed() {
  log.info('Dev seed starting…');

  const summary = [];

  for (const fixture of DEV_FIXTURES) {
    // ── Account ──────────────────────────────────────────────────────────────
    let account = getDb()
      .prepare('SELECT * FROM accounts WHERE name = ?')
      .get(fixture.accountName);

    if (account) {
      log.info({ accountId: account.id }, `dev-seed: account already exists — ${fixture.accountName}`);
    } else {
      account = createAccount(fixture.accountName);
      log.info({ accountId: account.id }, `dev-seed: created account — ${fixture.accountName}`);
    }

    // ── Roles ─────────────────────────────────────────────────────────────────
    const roleMap = {};
    for (const roleDef of fixture.roles) {
      let role = getRoleByName(account.id, roleDef.name);
      if (role) {
        const current = JSON.stringify([...role.permissions].sort());
        const desired = JSON.stringify([...roleDef.permissions].sort());
        if (current !== desired) {
          updateRolePermissions(role.id, roleDef.permissions);
          role = getRoleByName(account.id, roleDef.name);
          log.info(`dev-seed: updated role permissions — ${roleDef.name}`);
        }
        log.info(`dev-seed: role already exists — ${roleDef.name}`);
      } else {
        role = createRole(account.id, roleDef.name, roleDef.permissions);
        log.info(`dev-seed: created role — ${roleDef.name}`);
      }
      roleMap[roleDef.name] = role;
    }

    // ── Users ─────────────────────────────────────────────────────────────────
    for (const userDef of fixture.users) {
      let user = getUserByEmail(account.id, userDef.email);
      if (user) {
        log.info(`dev-seed: user already exists — ${userDef.email}`);
      } else {
        const passwordHash = await bcrypt.hash(userDef.password, 12);
        user = createUser(account.id, userDef.email, passwordHash);
        log.info(`dev-seed: created user — ${userDef.email}`);
      }

      for (const roleName of userDef.roles) {
        if (roleMap[roleName]) assignRoleToUser(user.id, roleMap[roleName].id);
      }

      summary.push({
        accountId: account.id,
        email: userDef.email,
        password: userDef.password,
        roles: userDef.roles,
      });
    }
  }

  return summary;
}
