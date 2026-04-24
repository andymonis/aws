import test from 'node:test';
import assert from 'node:assert/strict';
import { listTasks } from './list-tasks.js';

test('returns only active tasks', () => {
  const tasks = [
    { id: '1', status: 'active' },
    { id: '2', status: 'archived' },
  ];

  const result = listTasks(tasks);

  assert.deepEqual(result, [
    { id: '1', status: 'active' },
  ]);
});

test('returns empty array if no active tasks', () => {
  const tasks = [
    { id: '1', status: 'archived' },
  ];

  const result = listTasks(tasks);

  assert.deepEqual(result, []);
});

test('does not mutate original array', () => {
  const tasks = [
    { id: '1', status: 'active' },
  ];

  const copy = [...tasks];

  listTasks(tasks);

  assert.deepEqual(tasks, copy);
});
