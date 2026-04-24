import test from 'node:test';
import assert from 'node:assert/strict';
import { handler } from './action-handler.js';

test('records append-only event and updates task counters', async () => {
  const puts = [];
  const existingTask = {
    id: 'task_1',
    title: 'Write report',
    status: 'active',
    createdAt: '2026-04-23T10:00:00Z',
    skipCount: 0,
    completionCount: 0,
    lastTouched: null,
  };

  const response = await handler(
    {
      body: {
        taskId: 'task_1',
        action: 'skip',
      },
    },
    {
      requestId: 'req_1',
      db: {
        get(tableName, id) {
          assert.equal(tableName, 'tee_tasks');
          assert.equal(id, 'task_1');
          return existingTask;
        },
        put(tableName, item) {
          puts.push({ tableName, item });
          return item;
        },
      },
    }
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    ok: true,
    data: { success: true },
    requestId: 'req_1',
  });

  assert.equal(puts.length, 2);
  assert.equal(puts[0].tableName, 'tee_events');
  assert.equal(puts[0].item.taskId, 'task_1');
  assert.equal(puts[0].item.type, 'skip');
  assert.ok(typeof puts[0].item.timestamp === 'string');

  assert.equal(puts[1].tableName, 'tee_tasks');
  assert.equal(puts[1].item.id, 'task_1');
  assert.equal(puts[1].item.title, 'Write report');
  assert.equal(puts[1].item.status, 'active');
  assert.equal(puts[1].item.skipCount, 1);
  assert.equal(puts[1].item.completionCount, 0);
  assert.equal(puts[1].item.lastTouched, puts[0].item.timestamp);

  assert.equal(existingTask.skipCount, 0);
  assert.equal(existingTask.completionCount, 0);
  assert.equal(existingTask.lastTouched, null);
});

test('returns 404 when task does not exist', async () => {
  const response = await handler(
    {
      body: {
        taskId: 'missing_task',
        action: 'skip',
      },
    },
    {
      requestId: 'req_404',
      db: {
        get() {
          return null;
        },
        put() {
          throw new Error('put should not be called when task is missing');
        },
      },
    }
  );

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, {
    ok: false,
    error: {
      code: 'TEE_TASK_NOT_FOUND',
      message: 'Task not found.',
    },
    requestId: 'req_404',
  });
});

test('returns 400 for invalid action payload', async () => {
  const response = await handler(
    {
      body: {
        taskId: 'task_1',
        action: 'unknown-action',
      },
    },
    {
      requestId: 'req_400',
      db: {
        get() {
          throw new Error('get should not be called for invalid payload');
        },
        put() {
          throw new Error('put should not be called for invalid payload');
        },
      },
    }
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    ok: false,
    error: {
      code: 'TEE_INVALID_ACTION',
      message: 'taskId and valid action (complete, skip, snooze) are required.',
    },
    requestId: 'req_400',
  });
});
