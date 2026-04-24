import { createEvent } from './create-event.js';
import { applyActionToTask } from './apply-action-to-task.js';

const VALID_ACTIONS = new Set(['complete', 'skip', 'snooze']);

/**
 * action-handler.js — record a user action and update task state.
 *
 * Route: POST /action (auth: true)
 */
export async function handler(event, context) {
  const taskId = event.body?.taskId;
  const action = event.body?.action;

  if (!taskId || !VALID_ACTIONS.has(action)) {
    return {
      statusCode: 400,
      body: {
        ok: false,
        error: {
          code: 'TEE_INVALID_ACTION',
          message: 'taskId and valid action (complete, skip, snooze) are required.',
        },
        requestId: context.requestId,
      },
    };
  }

  const task = context.db.get('tee_tasks', taskId);
  if (!task) {
    return {
      statusCode: 404,
      body: {
        ok: false,
        error: {
          code: 'TEE_TASK_NOT_FOUND',
          message: 'Task not found.',
        },
        requestId: context.requestId,
      },
    };
  }

  const now = new Date().toISOString();
  const nowFn = () => now;

  const actionEvent = createEvent(taskId, action, nowFn);
  context.db.put('tee_events', actionEvent);

  const updatedTask = applyActionToTask(task, action, nowFn);
  context.db.put('tee_tasks', {
    ...updatedTask,
    id: task.id,
  });

  return {
    statusCode: 200,
    body: {
      ok: true,
      data: {
        success: true,
      },
      requestId: context.requestId,
    },
  };
}
