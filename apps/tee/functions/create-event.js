export function createEvent(taskId, action, nowFn) {
  return {
    taskId,
    type: action,
    timestamp: nowFn(),
  };
}
