const outputEl = document.querySelector('#output');
const sessionEl = document.querySelector('#session');

const identityBaseInput = document.querySelector('#identity-base');

const registerBtn = document.querySelector('#register-btn');
const registerAccountInput = document.querySelector('#register-account');
const registerEmailInput = document.querySelector('#register-email');
const registerPasswordInput = document.querySelector('#register-password');

const loginBtn = document.querySelector('#login-btn');
const loginAccountIdInput = document.querySelector('#login-account-id');
const loginEmailInput = document.querySelector('#login-email');
const loginPasswordInput = document.querySelector('#login-password');

const refreshBtn = document.querySelector('#refresh-btn');
const meBtn = document.querySelector('#me-btn');

const state = {
  accountId: '',
  accessToken: '',
  refreshToken: '',
  user: null,
};

function toPretty(value) {
  return JSON.stringify(value, null, 2);
}

function showSession() {
  sessionEl.textContent = toPretty(state);
}

function showResponse(label, status, body) {
  outputEl.textContent = toPretty({ label, status, body });
}

function getIdentityBaseUrl() {
  const raw = identityBaseInput.value.trim();
  return raw.replace(/\/$/, '');
}

async function requestJson(path, options = {}) {
  const url = `${getIdentityBaseUrl()}${path}`;
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({
    ok: false,
    error: { code: 'CLIENT_PARSE_ERROR', message: 'Failed to parse JSON response' },
  }));
  return { response, body };
}

async function register() {
  const payload = {
    accountName: registerAccountInput.value.trim(),
    email: registerEmailInput.value.trim(),
    password: registerPasswordInput.value,
  };

  const { response, body } = await requestJson('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (response.ok && body.ok) {
    state.accountId = body.data.user.accountId;
    state.accessToken = body.data.accessToken;
    state.refreshToken = body.data.refreshToken;
    state.user = body.data.user;
    loginAccountIdInput.value = state.accountId;
  }

  showSession();
  showResponse('register', response.status, body);
}

async function login() {
  const accountId = loginAccountIdInput.value.trim();
  const email = loginEmailInput.value.trim();
  const payload = {
    password: loginPasswordInput.value,
  };

  if (email) payload.email = email;
  if (accountId) payload.accountId = accountId;

  const { response, body } = await requestJson('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (response.ok && body.ok) {
    state.accountId = body.data.user.accountId;
    state.accessToken = body.data.accessToken;
    state.refreshToken = body.data.refreshToken;
    state.user = body.data.user;
    loginAccountIdInput.value = state.accountId;
    loginEmailInput.value = state.user.email;
  }

  showSession();
  showResponse('login', response.status, body);
}

async function refreshToken() {
  const payload = { refreshToken: state.refreshToken };

  const { response, body } = await requestJson('/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (response.ok && body.ok) {
    state.accessToken = body.data.accessToken;
    state.refreshToken = body.data.refreshToken;
  }

  showSession();
  showResponse('refresh', response.status, body);
}

async function getMe() {
  const { response, body } = await requestJson('/users/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${state.accessToken}`,
    },
  });

  if (response.ok && body.ok) {
    state.user = body.data;
  }

  showSession();
  showResponse('users/me', response.status, body);
}

registerBtn.addEventListener('click', () => register().catch((err) => showResponse('register', 0, { error: err.message })));
loginBtn.addEventListener('click', () => login().catch((err) => showResponse('login', 0, { error: err.message })));
refreshBtn.addEventListener('click', () => refreshToken().catch((err) => showResponse('refresh', 0, { error: err.message })));
meBtn.addEventListener('click', () => getMe().catch((err) => showResponse('users/me', 0, { error: err.message })));

identityBaseInput.value = `${window.location.protocol}//${window.location.hostname}:3001`;
showSession();
