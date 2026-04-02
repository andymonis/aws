/**
 * put-note.js — create/update a note for the authenticated account.
 *
 * Route: POST /notes (auth: true)
 */
export async function handler(event, context) {
  const { id, title, content } = event.body ?? {};

  if (!title) {
    return {
      statusCode: 400,
      body: {
        ok: false,
        error: {
          code: 'NOTE_VALIDATION',
          message: 'title is required',
        },
      },
    };
  }

  const saved = context.db.put('notes', {
    id,
    title,
    content: content ?? '',
  });

  return {
    statusCode: 200,
    body: {
      ok: true,
      data: saved,
      requestId: context.requestId,
    },
  };
}
