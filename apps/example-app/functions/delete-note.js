/**
 * delete-note.js — delete a note for the authenticated account.
 *
 * Route: DELETE /notes/:id (auth: true)
 */
export async function handler(event, context) {
  const id = event.params?.id;
  const result = context.db.delete('notes', id);

  return {
    statusCode: result.deleted ? 200 : 404,
    body: {
      ok: result.deleted,
      data: result,
      requestId: context.requestId,
    },
  };
}
