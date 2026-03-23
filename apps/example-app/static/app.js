const outputEl = document.querySelector('#output');
const button = document.querySelector('#call-api');

button.addEventListener('click', async () => {
  outputEl.textContent = 'Loading...';

  try {
    const res = await fetch('/hello');
    const data = await res.json();

    outputEl.textContent = JSON.stringify(
      {
        status: res.status,
        body: data,
      },
      null,
      2
    );
  } catch (err) {
    outputEl.textContent = `Request failed: ${err.message}`;
  }
});
