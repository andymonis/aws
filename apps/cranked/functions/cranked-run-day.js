import { getDayKey } from './game-state.js';

/**
 * cranked-run-day.js — skeleton daily processing run.
 *
 * Route: POST /cranked/run-day (auth: true, roles: [admin])
 */
export async function handler(event, context) {
  const dayKey = event.body?.dayKey ?? getDayKey();

  const existingRun = context.db.get('cranked_runs', dayKey);
  if (existingRun) {
    return {
      statusCode: 200,
      body: {
        ok: true,
        data: {
          run: existingRun,
          reused: true,
        },
        requestId: context.requestId,
      },
    };
  }

  const allPlays = context.db.list('cranked_plays', { limit: 200 });
  const dayPlays = allPlays.filter((p) => p.dayKey === dayKey);

  const outcomes = dayPlays.map((play) => ({
    userId: play.userId,
    cards: play.cards,
    score: play.cards.length,
  }));

  const run = context.db.put('cranked_runs', {
    id: dayKey,
    dayKey,
    processedAt: new Date().toISOString(),
    totalPlays: dayPlays.length,
    outcomes,
  });

  return {
    statusCode: 200,
    body: {
      ok: true,
      data: {
        run,
        reused: false,
      },
      requestId: context.requestId,
    },
  };
}
