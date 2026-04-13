const outputEl = document.querySelector('#output');

const cardsEl = document.querySelector('#cards');
const deckListEl = document.querySelector('#deck-list');
const leaderboardEl = document.querySelector('#leaderboard');
const eventsListEl = document.querySelector('#events-list');
const selectedHandEl = document.querySelector('#selected-hand');
const selectedEventEl = document.querySelector('#selected-event');
const lastResultEl = document.querySelector('#last-result');
const recentResultsEl = document.querySelector('#recent-results');

const statusDayEl = document.querySelector('#status-day');
const statusEnrolledEl = document.querySelector('#status-enrolled');
const statusEventEl = document.querySelector('#status-event');
const statusPlayEl = document.querySelector('#status-play');
const statusRankEl = document.querySelector('#status-rank');
const statusScoreEl = document.querySelector('#status-score');
const headerLoginLinkEl = document.querySelector('#header-login-link');
const headerLogoutBtnEl = document.querySelector('#header-logout-btn');

const enrollBtn = document.querySelector('#enroll-btn');
const meBtn = document.querySelector('#me-btn');
const playBtn = document.querySelector('#play-btn');
const clearHandBtn = document.querySelector('#clear-hand-btn');
const suggestHandBtn = document.querySelector('#suggest-hand-btn');

const navButtons = [...document.querySelectorAll('[data-target-screen]')];
const screens = [...document.querySelectorAll('[data-screen]')];

const state = {
  activeScreen: 'home',
  me: null,
  deck: [],
  availableEvents: [],
  selectedCards: new Set(),
  selectedEventId: null,
  accessToken: null,
};

function getIdentityBaseUrl() {
  return `${window.location.origin}/identity`;
}

function redirectToLogin() {
  const redirect = encodeURIComponent('/cranked/');
  window.location.assign(`/login/?redirect=${redirect}`);
}

function updateHeaderAuthActions(isLoggedIn) {
  headerLoginLinkEl.classList.toggle('hidden', isLoggedIn);
  headerLogoutBtnEl.classList.toggle('hidden', !isLoggedIn);
}

function setAccessToken(token) {
  state.accessToken = token;
  if (token) {
    localStorage.setItem('cranked.accessToken', token);
  } else {
    localStorage.removeItem('cranked.accessToken');
  }
}

function getAccessToken() {
  return state.accessToken ?? localStorage.getItem('cranked.accessToken');
}

function consumeRedirectToken() {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : '';

  if (!hash) return;

  const fragment = new URLSearchParams(hash);
  const accessToken = fragment.get('accessToken');

  if (accessToken) {
    setAccessToken(accessToken);
  }

  window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
}

function restoreSavedToken() {
  const saved = localStorage.getItem('cranked.accessToken');
  if (saved && !state.accessToken) setAccessToken(saved);
}

function show(payload) {
  outputEl.textContent = JSON.stringify(payload, null, 2);
}

function authHeaders() {
  const token = getAccessToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function verifyAccessToken() {
  const token = getAccessToken();
  if (!token) {
    updateHeaderAuthActions(false);
    return false;
  }

  const response = await fetch(`${getIdentityBaseUrl()}/auth/verify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json().catch(() => ({ ok: false }));

  if (!response.ok || !payload.ok) {
    setAccessToken(null);
    updateHeaderAuthActions(false);
    return false;
  }

  updateHeaderAuthActions(true);
  return true;
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

function setActiveScreen(screenName) {
  state.activeScreen = screenName;

  screens.forEach((screen) => {
    screen.classList.toggle('active', screen.dataset.screen === screenName);
  });

  navButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.targetScreen === screenName);
  });
}

function syncCardsInputFromSelection() {
  cardsEl.value = [...state.selectedCards].join(',');
}

function parseCardsInput() {
  return cardsEl.value
    .split(',')
    .map((cardId) => cardId.trim())
    .filter(Boolean);
}

function getSelectedEvent() {
  return state.availableEvents.find((event) => event.id === state.selectedEventId) ?? null;
}

function renderStatus() {
  const meData = state.me;
  const selectedEvent = getSelectedEvent() ?? meData?.home?.selectedEvent ?? null;

  statusDayEl.textContent = meData?.dayKey ?? '-';
  statusEnrolledEl.textContent = meData?.player ? 'Enrolled' : 'Not enrolled';
  statusEventEl.textContent = selectedEvent ? selectedEvent.name : 'None';
  statusPlayEl.textContent = meData?.todayPlay ? 'Submitted' : 'Not submitted';
  statusRankEl.textContent = meData?.todayOutcome?.rank ? String(meData.todayOutcome.rank) : '-';
  statusScoreEl.textContent = meData?.todayOutcome?.score ? String(meData.todayOutcome.score) : '-';
}

function renderSelectedHand() {
  if (!state.deck.length || state.selectedCards.size === 0) {
    selectedHandEl.innerHTML = '<p class="empty-state">No cards selected yet.</p>';
    syncCardsInputFromSelection();
    return;
  }

  const cards = state.deck.filter((card) => state.selectedCards.has(card.id));
  selectedHandEl.innerHTML = `
    <div class="chip-row">
      ${cards.map((card) => `<span class="chip">${card.name} · ${card.power}</span>`).join('')}
    </div>
  `;
  syncCardsInputFromSelection();
}

function toggleCard(cardId) {
  if (state.selectedCards.has(cardId)) {
    state.selectedCards.delete(cardId);
  } else {
    if (state.selectedCards.size >= 5) return;
    state.selectedCards.add(cardId);
  }

  renderDeck();
  renderSelectedHand();
}

function suggestBestHand() {
  const bestCards = [...state.deck]
    .sort((a, b) => b.power - a.power || a.name.localeCompare(b.name))
    .slice(0, 5);

  state.selectedCards = new Set(bestCards.map((card) => card.id));
  renderDeck();
  renderSelectedHand();
}

function renderDeck() {
  if (!state.deck.length) {
    deckListEl.innerHTML = '<p class="empty-state">Enroll and refresh to see your deck.</p>';
    return;
  }

  deckListEl.innerHTML = `
    <div class="deck-grid">
      ${state.deck
        .map((card) => {
          const selected = state.selectedCards.has(card.id);
          return `
            <button class="deck-card ${selected ? 'selected' : ''}" data-card-id="${card.id}" type="button">
              <span class="card-type">Power ${card.power}</span>
              <strong>${card.name}</strong>
              <small>${card.id}</small>
            </button>
          `;
        })
        .join('')}
    </div>
  `;

  deckListEl.querySelectorAll('[data-card-id]').forEach((button) => {
    button.addEventListener('click', () => toggleCard(button.dataset.cardId));
  });
}

function renderSelectedEvent() {
  const event = getSelectedEvent();
  if (!event) {
    selectedEventEl.innerHTML = '<p class="empty-state">No event selected yet.</p>';
    return;
  }

  selectedEventEl.innerHTML = `
    <div class="event-summary">
      <p class="eyebrow">${event.type}</p>
      <h3>${event.name}</h3>
      <p>${event.description}</p>
      <p class="muted">${event.scoreRule}</p>
    </div>
  `;
}

function selectEvent(eventId) {
  state.selectedEventId = eventId;
  renderEvents();
  renderSelectedEvent();
  renderStatus();
}

function renderEvents() {
  if (!state.availableEvents.length) {
    eventsListEl.innerHTML = '<p class="empty-state">Refresh your state to load today\'s events.</p>';
    return;
  }

  eventsListEl.innerHTML = state.availableEvents
    .map((event) => {
      const selected = state.selectedEventId === event.id;
      return `
        <button class="event-card ${selected ? 'selected' : ''}" data-event-id="${event.id}" type="button">
          <span class="event-type">${event.type}</span>
          <strong>${event.name}</strong>
          <p>${event.description}</p>
          <small>${event.scoreRule}</small>
        </button>
      `;
    })
    .join('');

  eventsListEl.querySelectorAll('[data-event-id]').forEach((button) => {
    button.addEventListener('click', () => selectEvent(button.dataset.eventId));
  });
}

function renderLastResult() {
  const lastResult = state.me?.home?.lastResult ?? null;

  if (!lastResult) {
    lastResultEl.innerHTML = '<p class="empty-state">No processed result yet.</p>';
    return;
  }

  lastResultEl.innerHTML = `
    <div class="result-card">
      <p class="eyebrow">${lastResult.dayKey}</p>
      <h3>Rank ${lastResult.rank}</h3>
      <p>Score ${lastResult.score}</p>
      <p class="muted">${lastResult.event?.name ?? 'No event recorded'}</p>
    </div>
  `;
}

function renderRecentResults() {
  const recentResults = state.me?.recentResults ?? [];

  if (!recentResults.length) {
    recentResultsEl.innerHTML = '<p class="empty-state">No previous results.</p>';
    return;
  }

  recentResultsEl.innerHTML = `
    <div class="result-list">
      ${recentResults
        .map(
          (result) => `
            <article class="result-row">
              <div>
                <strong>${result.dayKey}</strong>
                <p class="muted">${result.event?.name ?? 'No event recorded'}</p>
              </div>
              <div class="result-stats">
                <span>#${result.rank}</span>
                <span>${result.score} pts</span>
              </div>
            </article>
          `
        )
        .join('')}
    </div>
  `;
}

function renderLeaderboard() {
  const todayRun = state.me?.todayRun;
  const todayOutcome = state.me?.todayOutcome ?? null;

  if (!todayRun || !Array.isArray(todayRun.leaderboard) || todayRun.leaderboard.length === 0) {
    leaderboardEl.innerHTML = '<p class="empty-state">No run processed yet for today.</p>';
    return;
  }

  leaderboardEl.innerHTML = `
    <table class="leaderboard-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Team</th>
          <th>Event</th>
          <th>Score</th>
        </tr>
      </thead>
      <tbody>
        ${todayRun.leaderboard
          .map((entry) => {
            const isMe = todayOutcome && entry.userId === todayOutcome.userId;
            return `
              <tr class="${isMe ? 'me' : ''}">
                <td>${entry.rank}</td>
                <td>${entry.teamName}</td>
                <td>${entry.event?.name ?? '-'}</td>
                <td>${entry.score}</td>
              </tr>
            `;
          })
          .join('')}
      </tbody>
    </table>
  `;
}

function renderAll() {
  renderStatus();
  renderDeck();
  renderSelectedHand();
  renderEvents();
  renderSelectedEvent();
  renderLastResult();
  renderRecentResults();
  renderLeaderboard();
}

function resetForNotEnrolled() {
  state.me = null;
  state.deck = [];
  state.availableEvents = [];
  state.selectedCards = new Set();
  state.selectedEventId = null;
  renderAll();
}

function applyMeData(meData) {
  state.me = meData;
  state.deck = meData?.player?.deck ?? [];
  state.availableEvents = meData?.availableEvents ?? [];
  state.selectedCards = new Set(meData?.todayPlay?.cards ?? []);
  state.selectedEventId = meData?.todayPlay?.eventId ?? meData?.home?.selectedEvent?.id ?? null;
  renderAll();
}

async function refreshMe() {
  const verified = await verifyAccessToken();
  if (!verified) {
    redirectToLogin();
    return;
  }

  const result = await callApi('/cranked/me', 'GET');

  if (result.status === 200 && result.data?.ok) {
    applyMeData(result.data.data);
    return;
  }

  if (result.status === 404 && result.data?.error?.code === 'CRANKED_NOT_ENROLLED') {
    resetForNotEnrolled();
  }
}

async function enroll() {
  const verified = await verifyAccessToken();
  if (!verified) {
    redirectToLogin();
    return;
  }

  const result = await callApi('/cranked/enroll', 'POST');
  if (result.status === 200 || result.status === 201) {
    await refreshMe();
  }
}

async function submitPlay() {
  const verified = await verifyAccessToken();
  if (!verified) {
    redirectToLogin();
    return;
  }

  const cards = state.selectedCards.size ? [...state.selectedCards] : parseCardsInput();
  const eventId = state.selectedEventId;
  const result = await callApi('/cranked/play', 'POST', { eventId, cards });
  if (result.status === 200) {
    await refreshMe();
    setActiveScreen('home');
  }
}

cardsEl.addEventListener('input', () => {
  state.selectedCards = new Set(parseCardsInput());
  renderDeck();
  renderSelectedHand();
});

enrollBtn.addEventListener('click', enroll);
meBtn.addEventListener('click', refreshMe);
playBtn.addEventListener('click', submitPlay);
headerLogoutBtnEl.addEventListener('click', () => {
  setAccessToken(null);
  updateHeaderAuthActions(false);
  redirectToLogin();
});
clearHandBtn.addEventListener('click', () => {
  state.selectedCards = new Set();
  renderDeck();
  renderSelectedHand();
});
suggestHandBtn.addEventListener('click', suggestBestHand);

navButtons.forEach((button) => {
  button.addEventListener('click', () => setActiveScreen(button.dataset.targetScreen));
});

consumeRedirectToken();
restoreSavedToken();
updateHeaderAuthActions(Boolean(getAccessToken()));
renderAll();
setActiveScreen('home');

(async () => {
  const verified = await verifyAccessToken();
  if (!verified) {
    redirectToLogin();
    return;
  }
  refreshMe();
})();
