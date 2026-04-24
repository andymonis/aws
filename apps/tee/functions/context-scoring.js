export function contextBoost(task, context) {
  if (!context || !context.timeOfDay) return 0;

  const { timeOfDay } = context;

  if (timeOfDay === 'morning') {
    if ((task.skipCount ?? 0) === 0) return 1;
  }

  if (timeOfDay === 'evening') {
    let boost = 0;

    if ((task.completionCount ?? 0) > 0) boost += 1;
    if (task.lastTouched) boost += 1;

    return boost;
  }

  return 0;
}
