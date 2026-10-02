// Entry point: open the database, apply preferences, draw the first screen.
import * as D from './db.js';
import { loadPrefs, render } from './ui/shell.js';
import { lockIfNeeded } from './features/lock.js';
import './actions.js'; // registers the tap / input / swipe handlers

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
  document.getElementById('app').innerHTML = `<div class="hint" style="padding:40px 20px">${String((e && e.message) || e)}</div>`;
});
