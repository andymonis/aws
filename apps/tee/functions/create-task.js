export function createTask(input, idGenerator, nowFn) {
  const title = input?.title?.trim();

  if (!title) {
    throw new Error('Invalid title');
  }

  return {
    id: idGenerator(),
    title,
    status: 'active',
    createdAt: nowFn(),
    skipCount: 0,
    completionCount: 0,
    lastTouched: null,
  };
}
