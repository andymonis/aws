import test from 'node:test';
import assert from 'node:assert/strict';
import { simplifyTask } from './simplify-task.js';

test('simplifies write tasks', () => {
  const result = simplifyTask('Write report');

  assert.equal(result, 'Write 3 bullet points for report');
});

test('simplifies read tasks', () => {
  const result = simplifyTask('Read article');

  assert.equal(result, 'Read for 2 minutes');
});

test('fallback simplification', () => {
  const result = simplifyTask('Clean kitchen');

  assert.equal(result, 'Spend 2 minutes on: Clean kitchen');
});

test('does not return original task', () => {
  const input = 'Write report';
  const result = simplifyTask(input);

  assert.notEqual(result, input);
});
