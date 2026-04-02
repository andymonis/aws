# Building API Features

This guide shows how to add new app endpoints.

## 1) Add a handler file

Create a file in your app folder, for example `apps/example-app/functions/create-order.js`.

Required export:

```js
export async function handler(event, context) {
  return {
    statusCode: 200,
    body: {
      ok: true,
      input: event.body,
      user: context.user,
      requestId: context.requestId,
    },
  };
}
```

## 2) Register route in platform config

Edit `platform.config.js` and ensure the app is declared:

```js
apps: {
  'example-app': {
    functionsDir: '/absolute/path/to/apps/example-app/functions',
    staticDir: '/absolute/path/to/apps/example-app/static',
    staticPrefix: '/app/'
  }
}
```

Then add a route entry:

```js
{
  app: 'example-app',
  path: '/orders',
  method: 'POST',
  function: 'create-order',
  auth: true,
  roles: ['admin', 'user']
}
```

Route fields:

- `app`: app key from `config.apps`
- `path`: HTTP path
- `method`: HTTP verb (uppercase)
- `function`: handler filename without `.js`
- `auth`: whether JWT is required
- `roles` (optional): allowed roles

## 3) Restart and test

After changing config or handler files, restart server and test the endpoint.

## 4) Handler input/output contract

### `event`

- `event.method`
- `event.path`
- `event.params`
- `event.query`
- `event.body`
- `event.headers`

### `context`

- `context.user` (`null` for unauthenticated routes)
- `context.db` account-scoped data client
- `context.logger`
- `context.config`
- `context.requestId`

`context.db` methods:

- `context.db.list(tableName, { limit })`
- `context.db.get(tableName, id)`
- `context.db.put(tableName, item)`
- `context.db.delete(tableName, id)`

Data permissions are enforced automatically:

- read: `data:read` or `data:*`
- write: `data:write` or `data:*`

### Return value

Return an object:

- `statusCode` (optional, default `200`)
- `body` (JSON-serializable object)

## 5) Common pitfalls

- Route `app` must match a key in `platform.config.js > apps`.
- Function name in config must match file stem exactly.
- Missing `handler` export causes runtime error.
- Protected routes (`auth: true`) need `Authorization: Bearer <token>`.
- Role-gated routes require matching `roles` claim in JWT.
- `context.db` table names must exist in `platform.config.js > tables`.
