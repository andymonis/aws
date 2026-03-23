import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../shared/logger.js';
import { verifyToken } from '../shared/verifyToken.js';
import { PlatformError, errors } from '../shared/errors.js';
import { invoke } from '../function-runtime/index.js';

const log = createLogger('api-gateway');

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function ok(reply, body, statusCode = 200) {
  return reply.status(statusCode).send(body);
}

function fail(reply, err, requestId) {
  const isPlatform = err instanceof PlatformError;
  const status = isPlatform ? err.status : 500;
  const code = isPlatform ? err.code : 'GW_INTERNAL_ERROR';
  const message = isPlatform ? err.message : 'An unexpected error occurred';
  if (!isPlatform) log.error({ err, requestId }, 'Unhandled gateway error');
  return reply.status(status).send({ ok: false, error: { code, message }, requestId });
}

// ---------------------------------------------------------------------------
// Rate limiter stub (Phase 4 will fill this in)
// ---------------------------------------------------------------------------

function rateLimiter(_request) {
  // TODO Phase 4: enforce per-account rate limits
  return true;
}

// ---------------------------------------------------------------------------
// Permission check
// ---------------------------------------------------------------------------

function hasRequiredRole(tokenPayload, requiredRoles) {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  const { roles = [], permissions = [] } = tokenPayload;
  if (permissions.includes('api:*')) return true;
  return requiredRoles.some((r) => roles.includes(r));
}

// ---------------------------------------------------------------------------
// Gateway server factory
// ---------------------------------------------------------------------------

/**
 * Build and return a configured Fastify gateway instance.
 * @param {object} config - contents of platform.config.js
 */
export function buildGateway(config) {
  const { routes = [], functionsDir, staticDir, staticPrefix = '/app/' } = config;

  if (!functionsDir) {
    throw new Error('platform.config.js must define functionsDir');
  }

  const app = Fastify({ logger: false });

  // CORS
  app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Optional static asset hosting
  if (staticDir) {
    app.register(fastifyStatic, {
      root: staticDir,
      prefix: staticPrefix,
      index: 'index.html',
      decorateReply: false,
    });
  }

  // Assign request ID to every request
  app.addHook('onRequest', (request, _reply, done) => {
    request.requestId = uuidv4();
    done();
  });

  // Register each declared route
  for (const route of routes) {
    const { path: routePath, method, function: functionName, auth = false, roles } = route;

    if (!routePath || !method || !functionName) {
      log.warn({ route }, 'Skipping invalid route definition (missing path, method or function)');
      continue;
    }

    const httpMethod = method.toLowerCase();

    app[httpMethod](routePath, async (request, reply) => {
      const requestId = request.requestId;
      const childLog = log.child({ requestId, path: routePath, method });

      childLog.info('request received');

      // Rate limiter
      if (!rateLimiter(request)) {
        return fail(reply, errors.rateLimited(), requestId);
      }

      // Auth
      let tokenPayload = null;
      const authHeader = request.headers['authorization'] ?? '';
      const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

      if (rawToken) {
        try {
          tokenPayload = verifyToken(rawToken);
        } catch (err) {
          return fail(reply, err, requestId);
        }
      }

      if (auth && !tokenPayload) {
        return fail(reply, errors.unauthorized('Authentication required'), requestId);
      }

      // Permission check
      if (tokenPayload && !hasRequiredRole(tokenPayload, roles)) {
        return fail(reply, errors.forbidden(), requestId);
      }

      // Build event + context
      const event = {
        method: request.method,
        path: request.url,
        params: request.params ?? {},
        query: request.query ?? {},
        body: request.body ?? {},
        headers: request.headers,
      };

      const context = {
        user: tokenPayload
          ? {
              id: tokenPayload.sub,
              accountId: tokenPayload.accountId,
              roles: tokenPayload.roles,
              permissions: tokenPayload.permissions,
            }
          : null,
        logger: childLog,
        config,
        requestId,
      };

      // Invoke function
      let result;
      try {
        result = await invoke({ functionsDir, functionName, event, context });
      } catch (err) {
        return fail(reply, err, requestId);
      }

      childLog.info({ statusCode: result.statusCode }, 'request complete');
      return ok(reply, result.body, result.statusCode);
    });
  }

  // 404 for unmatched routes
  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({ ok: false, error: { code: 'GW_ROUTE_NOT_FOUND', message: 'Route not found' } });
  });

  return app;
}

export async function startGateway(config, port) {
  const app = buildGateway(config);
  await app.listen({ port, host: '0.0.0.0' });
  log.info({ port }, 'api-gateway listening');
  return app;
}
