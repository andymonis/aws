import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIntervention } from './build-intervention.js';
import { StaticPromptGenerator } from './static-prompt-generator.js';

test('uses injected prompt generator', async () => {
  const mockGenerator = {
    generate: async () => 'Mock prompt',
  };

  const result = await buildIntervention(
    { skipStreak: 2, fatigueScore: 0 },
    { id: 'task_1', title: 'Write report' },
    mockGenerator
  );

  assert.equal(result.type, 'intervention');
  assert.equal(result.id, 'task_1');
  assert.equal(result.content, 'Mock prompt');
  assert.equal(result.followUp, 'Write 3 bullet points for report');
  assert.equal(result.reason, 'skip_streak_detected');
});

test('falls back if prompt generation fails', async () => {
  const brokenGenerator = {
    generate: async () => {
      throw new Error('fail');
    },
  };

  const result = await buildIntervention(
    { skipStreak: 2, fatigueScore: 0 },
    { id: 'task_1', title: 'Write report' },
    brokenGenerator
  );

  assert.equal(result.content, 'Try a smaller step');
});

test('static generator works', async () => {
  const gen = new StaticPromptGenerator();

  const result = await gen.generate({ type: 'skip' });

  assert.ok(result.includes('smallest'));
});

test('uses fatigue prompt when fatigue triggers without skip streak', async () => {
  const result = await buildIntervention(
    { skipStreak: 0, fatigueScore: 4 },
    { id: 'task_2', title: 'Read docs' },
    new StaticPromptGenerator()
  );

  assert.equal(result.content, 'Do a 2 minute version of something');
  assert.equal(result.followUp, 'Read for 2 minutes');
  assert.equal(result.reason, 'fatigue_detected');
});
