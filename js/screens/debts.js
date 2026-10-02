// Debts and credits (money lent and borrowed privately).
import * as D from '../db.js';
import { amount, date, esc, tr } from '../core.js';
import { chip, hint, pill, ring, seg, topbar } from '../ui/kit.js';
import { S } from '../ui/state.js';

export const debtsScreen = () => {
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
