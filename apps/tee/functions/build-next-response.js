export function buildNextResponse(task) {
  if (!task) {
    return {
      type: 'task',
      content: 'No tasks available',
      reason: 'empty_state',
    };
  }

  return {
    type: 'task',
    id: task.id,
    content: task.title,
    reason: 'basic_scoring_v1',
  };
}
