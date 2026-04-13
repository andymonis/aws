const outputEl = document.querySelector('#output');
const identityBaseInput = document.querySelector('#identity-base');
const redirectUrlInput = document.querySelector('#redirect-url');

const loginBtn = document.querySelector('#login-btn');
const loginAccountIdInput = document.querySelector('#login-account-id');
const loginEmailInput = document.querySelector('#login-email');
const loginPasswordInput = document.querySelector('#login-password');

function toPretty(value) {
  return JSON.stringify(value, null, 2);
}

function showResponse(label, status, body) {
  outputEl.textContent = toPretty({ label, status, body });
}

function getIdentityBaseUrl() {
  return identityBaseInput.value.trim().replace(/\/$/, '');
}

function getRedirectUrl() {
  const value = redirectUrlInput.value.trim();
  return value || '/';
}

function buildRedirectUrl(accessToken, accountId, email) {
  const base = getRedirectUrl();
  const fragment = new URLSearchParams({
    accessToken,
    accountId,
    email,
  }).toString();

  if (base.includes('#')) {
    return `${base}&${fragment}`;
  }

  return `${base}#${fragment}`;
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${getIdentityBaseUrl()}${path}`, options);
  const body = await response.json().catch(() => ({
    ok: false,
    error: { code: 'LOGIN_PARSE_ERROR', message: 'Failed to parse JSON response' },
  }));
  return { response, body };
}

async function login() {
  const accountId = loginAccountIdInput.value.trim();
  const email = loginEmailInput.value.trim();
  const payload = { password: loginPasswordInput.value };

  if (email) payload.email = email;
  if (accountId) payload.accountId = accountId;

  const { response, body } = await requestJson('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  showResponse('login', response.status, body);

  if (response.ok && body.ok) {
    const redirectTo = buildRedirectUrl(
      body.data.accessToken,
      body.data.user.accountId,
      body.data.user.email
    );
    window.location.assign(redirectTo);
  }
}

const params = new URLSearchParams(window.location.search);
const redirectParam = params.get('redirect');

identityBaseInput.value = `${window.location.origin}/identity`;
redirectUrlInput.value = redirectParam || '/';

loginBtn.addEventListener('click', () => login().catch((err) => showResponse('login', 0, { error: err.message })));
