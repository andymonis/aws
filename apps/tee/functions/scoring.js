import { contextBoost } from './context-scoring.js';
import { resolveEngineConfig } from './engine-config.js';

export function scoreTask(task, now, context, config) {
  const effectiveConfig = resolveEngineConfig(config);
  let score = 0;

  score -= (task.skipCount ?? 0) * effectiveConfig.scoring.skipPenalty;

  if (!task.lastTouched) {
    score += effectiveConfig.scoring.untouchedBoost;
  } else {
    const hours = (new Date(now) - new Date(task.lastTouched)) / (1000 * 60 * 60);

    if (hours > 24) {
      score += effectiveConfig.scoring.staleBoost;
    }
  }

  score += contextBoost(task, context);

  return score;
}
