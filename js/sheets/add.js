// Quick-add sheet: expense, income or installment payment with the built-in keypad.
import * as D from '../db.js';
import * as J from '../jalali.js';
import { amount, compact, dayMonth, esc, fromDisplay, group, num, t, toDisplay, tr, unitLabel } from '../core.js';
import { forCategory, ic } from '../icons.js';
import { loanColor } from '../theme.js';
import { accName, catName, dateField, field, hint, pick, seg } from '../ui/kit.js';
import { closeAll, confirmDialog, push, renderLayers, sheetHead } from '../ui/layers.js';
import { render, toast } from '../ui/shell.js';
import { S } from '../ui/state.js';

export function openAdd(mode = 'expense', tx = null) {
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
          <span class="sq" style="background:${loanColor(i.loan_id, S.dark)}"></span><div class="grow"><div class="sb ell" style="font-size:13px">${esc(i.lender)}</div>
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
export const amtText = (L) => (Number(L.digits) ? group(Number(L.digits)) : num(0));
export const amtSub = (L) => (Number(L.digits) >= 1000 ? `${compact(fromDisplay(Number(L.digits)))} ${unitLabel()}` : unitLabel());
export const canSave = (L) => Number(L.digits) > 0 && (L.mode !== 2 || !!L.inst);
