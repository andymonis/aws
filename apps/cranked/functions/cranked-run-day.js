import { getDayKey } from './game-state.js';

function computeTieBreakerSeed(dayKey, userId) {
  const source = `${dayKey}:${userId}`;
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) % 100000;
  }
  return hash;
}

function buildDeckIndex(deck) {
  const index = new Map();
  for (const card of deck ?? []) {
    index.set(card.id, card);
  }
  return index;
}

function computeOutcome(play, player, dayKey) {
  const deckIndex = buildDeckIndex(player?.deck ?? []);
  const cards = Array.isArray(play.cards) ? play.cards : [];
  const cardBreakdown = cards.map((cardId) => {
    const card = deckIndex.get(cardId);
    return {
      id: cardId,
      name: card?.name ?? 'Unknown card',
      power: card?.power ?? 0,
    };
  });

  const basePower = cardBreakdown.reduce((sum, card) => sum + card.power, 0);
  const fullHandBonus = cards.length === 5 ? 2 : 0;
  const varietyBonus = new Set(cards).size >= 4 ? 1 : 0;
  const score = basePower + fullHandBonus + varietyBonus;

  return {
    userId: play.userId,
    teamName: player?.teamName ?? 'Unknown Team',
    cards,
    cardBreakdown,
    basePower,
    bonuses: {
      fullHandBonus,
      varietyBonus,
    },
    score,
    tieBreakerSeed: computeTieBreakerSeed(dayKey, play.userId),
  };
}

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
  const players = context.db.list('cranked_players', { limit: 200 });
  const playersById = new Map(players.map((player) => [player.userId, player]));

  const rankedOutcomes = dayPlays
    .map((play) => computeOutcome(play, playersById.get(play.userId), dayKey))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.tieBreakerSeed !== b.tieBreakerSeed) return a.tieBreakerSeed - b.tieBreakerSeed;
      return a.userId.localeCompare(b.userId);
    })
    .map((outcome, index) => ({
      ...outcome,
      rank: index + 1,
    }));

  for (const outcome of rankedOutcomes) {
    const player = playersById.get(outcome.userId);
    if (!player) continue;

    context.db.put('cranked_players', {
      ...player,
      id: player.userId,
      lastRunDay: dayKey,
    });
  }

  const run = context.db.put('cranked_runs', {
    id: dayKey,
    dayKey,
    processedAt: new Date().toISOString(),
    totalPlays: dayPlays.length,
    scoringVersion: 'phase3-skeleton-v1',
    leaderboard: rankedOutcomes.slice(0, 10).map(({ userId, teamName, rank, score }) => ({
      userId,
      teamName,
      rank,
      score,
    })),
    outcomes: rankedOutcomes,
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
