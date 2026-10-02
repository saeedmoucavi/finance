// App shell: preferences and theme, rendering the current screen, bottom navigation, toasts.
import * as D from '../db.js';
import { amount, isFa, prefs, tr } from '../core.js';
import { ic } from '../icons.js';
import { renderLock } from '../features/lock.js';
import { startAutoRefresh, stopAutoRefresh } from '../market.js';
import { SCREENS } from '../screens/index.js';
import { layers, pop } from './layers.js';
import { $app, S, TABS } from './state.js';

export function loadPrefs() {
  const s = D.settings();
  prefs.lang = s.lang || 'fa';
  prefs.unit = s.unit || 'toman';
  prefs.faDigits = (s.fa_digits ?? '1') === '1';
  prefs.reminderDays = Number(s.reminder_days) || 3;
  prefs.theme = localStorage.getItem('theme') || 'auto';
  document.documentElement.lang = prefs.lang;
  document.documentElement.dir = isFa() ? 'rtl' : 'ltr';
  applyTheme();
}

export function applyTheme() {
  const sys = window.matchMedia('(prefers-color-scheme: dark)').matches;
  S.dark = prefs.theme === 'dark' || (prefs.theme === 'auto' && sys);
  document.documentElement.dataset.theme = S.dark ? 'dark' : 'light';
  document.querySelector('meta[name=theme-color]').content = S.dark ? '#121419' : '#ECEDEF';
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { applyTheme(); render(); });

// ================================================================== render

export function render(keepScroll = true) {
  if (S.locked) return renderLock();
  const cur = S.stack[S.stack.length - 1];
  const y = keepScroll && S.last === cur ? window.scrollY : 0;
  $app.innerHTML = '<div class="statusbar"></div>' + SCREENS[cur]() + (TABS.includes(cur) ? navHtml(cur) : '');
  window.scrollTo(0, y);
  S.last = cur;
  runCounters();
  // live prices while the assets screen is open
  if (cur === 'assets') startAutoRefresh(() => S.stack[S.stack.length - 1] === 'assets' && !document.hidden && !S.locked, (ok) => { S.assets.offline = !ok; render(); });
  else stopAutoRefresh();
}

export function navHtml(cur) {
  const it = (id, icon, label) => `<button class="it ${cur === id ? 'on' : ''}" data-a="go" data-s="${id}">${ic(icon, 23, cur === id ? 2 : 1.8)}<span>${tr(label)}</span><span class="ln"></span></button>`;
  return `<nav class="nav"><button class="fab" data-a="add" aria-label="+">${ic('plus', 24, 2.2)}</button><div class="in">
    ${it('home', 'home', 'nav_home')}${it('tx', 'receipt', 'nav_tx')}<span style="width:56px"></span>${it('assets', 'safe', 'nav_assets')}${it('more', 'more', 'nav_more')}</div></nav>`;
}

/** Amounts with data-count roll up from their previous value. */
export function runCounters() {
  $app.querySelectorAll('[data-count]').forEach((el) => {
    const key = el.dataset.key;
    const to = Number(el.dataset.count);
    const from = S.counts[key] ?? 0;
    S.counts[key] = to;
    if (from === to) return;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 900);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = amount(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

export function go(s) {
  S.stack = s === 'home' ? ['home'] : TABS.includes(s) ? ['home', s] : [...S.stack, s];
  render(false);
}
export function back() {
  if (layers.length) return pop();
  if (S.stack.length > 1) { S.stack.pop(); render(false); }
}

export function toast(text) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}
