import test from 'node:test';
import assert from 'node:assert/strict';
import { applyActionToTask } from './apply-action-to-task.js';

const baseTask = {
  id: '1',
  title: 'Task',
  status: 'active',
  skipCount: 0,
  completionCount: 0,
  lastTouched: null,
};

test('increments skipCount', () => {
  const now = () => 'now';

  const result = applyActionToTask(baseTask, 'skip', now);

  assert.equal(result.skipCount, 1);
  assert.equal(result.lastTouched, 'now');
});

test('increments completionCount', () => {
  const now = () => 'now';

  const result = applyActionToTask(baseTask, 'complete', now);

  assert.equal(result.completionCount, 1);
});

test('snooze does not change counters', () => {
  const now = () => 'now';

  const result = applyActionToTask(baseTask, 'snooze', now);

  assert.equal(result.skipCount, 0);
  assert.equal(result.completionCount, 0);
  assert.equal(result.lastTouched, 'now');
});

test('does not mutate original task', () => {
  const now = () => 'now';

  const original = { ...baseTask };

  applyActionToTask(baseTask, 'skip', now);

  assert.deepEqual(baseTask, original);
});
