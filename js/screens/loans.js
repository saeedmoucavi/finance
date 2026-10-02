// Loans: summary strip and expandable loan cards with their installments.
import * as D from '../db.js';
import * as J from '../jalali.js';
import { amount, compact, date, dayMonth, esc, num, percent, t, tr } from '../core.js';
import { FLOW, loanColor } from '../theme.js';
import { hint, miniRing, ring, topbar } from '../ui/kit.js';
import { S } from '../ui/state.js';

export const loansScreen = () => {
  const st = S.loans;
  const loans = D.loans(st.archived);
  if (st.open === undefined) st.open = loans[0]?.id ?? null;
  const [ty, tm] = J.today();
  const lt = D.loanTotals(...J.monthRange(ty, tm));
  const cell = (label, value, w) => `<div class="col" style="flex:${w};min-width:0"><span class="ell" style="font-size:11px;color:var(--hero-muted)">${label}</span>
    <span class="ell" style="font-size:17px;font-weight:600;color:#fff">${value}</span></div>`;
  return `<div class="page sub">
  ${topbar(tr('nav_loans'), true, ring('plus', 'loanNew'))}
  <div class="hero row" style="border-radius:24px;padding:14px 16px;gap:14px">${cell(tr('remaining_total'), compact(lt.remaining), 1.2)}${cell(tr('this_month'), compact(lt.dueThisMonth), 1)}${cell(tr('active_loans'), num(lt.active), 0.7)}</div>
  ${loans.length ? loans.map(loanCard).join('') : hint(tr('no_loans_long'))}
  <button class="link center" style="align-self:center" data-a="loanArchived">${tr(st.archived ? 'hide_archived' : 'show_archived')}</button>
</div>`;
};

export function loanCard(l) {
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
    <div class="row click" data-a="loanToggle" data-id="${l.id}"><span class="sq" style="width:22px;height:22px;border-radius:7px;background:${loanColor(l.id, S.dark)}"></span>
      <div class="grow"><div class="b ell" style="font-size:14.5px">${esc(l.lender)}${l.archived ? ' · ' + tr('archived') : ''}</div><div class="muted ell" style="font-size:11px">${sub}</div></div>
      ${miniRing(frac, open ? 46 : 40, open ? percent(Math.floor(frac * 100)) : '')}</div>${body}</div>`;
}

export function instLine(i, isNext) {
  const days = J.daysBetween(J.todayIso(), i.due_date);
  const isOpen = i.paid < i.amount;
  const dot = !isOpen ? FLOW.income : days < 0 ? FLOW.expense : isNext ? FLOW.installments : 'var(--hair)';
  return `<div class="row click" style="padding:8px 0;font-size:12.5px" data-a="pay" data-id="${i.id}">
    <span class="dot" style="background:${dot}"></span><span class="${isOpen ? '' : 'muted'}">${t('inst_n', num(i.seq))}</span>
    <span class="muted grow ell" style="font-size:12px">${date(i.due_date)}</span>
    ${isOpen ? `<span class="sb">${amount(i.amount - i.paid)}</span><span class="mini">${tr('pay')}</span>` : `<span class="pos sb" style="font-size:12px">${tr('paid_check')}</span>`}</div>`;
}
