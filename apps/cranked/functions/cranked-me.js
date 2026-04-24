import {
  applySeasonToPlayer,
  getAvailableEvents,
  getCurrentSeason,
  getDayKey,
  getSeasonForDayKey,
  isPlayerEnrolledForSeason,
} from './game-state.js';

/**
 * cranked-me.js — return player state for the authenticated user.
 *
 * Route: GET /cranked/me (auth: true)
 */
export async function handler(_event, context) {
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

  const normalizedPlayer = applySeasonToPlayer(storedPlayer, season);
  const player = JSON.stringify(normalizedPlayer) !== JSON.stringify(storedPlayer)
    ? context.db.put('cranked_players', {
        ...normalizedPlayer,
        id: userId,
        userId,
      })
    : normalizedPlayer;

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

  const rawTodayPlay = context.db.get('cranked_plays', `${dayKey}:${userId}`);
  const todayPlay = rawTodayPlay && (rawTodayPlay.seasonId == null || rawTodayPlay.seasonId === season.id)
    ? rawTodayPlay
    : null;

  const rawTodayRun = context.db.get('cranked_runs', dayKey);
  const todayRun = rawTodayRun && (rawTodayRun.seasonId == null || rawTodayRun.seasonId === season.id)
    ? rawTodayRun
    : null;
  const todayOutcome = todayRun?.outcomes?.find((outcome) => outcome.userId === userId) ?? null;
  const availableEvents = getAvailableEvents(dayKey);

  const allRuns = context.db.list('cranked_runs', { limit: 50 });
  const recentResults = allRuns
    .filter((run) => {
      const runSeasonId = run.seasonId ?? getSeasonForDayKey(run.dayKey).id;
      return runSeasonId === season.id;
    })
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
    season,
    seasonEnrolled: true,
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
        season,
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
