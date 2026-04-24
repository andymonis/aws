export function applyActionToTask(task, action, nowFn) {
  const updated = { ...task };

  if (action === 'complete') {
    updated.completionCount += 1;
  }

  if (action === 'skip') {
    updated.skipCount += 1;
  }

  updated.lastTouched = nowFn();

  return updated;
}
