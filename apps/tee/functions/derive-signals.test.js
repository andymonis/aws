import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveSignals } from './derive-signals.js';

test('calculates skip streak', () => {
  const events = [
    { type: 'complete' },
    { type: 'skip' },
    { type: 'skip' },
  ];

  const result = deriveSignals(events);

  assert.equal(result.skipStreak, 2);
});

test('calculates completion streak', () => {
  const events = [
    { type: 'skip' },
    { type: 'complete' },
    { type: 'complete' },
  ];

  const result = deriveSignals(events);

  assert.equal(result.completionStreak, 2);
});

test('calculates fatigue score', () => {
  const events = [
    { type: 'skip' },
    { type: 'skip' },
    { type: 'complete' },
  ];

  const result = deriveSignals(events);

  assert.equal(result.fatigueScore, 0);
});

test('fatigue increases with skip streak', () => {
  const events = [
    { type: 'skip' },
    { type: 'skip' },
    { type: 'skip' },
  ];

  const result = deriveSignals(events);

  assert.equal(result.fatigueScore, 6);
});
