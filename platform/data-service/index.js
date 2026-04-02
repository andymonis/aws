import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../shared/logger.js';
import { PlatformError } from '../shared/errors.js';

const log = createLogger('data-service');

const DATA_DB_PATH = process.env.DATA_DB_PATH ?? './platform/data-service/data.db';

let _db = null;
let _tableMap = new Map(); // logical name -> sql table name

function normalizeTables(tables = []) {
  return tables
    .map((entry) => {
      if (typeof entry === 'string') return { name: entry };
      if (entry && typeof entry === 'object') return { name: entry.name };
      return null;
    })
    .filter((t) => t && typeof t.name === 'string' && t.name.trim() !== '')
    .map((t) => ({ name: t.name.trim() }));
}

function toSqlTableName(logicalName) {
  const safe = logicalName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  if (!safe || /^\d/.test(safe)) {
    throw new Error(`Invalid table name '${logicalName}' in platform.config.js`);
  }
  return `ds_${safe}`;
}

function assertStarted() {
  if (!_db || _tableMap.size === 0) {
    throw new PlatformError('DATA_NOT_INITIALIZED', 'Data service is not initialized', 500);
  }
}

function assertTable(logicalTable) {
  const sqlTable = _tableMap.get(logicalTable);
  if (!sqlTable) {
    throw new PlatformError('DATA_TABLE_NOT_FOUND', `Unknown table '${logicalTable}'`, 404);
  }
  return sqlTable;
}

function assertAuthenticated(user) {
  if (!user || !user.accountId) {
    throw new PlatformError('GW_UNAUTHORIZED', 'Authentication required for data access', 401);
  }
}

function assertPermission(user, requiredPermission) {
  const permissions = user?.permissions ?? [];
  const hasAny = permissions.includes('data:*') || permissions.includes(requiredPermission);
  if (!hasAny) {
    throw new PlatformError('GW_FORBIDDEN', `Missing permission '${requiredPermission}'`, 403);
  }
}

function mapRow(row) {
  const data = JSON.parse(row.data);
  return {
    ...data,
    id: row.id,
    accountId: row.account_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createScopedClient({ user }) {
  return {
    list(logicalTable, options = {}) {
      assertStarted();
      assertAuthenticated(user);
      assertPermission(user, 'data:read');

      const sqlTable = assertTable(logicalTable);
      const limit = Number.isInteger(options.limit) ? options.limit : parseInt(options.limit ?? '50', 10);
      const boundedLimit = Number.isNaN(limit) ? 50 : Math.min(Math.max(limit, 1), 200);

      const rows = _db
        .prepare(`SELECT * FROM ${sqlTable} WHERE account_id = ? ORDER BY updated_at DESC LIMIT ?`)
        .all(user.accountId, boundedLimit);

      return rows.map(mapRow);
    },

    get(logicalTable, id) {
      assertStarted();
      assertAuthenticated(user);
      assertPermission(user, 'data:read');

      if (!id) {
        throw new PlatformError('DATA_VALIDATION', 'id is required', 400);
      }

      const sqlTable = assertTable(logicalTable);
      const row = _db
        .prepare(`SELECT * FROM ${sqlTable} WHERE account_id = ? AND id = ?`)
        .get(user.accountId, id);

      return row ? mapRow(row) : null;
    },

    put(logicalTable, item = {}) {
      assertStarted();
      assertAuthenticated(user);
      assertPermission(user, 'data:write');

      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw new PlatformError('DATA_VALIDATION', 'item must be an object', 400);
      }

      const sqlTable = assertTable(logicalTable);
      const now = new Date().toISOString();
      const id = item.id ?? uuidv4();

      const existing = _db
        .prepare(`SELECT created_at FROM ${sqlTable} WHERE account_id = ? AND id = ?`)
        .get(user.accountId, id);

      const createdAt = existing?.created_at ?? now;
      const payload = { ...item, id };

      _db
        .prepare(
          `INSERT INTO ${sqlTable} (id, account_id, data, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(account_id, id)
           DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
        )
        .run(id, user.accountId, JSON.stringify(payload), createdAt, now);

      return {
        ...payload,
        accountId: user.accountId,
        createdAt,
        updatedAt: now,
      };
    },

    delete(logicalTable, id) {
      assertStarted();
      assertAuthenticated(user);
      assertPermission(user, 'data:write');

      if (!id) {
        throw new PlatformError('DATA_VALIDATION', 'id is required', 400);
      }

      const sqlTable = assertTable(logicalTable);
      const result = _db
        .prepare(`DELETE FROM ${sqlTable} WHERE account_id = ? AND id = ?`)
        .run(user.accountId, id);

      return { deleted: result.changes > 0, id };
    },
  };
}

export function startDataService(config) {
  const tables = normalizeTables(config.tables ?? []);

  if (tables.length === 0) {
    throw new Error('platform.config.js must declare at least one table for data-service');
  }

  if (_db) {
    return {
      dbPath: path.resolve(DATA_DB_PATH),
      tables: [..._tableMap.keys()],
    };
  }

  fs.mkdirSync(path.dirname(path.resolve(DATA_DB_PATH)), { recursive: true });

  _db = new Database(path.resolve(DATA_DB_PATH));
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  _tableMap = new Map();

  for (const table of tables) {
    const sqlTable = toSqlTableName(table.name);

    if (_tableMap.has(table.name)) {
      throw new Error(`Duplicate table '${table.name}' in platform.config.js`);
    }

    _db.exec(`
      CREATE TABLE IF NOT EXISTS ${sqlTable} (
        id         TEXT NOT NULL,
        account_id TEXT NOT NULL,
        data       TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (account_id, id)
      );

      CREATE INDEX IF NOT EXISTS idx_${sqlTable}_account_updated
      ON ${sqlTable} (account_id, updated_at);
    `);

    _tableMap.set(table.name, sqlTable);
  }

  log.info({ dbPath: path.resolve(DATA_DB_PATH), tables: [..._tableMap.keys()] }, 'data-service ready');

  return {
    dbPath: path.resolve(DATA_DB_PATH),
    tables: [..._tableMap.keys()],
  };
}

export function createDataClient(params) {
  return createScopedClient(params);
}
