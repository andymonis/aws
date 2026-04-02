/**
 * list-notes.js — list notes for the authenticated account.
 *
 * Route: GET /notes (auth: true)
 */
export async function handler(event, context) {
  const limit = event.query?.limit ? parseInt(event.query.limit, 10) : 50;
  const notes = context.db.list('notes', { limit });

  return {
    statusCode: 200,
    body: {
      items: notes,
      count: notes.length,
      requestId: context.requestId,
    },
  };
}
