# Data Service

This guide explains the Phase 2 persistent data model exposed to handlers as `context.db`.

## 1) Declare tables

In `platform.config.js`:

```js
tables: [
  { name: 'notes' }
]
```

Each declared table is created in SQLite at startup.

## 2) Use in handlers

Example:

```js
export async function handler(event, context) {
  const item = context.db.put('notes', {
    title: 'First note',
    content: 'Hello',
  });

  return {
    statusCode: 200,
    body: { ok: true, data: item },
  };
}
```

Available methods:

- `context.db.list(tableName, { limit })`
- `context.db.get(tableName, id)`
- `context.db.put(tableName, item)`
- `context.db.delete(tableName, id)`

## 3) Account scoping and permissions

All operations are automatically scoped to `context.user.accountId`.

Permissions:

- read (`list`, `get`): `data:read` or `data:*`
- write (`put`, `delete`): `data:write` or `data:*`

Errors:

- unauthenticated access → `401`
- missing data permission → `403`
- unknown table → `404`

## 4) Environment variable

Optional:

- `DATA_DB_PATH` (default `./platform/data-service/data.db`)
