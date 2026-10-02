// Debt form and the settle dialog.
import * as D from '../db.js';
import * as J from '../jalali.js';
import { esc, fromDisplay, toDisplay, tr, unitLabel } from '../core.js';
import { ic } from '../icons.js';
import { dateField, field, seg } from '../ui/kit.js';
import { closeAll, confirmDialog, dialogBox, push, renderLayers, sheetHead } from '../ui/layers.js';
import { render, toast } from '../ui/shell.js';
import { S } from '../ui/state.js';

export function openDebt(debt = null) {
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

export function openSettle(d) {
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
