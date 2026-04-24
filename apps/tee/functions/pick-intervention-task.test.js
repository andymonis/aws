import test from 'node:test';
import assert from 'node:assert/strict';
import { pickInterventionTask } from './pick-intervention-task.js';

test('picks the most recently skipped active task', () => {
  const tasks = [
    { id: 'task_1', title: 'Write report', status: 'active', skipCount: 1, createdAt: '2026-04-23T10:00:00Z' },
    { id: 'task_2', title: 'Read docs', status: 'active', skipCount: 3, createdAt: '2026-04-23T11:00:00Z' },
  ];

  const events = [
    { taskId: 'task_2', type: 'skip', timestamp: '2026-04-23T12:00:00Z' },
    { taskId: 'task_1', type: 'skip', timestamp: '2026-04-23T13:00:00Z' },
  ];

  const picked = pickInterventionTask(tasks, events);

  assert.equal(picked.id, 'task_1');
});

test('falls back to highest skipCount active task', () => {
  const tasks = [
    { id: 'task_1', title: 'Write report', status: 'active', skipCount: 1, createdAt: '2026-04-23T10:00:00Z' },
    { id: 'task_2', title: 'Read docs', status: 'active', skipCount: 3, createdAt: '2026-04-23T11:00:00Z' },
  ];

  const events = [
    { taskId: 'task_9', type: 'skip', timestamp: '2026-04-23T12:00:00Z' },
  ];

  const picked = pickInterventionTask(tasks, events);

  assert.equal(picked.id, 'task_2');
});
