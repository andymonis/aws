import { scoreTask } from './scoring.js';

export function scoreActiveTasks(tasks, now, context, config) {
  const active = tasks.filter((task) => task.status === 'active');

  return active.map((task) => ({
    task,
    score: scoreTask(task, now, context, config),
  }));
}

export function pickTopScored(scored) {
  if (scored.length === 0) {
    return null;
  }

  return scored
    .slice()
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return new Date(a.task.createdAt) - new Date(b.task.createdAt);
    })[0];
}

export function selectNextTask(tasks, now, context, config) {
  const scored = scoreActiveTasks(tasks, now, context, config);
  const top = pickTopScored(scored);

  return top?.task ?? null;
}
