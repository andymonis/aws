import {
  STARTER_DECK,
  applySeasonToPlayer,
  getCurrentSeason,
  isPlayerEnrolledForSeason,
  migrateDeckToGuidIds,
} from './game-state.js';

/**
 * cranked-enroll.js — join the current season with a player profile and starter deck.
 *
 * Route: POST /cranked/enroll (auth: true)
 */
export async function handler(_event, context) {
  const userId = context.user.id;
  const season = getCurrentSeason();
  const existing = context.db.get('cranked_players', userId);

  if (existing) {
    const migratedDeck = migrateDeckToGuidIds(existing.deck ?? []);
    const seasonReadyPlayer = applySeasonToPlayer(existing, season);
    const alreadyEnrolled = isPlayerEnrolledForSeason(seasonReadyPlayer, season);
    const seasonNeedsRefresh = !alreadyEnrolled;
    const hasDeckChanges = JSON.stringify(migratedDeck) !== JSON.stringify(existing.deck ?? []);
    const needsUpdate = hasDeckChanges || seasonNeedsRefresh || seasonReadyPlayer !== existing;

    const player = needsUpdate
      ? context.db.put('cranked_players', {
          ...seasonReadyPlayer,
          id: userId,
          userId,
          deck: migratedDeck,
          enrolledAt: seasonNeedsRefresh ? new Date().toISOString() : existing.enrolledAt,
        })
      : seasonReadyPlayer;

    return {
      statusCode: 200,
      body: {
        ok: true,
        data: {
          player,
          season,
          alreadyEnrolled,
          migratedDeckIds: hasDeckChanges,
          seasonRenewed: seasonNeedsRefresh,
        },
        requestId: context.requestId,
      },
    };
  }

  const player = context.db.put('cranked_players', {
    id: userId,
    userId,
    teamName: 'Starter Team',
    deck: STARTER_DECK.map((card) => ({ ...card })),
    enrolledAt: new Date().toISOString(),
    seasonId: season.id,
    seasonName: season.name,
    seasonStartsAt: season.startsAt,
    seasonEndsAt: season.endsAt,
    seasonStatus: 'active',
    lastPlayDay: null,
    lastRunDay: null,
  });

  return {
    statusCode: 201,
    body: {
      ok: true,
      data: {
        player,
        season,
        alreadyEnrolled: false,
        migratedDeckIds: false,
        seasonRenewed: false,
      },
      requestId: context.requestId,
    },
  };
}
