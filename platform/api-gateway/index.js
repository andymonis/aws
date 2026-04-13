import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../shared/logger.js';
import { resolveCorsOrigin } from '../shared/cors.js';
import { verifyToken } from '../shared/verifyToken.js';
import { PlatformError, errors } from '../shared/errors.js';
import { invoke } from '../function-runtime/index.js';
import { createDataClient } from '../data-service/index.js';

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

function buildForwardHeaders(incomingHeaders) {
  const headers = {};

  for (const [key, value] of Object.entries(incomingHeaders ?? {})) {
    const lower = key.toLowerCase();
    if (lower === 'host' || lower === 'content-length' || lower === 'connection') continue;
    if (value === undefined) continue;
    headers[key] = Array.isArray(value) ? value.join(', ') : value;
  }

  return headers;
}

function buildIdentityUrl(identityPort, request) {
  const pathSuffix = request.params['*'] ? `/${request.params['*']}` : '';
  const query = request.raw.url.includes('?') ? request.raw.url.slice(request.raw.url.indexOf('?')) : '';
  return `http://127.0.0.1:${identityPort}${pathSuffix}${query}`;
}

function buildAppsMap(config) {
  const declaredApps = config.apps && typeof config.apps === 'object'
    ? { ...config.apps }
    : {};

  // Backward compatibility for older single-app config shape.
  if (Object.keys(declaredApps).length === 0 && config.functionsDir) {
    declaredApps.default = {
      functionsDir: config.functionsDir,
      staticDir: config.staticDir,
      staticPrefix: config.staticPrefix ?? '/app/',
    };
  }

  return declaredApps;
}

// ---------------------------------------------------------------------------
// Gateway server factory
// ---------------------------------------------------------------------------

/**
 * Build and return a configured Fastify gateway instance.
 * @param {object} config - contents of platform.config.js
 */
export function buildGateway(config) {
  const { routes = [] } = config;
  const apps = buildAppsMap(config);
  const appNames = Object.keys(apps);

  if (appNames.length === 0) {
    throw new Error('platform.config.js must define apps.<name>.functionsDir (or legacy functionsDir)');
  }

  const app = Fastify({ logger: false });

  // CORS
  app.register(cors, {
    origin: resolveCorsOrigin(),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Optional static asset hosting (per app)
  const usedPrefixes = new Set();
  for (const appName of appNames) {
    const appConfig = apps[appName];
    const prefix = appConfig.staticPrefix ?? `/${appName}/`;

    if (appConfig.staticDir) {
      if (usedPrefixes.has(prefix)) {
        throw new Error(`Duplicate staticPrefix '${prefix}' in platform.config.js`);
      }
      usedPrefixes.add(prefix);

      app.register(fastifyStatic, {
        root: appConfig.staticDir,
        prefix,
        index: 'index.html',
        decorateReply: false,
      });
    }
  }

  // Assign request ID to every request
  app.addHook('onRequest', (request, _reply, done) => {
    request.requestId = uuidv4();
    done();
  });

  // Gateway health probe
  app.get('/health', async (request, reply) => {
    return reply.status(200).send({
      ok: true,
      data: {
        service: 'api-gateway',
        status: 'up',
        timestamp: new Date().toISOString(),
      },
      requestId: request.requestId,
    });
  });

  // Identity reverse proxy for browser clients (single public origin).
  app.all('/identity/*', async (request, reply) => {
    const requestId = request.requestId;
    const childLog = log.child({ requestId, proxy: 'identity', method: request.method });
    const identityPort = parseInt(process.env.IDENTITY_PORT ?? '3001', 10);

    try {
      const targetUrl = buildIdentityUrl(identityPort, request);
      const headers = buildForwardHeaders(request.headers);
      const method = request.method.toUpperCase();

      let body;
      if (method !== 'GET' && method !== 'HEAD' && request.body !== undefined && request.body !== null) {
        body = typeof request.body === 'string' || Buffer.isBuffer(request.body)
          ? request.body
          : JSON.stringify(request.body);

        if (!headers['content-type']) {
          headers['content-type'] = 'application/json';
        }
      }

      const upstream = await fetch(targetUrl, {
        method,
        headers,
        body,
      });

      for (const [key, value] of upstream.headers.entries()) {
        const lower = key.toLowerCase();
        if (lower === 'content-length' || lower === 'connection' || lower === 'transfer-encoding') continue;
        reply.header(key, value);
      }

      const contentType = upstream.headers.get('content-type') ?? '';
      const rawText = await upstream.text();

      reply.status(upstream.status);
      if (contentType.includes('application/json')) {
        try {
          return reply.send(rawText ? JSON.parse(rawText) : {});
        } catch {
          return reply.send({ ok: false, error: { code: 'GW_BAD_UPSTREAM', message: 'Invalid JSON from identity' } });
        }
      }

      return reply.send(rawText);
    } catch (err) {
      childLog.error({ err }, 'identity proxy failure');
      return fail(reply, errors.internal('Identity service unavailable'), requestId);
    }
  });

  // Register each declared route
  for (const route of routes) {
    const { app: routeApp, path: routePath, method, function: functionName, auth = false, roles } = route;

    const inferredApp = appNames.length === 1 ? appNames[0] : null;
    const appName = routeApp ?? inferredApp;
    const appConfig = appName ? apps[appName] : null;

    if (!routePath || !method || !functionName) {
      throw new Error(`Invalid route config: missing path/method/function for route ${JSON.stringify(route)}`);
    }

    if (!appName) {
      throw new Error(`Route '${method} ${routePath}' is missing app binding`);
    }

    if (!appConfig) {
      throw new Error(`Route '${method} ${routePath}' references unknown app '${appName}'`);
    }

    if (!appConfig.functionsDir) {
      throw new Error(`App '${appName}' is missing functionsDir in platform.config.js`);
    }

    const httpMethod = method.toLowerCase();

    app[httpMethod](routePath, async (request, reply) => {
      const requestId = request.requestId;
      const childLog = log.child({ requestId, app: appName, path: routePath, method });

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
        app: appName,
        user: tokenPayload
          ? {
              id: tokenPayload.sub,
              accountId: tokenPayload.accountId,
              roles: tokenPayload.roles,
              permissions: tokenPayload.permissions,
            }
          : null,
        db: createDataClient({
          user: tokenPayload
            ? {
                id: tokenPayload.sub,
                accountId: tokenPayload.accountId,
                roles: tokenPayload.roles,
                permissions: tokenPayload.permissions,
              }
            : null,
        }),
        logger: childLog,
        config,
        requestId,
      };

      // Invoke function
      let result;
      try {
        result = await invoke({
          functionsDir: appConfig.functionsDir,
          functionName,
          event,
          context,
        });
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
