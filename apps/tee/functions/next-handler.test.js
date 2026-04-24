import test from 'node:test';
import assert from 'node:assert/strict';
import { handler } from './next-handler.js';

test('intervention overrides task selection when skip streak is high', async () => {
  const response = await handler({ body: { debug: true } }, {
    requestId: 'req_next_1',
    promptGenerator: {
      generate: async () => 'Mock prompt from next handler test',
    },
    db: {
      list(tableName) {
        if (tableName === 'tee_tasks') {
          return [
            {
              id: 'task_2',
              title: 'Later task',
              status: 'active',
              skipCount: 1,
              createdAt: '2026-04-23T11:00:00Z',
            },
            {
              id: 'task_1',
              title: 'Do this now',
              status: 'active',
              skipCount: 4,
              createdAt: '2026-04-23T10:00:00Z',
            },
          ];
        }

        assert.equal(tableName, 'tee_events');
        return [
          { type: 'complete' },
          { type: 'skip' },
          { type: 'skip' },
        ];
      },
    },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    ok: true,
    data: {
      type: 'intervention',
      id: 'task_1',
      content: 'Mock prompt from next handler test',
      followUp: 'Spend 2 minutes on: Do this now',
      reason: 'skip_streak_detected',
    },
    debug: {
      signals: {
        skipStreak: 2,
        completionStreak: 0,
        fatigueScore: 4,
      },
      scoring: [
        { taskId: 'task_2', score: -3 },
        { taskId: 'task_1', score: -18 },
      ],
      selectedReason: 'intervention_triggered',
      interventionTriggered: true,
    },
    requestId: 'req_next_1',
  });
});

test('uses static fallback prompt generator when none is injected', async () => {
  const response = await handler({}, {
    requestId: 'req_next_static',
    db: {
      list(tableName) {
        if (tableName === 'tee_tasks') {
          return [
            {
              id: 'task_1',
              title: 'Write report',
              status: 'active',
              skipCount: 0,
              completionCount: 0,
              lastTouched: null,
              createdAt: '2026-04-23T10:00:00Z',
            },
          ];
        }

        return [
          { type: 'skip', taskId: 'task_1' },
          { type: 'skip', taskId: 'task_1' },
        ];
      },
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.type, 'intervention');
  assert.equal(response.body.data.content, 'What’s the smallest version of this?');
});

test('returns task response when intervention is not triggered', async () => {
  const response = await handler({ body: { context: { timeOfDay: 'morning' }, debug: true } }, {
    requestId: 'req_next_2a',
    db: {
      list(tableName) {
        if (tableName === 'tee_tasks') {
          return [
            {
              id: 'task_1',
              title: 'Do this now',
              status: 'active',
              skipCount: 0,
              createdAt: '2026-04-23T10:00:00Z',
            },
          ];
        }

        assert.equal(tableName, 'tee_events');
        return [
          { type: 'skip' },
          { type: 'complete' },
        ];
      },
    },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    ok: true,
    data: {
      type: 'task',
      id: 'task_1',
      content: 'Do this now',
      reason: 'basic_scoring_v1',
    },
    debug: {
      signals: {
        skipStreak: 0,
        completionStreak: 1,
        fatigueScore: 0,
      },
      scoring: [
        { taskId: 'task_1', score: 3 },
      ],
      selectedReason: 'highest_score',
      interventionTriggered: false,
    },
    requestId: 'req_next_2a',
  });
});

test('returns intervention empty follow-up when no active tasks', async () => {
  const response = await handler({ body: { debug: true } }, {
    requestId: 'req_next_2',
    db: {
      list(tableName) {
        if (tableName === 'tee_tasks') {
          return [
            {
              id: 'task_archived',
              title: 'Old task',
              status: 'archived',
              skipCount: 0,
              createdAt: '2026-04-23T09:00:00Z',
            },
          ];
        }

        assert.equal(tableName, 'tee_events');
        return [
          { type: 'skip' },
          { type: 'skip' },
          { type: 'skip' },
        ];
      },
    },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    ok: true,
    data: {
      type: 'intervention',
      content: 'What’s the smallest version of this?',
      reason: 'skip_streak_detected',
    },
    debug: {
      signals: {
        skipStreak: 3,
        completionStreak: 0,
        fatigueScore: 6,
      },
      scoring: [],
      selectedReason: 'intervention_triggered',
      interventionTriggered: true,
    },
    requestId: 'req_next_2',
  });
});

test('does not include debug by default', async () => {
  const response = await handler({}, {
    requestId: 'req_next_no_debug',
    db: {
      list(tableName) {
        if (tableName === 'tee_tasks') {
          return [
            {
              id: 'task_1',
              title: 'Do this now',
              status: 'active',
              skipCount: 0,
              completionCount: 0,
              lastTouched: null,
              createdAt: '2026-04-23T10:00:00Z',
            },
          ];
        }

        return [{ type: 'complete' }];
      },
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.debug, undefined);
});
