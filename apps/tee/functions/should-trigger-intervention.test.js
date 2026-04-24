import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldTriggerIntervention } from './should-trigger-intervention.js';

test('triggers on skip streak', () => {
  assert.equal(shouldTriggerIntervention({ skipStreak: 2, fatigueScore: 0 }), true);
});

test('triggers on fatigue', () => {
  assert.equal(shouldTriggerIntervention({ skipStreak: 0, fatigueScore: 4 }), true);
});

test('does not trigger when low', () => {
  assert.equal(shouldTriggerIntervention({ skipStreak: 1, fatigueScore: 1 }), false);
});
