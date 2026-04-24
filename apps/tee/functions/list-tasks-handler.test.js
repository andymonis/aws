import test from 'node:test';
import assert from 'node:assert/strict';
import { handler } from './list-tasks-handler.js';

test('returns only active tasks in the platform envelope', async () => {
  const storedTasks = [
    {
      id: 'task_2',
      title: 'Second task',
      status: 'active',
      createdAt: '2026-04-23T10:05:00Z',
      skipCount: 0,
      completionCount: 0,
      lastTouched: null,
      accountId: 'acct_1',
      updatedAt: '2026-04-23T10:05:00Z',
    },
    {
      id: 'task_archived',
      title: 'Archived task',
      status: 'archived',
      createdAt: '2026-04-23T09:00:00Z',
      skipCount: 0,
      completionCount: 1,
      lastTouched: '2026-04-23T09:30:00Z',
      accountId: 'acct_1',
      updatedAt: '2026-04-23T09:30:00Z',
    },
    {
      id: 'task_1',
      title: 'First task',
      status: 'active',
      createdAt: '2026-04-23T10:00:00Z',
      skipCount: 0,
      completionCount: 0,
      lastTouched: null,
      accountId: 'acct_1',
      updatedAt: '2026-04-23T10:00:00Z',
    },
  ];

  const response = await handler({}, {
    requestId: 'req_1',
    db: {
      list(tableName) {
        assert.equal(tableName, 'tee_tasks');
        return storedTasks;
      },
    },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    ok: true,
    data: [
      {
        id: 'task_2',
        title: 'Second task',
        status: 'active',
        createdAt: '2026-04-23T10:05:00Z',
        skipCount: 0,
        completionCount: 0,
        lastTouched: null,
      },
      {
        id: 'task_1',
        title: 'First task',
        status: 'active',
        createdAt: '2026-04-23T10:00:00Z',
        skipCount: 0,
        completionCount: 0,
        lastTouched: null,
      },
    ],
    requestId: 'req_1',
  });
});
