import test from 'node:test';
import assert from 'node:assert/strict';
import { createEvent } from './create-event.js';

test('creates event correctly', () => {
  const now = () => '2026-04-23T10:00:00Z';

  const event = createEvent('task_1', 'skip', now);

  assert.deepEqual(event, {
    taskId: 'task_1',
    type: 'skip',
    timestamp: '2026-04-23T10:00:00Z',
  });
});
