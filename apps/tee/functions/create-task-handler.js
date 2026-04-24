import { v4 as uuidv4 } from 'uuid';
import { createTask } from './create-task.js';

/**
 * create-task-handler.js — create a new task for the authenticated user.
 *
 * Route: POST /tasks (auth: true)
 */
export async function handler(event, context) {
  try {
    const task = createTask(
      event.body ?? {},
      () => `task_${uuidv4()}`,
      () => new Date().toISOString()
    );

    const savedTask = context.db.put('tee_tasks', task);

    return {
      statusCode: 201,
      body: {
        ok: true,
        data: savedTask,
        requestId: context.requestId,
      },
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: {
        ok: false,
        error: {
          code: 'TEE_INVALID_TASK',
          message: error.message,
        },
        requestId: context.requestId,
      },
    };
  }
}
