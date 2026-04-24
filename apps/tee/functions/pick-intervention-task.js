export function pickInterventionTask(tasks, events) {
  const activeTasks = tasks.filter((task) => task.status === 'active');

  if (activeTasks.length === 0) {
    return null;
  }

  const activeById = new Map(activeTasks.map((task) => [task.id, task]));

  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i];
    if (event.type !== 'skip') continue;

    const skippedTask = activeById.get(event.taskId);
    if (skippedTask) {
      return skippedTask;
    }
  }

  return activeTasks
    .slice()
    .sort((a, b) => {
      if ((b.skipCount ?? 0) !== (a.skipCount ?? 0)) {
        return (b.skipCount ?? 0) - (a.skipCount ?? 0);
      }

      return new Date(a.createdAt) - new Date(b.createdAt);
    })[0];
}
