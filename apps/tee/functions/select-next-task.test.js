import test from 'node:test';
import assert from 'node:assert/strict';
import { selectNextTask } from './select-next-task.js';

test('selects highest scoring task', () => {
  const now = '2026-04-23T10:00:00Z';
  const tasks = [
    {
      id: '1',
      skipCount: 1,
      lastTouched: null,
      createdAt: '2026-01-01T00:00:00Z',
      status: 'active',
    },
    {
      id: '2',
      skipCount: 0,
      lastTouched: null,
      createdAt: '2026-01-02T00:00:00Z',
      status: 'active',
    },
  ];

  const result = selectNextTask(tasks, now);

  assert.equal(result.id, '2');
});

test('breaks tie using createdAt', () => {
  const now = '2026-04-23T10:00:00Z';
  const tasks = [
    {
      id: '1',
      skipCount: 0,
      lastTouched: null,
      createdAt: '2026-01-01T00:00:00Z',
      status: 'active',
    },
    {
      id: '2',
      skipCount: 0,
      lastTouched: null,
      createdAt: '2026-02-01T00:00:00Z',
      status: 'active',
    },
  ];

  const result = selectNextTask(tasks, now);

  assert.equal(result.id, '1');
});

test('ignores archived tasks', () => {
  const now = '2026-04-23T10:00:00Z';
  const tasks = [
    {
      id: '1',
      skipCount: 0,
      lastTouched: null,
      createdAt: '2026-01-01T00:00:00Z',
      status: 'archived',
    },
    {
      id: '2',
      skipCount: 1,
      lastTouched: '2026-04-22T08:00:00Z',
      createdAt: '2026-01-02T00:00:00Z',
      status: 'active',
    },
  ];

  const result = selectNextTask(tasks, now);

  assert.equal(result.id, '2');
});

test('uses time-of-day context as a bias, not a replacement', () => {
  const now = '2026-04-23T20:00:00Z';
  const tasks = [
    {
      id: 'fresh',
      skipCount: 0,
      completionCount: 0,
      lastTouched: '2026-04-23T19:30:00Z',
      createdAt: '2026-01-01T00:00:00Z',
      status: 'active',
    },
    {
      id: 'familiar',
      skipCount: 0,
      completionCount: 1,
      lastTouched: '2026-04-23T19:00:00Z',
      createdAt: '2026-01-02T00:00:00Z',
      status: 'active',
    },
  ];

  const result = selectNextTask(tasks, now, { timeOfDay: 'evening' });

  assert.equal(result.id, 'familiar');
});
