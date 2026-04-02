import path from 'path';
import { createLogger } from '../shared/logger.js';
import { PlatformError } from '../shared/errors.js';

const log = createLogger('function-runtime');

// Handler module cache: <absolute file path> → handler function
const _cache = new Map();

/**
 * Resolve and optionally cache a handler module.
 * @param {string} functionsDir - absolute or relative path to functions directory
 * @param {string} functionName - stem name of the handler file (no extension)
 * @returns {Promise<Function>} the `handler` export
 */
async function loadHandler(functionsDir, functionName) {
  const filePath = path.resolve(functionsDir, `${functionName}.js`);

  if (_cache.has(filePath)) {
    return _cache.get(filePath);
  }

  let mod;
  try {
    mod = await import(filePath);
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      throw new PlatformError(
        'RUNTIME_HANDLER_NOT_FOUND',
        `Handler file not found: ${functionName}.js`,
        404
      );
    }
    throw new PlatformError(
      'RUNTIME_EXECUTION_ERROR',
      `Failed to load handler '${functionName}': ${err.message}`,
      500
    );
  }

  if (typeof mod.handler !== 'function') {
    throw new PlatformError(
      'RUNTIME_INVALID_HANDLER',
      `Handler file '${functionName}.js' does not export a 'handler' function`,
      500
    );
  }

  _cache.set(filePath, mod.handler);
  return mod.handler;
}

/**
 * Invoke a named function handler.
 *
 * @param {object} options
 * @param {string} options.functionsDir   - directory containing handler files
 * @param {string} options.functionName   - name of the handler to invoke
 * @param {object} options.event          - the event object passed to the handler
 * @param {object} options.context        - the context object passed to the handler
 * @returns {Promise<{ statusCode: number, body: object|null }>}
 */
export async function invoke({ functionsDir, functionName, event, context }) {
  log.info({ functionName, requestId: context.requestId }, 'invoking handler');

  const handler = await loadHandler(functionsDir, functionName);

  let result;
  try {
    const start = Date.now();
    result = await handler(event, context);
    log.info(
      { functionName, requestId: context.requestId, durationMs: Date.now() - start },
      'handler completed'
    );
  } catch (err) {
    if (err instanceof PlatformError) {
      throw err;
    }

    log.error({ functionName, requestId: context.requestId, err }, 'handler threw');
    throw new PlatformError(
      'RUNTIME_EXECUTION_ERROR',
      `Handler '${functionName}' threw an error: ${err.message}`,
      500
    );
  }

  if (!result || typeof result !== 'object') {
    throw new PlatformError(
      'RUNTIME_INVALID_HANDLER',
      `Handler '${functionName}' must return an object`,
      500
    );
  }

  return {
    statusCode: result.statusCode ?? 200,
    body: result.body ?? null,
  };
}
