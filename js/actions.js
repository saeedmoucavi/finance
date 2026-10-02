// Every tap is routed here: data-a="name" calls A.name; data-a=".name" calls a method on the top layer.
import * as D from './db.js';
import * as J from './jalali.js';
import * as X from './export.js';
import { group, isFa, prefs, toLatin, tr } from './core.js';
import { backup, pickImport, shareFile } from './features/backup.js';
import { pinKey, pinSetup } from './features/lock.js';
import { refreshAll } from './market.js';
import { openAdd } from './sheets/add.js';
import { openAdjust, openAsset } from './sheets/asset.js';
import { openDebt, openSettle } from './sheets/debt.js';
import { openLoan } from './sheets/loan.js';
import { openPay } from './sheets/pay.js';
import { accName, catName, pick } from './ui/kit.js';
import { closeAll, confirmDialog, datePicker, dialogBox, layers, nameDialog, pop, push, renderLayers, top } from './ui/layers.js';
import { back, go, loadPrefs, render, toast } from './ui/shell.js';
import { $app, $report, S } from './ui/state.js';

export let swiped = false;

// ================================================================== actions
export const A = {
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
  assetPeriod: (ds) => { S.assets.period = Number(ds.i); render(); },
  async assetRefresh() {
    S.assets.refreshing = true; render();
    const ok = await refreshAll();
    S.assets.refreshing = false; S.assets.offline = !ok; render();
    if (!ok) toast(tr('prices_never'));
  },
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
  pinKey,
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
  } else if (el.dataset.dec) {
    v = toLatin(v).replace(/[٫,]/g, '.').replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 14);
    el.value = v;
  } else if (el.dataset.int) {
    v = toLatin(v).replace(/\D/g, '').slice(0, 3);
    el.value = v;
  }
  L[el.dataset.bind] = v;
  if (L.onInput) L.onInput(el.dataset.bind);
});

// swipe a transaction sideways to delete it
export let sw = null;
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
