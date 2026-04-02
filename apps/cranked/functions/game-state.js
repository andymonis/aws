export const STARTER_DECK = [
  { id: 'sprinter', name: 'Sprinter', power: 2 },
  { id: 'climber', name: 'Climber', power: 2 },
  { id: 'domestique', name: 'Domestique', power: 1 },
  { id: 'rouleur', name: 'Rouleur', power: 2 },
  { id: 'puncheur', name: 'Puncheur', power: 3 },
  { id: 'breakaway', name: 'Breakaway', power: 1 },
  { id: 'allrounder', name: 'All-rounder', power: 2 },
  { id: 'captain', name: 'Captain', power: 3 },
];

export function getDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function isValidPlay(deck, cards) {
  if (!Array.isArray(cards)) return { ok: false, message: 'cards must be an array' };
  if (cards.length === 0) return { ok: false, message: 'cards must include at least one card id' };
  if (cards.length > 5) return { ok: false, message: 'cards can include at most 5 card ids' };

  const allowed = new Set(deck.map((c) => c.id));
  for (const cardId of cards) {
    if (!allowed.has(cardId)) {
      return { ok: false, message: `card '${cardId}' is not in your deck` };
    }
  }

  return { ok: true };
}
