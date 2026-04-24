import { simplifyTask } from './simplify-task.js';

export async function buildIntervention(signals, task, promptGenerator) {
  const promptType = signals.skipStreak >= 2 ? 'skip' : 'fatigue';
  const reason = promptType === 'skip' ? 'skip_streak_detected' : 'fatigue_detected';

  let content;

  try {
    content = await promptGenerator.generate({
      type: promptType,
      taskTitle: task?.title,
      signals,
    });
  } catch {
    content = 'Try a smaller step';
  }

  return {
    type: 'intervention',
    ...(task ? { id: task.id } : {}),
    content,
    ...(task ? { followUp: simplifyTask(task.title) } : {}),
    reason,
  };
}
