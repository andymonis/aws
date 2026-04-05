const outputEl = document.querySelector('#output');

const tokenEl = document.querySelector('#token');
const cardsEl = document.querySelector('#cards');
const runDayKeyEl = document.querySelector('#run-day-key');
const deckListEl = document.querySelector('#deck-list');
const leaderboardEl = document.querySelector('#leaderboard');

const statusDayEl = document.querySelector('#status-day');
const statusEnrolledEl = document.querySelector('#status-enrolled');
const statusPlayEl = document.querySelector('#status-play');
const statusRankEl = document.querySelector('#status-rank');

const enrollBtn = document.querySelector('#enroll-btn');
const meBtn = document.querySelector('#me-btn');
const playBtn = document.querySelector('#play-btn');
const runDayBtn = document.querySelector('#run-day-btn');

const state = {
  dayKey: null,
  deck: [],
  selectedCards: new Set(),
};

function consumeRedirectToken() {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : '';

  if (!hash) return;

  const fragment = new URLSearchParams(hash);
  const accessToken = fragment.get('accessToken');

  if (accessToken) {
    tokenEl.value = accessToken;
    localStorage.setItem('cranked.accessToken', accessToken);
  }

  window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
}

function restoreSavedToken() {
  const saved = localStorage.getItem('cranked.accessToken');
  if (saved && !tokenEl.value.trim()) {
    tokenEl.value = saved;
  }
}

function show(payload) {
  outputEl.textContent = JSON.stringify(payload, null, 2);
}

function syncCardsInputFromSelection() {
  cardsEl.value = [...state.selectedCards].join(',');
}

function parseCardsInput() {
  return cardsEl.value
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
}

function renderStatus({ dayKey = '-', enrolled = false, hasPlay = false, rank = null } = {}) {
  statusDayEl.textContent = dayKey;
  statusEnrolledEl.textContent = enrolled ? 'Enrolled' : 'Not enrolled';
  statusPlayEl.textContent = hasPlay ? 'Submitted' : 'Not submitted';
  statusRankEl.textContent = rank ? String(rank) : '-';
}

function toggleCard(cardId) {
  if (state.selectedCards.has(cardId)) {
    state.selectedCards.delete(cardId);
  } else {
    if (state.selectedCards.size >= 5) return;
    state.selectedCards.add(cardId);
  }

  renderDeck(state.deck);
  syncCardsInputFromSelection();
}

function renderDeck(deck = []) {
  state.deck = deck;

  if (!deck.length) {
    deckListEl.innerHTML = '<p>Enroll and refresh to see your starter deck.</p>';
    return;
  }

  const cardsHtml = deck
    .map((card) => {
      const selected = state.selectedCards.has(card.id);
      return `
        <button class="deck-card ${selected ? 'selected' : ''}" data-card-id="${card.id}" type="button">
          <strong>${card.name}</strong>
          <span>Power ${card.power}</span>
          <small>${card.id}</small>
        </button>
      `;
    })
    .join('');

  deckListEl.innerHTML = `<div class="deck-grid">${cardsHtml}</div>`;

  deckListEl.querySelectorAll('[data-card-id]').forEach((el) => {
    el.addEventListener('click', () => toggleCard(el.getAttribute('data-card-id')));
  });
}

function renderLeaderboard(todayRun, todayOutcome) {
  if (!todayRun || !Array.isArray(todayRun.leaderboard) || todayRun.leaderboard.length === 0) {
    leaderboardEl.innerHTML = '<p>No run processed yet for today.</p>';
    return;
  }

  const rows = todayRun.leaderboard
    .map((entry) => {
      const isMe = todayOutcome && entry.userId === todayOutcome.userId;
      return `
        <tr class="${isMe ? 'me' : ''}">
          <td>${entry.rank}</td>
          <td>${entry.teamName}</td>
          <td>${entry.score}</td>
        </tr>
      `;
    })
    .join('');

  leaderboardEl.innerHTML = `
    <table class="leaderboard-table">
      <thead>
        <tr><th>Rank</th><th>Team</th><th>Score</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function applyMeData(meData) {
  const deck = meData?.player?.deck ?? [];
  const playedCards = meData?.todayPlay?.cards ?? [];

  state.dayKey = meData?.dayKey ?? null;
  state.selectedCards = new Set(playedCards.length ? playedCards : [...state.selectedCards]);

  renderStatus({
    dayKey: meData?.dayKey ?? '-',
    enrolled: true,
    hasPlay: Boolean(meData?.todayPlay),
    rank: meData?.todayOutcome?.rank ?? null,
  });

  renderDeck(deck);
  syncCardsInputFromSelection();
  renderLeaderboard(meData?.todayRun, meData?.todayOutcome);
}

function authHeaders() {
  const token = tokenEl.value.trim();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function callApi(path, method, body) {
  const headers = authHeaders();
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({
    ok: false,
    error: { code: 'CRANKED_PARSE_ERROR', message: 'Failed to parse response JSON' },
  }));

  show({ status: response.status, data });
  return { status: response.status, data };
}

async function refreshMe() {
  const result = await callApi('/cranked/me', 'GET');

  if (result.status === 200 && result.data?.ok) {
    applyMeData(result.data.data);
    return;
  }

  if (result.status === 404 && result.data?.error?.code === 'CRANKED_NOT_ENROLLED') {
    renderStatus({ dayKey: '-', enrolled: false, hasPlay: false, rank: null });
    renderDeck([]);
    renderLeaderboard(null, null);
  }
}

async function enroll() {
  const result = await callApi('/cranked/enroll', 'POST');
  if (result.status === 200 || result.status === 201) {
    await refreshMe();
  }
}

async function submitPlay() {
  const cards = state.selectedCards.size ? [...state.selectedCards] : parseCardsInput();
  const result = await callApi('/cranked/play', 'POST', { cards });
  if (result.status === 200) {
    await refreshMe();
  }
}

enrollBtn.addEventListener('click', enroll);
meBtn.addEventListener('click', refreshMe);
playBtn.addEventListener('click', submitPlay);
runDayBtn.addEventListener('click', () => {
  const dayKey = runDayKeyEl.value.trim();
  if (dayKey) {
    callApi('/cranked/run-day', 'POST', { dayKey }).then(() => refreshMe());
    return;
  }

  callApi('/cranked/run-day', 'POST').then(() => refreshMe());
});

tokenEl.addEventListener('input', () => {
  const token = tokenEl.value.trim();
  if (token) {
    localStorage.setItem('cranked.accessToken', token);
  } else {
    localStorage.removeItem('cranked.accessToken');
  }
});

consumeRedirectToken();
restoreSavedToken();
renderStatus();
if (tokenEl.value.trim()) {
  refreshMe();
}
