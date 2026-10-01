import * as D from './db.js';
import { loadPrefs, lockIfNeeded, render } from './app.js';

async function boot() {
  await D.open();
  loadPrefs();
  lockIfNeeded();
  render(false);
  // the offline cache would hide edits while developing on localhost
  if ('serviceWorker' in navigator && location.hostname !== 'localhost') navigator.serviceWorker.register('sw.js').catch(() => {});
}

boot().catch((e) => {
  console.error(e);
  document.getElementById('app').innerHTML = `<div class="hint" style="padding:40px 20px">${String(e && e.message || e)}</div>`;
});
