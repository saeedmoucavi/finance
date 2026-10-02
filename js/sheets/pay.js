// Pay (or change / undo) one installment.
import * as D from '../db.js';
import * as J from '../jalali.js';
import { amount, date, esc, fromDisplay, num, t, toDisplay, tr } from '../core.js';
import { accName, dateField, field, pick } from '../ui/kit.js';
import { closeAll, dialogBox, push, renderLayers } from '../ui/layers.js';
import { render, toast } from '../ui/shell.js';

export function openPay(id) {
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
