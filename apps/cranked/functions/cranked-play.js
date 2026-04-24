import {
  applySeasonToPlayer,
  getCurrentSeason,
  getDayKey,
  isPlayerEnrolledForSeason,
  isValidEventSelection,
  isValidPlay,
} from './game-state.js';

/**
 * cranked-play.js — submit daily play (up to 5 cards).
 *
 * Route: POST /cranked/play (auth: true)
 */
export async function handler(event, context) {
  const userId = context.user.id;
  const dayKey = getDayKey();
  const season = getCurrentSeason();

  const storedPlayer = context.db.get('cranked_players', userId);
  if (!storedPlayer) {
    return {
      statusCode: 404,
      body: {
        ok: false,
        error: {
          code: 'CRANKED_NOT_ENROLLED',
          message: 'Player is not enrolled for the current season. Call POST /cranked/enroll first.',
        },
        requestId: context.requestId,
      },
    };
  }

  const player = applySeasonToPlayer(storedPlayer, season);
  if (!isPlayerEnrolledForSeason(player, season)) {
    return {
      statusCode: 404,
      body: {
        ok: false,
        error: {
          code: 'CRANKED_NOT_ENROLLED',
          message: 'Player is not enrolled for the current season. Call POST /cranked/enroll first.',
        },
        requestId: context.requestId,
      },
    };
  }

  const eventId = event.body?.eventId ?? null;
  const eventValidation = isValidEventSelection(dayKey, eventId);
  if (!eventValidation.ok) {
    return {
      statusCode: 400,
      body: {
        ok: false,
        error: {
          code: 'CRANKED_INVALID_EVENT',
          message: eventValidation.message,
        },
        requestId: context.requestId,
      },
    };
  }

  const cards = event.body?.cards ?? [];
  const validation = isValidPlay(player.deck ?? [], cards);
  if (!validation.ok) {
    return {
      statusCode: 400,
      body: {
        ok: false,
        error: {
          code: 'CRANKED_INVALID_PLAY',
          message: validation.message,
        },
        requestId: context.requestId,
      },
    };
  }

  const playId = `${dayKey}:${userId}`;
  const existingPlay = context.db.get('cranked_plays', playId);
  if (existingPlay) {
    return {
      statusCode: 409,
      body: {
        ok: false,
        error: {
          code: 'CRANKED_ALREADY_PLAYED',
          message: `Play for day '${dayKey}' already submitted.`,
        },
        requestId: context.requestId,
      },
    };
  }

  const play = context.db.put('cranked_plays', {
    id: playId,
    dayKey,
    seasonId: season.id,
    userId,
    eventId,
    event: eventValidation.event,
    cards: validation.cards,
    submittedAt: new Date().toISOString(),
  });

  const updatedPlayer = context.db.put('cranked_players', {
    ...player,
    id: userId,
    lastPlayDay: dayKey,
  });

  return {
    statusCode: 200,
    body: {
      ok: true,
      data: {
        play,
        player: updatedPlayer,
      },
      requestId: context.requestId,
    },
  };
}
