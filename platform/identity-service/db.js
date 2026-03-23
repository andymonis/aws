import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const DB_PATH = process.env.IDENTITY_DB_PATH ?? './platform/identity-service/identity.db';

let _db = null;

/**
 * Return (or lazily open) the SQLite database connection.
 * Creates the schema on first boot if tables do not exist.
 * @returns {import('better-sqlite3').Database}
 */
export function getDb() {
  if (_db) return _db;

  _db = new Database(path.resolve(DB_PATH));
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      account_id    TEXT NOT NULL REFERENCES accounts(id),
      email         TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TEXT NOT NULL,
      UNIQUE(account_id, email)
    );

    CREATE TABLE IF NOT EXISTS roles (
      id          TEXT PRIMARY KEY,
      account_id  TEXT NOT NULL REFERENCES accounts(id),
      name        TEXT NOT NULL,
      permissions TEXT NOT NULL DEFAULT '[]',
      created_at  TEXT NOT NULL,
      UNIQUE(account_id, name)
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      user_id    TEXT NOT NULL REFERENCES users(id),
      role_id    TEXT NOT NULL REFERENCES roles(id),
      PRIMARY KEY (user_id, role_id)
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      token      TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id),
      expires_at TEXT NOT NULL
    );
  `);

  return _db;
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export function createAccount(name) {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO accounts (id, name, created_at) VALUES (?, ?, ?)').run(id, name, now);
  return { id, name, createdAt: now };
}

export function getAccountById(id) {
  return getDb().prepare('SELECT * FROM accounts WHERE id = ?').get(id) ?? null;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export function createUser(accountId, email, passwordHash) {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO users (id, account_id, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, accountId, email, passwordHash, now);
  return { id, accountId, email, createdAt: now };
}

export function getUserByEmail(accountId, email) {
  return (
    getDb()
      .prepare('SELECT * FROM users WHERE account_id = ? AND email = ?')
      .get(accountId, email) ?? null
  );
}

export function getUserById(accountId, userId) {
  return (
    getDb()
      .prepare('SELECT * FROM users WHERE id = ? AND account_id = ?')
      .get(userId, accountId) ?? null
  );
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export function createRole(accountId, name, permissions = []) {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO roles (id, account_id, name, permissions, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, accountId, name, JSON.stringify(permissions), now);
  return { id, accountId, name, permissions, createdAt: now };
}

export function getRolesByAccount(accountId) {
  const rows = getDb()
    .prepare('SELECT * FROM roles WHERE account_id = ?')
    .all(accountId);
  return rows.map((r) => ({ ...r, permissions: JSON.parse(r.permissions) }));
}

export function getRoleByName(accountId, name) {
  const row = getDb()
    .prepare('SELECT * FROM roles WHERE account_id = ? AND name = ?')
    .get(accountId, name);
  return row ? { ...row, permissions: JSON.parse(row.permissions) } : null;
}

export function assignRoleToUser(userId, roleId) {
  getDb()
    .prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)')
    .run(userId, roleId);
}

// ---------------------------------------------------------------------------
// Resolving a user's roles + permissions (used when building JWT payload)
// ---------------------------------------------------------------------------

export function getUserRolesAndPermissions(userId) {
  const rows = getDb().prepare(`
    SELECT r.name, r.permissions
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = ?
  `).all(userId);

  const roles = rows.map((r) => r.name);
  const permissions = [
    ...new Set(rows.flatMap((r) => JSON.parse(r.permissions))),
  ];
  return { roles, permissions };
}

// ---------------------------------------------------------------------------
// Refresh tokens
// ---------------------------------------------------------------------------

export function storeRefreshToken(token, userId, expiresAt) {
  getDb()
    .prepare('INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, ?)')
    .run(token, userId, expiresAt.toISOString());
}

export function getRefreshToken(token) {
  return getDb()
    .prepare('SELECT * FROM refresh_tokens WHERE token = ?')
    .get(token) ?? null;
}

export function deleteRefreshToken(token) {
  getDb().prepare('DELETE FROM refresh_tokens WHERE token = ?').run(token);
}
