import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreTask } from './scoring.js';

test('penalizes skipped tasks', () => {
  const now = '2026-04-23T10:00:00Z';

  const low = scoreTask({ skipCount: 0, lastTouched: null }, now);
  const high = scoreTask({ skipCount: 2, lastTouched: null }, now);

  assert.ok(low > high);
});

test('boosts untouched tasks', () => {
  const now = '2026-04-23T10:00:00Z';

  const untouched = scoreTask({ skipCount: 0, lastTouched: null }, now);
  const touched = scoreTask({ skipCount: 0, lastTouched: '2026-04-23T09:00:00Z' }, now);

  assert.ok(untouched > touched);
});

test('boosts tasks not touched recently', () => {
  const now = '2026-04-23T10:00:00Z';

  const old = scoreTask({ skipCount: 0, lastTouched: '2026-04-20T10:00:00Z' }, now);
  const recent = scoreTask({ skipCount: 0, lastTouched: '2026-04-23T09:00:00Z' }, now);

  assert.ok(old > recent);
});

test('morning boosts untouched tasks', () => {
  const now = '2026-04-23T10:00:00Z';

  const clean = scoreTask(
    { skipCount: 0, completionCount: 0, lastTouched: null },
    now,
    { timeOfDay: 'morning' }
  );

  const skipped = scoreTask(
    { skipCount: 1, completionCount: 0, lastTouched: null },
    now,
    { timeOfDay: 'morning' }
  );

  assert.ok(clean > skipped);
});

test('evening boosts completed tasks', () => {
  const now = '2026-04-23T20:00:00Z';

  const familiar = scoreTask(
    { skipCount: 0, completionCount: 2, lastTouched: '2026-04-22T18:00:00Z' },
    now,
    { timeOfDay: 'evening' }
  );

  const fresh = scoreTask(
    { skipCount: 0, completionCount: 0, lastTouched: null },
    now,
    { timeOfDay: 'evening' }
  );

  assert.ok(familiar > fresh);
});

test('no context does not change score', () => {
  const now = '2026-04-23T10:00:00Z';

  const withContext = scoreTask(
    { skipCount: 0, completionCount: 0, lastTouched: null },
    now,
    { timeOfDay: 'afternoon' }
  );

  const noContext = scoreTask(
    { skipCount: 0, completionCount: 0, lastTouched: null },
    now,
    null
  );

  assert.equal(withContext, noContext);
});

test('changing skip penalty changes scoring', () => {
  const now = '2026-04-23T10:00:00Z';
  const task = { skipCount: 1, completionCount: 0, lastTouched: null };

  const defaultScore = scoreTask(task, now, null, {
    scoring: { skipPenalty: 5 },
  });

  const strongerPenaltyScore = scoreTask(task, now, null, {
    scoring: { skipPenalty: 10 },
  });

  assert.ok(strongerPenaltyScore < defaultScore);
});
