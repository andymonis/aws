import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PlatformError } from '../shared/errors.js';
import {
  createAccount,
  createUser,
  getUserByEmail,
  getUsersByEmail,
  getUsersByAccountId,
  getUserById,
  createRole,
  getRolesByAccount,
  getRoleByName,
  assignRoleToUser,
  getUserRolesAndPermissions,
  storeRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
} from './db.js';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

function getSecret() {
  const secret = process.env.PLATFORM_JWT_SECRET;
  if (!secret) {
    throw new PlatformError('CONFIG_ERROR', 'PLATFORM_JWT_SECRET is not set', 500);
  }
  return secret;
}

function issueAccessToken(user, roles, permissions) {
  return jwt.sign(
    {
      sub: user.id,
      accountId: user.account_id ?? user.accountId,
      roles,
      permissions,
    },
    getSecret(),
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

async function issueRefreshToken(userId) {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  storeRefreshToken(token, userId, expiresAt);
  return token;
}

async function resolveUserByPassword(users, password, ambiguousMessage) {
  const matches = [];
  for (const user of users) {
    if (await bcrypt.compare(password, user.password_hash)) {
      matches.push(user);
    }
  }

  if (matches.length > 1) {
    throw new PlatformError('AUTH_AMBIGUOUS_LOGIN', ambiguousMessage, 400);
  }

  return matches[0] ?? null;
}

// ---------------------------------------------------------------------------
// Auth handlers
// ---------------------------------------------------------------------------

export async function register(body) {
  const { accountName, email, password } = body;

  if (!accountName || !email || !password) {
    throw new PlatformError('AUTH_VALIDATION', 'accountName, email and password are required', 400);
  }

  const account = createAccount(accountName);

  // Create default admin role for new accounts
  const adminRole = createRole(account.id, 'admin', [
    'api:*',
    'data:*',
    'function:*',
  ]);

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = createUser(account.id, email, passwordHash);

  assignRoleToUser(user.id, adminRole.id);

  const { roles, permissions } = getUserRolesAndPermissions(user.id);
  const accessToken = issueAccessToken(user, roles, permissions);
  const refreshToken = await issueRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, accountId: account.id, roles },
  };
}

export async function login(body) {
  const { accountId, email, password } = body;

  if (!password || (!email && !accountId)) {
    throw new PlatformError(
      'AUTH_VALIDATION',
      'Provide password plus either email or accountId',
      400
    );
  }

  let user = null;

  if (email && accountId) {
    const candidate = getUserByEmail(accountId, email);
    if (candidate && (await bcrypt.compare(password, candidate.password_hash))) {
      user = candidate;
    }
  } else if (email) {
    const candidates = getUsersByEmail(email);
    user = await resolveUserByPassword(
      candidates,
      password,
      'Multiple accounts matched this email/password. Provide accountId with email.'
    );
  } else {
    const candidates = getUsersByAccountId(accountId);
    user = await resolveUserByPassword(
      candidates,
      password,
      'Multiple users matched this accountId/password. Provide email with password.'
    );
  }

  if (!user) {
    throw new PlatformError('AUTH_INVALID_CREDENTIALS', 'Invalid credentials', 401);
  }

  const { roles, permissions } = getUserRolesAndPermissions(user.id);
  const accessToken = issueAccessToken(user, roles, permissions);
  const refreshToken = await issueRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, accountId: user.account_id, roles },
  };
}

export async function refresh(body) {
  const { refreshToken } = body;

  if (!refreshToken) {
    throw new PlatformError('AUTH_VALIDATION', 'refreshToken is required', 400);
  }

  const stored = getRefreshToken(refreshToken);
  if (!stored || new Date(stored.expires_at) < new Date()) {
    if (stored) deleteRefreshToken(refreshToken);
    throw new PlatformError('AUTH_INVALID_TOKEN', 'Refresh token is invalid or expired', 401);
  }

  // Rotate token
  deleteRefreshToken(refreshToken);

  const user = getUserById(null, stored.user_id);
  if (!user) {
    throw new PlatformError('AUTH_INVALID_TOKEN', 'User not found', 401);
  }

  const { roles, permissions } = getUserRolesAndPermissions(user.id);
  const accessToken = issueAccessToken(user, roles, permissions);
  const newRefreshToken = await issueRefreshToken(user.id);

  return { accessToken, refreshToken: newRefreshToken };
}

// ---------------------------------------------------------------------------
// User handlers
// ---------------------------------------------------------------------------

export function getMe(tokenPayload) {
  const user = getUserById(tokenPayload.accountId, tokenPayload.sub);
  if (!user) {
    throw new PlatformError('AUTH_USER_NOT_FOUND', 'User not found', 404);
  }
  const { roles, permissions } = getUserRolesAndPermissions(user.id);
  return { id: user.id, email: user.email, accountId: user.account_id, roles, permissions };
}

// ---------------------------------------------------------------------------
// Role handlers
// ---------------------------------------------------------------------------

export function listRoles(tokenPayload) {
  return getRolesByAccount(tokenPayload.accountId);
}

export function addRole(tokenPayload, body) {
  const { name, permissions = [] } = body;
  if (!name) {
    throw new PlatformError('ROLE_VALIDATION', 'name is required', 400);
  }
  const existing = getRoleByName(tokenPayload.accountId, name);
  if (existing) {
    throw new PlatformError('ROLE_CONFLICT', `Role '${name}' already exists`, 409);
  }
  return createRole(tokenPayload.accountId, name, permissions);
}

export function assignRole(tokenPayload, userId, body) {
  const { roleName } = body;
  if (!roleName) {
    throw new PlatformError('ROLE_VALIDATION', 'roleName is required', 400);
  }
  const targetUser = getUserById(tokenPayload.accountId, userId);
  if (!targetUser) {
    throw new PlatformError('AUTH_USER_NOT_FOUND', 'User not found', 404);
  }
  const role = getRoleByName(tokenPayload.accountId, roleName);
  if (!role) {
    throw new PlatformError('ROLE_NOT_FOUND', `Role '${roleName}' not found`, 404);
  }
  assignRoleToUser(userId, role.id);
  return { userId, roleName };
}

export function verifyTokenInfo(tokenPayload) {
  // Decode expiry from the JWT payload (exp is in seconds since epoch)
  const expiresAt = new Date(tokenPayload.exp * 1000);
  const now = new Date();

  return {
    userId: tokenPayload.sub,
    accountId: tokenPayload.accountId,
    roles: tokenPayload.roles ?? [],
    permissions: tokenPayload.permissions ?? [],
    expiresAt: expiresAt.toISOString(),
    isExpired: now > expiresAt,
  };
}
