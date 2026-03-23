/**
 * Standard platform error.
 * All services throw this so that the gateway can produce consistent error envelopes.
 */
export class PlatformError extends Error {
  /**
   * @param {string} code    - SCREAMING_SNAKE error code
   * @param {string} message - human-readable message
   * @param {number} status  - HTTP status code
   */
  constructor(code, message, status = 500) {
    super(message);
    this.name = 'PlatformError';
    this.code = code;
    this.status = status;
  }
}

/** Convenience factories */
export const errors = {
  unauthorized: (msg = 'Unauthorized') =>
    new PlatformError('GW_UNAUTHORIZED', msg, 401),

  forbidden: (msg = 'Forbidden') =>
    new PlatformError('GW_FORBIDDEN', msg, 403),

  notFound: (msg = 'Not found') =>
    new PlatformError('GW_ROUTE_NOT_FOUND', msg, 404),

  rateLimited: (msg = 'Too many requests') =>
    new PlatformError('GW_RATE_LIMITED', msg, 429),

  internal: (msg = 'Internal error') =>
    new PlatformError('GW_INTERNAL_ERROR', msg, 500),
};
