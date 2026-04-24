import { listTasks } from './list-tasks.js';

/**
 * list-tasks-handler.js — list tasks for the authenticated user.
 *
 * Route: GET /tasks (auth: true)
 */
export async function handler(_event, context) {
  const tasks = context.db.list('tee_tasks');

  const activeTasks = listTasks(tasks).map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    createdAt: task.createdAt,
    skipCount: task.skipCount,
    completionCount: task.completionCount,
    lastTouched: task.lastTouched ?? null,
  }));

  return {
    statusCode: 200,
    body: {
      ok: true,
      data: activeTasks,
      requestId: context.requestId,
    },
  };
}
