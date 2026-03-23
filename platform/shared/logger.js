import pino from 'pino';

/**
 * Create a named pino logger.
 * @param {string} name - service name, bound as `service` field on every log line
 * @returns {import('pino').Logger}
 */
export function createLogger(name) {
  return pino({
    level: process.env.LOG_LEVEL ?? 'info',
    base: { service: name },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}
