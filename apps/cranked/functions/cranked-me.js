import { getAvailableEvents, getDayKey } from './game-state.js';

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
  const todayRun = context.db.get('cranked_runs', dayKey);
  const todayOutcome = todayRun?.outcomes?.find((outcome) => outcome.userId === userId) ?? null;
  const availableEvents = getAvailableEvents(dayKey);

  const allRuns = context.db.list('cranked_runs', { limit: 50 });
  const recentResults = allRuns
    .filter((run) => Array.isArray(run.outcomes))
    .map((run) => {
      const outcome = run.outcomes.find((entry) => entry.userId === userId);
      if (!outcome) return null;

      return {
        dayKey: run.dayKey,
        processedAt: run.processedAt,
        rank: outcome.rank,
        score: outcome.score,
        event: outcome.event ?? null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.dayKey.localeCompare(a.dayKey))
    .slice(0, 5);

  const home = {
    canSubmitPlay: !todayPlay,
    selectedEvent: todayPlay?.event ?? null,
    lastResult: recentResults[0] ?? null,
  };

  return {
    statusCode: 200,
    body: {
      ok: true,
      data: {
        dayKey,
        player,
        home,
        availableEvents,
        todayPlay,
        todayRun,
        todayOutcome,
        recentResults,
      },
      requestId: context.requestId,
    },
  };
}
