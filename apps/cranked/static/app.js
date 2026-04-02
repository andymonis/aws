const outputEl = document.querySelector('#output');

const tokenEl = document.querySelector('#token');
const cardsEl = document.querySelector('#cards');

const enrollBtn = document.querySelector('#enroll-btn');
const meBtn = document.querySelector('#me-btn');
const playBtn = document.querySelector('#play-btn');
const runDayBtn = document.querySelector('#run-day-btn');

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
}

enrollBtn.addEventListener('click', () => callApi('/cranked/enroll', 'POST'));
meBtn.addEventListener('click', () => callApi('/cranked/me', 'GET'));
playBtn.addEventListener('click', () => {
  const cards = cardsEl.value
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);

  callApi('/cranked/play', 'POST', { cards });
});
runDayBtn.addEventListener('click', () => callApi('/cranked/run-day', 'POST'));

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
