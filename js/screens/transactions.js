// Transactions: month list grouped by day, filters, search, swipe to delete.
import * as D from '../db.js';
import * as J from '../jalali.js';
import { amount, compact, dayMonth, esc, month, num, t, toLatin, tr, weekday } from '../core.js';
import { forCategory, ic } from '../icons.js';
import { chip, hint, kindColors, ring, rtl, seg, topbar, txAcc, txCat } from '../ui/kit.js';
import { S } from '../ui/state.js';

export const transactionsScreen = () => {
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

export function txRow(x) {
  const [bg, ink] = kindColors(x.kind);
  const sub = [txAcc(x), x.note].filter(Boolean).map(esc).join(' · ');
  const signed = x.kind === 'income' ? x.amount : -x.amount;
  return `<div class="swipe"><div class="under">${ic('trash', 20)}${ic('trash', 20)}</div>
    <div class="item click" data-a="editTx" data-id="${x.id}" data-swipe="${x.id}">
      ${chip(forCategory(x.cfa || '', x.cen || '', x.kind), bg, ink, 36)}
      <div class="grow"><div class="title ell">${esc(txCat(x)) || tr('uncategorized')}</div>${sub ? `<div class="sub ell">${sub}</div>` : ''}</div>
      <span class="b ${x.kind === 'income' ? 'pos' : 'neg'}" style="font-size:13.5px">${amount(signed, { signed: true })}</span></div></div>`;
}

export function instPaidRow(i) {
  return `<div class="item click" data-a="pay" data-id="${i.id}">${chip('bank', 'var(--gold-bg)', 'var(--gold)', 36)}
    <div class="grow"><div class="title ell">${t('inst_of', esc(i.lender))}</div><div class="sub">${t('inst_n', num(i.seq))}</div></div>
    <span class="b" style="font-size:13.5px">${amount(-i.paid, { signed: true })}</span></div>`;
}
