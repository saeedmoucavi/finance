// Screens, sheets and dialogs. Each screen is a function returning HTML; clicks
// are routed through data-a attributes ('.name' calls a method on the top layer).
import * as D from './db.js';
import * as J from './jalali.js';
import * as X from './export.js';
import {
  prefs, isFa, tr, t, num, toLatin, group, toDisplay, fromDisplay, unitLabel,
  amount, compact, percent, date, dayMonth, month, weekday, esc,
} from './core.js';
import { ic, forCategory, forAsset, FLOW, BAR_COLORS, loanColor, shade, alpha } from './icons.js';

const $app = document.getElementById('app');
const $layers = document.getElementById('layers');
const $report = document.getElementById('report');
const TABS = ['home', 'tx', 'loans', 'more'];
const ASSET_KINDS = ['savings', 'bank', 'cash', 'gold', 'currency', 'property', 'investment', 'other'];

const S = {
  stack: ['home'], last: null, counts: {},
  tx: { filter: 0, ym: null, q: '', searching: false, cat: null },
  loans: { archived: false, open: undefined, all: {} },
  rep: { yearly: 0, ym: null },
  debts: { tab: 0 }, lists: { tab: 0 },
  locked: false, hiddenAt: 0,
};
let layers = [];
let dark = false;
let swiped = false;

// ================================================================== prefs & theme
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

function applyTheme() {
  const sys = window.matchMedia('(prefers-color-scheme: dark)').matches;
  dark = prefs.theme === 'dark' || (prefs.theme === 'auto' && sys);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name=theme-color]').content = dark ? '#121419' : '#ECEDEF';
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { applyTheme(); render(); });

const rtl = () => isFa();

// ================================================================== small builders
const ring = (icon, a, attrs = '', cls = '') => `<button class="ring ${cls}" data-a="${a}" ${attrs}>${ic(icon, 16, 1.9)}</button>`;
const backBtn = () => ring(rtl() ? 'chev_right' : 'chev_left', 'back');
const topbar = (title, back, actions = '') => `<div class="topbar">${back ? backBtn() : ''}<h1>${title}</h1>${actions}</div>`;
const chip = (icon, bg, ink, size = 34, isz = 16) =>
  `<span class="chip" style="width:${size}px;height:${size}px;background:${bg};color:${ink}">${ic(icon, isz, 1.9)}</span>`;
const pill = (frac, onDark) => {
  const fr = Math.max(0, Math.min(1, frac || 0));
  return `<div class="pill ${onDark ? 'on-dark' : ''}"><div class="tr"><div class="fl" style="width:${fr * 100}%"></div></div><span class="pc">${percent(Math.floor(fr * 100))}</span></div>`;
};
const seg = (opts, sel, a) => `<div class="seg">${opts.map((o, i) => `<button class="${i === sel ? 'on' : ''}" data-a="${a}" data-i="${i}">${o}</button>`).join('')}</div>`;
const pick = (label, on, a, attrs = '', icon = '') =>
  `<button class="pick ${on ? 'on' : ''}" data-a="${a}" ${attrs}>${icon ? ic(icon, 14) : ''}${esc(label)}</button>`;
const toggle = (on, a) => `<button class="toggle ${on ? 'on' : ''}" data-a="${a}" aria-pressed="${on}"></button>`;
const hint = (text) => `<div class="hint">${text}</div>`;
const catName = (c) => (isFa() || !c.name_en ? c.name_fa : c.name_en) || tr('uncategorized');
const txCat = (x) => (isFa() || !x.cen ? x.cfa : x.cen) || '';
const txAcc = (x) => (isFa() || !x.aen ? x.afa : x.aen) || '';
const accName = (a) => (isFa() || !a.name_en ? a.name_fa : a.name_en);
const kindColors = (k) => (k === 'income' ? ['var(--pos-bg)', 'var(--pos)'] : k === 'installment' ? ['var(--gold-bg)', 'var(--gold)'] : ['var(--neg-bg)', 'var(--neg)']);

function miniRing(frac, size = 44, label = '') {
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, frac));
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="flex-shrink:0">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--track)" stroke-width="4"/>
    ${f > 0 ? `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"
      stroke-dasharray="${c * f} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/>` : ''}
    ${label ? `<text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="10" font-weight="700" fill="var(--text)" font-family="Vazir">${label}</text>` : ''}</svg>`;
}

/** Segmented donut with rounded, separated ends (income / expenses / installments). */
function donut(values, colors, size, stroke, track, center = '') {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const total = values.reduce((a, b) => a + b, 0);
  const live = values.filter((v) => v > 0).length;
  const capDeg = (stroke / 2 / r) * (180 / Math.PI);
  let arcs = '';
  if (total > 0) {
    let start = 0;
    values.forEach((v, i) => {
      if (v <= 0) return;
      const sweep = (v / total) * 360;
      const gap = live > 1 ? capDeg * 2 + 4 : 0;
      const draw = Math.max(0.1, sweep - gap);
      arcs += `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${colors[i]}" stroke-width="${stroke}" stroke-linecap="round"
        pathLength="360" stroke-dasharray="${draw} 360" stroke-dashoffset="${-(start + gap / 2)}" transform="rotate(-90 ${cx} ${cx})"/>`;
      start += sweep;
    });
  }
  return `<div style="position:relative;width:${size}px;height:${size}px;flex-shrink:0" class="rise">
    <svg width="${size}" height="${size}"><circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/>${arcs}</svg>
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">${center}</div></div>`;
}

const legend = (color, label, value) =>
  `<div class="legend"><span class="dot" style="background:${color}"></span><span style="color:var(--hero-muted)">${label}</span><span class="v">${value}</span></div>`;

function field(label, key, value, { placeholder = '', type = 'text', amountField = false } = {}) {
  const v = amountField ? (value ? group(Number(value)) : '') : value ?? '';
  const mode = amountField || type === 'number' ? 'inputmode="numeric"' : '';
  return `<div class="field"><label>${label}</label><input type="text" ${mode} data-bind="${key}" ${amountField ? 'data-amount="1"' : ''}
    ${type === 'number' ? 'data-int="1"' : ''} value="${esc(v)}" placeholder="${esc(placeholder)}" autocomplete="off"></div>`;
}

function dateField(label, key, iso, optional = false) {
  const text = !iso ? tr('none') : iso === J.todayIso() ? `${date(iso)} · ${tr('today')}` : date(iso);
  return `<div class="field tap" data-a="pickDate" data-k="${key}" data-opt="${optional ? 1 : ''}"><label>${label}</label>
    <span class="val ell">${text}</span>${ic('calendar', 16, 1.8, 'muted')}</div>`;
}

// ================================================================== render
const SCREENS = {};

export function render(keepScroll = true) {
  if (S.locked) return renderLock();
  const cur = S.stack[S.stack.length - 1];
  const y = keepScroll && S.last === cur ? window.scrollY : 0;
  $app.innerHTML = '<div class="statusbar"></div>' + SCREENS[cur]() + (TABS.includes(cur) ? navHtml(cur) : '');
  window.scrollTo(0, y);
  S.last = cur;
  runCounters();
}

function navHtml(cur) {
  const it = (id, icon, label) => `<button class="it ${cur === id ? 'on' : ''}" data-a="go" data-s="${id}">${ic(icon, 23, cur === id ? 2 : 1.8)}<span>${tr(label)}</span><span class="ln"></span></button>`;
  return `<nav class="nav"><button class="fab" data-a="add" aria-label="+">${ic('plus', 24, 2.2)}</button><div class="in">
    ${it('home', 'home', 'nav_home')}${it('tx', 'receipt', 'nav_tx')}<span style="width:56px"></span>${it('loans', 'bank', 'nav_loans')}${it('more', 'more', 'nav_more')}</div></nav>`;
}

/** Amounts with data-count roll up from their previous value. */
function runCounters() {
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

function go(s) {
  S.stack = s === 'home' ? ['home'] : TABS.includes(s) ? ['home', s] : [...S.stack, s];
  render(false);
}
function back() {
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

// ================================================================== layers (sheets, dialogs)
const top = () => layers[layers.length - 1];
function push(L) { layers.push(L); renderLayers(); }
function pop() { layers.pop(); renderLayers(); }
function closeAll() { layers = []; renderLayers(); }

function renderLayers() {
  const scrolls = [...$layers.children].map((c) => c.firstElementChild?.scrollTop || 0);
  $layers.innerHTML = layers.map((L, i) => {
    const inner = L.render(L);
    const box = L.dialog ? `<div class="dialog">${inner}</div>` : `<div class="sheet"><div class="handle"></div>${inner}</div>`;
    return `<div class="layer ${L.dialog ? 'dlg' : ''} ${L.shown ? '' : 'enter'}" data-layer="${i}">${box}</div>`;
  }).join('');
  [...$layers.children].forEach((c, i) => { if (scrolls[i]) c.firstElementChild.scrollTop = scrolls[i]; });
  layers.forEach((L) => { L.shown = true; });
  document.body.style.overflow = layers.length ? 'hidden' : '';
}

const sheetHead = (title) => `<div class="row"><h2>${title}</h2>${ring('close', 'close', '', 'sm')}</div>`;
function dialogBox(title, body, acts) {
  return `<h2>${title}</h2>${body}<div class="acts">${acts.map((a) => `<button class="${a.cls || ''}" data-a="${a.a}">${a.label}</button>`).join('')}</div>`;
}

function confirmDialog(title, body, okLabel, onOk, danger = true) {
  push({
    dialog: true,
    render: () => dialogBox(title, body ? `<div class="t2" style="font-size:13px">${body}</div>` : '', [
      { label: tr('cancel'), a: 'close' }, { label: okLabel, a: '.ok', cls: danger ? 'danger ok' : 'ok' }]),
    ok() { pop(); onOk(); },
  });
}

function datePicker(initial, onPick) {
  const [y, m] = J.fromIso(initial || J.todayIso());
  push({
    dialog: true, y, m, sel: initial || J.todayIso(),
    render(L) {
      const names = isFa() ? J.WEEK_SHORT_FA : J.WEEK_SHORT_EN;
      const off = J.weekdayIndex(J.toIso(L.y, L.m, 1));
      const len = J.monthLength(L.y, L.m);
      const today = J.todayIso();
      let cells = names.map((n) => `<div class="wd">${n}</div>`).join('') + '<span></span>'.repeat(off);
      for (let d = 1; d <= len; d++) {
        const iso = J.toIso(L.y, L.m, d);
        cells += `<button class="${iso === L.sel ? 'sel' : ''} ${iso === today ? 'today' : ''}" data-a=".day" data-iso="${iso}">${num(d)}</button>`;
      }
      return `<h2>${tr('pick_date')}</h2>
        <div class="cal-head">${ring(rtl() ? 'chev_right' : 'chev_left', '.shift', 'data-n="-1"', 'sm')}
          <div class="grow center b">${month(L.y, L.m)}</div>${ring(rtl() ? 'chev_left' : 'chev_right', '.shift', 'data-n="1"', 'sm')}</div>
        <div class="cal-grid">${cells}</div>
        <div class="acts"><button data-a=".today" style="margin-inline-end:auto">${tr('today')}</button>
          <button data-a="close">${tr('cancel')}</button><button class="ok" data-a=".ok">${tr('ok')}</button></div>`;
    },
    shift(ds) { [this.y, this.m] = J.addMonths(this.y, this.m, Number(ds.n)); renderLayers(); },
    day(ds) { this.sel = ds.iso; renderLayers(); },
    today() { this.sel = J.todayIso(); [this.y, this.m] = J.today(); renderLayers(); },
    ok() { pop(); onPick(this.sel); },
  });
}

// ================================================================== home
SCREENS.home = () => {
  const [ty, tm] = J.today();
  const [ms, me] = J.monthRange(ty, tm);
  const [py, pm] = J.addMonths(ty, tm, -1);
  const [ps, pe] = J.monthRange(py, pm);
  const tot = D.totals(ms, me);
  const prev = D.totals(ps, pe).expense;
  const lt = D.loanTotals(ms, me);
  const up = D.upcoming(30).slice(0, 4);
  const slices = topSlices(D.breakdown(ms, me));

  let cmp = '';
  if (prev > 0 && tot.expense > 0) {
    const diff = Math.round(((tot.expense - prev) * 100) / prev);
    const mname = J.monthName(pm, isFa());
    cmp = `<div style="font-size:10.5px" class="${diff <= 0 ? 'pos' : 'neg'}">${diff <= 0 ? t('less_than', percent(-diff), mname) : t('more_than', percent(diff), mname)}</div>`;
  }
  const lastBackup = Number(localStorage.getItem('last_backup') || 0);
  const needBackup = (D.transactions('0000-01-01', '9999-12-31').length > 0) && Date.now() - lastBackup > 14 * 86400000;

  return `<div class="page">
  <div class="row home-head rise" style="align-items:flex-end">
    <div class="grow"><div class="top">${tr('home_top')}</div><div class="main">${tr('home_main')}</div></div>
    <span class="month-chip">${month(ty, tm)}</span>${ring('bell', 'go', 'data-s="loans"')}
  </div>
  ${needBackup ? `<div class="card click row rise" data-a="backup" style="padding:12px 14px">${chip('upload', 'var(--gold-bg)', 'var(--gold)', 32, 15)}
     <div class="grow" style="font-size:12.5px">${tr('backup_remind')}</div><span class="mini">${tr('backup_send')}</span></div>` : ''}
  <div class="hero rise" style="animation-delay:.05s">
    <div class="row" style="gap:8px"><span class="dot" style="width:6px;height:6px;background:#C7CED6"></span>
      <span class="lbl grow">${tr('month_balance')}</span>${ring('arrow_out', 'go', 'data-s="reports"', 'dark')}</div>
    <div class="row" style="gap:12px;margin-top:6px">
      <div class="grow col">
        <div class="big num" data-count="${tot.net}" data-key="net">${amount(S.counts.net ?? 0)}</div>
        <div class="lbl" style="margin-bottom:10px">${unitLabel()}</div>
        <div class="col" style="gap:6px">${legend(FLOW.income, tr('income'), amount(tot.income))}${legend(FLOW.expense, tr('expenses'), amount(tot.expense))}${legend(FLOW.installments, tr('installments'), amount(tot.installments))}</div>
      </div>
      ${donut([tot.income, tot.expense, tot.installments], [FLOW.income, FLOW.expense, FLOW.installments], 118, 14, 'rgba(255,255,255,.09)', `<span class="lbl" style="font-size:11px">${tr('this_month')}</span>`)}
    </div>
  </div>
  <div class="loanstrip rise" style="animation-delay:.1s" data-a="go" data-s="loans">
    <div class="col"><span class="lbl">${tr('loan_debt')}</span><span style="font-size:17px;font-weight:600">${compact(lt.remaining)}</span></div>
    <div class="grow col" style="gap:5px">${lt.count === 0 ? `<span class="lbl">${tr('no_loans')}</span>` :
      `<span class="lbl ell" style="font-size:10.5px">${t('paid_of', num(lt.done), num(lt.count))}</span>${pill(lt.done / lt.count, true)}`}</div>
  </div>
  <div class="card click rise" style="animation-delay:.15s" data-a="go" data-s="reports">
    <div class="row" style="align-items:flex-start">${chip('down', 'var(--neg-bg)', 'var(--neg)', 34, 15)}
      <div class="grow"><div class="b" style="font-size:13.5px">${tr('month_expenses')}</div><div class="muted" style="font-size:11px">${tr('by_category')}</div></div>
      <div class="col" style="align-items:flex-end"><div class="neg b" style="font-size:20px">${amount(tot.expense)}</div>${cmp}</div></div>
    <div style="height:14px"></div>
    ${slices.length ? categoryBars(slices, tot.expense) : hint(tr('no_expenses'))}
  </div>
  <div class="card rise" style="animation-delay:.2s;padding:12px 16px">
    <div class="row"><span class="b grow" style="font-size:13.5px">${tr('upcoming')}</span><button class="link" data-a="go" data-s="loans">${tr('all')}</button></div>
    ${up.length ? up.map(instRow).join('') : hint(tr('no_upcoming'))}
  </div>
</div>`;
};

function topSlices(all) {
  const list = all.filter((s) => s.total > 0);
  if (list.length <= 5) return list;
  const rest = list.slice(4).reduce((s, c) => s + c.total, 0);
  return [...list.slice(0, 4), { cid: -1, name_fa: 'سایر', name_en: 'Others', color: '#9AA3AE', total: rest }];
}

function categoryBars(slices, total) {
  const max = Math.max(...slices.map((s) => s.total));
  return `<div class="bars">${slices.map((s, i) => {
    const color = s.cid === -1 ? BAR_COLORS[5] : BAR_COLORS[i % 5];
    const ink = dark ? color : shade(color);
    const h = Math.max(8, Math.round((100 * s.total) / max));
    const pct = total > 0 ? Math.round((s.total * 100) / total) : 0;
    const icon = s.cid === -1 ? 'other' : forCategory(s.name_fa || '', s.name_en || '', 'expense');
    return `<div class="bar"><span class="b" style="font-size:11px">${percent(pct)}</span>
      <div class="track"><div class="fill" style="height:${h}px;background:linear-gradient(${color},${alpha(color, 0.8)});animation-delay:${0.2 + i * 0.07}s"></div></div>
      ${chip(icon, alpha(color, dark ? 0.22 : 0.2), ink, 28, 14)}<span class="name">${esc(catName(s))}</span></div>`;
  }).join('')}</div>`;
}

function instRow(i) {
  const days = J.daysBetween(J.todayIso(), i.due_date);
  const status = days < 0 ? t('days_late', num(-days)) : days === 0 ? tr('due_today') : t('days_left', num(days));
  return `<div class="row click" style="padding:8px 0" data-a="pay" data-id="${i.id}">
    <span class="sq" style="background:${loanColor(i.loan_id, dark)}"></span>
    <div class="grow"><div class="sb ell" style="font-size:13px">${esc(i.lender)}</div>
      <div class="ell ${days < 0 ? 'neg' : 'muted'}" style="font-size:11px">${t('inst_n', num(i.seq))} · ${status}</div></div>
    <span class="b" style="font-size:13px">${amount(i.amount - i.paid)}</span></div>`;
}

// ================================================================== transactions
SCREENS.tx = () => {
  const st = S.tx;
  if (!st.ym) st.ym = J.today().slice(0, 2);
  const [start, end] = J.monthRange(st.ym[0], st.ym[1]);
  const kind = st.filter === 1 ? 'expense' : st.filter === 2 ? 'income' : null;
  let entries = D.transactions(start, end, kind, st.cat).map((x) => ({ date: x.date, key: 't' + x.id, tx: x }));
  if (st.filter !== 2 && !st.cat) entries = entries.concat(D.paidInstallments(start, end).map((i) => ({ date: i.paid_date, key: 'i' + i.id, inst: i })));
  entries.sort((a, b) => (a.date === b.date ? (a.key < b.key ? 1 : -1) : a.date < b.date ? 1 : -1));
  const q = st.q.trim();
  if (q) {
    const ql = toLatin(q);
    entries = entries.filter((e) => (e.tx ? (e.tx.note.includes(q) || txCat(e.tx).includes(q) || String(e.tx.amount).includes(ql)) : e.inst.lender.includes(q)));
  }
  const tot = D.totals(start, end);
  const today = J.todayIso();
  const groups = [];
  for (const e of entries) {
    if (!groups.length || groups[groups.length - 1].date !== e.date) groups.push({ date: e.date, items: [] });
    groups[groups.length - 1].items.push(e);
  }
  const sum = st.filter === 2 ? `<span class="pos sb">${tr('sum_income')} ${compact(tot.income)}</span>`
    : st.filter === 1 ? `<span class="neg sb">${tr('sum_expense')} ${compact(tot.expense)}</span>`
      : `<span class="t2 sb">${tr('sum_out')} ${compact(tot.expense + tot.installments)}</span>`;

  return `<div class="page">
  ${topbar(tr('nav_tx'), false, ring('search', 'txSearch') + ring('filter', 'txFilterCat', st.cat ? 'style="color:var(--neg)"' : ''))}
  ${st.searching ? `<div class="field"><label>${tr('search')}</label><input type="search" data-global="txq" value="${esc(st.q)}" placeholder="${tr('search_hint')}"></div>` : ''}
  ${seg([tr('all'), tr('expense'), tr('income')], st.filter, 'txKind')}
  <div class="row" style="gap:8px">${ring(rtl() ? 'chev_right' : 'chev_left', 'txMonth', 'data-n="-1"', 'sm')}
    <span class="b" style="font-size:13.5px">${month(st.ym[0], st.ym[1])}</span>${ring(rtl() ? 'chev_left' : 'chev_right', 'txMonth', 'data-n="1"', 'sm')}
    <span class="grow"></span><span style="font-size:12px">${sum}</span></div>
  ${groups.length ? '' : hint(tr('no_tx'))}
  ${groups.map((g) => {
    const label = (g.date === today ? tr('today') : g.date === J.shiftIso(today, -1) ? tr('yesterday') : weekday(g.date)) + ' · ' + dayMonth(g.date);
    return `<div class="day">${label}</div><div class="card" style="padding:4px 6px">${g.items.map((e, i) =>
      (i ? '<div class="divider" style="margin:0 10px"></div>' : '') + (e.tx ? txRow(e.tx) : instPaidRow(e.inst))).join('')}</div>`;
  }).join('')}
  ${groups.length ? `<div class="hint" style="padding:4px 0;font-size:11px">${tr('swipe_hint')}</div>` : ''}
</div>`;
};

function txRow(x) {
  const [bg, ink] = kindColors(x.kind);
  const sub = [txAcc(x), x.note].filter(Boolean).map(esc).join(' · ');
  const signed = x.kind === 'income' ? x.amount : -x.amount;
  return `<div class="swipe"><div class="under">${ic('trash', 20)}${ic('trash', 20)}</div>
    <div class="item click" data-a="editTx" data-id="${x.id}" data-swipe="${x.id}">
      ${chip(forCategory(x.cfa || '', x.cen || '', x.kind), bg, ink, 36)}
      <div class="grow"><div class="title ell">${esc(txCat(x)) || tr('uncategorized')}</div>${sub ? `<div class="sub ell">${sub}</div>` : ''}</div>
      <span class="b ${x.kind === 'income' ? 'pos' : 'neg'}" style="font-size:13.5px">${amount(signed, { signed: true })}</span></div></div>`;
}

function instPaidRow(i) {
  return `<div class="item click" data-a="pay" data-id="${i.id}">${chip('bank', 'var(--gold-bg)', 'var(--gold)', 36)}
    <div class="grow"><div class="title ell">${t('inst_of', esc(i.lender))}</div><div class="sub">${t('inst_n', num(i.seq))}</div></div>
    <span class="b" style="font-size:13.5px">${amount(-i.paid, { signed: true })}</span></div>`;
}

// ================================================================== loans
SCREENS.loans = () => {
  const st = S.loans;
  const loans = D.loans(st.archived);
  if (st.open === undefined) st.open = loans[0]?.id ?? null;
  const [ty, tm] = J.today();
  const lt = D.loanTotals(...J.monthRange(ty, tm));
  const cell = (label, value, w) => `<div class="col" style="flex:${w};min-width:0"><span class="ell" style="font-size:11px;color:var(--hero-muted)">${label}</span>
    <span class="ell" style="font-size:17px;font-weight:600;color:#fff">${value}</span></div>`;
  return `<div class="page">
  ${topbar(tr('nav_loans'), false, ring('plus', 'loanNew'))}
  <div class="hero row" style="border-radius:24px;padding:14px 16px;gap:14px">${cell(tr('remaining_total'), compact(lt.remaining), 1.2)}${cell(tr('this_month'), compact(lt.dueThisMonth), 1)}${cell(tr('active_loans'), num(lt.active), 0.7)}</div>
  ${loans.length ? loans.map(loanCard).join('') : hint(tr('no_loans_long'))}
  <button class="link center" style="align-self:center" data-a="loanArchived">${tr(st.archived ? 'hide_archived' : 'show_archived')}</button>
</div>`;
};

function loanCard(l) {
  const open = S.loans.open === l.id;
  const frac = l.cnt ? l.done / l.cnt : 0;
  const sub = open ? t('monthly_inst', amount(l.installment_amount), num(l.due_day))
    : t('x_of_y', num(l.done), num(l.cnt)) + (l.next_due ? ' · ' + t('next_on', dayMonth(l.next_due)) : '');
  let body = '';
  if (open) {
    const insts = D.installments(l.id);
    const firstOpen = insts.findIndex((i) => i.paid < i.amount);
    const all = S.loans.all[l.id];
    let visible = insts;
    if (!all && insts.length > 5) {
      const from = Math.max(0, Math.min(firstOpen < 0 ? insts.length - 3 : firstOpen - 1, insts.length - 4));
      visible = insts.slice(from, from + 4);
    }
    body = `<div class="t2" style="font-size:11.5px;margin:10px 0 4px">${t('paid_of', num(l.done), num(l.cnt))} · ${tr('remaining')} ${compact(l.sched - l.paid_sum)}</div>
      ${visible.map((i, k) => (k ? '<div class="divider"></div>' : '') + instLine(i, insts[firstOpen]?.id === i.id)).join('')}
      <div class="row" style="margin-top:8px">${insts.length > 5 ? `<button class="link" data-a="loanAll" data-id="${l.id}">${all ? tr('show_less') : t('show_all', num(insts.length))}</button>` : ''}
        <span class="grow"></span>${ring('edit', 'loanEdit', `data-id="${l.id}"`, 'sm')}</div>`;
  }
  return `<div class="card" style="padding:14px">
    <div class="row click" data-a="loanToggle" data-id="${l.id}"><span class="sq" style="width:22px;height:22px;border-radius:7px;background:${loanColor(l.id, dark)}"></span>
      <div class="grow"><div class="b ell" style="font-size:14.5px">${esc(l.lender)}${l.archived ? ' · ' + tr('archived') : ''}</div><div class="muted ell" style="font-size:11px">${sub}</div></div>
      ${miniRing(frac, open ? 46 : 40, open ? percent(Math.floor(frac * 100)) : '')}</div>${body}</div>`;
}

function instLine(i, isNext) {
  const days = J.daysBetween(J.todayIso(), i.due_date);
  const isOpen = i.paid < i.amount;
  const dot = !isOpen ? FLOW.income : days < 0 ? FLOW.expense : isNext ? FLOW.installments : 'var(--hair)';
  return `<div class="row click" style="padding:8px 0;font-size:12.5px" data-a="pay" data-id="${i.id}">
    <span class="dot" style="background:${dot}"></span><span class="${isOpen ? '' : 'muted'}">${t('inst_n', num(i.seq))}</span>
    <span class="muted grow ell" style="font-size:12px">${date(i.due_date)}</span>
    ${isOpen ? `<span class="sb">${amount(i.amount - i.paid)}</span><span class="mini">${tr('pay')}</span>` : `<span class="pos sb" style="font-size:12px">${tr('paid_check')}</span>`}</div>`;
}

// ================================================================== more
SCREENS.more = () => {
  const assets = D.assetsTotal();
  const net = D.debtsOutstanding('receivable') - D.debtsOutstanding('payable');
  const tile = (icon, bg, ink, label, value, s) => `<button class="tile" data-a="go" data-s="${s}">${chip(icon, bg, ink, 36)}
    <span class="t2" style="font-size:12px;margin-top:4px">${label}</span><span class="sb ell" style="font-size:17px">${value}</span></button>`;
  const menu = (icon, title, sub, a, attrs = '', trailing = '') => `<div class="menu ${a ? 'click' : ''}" ${a ? `data-a="${a}"` : ''} ${attrs}>
    ${chip(icon, 'var(--field)', 'var(--accent)', 36)}<div class="grow"><div class="title">${title}</div><div class="sub">${sub}</div></div>${trailing}</div>`;
  const standalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  return `<div class="page">
  ${topbar(tr('nav_more'), false)}
  ${standalone ? '' : `<div class="card row" style="align-items:flex-start">${chip('share', 'var(--gold-bg)', 'var(--gold)', 34)}
     <div class="grow"><div class="b" style="font-size:13.5px">${tr('install_title')}</div><div class="t2" style="font-size:12px;line-height:1.7">${tr('install_hint')}</div></div></div>`}
  <div class="row">${tile('safe', 'var(--pos-bg)', 'var(--pos)', tr('assets'), compact(assets), 'assets')}${tile('swap', 'var(--gold-bg)', 'var(--gold)', tr('debts'), compact(net), 'debts')}</div>
  <div class="card tight">
    ${menu('chart', tr('reports'), tr('reports_sub'), 'go', 'data-s="reports"')}<div class="divider"></div>
    ${menu('calendar', tr('calendar'), tr('calendar_sub'), 'calendar')}<div class="divider"></div>
    ${menu('list', tr('lists'), tr('lists_sub'), 'go', 'data-s="lists"')}
  </div>
  <div class="card tight">
    ${menu('moon', tr('appearance'), tr('appearance_sub'), 'go', 'data-s="settings"', `<span class="t2" style="font-size:12px">${tr('theme_' + prefs.theme)}</span>`)}<div class="divider"></div>
    ${menu('globe', tr('lang_unit'), (isFa() ? 'فارسی' : 'English') + ' · ' + unitLabel(), 'go', 'data-s="settings"')}<div class="divider"></div>
    ${menu('lock', tr('pin_lock'), tr('pin_lock_sub'), '', '', toggle(!!localStorage.getItem('pin'), 'pinToggle'))}
  </div>
  <div class="card tight">
    ${menu('download', tr('import_pc'), tr('import_pc_sub'), 'importDb')}<div class="divider"></div>
    ${menu('share', tr('backup_send'), tr('backup_send_sub'), 'backup')}
  </div>
  <div class="hint" style="padding:4px 8px;font-size:11px;line-height:1.8">${tr('storage_note')}<br>${tr('about_line')}</div>
</div>`;
};

// ================================================================== assets
SCREENS.assets = () => {
  const assets = D.assets();
  const [ty, tm] = J.today();
  const final = D.assetsTotal() + D.totals(...J.monthRange(ty, tm)).net;
  return `<div class="page sub">
  ${topbar(tr('assets'), true, ring('plus', 'assetNew'))}
  <div class="hero"><div class="lbl">${tr('assets_total')}</div><div class="big num" style="font-size:27px" data-count="${assets.reduce((s, a) => s + a.amount, 0)}" data-key="assets">${amount(S.counts.assets ?? 0)}</div>
    <div class="lbl">${unitLabel()}</div><div class="lbl" style="margin-top:8px;font-size:11.5px">${t('final_line', compact(final))}</div></div>
  ${assets.length ? '' : hint(tr('no_assets'))}
  ${assets.map((a) => `<div class="card" style="padding:14px">
    <div class="row click" data-a="assetEdit" data-id="${a.id}">${chip(forAsset(a.kind), 'var(--pos-bg)', 'var(--pos)', 38)}
      <div class="grow"><div class="sb ell">${esc(a.name)}</div><div class="muted ell" style="font-size:11px">${tr('kind_' + a.kind)} · ${date(a.updated_at)}</div></div>
      <span class="b">${amount(a.amount)}</span></div>
    <div class="row" style="margin-top:10px;gap:8px"><button class="obtn pos grow" data-a="assetAdjust" data-id="${a.id}" data-s="1">${ic('plus', 17)}${tr('deposit')}</button>
      <button class="obtn neg grow" data-a="assetAdjust" data-id="${a.id}" data-s="-1">${ic('minus', 17)}${tr('withdraw')}</button></div></div>`).join('')}
</div>`;
};

// ================================================================== debts
SCREENS.debts = () => {
  const tab = S.debts.tab;
  const dir = tab === 0 ? 'receivable' : 'payable';
  const debts = D.debts(dir);
  const out = debts.reduce((s, d) => s + d.amount - d.settled, 0);
  const total = debts.reduce((s, d) => s + d.amount, 0);
  return `<div class="page sub">
  ${topbar(tr('debts'), true, ring('plus', 'debtNew'))}
  ${seg([tr('receivables'), tr('payables')], tab, 'debtTab')}
  <div class="card"><div class="row"><div class="grow"><div class="t2" style="font-size:12px">${tr(tab === 0 ? 'owed_to_you' : 'you_owe')}</div>
    <div class="b ${tab === 0 ? 'pos' : 'neg'}" style="font-size:19px">${amount(out, { withUnit: true })}</div></div>${chip('swap', 'var(--gold-bg)', 'var(--gold)', 38)}</div>
    ${total > 0 ? `<div class="muted" style="font-size:11px;margin:10px 0 4px">${tr('settled_share')}</div>${pill((total - out) / total, false)}` : ''}</div>
  ${debts.length ? '' : hint(tr('no_debts'))}
  ${debts.map((d) => {
    const done = d.settled >= d.amount;
    return `<div class="card" style="padding:14px"><div class="row click" data-a="debtEdit" data-id="${d.id}">
      <div class="grow"><div class="sb ell">${esc(d.counterparty)}</div><div class="muted ell" style="font-size:11px">${date(d.date)}${d.due_date ? ' · ' + tr('due') + ' ' + date(d.due_date) : ''}</div></div>
      <div class="col" style="align-items:flex-end"><span class="b">${amount(d.amount)}</span>
        <span class="${done ? 'pos' : 'muted'}" style="font-size:11px">${done ? tr('settled') : tr('left') + ' ' + amount(d.amount - d.settled)}</span></div></div>
      ${done ? '' : `<div class="row" style="margin-top:10px"><div class="grow">${pill(d.settled / Math.max(1, d.amount), false)}</div><button class="mini" data-a="debtSettle" data-id="${d.id}">${tr('settle')}</button></div>`}</div>`;
  }).join('')}
</div>`;
};

// ================================================================== reports
SCREENS.reports = () => {
  const st = S.rep;
  if (!st.ym) st.ym = J.today().slice(0, 2);
  const [start, end] = st.yearly ? J.yearRange(st.ym[0]) : J.monthRange(st.ym[0], st.ym[1]);
  const label = st.yearly ? `${tr('year')} ${num(st.ym[0])}` : month(st.ym[0], st.ym[1]);
  const r = X.reportData(start, end, label);
  S.report = r;
  const lg = (c, l, v) => `<div class="legend"><span class="dot" style="background:${c}"></span><span class="t2">${l}</span><span class="v">${amount(v)}</span></div>`;
  const pos = [[tr('assets_total'), r.assets], [tr('final_total'), r.final], [tr('receivables'), r.receivable], [tr('payables'), r.payable], [tr('loan_debt'), r.loanDebt], [tr('net_worth'), r.netWorth]];
  return `<div class="page sub">
  ${topbar(tr('reports'), true)}
  ${seg([tr('monthly'), tr('yearly')], st.yearly, 'repYearly')}
  <div class="row">${ring(rtl() ? 'chev_right' : 'chev_left', 'repShift', 'data-n="-1"', 'sm')}<div class="grow center b" style="font-size:15px">${label}</div>${ring(rtl() ? 'chev_left' : 'chev_right', 'repShift', 'data-n="1"', 'sm')}</div>
  <div class="card row" style="gap:14px"><div class="grow col" style="gap:8px;font-size:12.5px">${lg(FLOW.income, tr('income'), r.totals.income)}${lg(FLOW.expense, tr('expenses'), r.totals.expense)}${lg(FLOW.installments, tr('installments'), r.totals.installments)}
    <div class="divider"></div><div class="row"><span class="b grow">${tr('balance')}</span><span class="b ${r.totals.net < 0 ? 'neg' : 'pos'}">${amount(r.totals.net)}</span></div></div>
    ${donut([r.totals.income, r.totals.expense, r.totals.installments], [FLOW.income, FLOW.expense, FLOW.installments], 96, 12, 'var(--track)')}</div>
  <div class="card"><div class="b" style="font-size:13.5px;margin-bottom:6px">${tr('position')}</div>
    ${pos.map(([k, v]) => `<div class="row" style="padding:4px 0;font-size:12.5px"><span class="t2 grow">${k}</span><span class="sb">${amount(v)}</span></div>`).join('')}</div>
  ${catList(tr('expenses_by_cat'), r.expenseCats)}
  ${r.incomeCats.length ? catList(tr('income_by_cat'), r.incomeCats) : ''}
  <div class="row"><button class="obtn grow" data-a="exportExcel">${ic('file', 17)}${tr('export_excel')}</button><button class="obtn grow" data-a="exportPdf">${ic('print', 17)}${tr('export_pdf')}</button></div>
  <button class="link" style="align-self:center" data-a="exportHtml">${tr('report_view')}</button>
</div>`;
};

function catList(title, cats) {
  if (!cats.length) return `<div class="card"><div class="b" style="font-size:13.5px">${title}</div>${hint(tr('nothing_period'))}</div>`;
  const total = Math.max(1, cats.reduce((s, c) => s + c.total, 0));
  const max = Math.max(1, ...cats.map((c) => c.total));
  return `<div class="card"><div class="b" style="font-size:13.5px;margin-bottom:8px">${title}</div>${cats.map((c, i) => `
    <div style="padding:5px 0"><div class="row" style="gap:8px;font-size:12.5px"><span class="dot" style="width:9px;height:9px;background:${esc(c.color || '#BFC9CA')}"></span>
      <span class="grow ell">${esc(catName(c))}</span><span class="muted" style="font-size:11px">${percent(Math.round((c.total * 100) / total))}</span><span class="sb">${amount(c.total)}</span></div>
      <div style="margin-top:5px;height:6px;border-radius:3px;background:var(--track);overflow:hidden"><div style="height:100%;width:${(c.total / max) * 100}%;border-radius:3px;background:${esc(c.color || '#BFC9CA')};animation:fillx .8s cubic-bezier(.16,.84,.34,1) ${0.15 + i * 0.05}s both"></div></div></div>`).join('')}</div>`;
}

// ================================================================== lists
SCREENS.lists = () => {
  const tab = S.lists.tab;
  const rows = tab < 2
    ? D.categories(tab === 1 ? 'income' : 'expense', true).map((c) => ({ id: c.id, icon: forCategory(c.name_fa, c.name_en, c.kind), name: catName(c), on: !c.archived, acc: 0 }))
    : D.accounts(true).map((a) => ({ id: a.id, icon: 'wallet', name: accName(a), on: !a.archived, acc: 1 }));
  return `<div class="page sub">
  ${topbar(tr('lists'), true, ring('plus', 'listAdd'))}
  ${seg([tr('expense'), tr('income'), tr('methods')], tab, 'listTab')}
  <div class="muted" style="font-size:11px;padding:0 6px">${tr('lists_help')}</div>
  <div class="card tight">${rows.map((r, i) => `${i ? '<div class="divider"></div>' : ''}<div class="row" style="padding:6px 8px">
    ${chip(r.icon, 'var(--field)', r.on ? 'var(--accent)' : 'var(--muted)', 34)}<span class="grow ell" style="font-weight:500;${r.on ? '' : 'color:var(--muted)'}">${esc(r.name)}</span>
    ${ring('edit', 'listRename', `data-id="${r.id}" data-acc="${r.acc}"`, 'sm')}${toggle(r.on, 'listToggle" data-id="' + r.id + '" data-acc="' + r.acc)}</div>`).join('')}</div>
</div>`;
};

// ================================================================== settings
SCREENS.settings = () => {
  const themes = ['light', 'dark', 'auto'];
  const section = (title, body) => `<div class="muted" style="font-size:12px;padding:0 6px">${title}</div><div class="card col" style="gap:12px;padding:14px">${body}</div>`;
  return `<div class="page sub">
  ${topbar(tr('settings'), true)}
  ${section(tr('appearance'), seg(themes.map((x) => tr('theme_' + x)), themes.indexOf(prefs.theme), 'setTheme'))}
  ${section(tr('lang_unit'), seg(['فارسی', 'English'], isFa() ? 0 : 1, 'setLang') + seg([tr('toman'), tr('rial')], prefs.unit === 'rial' ? 1 : 0, 'setUnit') +
    (isFa() ? `<div class="row"><span class="grow" style="font-weight:500">${tr('fa_digits')}</span>${toggle(prefs.faDigits, 'setDigits')}</div>` : ''))}
  ${section(tr('reminders'), `<div class="row"><div class="grow"><div style="font-weight:500">${tr('remind_before')}</div><div class="muted" style="font-size:11px">${tr('calendar_sub')}</div></div>
    ${ring('minus', 'setDays', 'data-n="-1"', 'sm')}<span class="b center" style="width:26px;font-size:16px">${num(prefs.reminderDays)}</span>${ring('plus', 'setDays', 'data-n="1"', 'sm')}</div>
    <button class="obtn" data-a="calendar">${ic('calendar', 17)}${tr('calendar')}</button>`)}
  <div class="hint" style="font-size:11px">${tr('settings_note')}</div>
</div>`;
};

// ================================================================== sheets
function openAdd(mode = 'expense', tx = null) {
  const accounts = D.accounts();
  push({
    mode: mode === 'income' ? 1 : mode === 'installment' ? 2 : 0, tx,
    digits: tx ? String(toDisplay(tx.amount)) : '',
    cat: tx ? tx.category_id : null, acc: tx ? tx.account_id : accounts[0]?.id ?? null,
    date: tx ? tx.date : J.todayIso(), note: tx ? tx.note : '', inst: null,
    render(L) {
      const kind = L.mode === 1 ? 'income' : 'expense';
      const cats = D.categories(kind);
      if (!cats.some((c) => c.id === L.cat)) L.cat = cats[0]?.id ?? null;
      const modes = L.tx ? [tr('expense'), tr('income')] : [tr('expense'), tr('income'), tr('pay_inst')];
      let mid;
      if (L.mode === 2) {
        const list = D.nextOpenInstallments();
        mid = list.length ? list.map((i) => `<div class="optrow click ${L.inst?.id === i.id ? 'on' : ''}" data-a=".pickInst" data-id="${i.id}">
          <span class="sq" style="background:${loanColor(i.loan_id, dark)}"></span><div class="grow"><div class="sb ell" style="font-size:13px">${esc(i.lender)}</div>
          <div class="muted" style="font-size:11px">${t('inst_n', num(i.seq))} · ${dayMonth(i.due_date)}</div></div><span class="b" style="font-size:13px">${amount(i.amount - i.paid)}</span></div>`).join('')
          : hint(tr('no_open_inst'));
      } else {
        mid = `<div class="wrap">${cats.map((c) => pick(catName(c), c.id === L.cat, '.pickCat', `data-id="${c.id}"`, forCategory(c.name_fa, c.name_en, c.kind))).join('')}</div>`;
      }
      return `${sheetHead(tr(L.tx ? 'edit_tx' : 'new_tx'))}
        ${seg(modes, L.mode, '.setMode')}
        <div class="col" style="align-items:center;padding:4px 0"><div class="amount-big" id="amt">${amtText(L)}</div><div class="muted" id="amtsub" style="font-size:12px">${amtSub(L)}</div></div>
        ${mid}
        ${dateField(tr('date'), 'date', L.date)}
        ${accounts.length ? `<div class="row" style="align-items:flex-start"><span class="muted" style="font-size:12px;padding-top:8px">${tr('method')}</span>
          <div class="wrap grow">${accounts.map((a) => pick(accName(a), a.id === L.acc, '.pickAcc', `data-id="${a.id}"`)).join('')}</div></div>` : ''}
        ${L.mode !== 2 ? field(tr('note'), 'note', L.note, { placeholder: tr('optional') }) : ''}
        <div class="keypad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '<'].map((k) =>
          `<button data-a=".key" data-k="${k}" style="${k === '000' ? 'font-size:17px' : ''}">${k === '<' ? ic('backspace', 24) : num(k)}</button>`).join('')}</div>
        <button class="btn" id="save" data-a=".save" ${canSave(L) ? '' : 'disabled'}>${tr('save')}</button>
        ${L.tx ? `<button class="obtn neg" data-a=".del">${ic('trash', 17)}${tr('delete')}</button>` : ''}`;
    },
    setMode(ds) { this.mode = Number(ds.i); this.inst = null; renderLayers(); },
    pickCat(ds) { this.cat = Number(ds.id); renderLayers(); },
    pickAcc(ds) { this.acc = Number(ds.id); renderLayers(); },
    pickInst(ds) {
      this.inst = D.installment(Number(ds.id));
      this.digits = String(toDisplay(this.inst.amount - this.inst.paid));
      renderLayers();
    },
    key(ds) {
      const next = ds.k === '<' ? this.digits.slice(0, -1) : (this.digits + ds.k).replace(/^0+/, '');
      if (next.length > 13) return;
      this.digits = next;
      document.getElementById('amt').textContent = amtText(this);
      document.getElementById('amtsub').textContent = amtSub(this);
      document.getElementById('save').disabled = !canSave(this);
    },
    save() {
      if (!canSave(this)) return;
      const v = fromDisplay(Number(this.digits));
      if (this.mode === 2) {
        const i = this.inst;
        D.payInstallment(i.id, Math.min(i.paid + v, i.amount), this.date, this.acc, i.note);
      } else {
        const kind = this.mode === 1 ? 'income' : 'expense';
        if (this.tx) D.updateTransaction(this.tx.id, kind, this.date, v, this.cat, this.acc, this.note.trim());
        else D.addTransaction(kind, this.date, v, this.cat, this.acc, this.note.trim());
      }
      closeAll(); render(); toast(tr('saved'));
    },
    del() {
      confirmDialog(tr('delete_tx_q'), '', tr('delete'), () => { D.deleteTransaction(this.tx.id); closeAll(); render(); toast(tr('deleted')); });
    },
  });
}
const amtText = (L) => (Number(L.digits) ? group(Number(L.digits)) : num(0));
const amtSub = (L) => (Number(L.digits) >= 1000 ? `${compact(fromDisplay(Number(L.digits)))} ${unitLabel()}` : unitLabel());
const canSave = (L) => Number(L.digits) > 0 && (L.mode !== 2 || !!L.inst);

function openPay(id) {
  const i = D.installment(id);
  if (!i) return;
  const accounts = D.accounts();
  push({
    dialog: true,
    amt: String(toDisplay(i.paid > 0 ? i.paid : i.amount)), date: i.paid_date || J.todayIso(), acc: i.account_id ?? accounts[0]?.id ?? null,
    render(L) {
      return dialogBox(`${esc(i.lender)} · ${t('inst_n', num(i.seq))}`,
        `<div class="t2" style="font-size:12.5px">${t('due_on', date(i.due_date), amount(i.amount, { withUnit: true }))}</div>
         ${field(tr('paid_amount'), 'amt', L.amt, { amountField: true })}${dateField(tr('pay_date'), 'date', L.date)}
         <div class="wrap">${accounts.map((a) => pick(accName(a), a.id === L.acc, '.pickAcc', `data-id="${a.id}"`)).join('')}</div>`,
        [...(i.paid > 0 ? [{ label: tr('undo_pay'), a: '.undo', cls: 'danger' }] : []), { label: tr('cancel'), a: 'close' }, { label: tr('pay'), a: '.ok', cls: 'ok' }]);
    },
    pickAcc(ds) { this.acc = Number(ds.id); renderLayers(); },
    ok() {
      const v = Math.max(0, Math.min(fromDisplay(Number(this.amt) || 0), i.amount));
      D.payInstallment(i.id, v, this.date, this.acc, i.note);
      closeAll(); render(); toast(tr('saved'));
    },
    undo() { D.payInstallment(i.id, 0, this.date, null, i.note); closeAll(); render(); },
  });
}

function openLoan(loan = null) {
  const [ty, tm, td] = J.today();
  const [ny, nm] = J.addMonths(ty, tm, 1);
  push({
    lender: loan?.lender ?? '', total: loan ? String(toDisplay(loan.total_amount)) : '', count: loan ? String(loan.installment_count) : '',
    dueDay: String(loan?.due_day ?? td), firstDue: loan?.first_due_date ?? J.toIso(ny, nm, J.clampDay(ny, nm, td)),
    taken: loan?.taken_date ?? J.todayIso(), note: loan?.note ?? '', archived: !!loan?.archived,
    render(L) {
      return `${sheetHead(tr(loan ? 'edit_loan' : 'new_loan'))}
        ${field(tr('lender'), 'lender', L.lender, { placeholder: tr('lender_hint') })}
        ${field(tr('loan_total'), 'total', L.total, { amountField: true, placeholder: unitLabel() })}
        <div class="muted" style="font-size:11px;padding:0 6px">${tr('loan_total_help')}</div>
        ${field(tr('inst_count'), 'count', L.count, { type: 'number' })}
        ${field(tr('due_day'), 'dueDay', L.dueDay, { type: 'number', placeholder: '1–31' })}
        ${dateField(tr('first_due'), 'firstDue', L.firstDue)}${dateField(tr('taken_date'), 'taken', L.taken)}
        ${field(tr('note'), 'note', L.note, { placeholder: tr('optional') })}
        <div class="field" id="perinst" style="justify-content:space-between">${perInst(L)}</div>
        ${loan ? `<div class="row"><span class="grow">${tr('archive_loan')}</span>${toggle(L.archived, '.arch')}</div>` : ''}
        <button class="btn" id="save" data-a=".save" ${loanValid(L) ? '' : 'disabled'}>${tr('save')}</button>
        ${loan ? `<button class="obtn neg" data-a=".del">${ic('trash', 17)}${tr('delete_loan')}</button>` : ''}`;
    },
    onInput() {
      document.getElementById('perinst').innerHTML = perInst(this);
      document.getElementById('save').disabled = !loanValid(this);
    },
    arch() { this.archived = !this.archived; renderLayers(); },
    save() {
      if (!loanValid(this)) return;
      const total = fromDisplay(Number(this.total));
      const n = Number(this.count);
      const day = Math.max(1, Math.min(31, Number(this.dueDay) || 1));
      if (!loan) D.createLoan(this.lender.trim(), total, n, day, this.firstDue, this.taken, this.note.trim());
      else {
        const rebuild = total !== loan.total_amount || n !== loan.installment_count || day !== loan.due_day || this.firstDue !== loan.first_due_date;
        D.updateLoan(loan.id, this.lender.trim(), total, n, day, this.firstDue, this.taken, this.note.trim(), this.archived, rebuild);
      }
      closeAll(); render(); toast(tr('saved'));
    },
    del() {
      confirmDialog(tr('delete_loan_q'), tr('delete_loan_help'), tr('delete'), () => { D.deleteLoan(loan.id); S.loans.open = undefined; closeAll(); render(); });
    },
  });
}
const loanValid = (L) => L.lender.trim() && Number(L.total) > 0 && Number(L.count) >= 1 && Number(L.count) <= 600;
function perInst(L) {
  const total = fromDisplay(Number(L.total) || 0);
  const n = Number(L.count) || 0;
  return total > 0 && n > 0 ? `<span class="t2" style="font-size:12.5px">${tr('per_inst')}</span><span class="b">${amount(Math.floor(total / n), { withUnit: true })}</span>`
    : `<span class="muted" style="font-size:12px">${tr('per_inst')}</span>`;
}

function openAsset(asset = null) {
  const hist = asset ? D.assetHistory(asset.id) : [];
  push({
    name: asset?.name ?? '', kind: asset?.kind ?? 'savings', amt: asset ? String(toDisplay(asset.amount)) : '', note: asset?.note ?? '',
    render(L) {
      return `${sheetHead(tr(asset ? 'edit_asset' : 'new_asset'))}
        ${field(tr('name'), 'name', L.name, { placeholder: tr('asset_hint') })}
        <div class="wrap">${ASSET_KINDS.map((k) => pick(tr('kind_' + k), k === L.kind, '.pickKind', `data-k="${k}"`, forAsset(k))).join('')}</div>
        ${field(tr('balance'), 'amt', L.amt, { amountField: true, placeholder: unitLabel() })}
        ${field(tr('note'), 'note', L.note, { placeholder: tr('optional') })}
        <button class="btn" data-a=".save">${tr('save')}</button>
        ${hist.length ? `<div class="b" style="font-size:13px;margin-top:6px">${tr('history')}</div>${hist.map((h) => {
          const d = h.new_amount - h.old_amount;
          return `<div class="row" style="font-size:12.5px;padding:3px 0"><span class="muted grow">${date(h.date)}</span><span class="sb ${d >= 0 ? 'pos' : 'neg'}">${amount(d, { signed: true })}</span></div>`;
        }).join('')}` : ''}
        ${asset ? `<button class="obtn neg" data-a=".del">${ic('trash', 17)}${tr('delete')}</button>` : ''}`;
    },
    pickKind(ds) { this.kind = ds.k; renderLayers(); },
    save() {
      if (!this.name.trim()) return;
      const v = fromDisplay(Number(this.amt) || 0);
      if (asset) D.updateAsset(asset.id, this.name.trim(), this.kind, v, this.note.trim());
      else D.addAsset(this.name.trim(), this.kind, v, this.note.trim());
      closeAll(); render(); toast(tr('saved'));
    },
    del() { confirmDialog(tr('delete_q'), '', tr('delete'), () => { D.deleteAsset(asset.id); closeAll(); render(); }); },
  });
}

function openAdjust(asset, sign) {
  push({
    dialog: true, amt: '', note: '',
    render(L) {
      return dialogBox(`${tr(sign > 0 ? 'deposit' : 'withdraw')} · ${esc(asset.name)}`,
        field(tr('amount'), 'amt', L.amt, { amountField: true, placeholder: unitLabel() }) + field(tr('note'), 'note', L.note, { placeholder: tr('optional') }),
        [{ label: tr('cancel'), a: 'close' }, { label: tr('save'), a: '.ok', cls: 'ok' }]);
    },
    ok() {
      const v = fromDisplay(Number(this.amt) || 0);
      if (v > 0) { D.adjustAsset(asset.id, v * sign, J.todayIso(), this.note.trim()); toast(tr('saved')); }
      closeAll(); render();
    },
  });
}

function openDebt(debt = null) {
  push({
    dir: (debt?.direction ?? (S.debts.tab === 0 ? 'receivable' : 'payable')) === 'receivable' ? 0 : 1,
    who: debt?.counterparty ?? '', amt: debt ? String(toDisplay(debt.amount)) : '', date: debt?.date ?? J.todayIso(), due: debt?.due_date ?? null, note: debt?.note ?? '',
    render(L) {
      return `${sheetHead(tr(debt ? 'edit_debt' : 'new_debt'))}
        ${seg([tr('i_lent'), tr('i_borrowed')], L.dir, '.setDir')}
        ${field(tr('person'), 'who', L.who, { placeholder: tr('person_hint') })}
        ${field(tr('amount'), 'amt', L.amt, { amountField: true, placeholder: unitLabel() })}
        ${dateField(tr('date'), 'date', L.date)}${dateField(tr('due_date'), 'due', L.due, true)}
        ${L.due ? `<button class="link" style="align-self:flex-start" data-a=".clearDue">${tr('clear_date')}</button>` : ''}
        ${field(tr('note'), 'note', L.note, { placeholder: tr('optional') })}
        <button class="btn" data-a=".save">${tr('save')}</button>
        ${debt ? `<button class="obtn neg" data-a=".del">${ic('trash', 17)}${tr('delete')}</button>` : ''}`;
    },
    setDir(ds) { this.dir = Number(ds.i); renderLayers(); },
    clearDue() { this.due = null; renderLayers(); },
    save() {
      const v = fromDisplay(Number(this.amt) || 0);
      if (!this.who.trim() || v <= 0) return;
      const d = this.dir === 0 ? 'receivable' : 'payable';
      if (debt) D.updateDebt(debt.id, d, this.who.trim(), v, this.date, this.due, this.note.trim());
      else D.addDebt(d, this.who.trim(), v, this.date, this.due, this.note.trim());
      closeAll(); render(); toast(tr('saved'));
    },
    del() { confirmDialog(tr('delete_q'), '', tr('delete'), () => { D.deleteDebt(debt.id); closeAll(); render(); }); },
  });
}

function openSettle(d) {
  push({
    dialog: true, amt: String(toDisplay(d.amount)),
    render(L) {
      return dialogBox(`${tr('settle')} · ${esc(d.counterparty)}`, `<div class="t2" style="font-size:12px">${tr('settle_help')}</div>${field(tr('settled_total'), 'amt', L.amt, { amountField: true })}`,
        [{ label: tr('cancel'), a: 'close' }, { label: tr('save'), a: '.ok', cls: 'ok' }]);
    },
    ok() {
      const v = Math.max(0, Math.min(fromDisplay(Number(this.amt) || 0), d.amount));
      D.settleDebt(d.id, v, J.todayIso());
      closeAll(); render(); toast(tr('saved'));
    },
  });
}

function nameDialog(title, initial, onOk) {
  push({
    dialog: true, name: initial,
    render: (L) => dialogBox(title, field(tr('name'), 'name', L.name), [{ label: tr('cancel'), a: 'close' }, { label: tr('save'), a: '.ok', cls: 'ok' }]),
    ok() { if (this.name.trim()) onOk(this.name.trim()); closeAll(); render(); },
  });
}

// ================================================================== backup, import, share
async function shareFile(file) {
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return true;
    } catch (e) {
      if (e.name === 'AbortError') return false;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return true;
}

function backupName() {
  const [y, m, d] = J.today();
  return `finance-${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}.db`;
}

async function backup() {
  const ok = await shareFile(new File([D.exportBytes()], backupName(), { type: 'application/octet-stream' }));
  if (ok) { localStorage.setItem('last_backup', String(Date.now())); render(); }
}

function pickImport() {
  const input = document.getElementById('filein');
  input.value = '';
  input.click();
}
document.getElementById('filein').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!D.looksValid(bytes)) { toast(tr('import_invalid')); return; }
  confirmDialog(tr('import_q'), tr('import_help'), tr('import_do'), async () => {
    await D.replaceWith(bytes);
    loadPrefs();
    S.counts = {};
    S.loans.open = undefined;
    S.stack = ['home'];
    render(false);
    toast(tr('import_done'));
  });
});

// ================================================================== PIN lock
async function hash(pin) {
  let salt = localStorage.getItem('pin_salt');
  if (!salt) { salt = Math.random().toString(36).slice(2); localStorage.setItem('pin_salt', salt); }
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + pin));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

let pinEntry = '';
function renderLock(msg = '') {
  $app.innerHTML = `<div class="lock"><div class="brand">${ic('lock', 32, 1.9)}</div><div class="b" style="font-size:20px">${tr('app_title')}</div>
    <div class="muted">${msg || tr('pin_enter')}</div><div class="pin-dots">${[0, 1, 2, 3].map((i) => `<span class="${i < pinEntry.length ? 'f' : ''}"></span>`).join('')}</div>
    <div class="keypad" style="width:260px">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '<'].map((k) => k ? `<button data-a="pinKey" data-k="${k}">${k === '<' ? ic('backspace', 24) : num(k)}</button>` : '<span></span>').join('')}</div></div>`;
}

function pinSetup() {
  push({
    dialog: true, first: '', pin: '', msg: '',
    render(L) {
      return dialogBox(tr('pin_lock'), `<div class="muted center">${L.msg || (L.first ? tr('pin_again') : tr('pin_new'))}</div>
        <div class="pin-dots">${[0, 1, 2, 3].map((i) => `<span class="${i < L.pin.length ? 'f' : ''}"></span>`).join('')}</div>
        <div class="keypad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '<'].map((k) => k ? `<button data-a=".key" data-k="${k}">${k === '<' ? ic('backspace', 24) : num(k)}</button>` : '<span></span>').join('')}</div>`,
      [{ label: tr('cancel'), a: 'close' }]);
    },
    async key(ds) {
      this.pin = ds.k === '<' ? this.pin.slice(0, -1) : (this.pin + ds.k).slice(0, 4);
      this.msg = '';
      if (this.pin.length === 4) {
        if (!this.first) { this.first = this.pin; this.pin = ''; }
        else if (this.first === this.pin) { localStorage.setItem('pin', await hash(this.pin)); closeAll(); render(); toast(tr('saved')); return; }
        else { this.first = ''; this.pin = ''; this.msg = tr('pin_mismatch'); }
      }
      renderLayers();
    },
  });
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) S.hiddenAt = Date.now();
  else if (localStorage.getItem('pin') && S.hiddenAt && Date.now() - S.hiddenAt > 30000) { S.locked = true; pinEntry = ''; closeAll(); render(); }
});

export function lockIfNeeded() { S.locked = !!localStorage.getItem('pin'); }

// ================================================================== actions
const A = {
  go: (ds) => go(ds.s),
  back,
  close: () => pop(),
  add: () => openAdd(),
  pay: (ds) => openPay(Number(ds.id)),
  pickDate(ds) {
    const L = top();
    datePicker(L[ds.k], (iso) => { L[ds.k] = iso; renderLayers(); });
  },
  // transactions
  txKind: (ds) => { S.tx.filter = Number(ds.i); render(); },
  txMonth: (ds) => { S.tx.ym = J.addMonths(S.tx.ym[0], S.tx.ym[1], Number(ds.n)); render(); },
  txSearch: () => { S.tx.searching = !S.tx.searching; if (!S.tx.searching) S.tx.q = ''; render(); if (S.tx.searching) $app.querySelector('[data-global=txq]')?.focus(); },
  txFilterCat() {
    const cats = D.categories();
    push({
      dialog: true,
      render: () => dialogBox(tr('filter_cat'), `<div class="wrap">${pick(tr('all'), !S.tx.cat, '.set', 'data-id=""')}${cats.map((c) => pick(catName(c), c.id === S.tx.cat, '.set', `data-id="${c.id}"`)).join('')}</div>`,
        [{ label: tr('close'), a: 'close' }]),
      set(ds) { S.tx.cat = ds.id ? Number(ds.id) : null; closeAll(); render(); },
    });
  },
  editTx(ds) {
    if (swiped) return;
    const x = D.transactions('0000-01-01', '9999-12-31').find((r) => r.id === Number(ds.id));
    if (x) openAdd(x.kind, x);
  },
  // loans
  loanNew: () => openLoan(),
  loanToggle: (ds) => { S.loans.open = S.loans.open === Number(ds.id) ? null : Number(ds.id); render(); },
  loanAll: (ds) => { S.loans.all[ds.id] = !S.loans.all[ds.id]; render(); },
  loanEdit: (ds) => openLoan(D.loans(true).find((l) => l.id === Number(ds.id))),
  loanArchived: () => { S.loans.archived = !S.loans.archived; render(); },
  // assets & debts
  assetNew: () => openAsset(),
  assetEdit: (ds) => openAsset(D.assets().find((a) => a.id === Number(ds.id))),
  assetAdjust: (ds) => openAdjust(D.assets().find((a) => a.id === Number(ds.id)), Number(ds.s)),
  debtTab: (ds) => { S.debts.tab = Number(ds.i); render(); },
  debtNew: () => openDebt(),
  debtEdit: (ds) => openDebt([...D.debts('receivable'), ...D.debts('payable')].find((d) => d.id === Number(ds.id))),
  debtSettle: (ds) => openSettle([...D.debts('receivable'), ...D.debts('payable')].find((d) => d.id === Number(ds.id))),
  // reports
  repYearly: (ds) => { S.rep.yearly = Number(ds.i); render(); },
  repShift: (ds) => { S.rep.ym = J.addMonths(S.rep.ym[0], S.rep.ym[1], Number(ds.n) * (S.rep.yearly ? 12 : 1)); render(); },
  exportExcel: () => { try { shareFile(X.excel(S.report)); } catch (e) { console.error(e); toast(tr('export_failed')); } },
  exportPdf() {
    $report.innerHTML = X.reportHtml(S.report);
    $report.dir = isFa() ? 'rtl' : 'ltr';
    window.print();
  },
  exportHtml: () => shareFile(X.reportFile(S.report)),
  calendar: async () => { if (await shareFile(X.calendar())) toast(tr('calendar_done')); },
  // lists
  listTab: (ds) => { S.lists.tab = Number(ds.i); render(); },
  listToggle(ds, el) {
    const on = el.classList.contains('on');
    if (ds.acc === '1') D.archiveAccount(Number(ds.id), on); else D.archiveCategory(Number(ds.id), on);
    render();
  },
  listRename(ds) {
    const isAcc = ds.acc === '1';
    const row = isAcc ? D.accounts(true).find((a) => a.id === Number(ds.id)) : D.categories(null, true).find((c) => c.id === Number(ds.id));
    nameDialog(tr('rename'), isAcc ? accName(row) : catName(row), (n) => (isAcc ? D.renameAccount(row.id, n, isFa()) : D.renameCategory(row.id, n, isFa())));
  },
  listAdd() {
    const tab = S.lists.tab;
    nameDialog(tr('add_item'), '', (n) => (tab === 2 ? D.addAccount(n, isFa()) : D.addCategory(n, tab === 1 ? 'income' : 'expense', isFa())));
  },
  // settings
  setTheme: (ds) => { localStorage.setItem('theme', ['light', 'dark', 'auto'][Number(ds.i)]); loadPrefs(); render(); },
  setLang: (ds) => { D.setSetting('lang', ds.i === '0' ? 'fa' : 'en'); loadPrefs(); render(); },
  setUnit: (ds) => { D.setSetting('unit', ds.i === '1' ? 'rial' : 'toman'); loadPrefs(); S.counts = {}; render(); },
  setDigits: () => { D.setSetting('fa_digits', prefs.faDigits ? '0' : '1'); loadPrefs(); render(); },
  setDays: (ds) => { const d = Math.max(1, Math.min(15, prefs.reminderDays + Number(ds.n))); D.setSetting('reminder_days', d); loadPrefs(); render(); },
  pinToggle() {
    if (localStorage.getItem('pin')) { localStorage.removeItem('pin'); render(); } else pinSetup();
  },
  async pinKey(ds) {
    pinEntry = ds.k === '<' ? pinEntry.slice(0, -1) : (pinEntry + ds.k).slice(0, 4);
    if (pinEntry.length === 4) {
      if ((await hash(pinEntry)) === localStorage.getItem('pin')) { S.locked = false; pinEntry = ''; render(false); return; }
      pinEntry = '';
      return renderLock(tr('pin_wrong'));
    }
    renderLock();
  },
  importDb: pickImport,
  backup,
};

document.addEventListener('click', (e) => {
  const layer = e.target.closest('.layer');
  if (layer && e.target === layer && Number(layer.dataset.layer) === layers.length - 1) { pop(); return; }
  const el = e.target.closest('[data-a]');
  if (!el) return;
  const a = el.dataset.a;
  if (a.startsWith('.')) { const L = top(); if (L && L[a.slice(1)]) L[a.slice(1)](el.dataset, el); return; }
  if (A[a]) A[a](el.dataset, el);
});

document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.global === 'txq') { S.tx.q = el.value; const pos = el.selectionStart; render(); const n = $app.querySelector('[data-global=txq]'); n.focus(); n.setSelectionRange(pos, pos); return; }
  if (!el.dataset.bind) return;
  const L = top();
  if (!L) return;
  let v = el.value;
  if (el.dataset.amount) {
    v = toLatin(v).replace(/\D/g, '').slice(0, 15).replace(/^0+/, '');
    el.value = v ? group(Number(v)) : '';
  } else if (el.dataset.int) {
    v = toLatin(v).replace(/\D/g, '').slice(0, 3);
    el.value = v;
  }
  L[el.dataset.bind] = v;
  if (L.onInput) L.onInput(el.dataset.bind);
});

// swipe a transaction sideways to delete it
let sw = null;
document.addEventListener('touchstart', (e) => {
  const item = e.target.closest('[data-swipe]');
  sw = item ? { item, x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0, active: false } : null;
}, { passive: true });
document.addEventListener('touchmove', (e) => {
  if (!sw) return;
  const dx = e.touches[0].clientX - sw.x;
  const dy = e.touches[0].clientY - sw.y;
  if (!sw.active && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) sw.active = true;
  if (sw.active) { sw.dx = dx; sw.item.style.transition = 'none'; sw.item.style.transform = `translateX(${dx}px)`; }
}, { passive: true });
document.addEventListener('touchend', () => {
  if (!sw) return;
  const { item, dx, active } = sw;
  sw = null;
  item.style.transition = '';
  item.style.transform = '';
  if (!active) return;
  swiped = true;
  setTimeout(() => { swiped = false; }, 350);
  if (Math.abs(dx) > 110) {
    const id = Number(item.dataset.swipe);
    confirmDialog(tr('delete_tx_q'), '', tr('delete'), () => { D.deleteTransaction(id); render(); toast(tr('deleted')); });
  }
});

window.addEventListener('popstate', () => back());
