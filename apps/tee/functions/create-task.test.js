import test from 'node:test';
import assert from 'node:assert/strict';
import { createTask } from './create-task.js';

const mockId = () => 'task_1';
const mockNow = () => '2026-04-23T10:00:00Z';

test('creates a valid task', () => {
  const result = createTask({ title: 'Write report' }, mockId, mockNow);

  assert.deepEqual(result, {
    id: 'task_1',
    title: 'Write report',
    status: 'active',
    createdAt: '2026-04-23T10:00:00Z',
    skipCount: 0,
    completionCount: 0,
    lastTouched: null,
  });
});

test('trims whitespace', () => {
  const result = createTask({ title: '  Task  ' }, mockId, mockNow);

  assert.equal(result.title, 'Task');
});

test('rejects empty title', () => {
  assert.throws(() => createTask({ title: '' }, mockId, mockNow), /Invalid title/);
});

test('rejects missing title', () => {
  assert.throws(() => createTask({}, mockId, mockNow), /Invalid title/);
});
