export const defaultConfig = {
  scoring: {
    skipPenalty: 5,
    untouchedBoost: 2,
    staleBoost: 1,
  },
  intervention: {
    skipThreshold: 2,
    fatigueThreshold: 4,
  },
};

export function resolveEngineConfig(override = {}) {
  return {
    scoring: {
      ...defaultConfig.scoring,
      ...(override.scoring ?? {}),
    },
    intervention: {
      ...defaultConfig.intervention,
      ...(override.intervention ?? {}),
    },
  };
}
