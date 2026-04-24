import { resolveEngineConfig } from './engine-config.js';

export function shouldTriggerIntervention(signals, config) {
  const effectiveConfig = resolveEngineConfig(config);

  return (
    signals.skipStreak >= effectiveConfig.intervention.skipThreshold
    || signals.fatigueScore >= effectiveConfig.intervention.fatigueThreshold
  );
}
