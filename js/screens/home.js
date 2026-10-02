// Home: month balance with donut, loan-debt strip, expenses by category, upcoming installments.
import * as D from '../db.js';
import * as J from '../jalali.js';
import { amount, compact, esc, isFa, month, num, percent, t, tr, unitLabel } from '../core.js';
import { forCategory } from '../icons.js';
import { BAR_COLORS, FLOW, alpha, loanColor, shade } from '../theme.js';
import { catName, chip, donut, hint, legend, pill, ring } from '../ui/kit.js';
import { S } from '../ui/state.js';

export const homeScreen = () => {
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

export function topSlices(all) {
  const list = all.filter((s) => s.total > 0);
  if (list.length <= 5) return list;
  const rest = list.slice(4).reduce((s, c) => s + c.total, 0);
  return [...list.slice(0, 4), { cid: -1, name_fa: 'سایر', name_en: 'Others', color: '#9AA3AE', total: rest }];
}

export function categoryBars(slices, total) {
  const max = Math.max(...slices.map((s) => s.total));
  return `<div class="bars">${slices.map((s, i) => {
    const color = s.cid === -1 ? BAR_COLORS[5] : BAR_COLORS[i % 5];
    const ink = S.dark ? color : shade(color);
    const h = Math.max(8, Math.round((100 * s.total) / max));
    const pct = total > 0 ? Math.round((s.total * 100) / total) : 0;
    const icon = s.cid === -1 ? 'other' : forCategory(s.name_fa || '', s.name_en || '', 'expense');
    return `<div class="bar"><span class="b" style="font-size:11px">${percent(pct)}</span>
      <div class="track"><div class="fill" style="height:${h}px;background:linear-gradient(${color},${alpha(color, 0.8)});animation-delay:${0.2 + i * 0.07}s"></div></div>
      ${chip(icon, alpha(color, S.dark ? 0.22 : 0.2), ink, 28, 14)}<span class="name">${esc(catName(s))}</span></div>`;
  }).join('')}</div>`;
}

export function instRow(i) {
  const days = J.daysBetween(J.todayIso(), i.due_date);
  const status = days < 0 ? t('days_late', num(-days)) : days === 0 ? tr('due_today') : t('days_left', num(days));
  return `<div class="row click" style="padding:8px 0" data-a="pay" data-id="${i.id}">
    <span class="sq" style="background:${loanColor(i.loan_id, S.dark)}"></span>
    <div class="grow"><div class="sb ell" style="font-size:13px">${esc(i.lender)}</div>
      <div class="ell ${days < 0 ? 'neg' : 'muted'}" style="font-size:11px">${t('inst_n', num(i.seq))} · ${status}</div></div>
    <span class="b" style="font-size:13px">${amount(i.amount - i.paid)}</span></div>`;
}
