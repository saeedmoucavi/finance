// New / edit loan form; changing amounts rebuilds the schedule, keeping payments.
import * as D from '../db.js';
import * as J from '../jalali.js';
import { amount, fromDisplay, toDisplay, tr, unitLabel } from '../core.js';
import { ic } from '../icons.js';
import { dateField, field, toggle } from '../ui/kit.js';
import { closeAll, confirmDialog, push, renderLayers, sheetHead } from '../ui/layers.js';
import { render, toast } from '../ui/shell.js';
import { S } from '../ui/state.js';

export function openLoan(loan = null) {
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
export const loanValid = (L) => L.lender.trim() && Number(L.total) > 0 && Number(L.count) >= 1 && Number(L.count) <= 600;
export function perInst(L) {
  const total = fromDisplay(Number(L.total) || 0);
  const n = Number(L.count) || 0;
  return total > 0 && n > 0 ? `<span class="t2" style="font-size:12.5px">${tr('per_inst')}</span><span class="b">${amount(Math.floor(total / n), { withUnit: true })}</span>`
    : `<span class="muted" style="font-size:12px">${tr('per_inst')}</span>`;
}
