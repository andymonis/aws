import { scoreActiveTasks, pickTopScored } from './select-next-task.js';
import { buildNextResponse } from './build-next-response.js';
import { deriveSignals } from './derive-signals.js';
import { shouldTriggerIntervention } from './should-trigger-intervention.js';
import { pickInterventionTask } from './pick-intervention-task.js';
import { buildIntervention } from './build-intervention.js';
import { StaticPromptGenerator } from './static-prompt-generator.js';
import { resolveEngineConfig } from './engine-config.js';

const defaultPromptGenerator = new StaticPromptGenerator();

/**
 * next-handler.js — select the next task to execute.
 *
 * Route: POST /next (auth: true)
 */
export async function handler(_event, context) {
  const debugRequested = _event.body?.debug === true;
  const selectionContext = _event.body?.context ?? null;
  const tasks = context.db.list('tee_tasks');
  const events = context.db.list('tee_events');
  const promptGenerator = context.promptGenerator ?? defaultPromptGenerator;
  const engineConfig = resolveEngineConfig(
    context.engineConfig ?? context.config?.apps?.tee?.engineConfig
  );
  const now = new Date().toISOString();
  const signals = deriveSignals(events);
  const scored = scoreActiveTasks(tasks, now, selectionContext, engineConfig);
  const topScored = pickTopScored(scored);
  const interventionTriggered = shouldTriggerIntervention(signals, engineConfig);
  const next = interventionTriggered
    ? await buildIntervention(signals, pickInterventionTask(tasks, events), promptGenerator)
    : buildNextResponse(topScored?.task ?? null);

  const debug = {
    signals,
    scoring: scored.map((entry) => ({
      taskId: entry.task.id,
      score: entry.score,
    })),
    selectedReason: interventionTriggered ? 'intervention_triggered' : 'highest_score',
    interventionTriggered,
  };

  return {
    statusCode: 200,
    body: {
      ok: true,
      data: next,
      ...(debugRequested ? { debug } : {}),
      requestId: context.requestId,
    },
  };
}
