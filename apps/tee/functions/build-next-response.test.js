import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNextResponse } from './build-next-response.js';

test('returns empty state when no tasks', () => {
  const result = buildNextResponse(null);

  assert.deepEqual(result, {
    type: 'task',
    content: 'No tasks available',
    reason: 'empty_state',
  });
});
