import { getDayKey } from './game-state.js';

/**
 * cranked-me.js — return player state for the authenticated user.
 *
 * Route: GET /cranked/me (auth: true)
 */
export async function handler(_event, context) {
  const userId = context.user.id;
  const dayKey = getDayKey();

  const player = context.db.get('cranked_players', userId);

  if (!player) {
    return {
      statusCode: 404,
      body: {
        ok: false,
        error: {
          code: 'CRANKED_NOT_ENROLLED',
          message: 'Player is not enrolled. Call POST /cranked/enroll first.',
        },
        requestId: context.requestId,
      },
    };
  }

  const todayPlay = context.db.get('cranked_plays', `${dayKey}:${userId}`);

  return {
    statusCode: 200,
    body: {
      ok: true,
      data: {
        dayKey,
        player,
        todayPlay,
      },
      requestId: context.requestId,
    },
  };
}
