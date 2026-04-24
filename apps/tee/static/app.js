const tokenEl = document.querySelector('#token');
const titleEl = document.querySelector('#title');
const actionTaskIdEl = document.querySelector('#action-task-id');
const actionTypeEl = document.querySelector('#action-type');
const saveTokenBtn = document.querySelector('#save-token');
const createTaskBtn = document.querySelector('#create-task');
const recordActionBtn = document.querySelector('#record-action');
const listTasksBtn = document.querySelector('#list-tasks');
const nextTaskBtn = document.querySelector('#next-task');
const outputEl = document.querySelector('#output');

const TOKEN_KEY = 'tee.accessToken';

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

createTaskBtn.addEventListener('click', async () => {
  const token = getToken();
  if (!token) {
    renderOutput(0, { ok: false, message: 'Save an access token first.' });
    return;
  }

  outputEl.textContent = 'Loading...';

  try {
    const res = await fetch('/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: titleEl.value }),
    });

    const body = await res.json();
    renderOutput(res.status, body);
  } catch (err) {
    renderOutput(0, { ok: false, message: err.message });
  }
});

recordActionBtn.addEventListener('click', async () => {
  const token = getToken();
  if (!token) {
    renderOutput(0, { ok: false, message: 'Save an access token first.' });
    return;
  }

  outputEl.textContent = 'Loading...';

  try {
    const res = await fetch('/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        taskId: actionTaskIdEl.value,
        action: actionTypeEl.value,
      }),
    });

    const body = await res.json();
    renderOutput(res.status, body);
  } catch (err) {
    renderOutput(0, { ok: false, message: err.message });
  }
});

listTasksBtn.addEventListener('click', async () => {
  const token = getToken();
  if (!token) {
    renderOutput(0, { ok: false, message: 'Save an access token first.' });
    return;
  }

  outputEl.textContent = 'Loading...';

  try {
    const res = await fetch('/tasks', {
      method: 'GET',
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

nextTaskBtn.addEventListener('click', async () => {
  const token = getToken();
  if (!token) {
    renderOutput(0, { ok: false, message: 'Save an access token first.' });
    return;
  }

  outputEl.textContent = 'Loading...';

  try {
    const res = await fetch('/next', {
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
