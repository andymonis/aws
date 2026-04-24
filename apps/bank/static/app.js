const tokenEl = document.querySelector('#token');
const saveTokenBtn = document.querySelector('#save-token');
const openBtn = document.querySelector('#open-account');
const outputEl = document.querySelector('#output');

const TOKEN_KEY = 'bank.accessToken';

function getToken() {
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function renderOutput(status, body) {
  outputEl.textContent = JSON.stringify({ status, body }, null, 2);
}

tokenEl.value = getToken();

saveTokenBtn.addEventListener('click', () => {
  setToken(tokenEl.value.trim());
  renderOutput(0, { ok: true, message: 'Token saved' });
});

openBtn.addEventListener('click', async () => {
  const token = getToken();
  if (!token) {
    renderOutput(0, { ok: false, message: 'Save an access token first.' });
    return;
  }

  outputEl.textContent = 'Loading...';

  try {
    const res = await fetch('/bank/open', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const body = await res.json();
    renderOutput(res.status, body);
  } catch (err) {
    renderOutput(0, { ok: false, message: err.message });
  }
});
