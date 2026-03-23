import jwt from 'jsonwebtoken';
import { PlatformError } from './errors.js';

/**
 * Verify a JWT and return the decoded payload.
 * Pure function — no I/O.
 *
 * @param {string} token
 * @returns {{ sub: string, accountId: string, roles: string[], permissions: string[] }}
 * @throws {PlatformError} GW_UNAUTHORIZED if the token is missing, malformed, or expired
 */
export function verifyToken(token) {
  const secret = process.env.PLATFORM_JWT_SECRET;

  if (!secret) {
    throw new PlatformError('CONFIG_ERROR', 'PLATFORM_JWT_SECRET is not set', 500);
  }

  if (!token) {
    throw new PlatformError('GW_UNAUTHORIZED', 'No token provided', 401);
  }

  try {
    return jwt.verify(token, secret);
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token';
    throw new PlatformError('GW_UNAUTHORIZED', message, 401);
  }
}
