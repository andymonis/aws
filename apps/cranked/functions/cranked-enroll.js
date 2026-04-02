import { STARTER_DECK } from './game-state.js';

/**
 * cranked-enroll.js — create a player profile with default starter deck.
 *
 * Route: POST /cranked/enroll (auth: true)
 */
export async function handler(_event, context) {
  const userId = context.user.id;
  const existing = context.db.get('cranked_players', userId);

  if (existing) {
    return {
      statusCode: 200,
      body: {
        ok: true,
        data: {
          player: existing,
          alreadyEnrolled: true,
        },
        requestId: context.requestId,
      },
    };
  }

  const player = context.db.put('cranked_players', {
    id: userId,
    userId,
    teamName: 'Starter Team',
    deck: STARTER_DECK,
    enrolledAt: new Date().toISOString(),
    lastPlayDay: null,
    lastRunDay: null,
  });

  return {
    statusCode: 201,
    body: {
      ok: true,
      data: {
        player,
        alreadyEnrolled: false,
      },
      requestId: context.requestId,
    },
  };
}
