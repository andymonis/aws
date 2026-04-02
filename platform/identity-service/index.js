import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createLogger } from '../shared/logger.js';
import { verifyToken } from '../shared/verifyToken.js';
import { PlatformError } from '../shared/errors.js';
import {
  register,
  login,
  refresh,
  getMe,
  listRoles,
  addRole,
  assignRole,
  verifyTokenInfo,
} from './handlers.js';

const log = createLogger('identity-service');

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function ok(reply, data, status = 200) {
  return reply.status(status).send({ ok: true, data });
}

function fail(reply, err) {
  const isPlatform = err instanceof PlatformError;
  const status = isPlatform ? err.status : 500;
  const code = isPlatform ? err.code : 'INTERNAL_ERROR';
  const message = isPlatform ? err.message : 'An unexpected error occurred';
  if (!isPlatform) log.error({ err }, 'Unhandled error');
  return reply.status(status).send({ ok: false, error: { code, message } });
}

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

function requireAuth(request, reply) {
  const header = request.headers['authorization'] ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  try {
    request.tokenPayload = verifyToken(token);
  } catch (err) {
    fail(reply, err);
    return false;
  }
  return true;
}

function requirePermission(permission) {
  return (request, reply) => {
    if (!requireAuth(request, reply)) return false;
    const { permissions = [] } = request.tokenPayload;
    const hasWildcard = permissions.includes('api:*');
    const hasPermission = hasWildcard || permissions.includes(permission);
    if (!hasPermission) {
      fail(reply, new PlatformError('GW_FORBIDDEN', 'Insufficient permissions', 403));
      return false;
    }
    return true;
  };
}

// ---------------------------------------------------------------------------
// Server factory
// ---------------------------------------------------------------------------

export function buildIdentityServer() {
  const app = Fastify({ logger: false });

  app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // POST /auth/register
  app.post('/auth/register', async (req, reply) => {
    try {
      const result = await register(req.body ?? {});
      return ok(reply, result, 201);
    } catch (err) {
      return fail(reply, err);
    }
  });

  // POST /auth/login
  app.post('/auth/login', async (req, reply) => {
    try {
      const result = await login(req.body ?? {});
      return ok(reply, result);
    } catch (err) {
      return fail(reply, err);
    }
  });

  // POST /auth/refresh
  app.post('/auth/refresh', async (req, reply) => {
    try {
      const result = await refresh(req.body ?? {});
      return ok(reply, result);
    } catch (err) {
      return fail(reply, err);
    }
  });

  // POST /auth/verify
  app.post('/auth/verify', async (req, reply) => {
    try {
      const token = (req.body?.token) ?? (req.headers['authorization']?.slice(7) ?? null);
      const tokenPayload = verifyToken(token);
      const result = verifyTokenInfo(tokenPayload);
      return ok(reply, result);
    } catch (err) {
      return fail(reply, err);
    }
  });

  // GET /users/me
  app.get('/users/me', async (req, reply) => {
    if (!requireAuth(req, reply)) return;
    try {
      return ok(reply, getMe(req.tokenPayload));
    } catch (err) {
      return fail(reply, err);
    }
  });

  // GET /roles
  app.get('/roles', async (req, reply) => {
    if (!requirePermission('api:*')(req, reply)) return;
    try {
      return ok(reply, listRoles(req.tokenPayload));
    } catch (err) {
      return fail(reply, err);
    }
  });

  // POST /roles
  app.post('/roles', async (req, reply) => {
    if (!requirePermission('api:*')(req, reply)) return;
    try {
      return ok(reply, addRole(req.tokenPayload, req.body ?? {}), 201);
    } catch (err) {
      return fail(reply, err);
    }
  });

  // POST /users/:userId/roles
  app.post('/users/:userId/roles', async (req, reply) => {
    if (!requirePermission('api:*')(req, reply)) return;
    try {
      return ok(reply, assignRole(req.tokenPayload, req.params.userId, req.body ?? {}));
    } catch (err) {
      return fail(reply, err);
    }
  });

  return app;
}

export async function startIdentityService(port) {
  const app = buildIdentityServer();
  await app.listen({ port, host: '0.0.0.0' });
  log.info({ port }, 'identity-service listening');
  return app;
}
