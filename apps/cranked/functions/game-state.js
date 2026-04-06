export const STARTER_DECK = [
  { id: '8cb6d931-0c4d-4144-8104-2f36fc8ad39f', name: 'Sprinter', power: 2 },
  { id: '0c4eecf1-ecf5-4e3d-9f54-a94643f16b96', name: 'Climber', power: 2 },
  { id: '1dd2ef9b-34e7-4510-943d-fde15f575d11', name: 'Domestique', power: 1 },
  { id: 'fa92dd7d-9d07-4683-a5e1-5a6a8d8ecfcb', name: 'Rouleur', power: 2 },
  { id: 'd53e1dd3-ee3a-4f95-8c89-c55789acdc71', name: 'Puncheur', power: 3 },
  { id: '4659fca5-8bca-4f8f-bd8d-8a5f227f60c0', name: 'Breakaway', power: 1 },
  { id: '5af1113a-8057-4a8d-98b9-2dc8e9b6bf32', name: 'All-rounder', power: 2 },
  { id: '8dc88307-f44f-454b-b8f0-6d44a68f5bbf', name: 'Captain', power: 3 },
];

const EVENT_TEMPLATES = {
  training: [
    {
      slug: 'hill-repeats',
      name: 'Hill Repeats',
      description: 'A focused climbing block that rewards committed effort.',
      scoreRule: 'Gain +2 if your hand has total base power of 9 or more.',
    },
    {
      slug: 'team-drills',
      name: 'Team Drills',
      description: 'Structured training that rewards balanced squads.',
      scoreRule: 'Gain +1 if you play at least 4 different cards.',
    },
  ],
  race: [
    {
      slug: 'circuit-race',
      name: 'Circuit Race',
      description: 'Fast repeated laps with lots of drafting pressure.',
      scoreRule: 'Gain +2 if you submit a full 5-card hand.',
    },
    {
      slug: 'summit-finish',
      name: 'Summit Finish',
      description: 'A shorter stage that rewards punchy leaders.',
      scoreRule: 'Gain +2 if your hand includes a card with power 3.',
    },
  ],
  rest: [
    {
      slug: 'recovery-day',
      name: 'Recovery Day',
      description: 'Dial it back and keep the squad fresh.',
      scoreRule: 'Gain +1 if you play 3 or fewer cards.',
    },
    {
      slug: 'camp-reset',
      name: 'Camp Reset',
      description: 'An easier day that still rewards steady work.',
      scoreRule: 'Gain +1 if your hand has total base power of 6 or more.',
    },
  ],
};

const LEGACY_CARD_ID_ALIASES = {
  sprinter: '8cb6d931-0c4d-4144-8104-2f36fc8ad39f',
  climber: '0c4eecf1-ecf5-4e3d-9f54-a94643f16b96',
  domestique: '1dd2ef9b-34e7-4510-943d-fde15f575d11',
  rouleur: 'fa92dd7d-9d07-4683-a5e1-5a6a8d8ecfcb',
  puncheur: 'd53e1dd3-ee3a-4f95-8c89-c55789acdc71',
  breakaway: '4659fca5-8bca-4f8f-bd8d-8a5f227f60c0',
  allrounder: '5af1113a-8057-4a8d-98b9-2dc8e9b6bf32',
  captain: '8dc88307-f44f-454b-b8f0-6d44a68f5bbf',
};

function normalizeCardId(cardId) {
  return LEGACY_CARD_ID_ALIASES[cardId] ?? cardId;
}

function computeStableIndex(seed, length) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 33 + seed.charCodeAt(i)) % 2147483647;
  }
  return hash % length;
}

function createEvent(dayKey, eventType, template) {
  return {
    id: `${dayKey}:${eventType}:${template.slug}`,
    dayKey,
    type: eventType,
    name: template.name,
    description: template.description,
    scoreRule: template.scoreRule,
  };
}

export function migrateDeckToGuidIds(deck) {
  if (!Array.isArray(deck)) return [];

  return deck.map((card) => ({
    ...card,
    id: normalizeCardId(card.id),
  }));
}

export function getDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function getAvailableEvents(dayKey = getDayKey()) {
  return Object.entries(EVENT_TEMPLATES).map(([eventType, templates]) => {
    const template = templates[computeStableIndex(`${dayKey}:${eventType}`, templates.length)];
    return createEvent(dayKey, eventType, template);
  });
}

export function getEventById(dayKey, eventId) {
  return getAvailableEvents(dayKey).find((event) => event.id === eventId) ?? null;
}

export function isValidEventSelection(dayKey, eventId) {
  if (!eventId) {
    return { ok: false, message: 'eventId is required' };
  }

  const event = getEventById(dayKey, eventId);
  if (!event) {
    return { ok: false, message: `event '${eventId}' is not available for ${dayKey}` };
  }

  return { ok: true, event };
}

export function isValidPlay(deck, cards) {
  if (!Array.isArray(cards)) return { ok: false, message: 'cards must be an array' };
  if (cards.length === 0) return { ok: false, message: 'cards must include at least one card id' };
  if (cards.length > 5) return { ok: false, message: 'cards can include at most 5 card ids' };

  const allowed = new Set(migrateDeckToGuidIds(deck).map((c) => c.id));
  const normalizedCards = cards.map((cardId) => normalizeCardId(cardId));

  const seen = new Set();
  for (const cardId of normalizedCards) {
    if (seen.has(cardId)) {
      return { ok: false, message: `card '${cardId}' is duplicated in this play` };
    }
    seen.add(cardId);

    if (!allowed.has(cardId)) {
      return { ok: false, message: `card '${cardId}' is not in your deck` };
    }
  }

  return {
    ok: true,
    cards: normalizedCards,
  };
}
