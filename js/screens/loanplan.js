// Payment plan: every loan's installments by month of a year, or by year, with what is paid and what is left.
import * as D from '../db.js';
import * as J from '../jalali.js';
import { amount, compact, dayMonth, esc, isFa, num, percent, t, tr, unitLabel } from '../core.js';
import { ic } from '../icons.js';
import { FLOW, loanColor } from '../theme.js';
import { hint, ring, rtl, seg, topbar } from '../ui/kit.js';
import { S } from '../ui/state.js';

/** Paid, overdue and upcoming money of a set of installments. */
function sum(list, today) {
  const s = { total: 0, paid: 0, overdue: 0, upcoming: 0, count: list.length, done: 0 };
  for (const i of list) {
    const left = Math.max(0, i.amount - i.paid);
    s.total += i.amount;
    s.paid += Math.min(i.paid, i.amount);
    if (left === 0) s.done += 1;
    else if (i.due_date < today) s.overdue += left;
    else s.upcoming += left;
  }
  s.left = s.overdue + s.upcoming;
  return s;
}

const parts = (s) => [[s.paid, FLOW.income], [s.overdue, FLOW.expense], [s.upcoming, FLOW.installments]]
  .filter(([v]) => v > 0).map(([v, c]) => `<i style="flex:${v};background:${c}"></i>`).join('');

export const loanPlanScreen = () => {
  const st = S.plan;
  const today = J.todayIso();
  const [ty, tm] = J.today();
  if (st.year === null) st.year = ty;
  const all = D.planInstallments();
  if (!all.length) return `<div class="page sub">${topbar(tr('loan_plan'), true)}${hint(tr('no_loans_long'))}</div>`;

  let scope;
  let rows;
  if (st.yearly) {
    const years = new Map();
    for (const i of all) {
      const y = J.fromIso(i.due_date)[0];
      if (!years.has(y)) years.set(y, []);
      years.get(y).push(i);
    }
    const sums = [...years].map(([y, list]) => [y, sum(list, today)]);
    const max = Math.max(...sums.map(([, s]) => s.total));
    scope = all;
    rows = sums.map(([y, s]) => planRow(s, max, {
      label: `${tr('year')} ${num(y)}`, now: y === ty ? tr('plan_this_year') : '',
      attrs: `data-a="planYear" data-y="${y}"`, chev: rtl() ? 'chev_left' : 'chev_right',
    })).join('');
  } else {
    const months = Array.from({ length: 12 }, () => []);
    for (const i of all) {
      const [y, m] = J.fromIso(i.due_date);
      if (y === st.year) months[m - 1].push(i);
    }
    const sums = months.map((list) => sum(list, today));
    const max = Math.max(1, ...sums.map((s) => s.total));
    scope = months.flat();
    rows = sums.map((s, k) => {
      const key = `${st.year}-${k + 1}`;
      const open = st.open === key;
      return planRow(s, max, {
        label: J.monthName(k + 1, isFa()),
        now: st.year === ty && k + 1 === tm ? tr('this_month') : '',
        attrs: `data-a="planOpen" data-k="${key}"`, chev: 'chev_left', open,
        detail: open ? details(months[k], today) : '',
      });
    }).join('');
  }

  const s = sum(scope, today);
  const frac = s.total ? s.paid / s.total : 0;
  const stat = (label, value, color) => `<div class="plan-stat"><span class="k"><i style="background:${color}"></i>${label}</span><span class="v">${value}</span></div>`;
  const yearNav = st.yearly ? '' : `<div class="row">${ring(rtl() ? 'chev_right' : 'chev_left', 'planShift', 'data-n="-1"', 'sm')}
    <div class="grow center b" style="font-size:15px">${tr('year')} ${num(st.year)}</div>${ring(rtl() ? 'chev_left' : 'chev_right', 'planShift', 'data-n="1"', 'sm')}</div>`;

  return `<div class="page sub">
  ${topbar(tr('loan_plan'), true)}
  ${seg([tr('plan_by_month'), tr('plan_by_year')], st.yearly, 'planYearly')}
  ${yearNav}
  <div class="hero plan-hero rise">
    <div class="row"><span class="lbl grow">${st.yearly ? tr('plan_all') : `${tr('year')} ${num(st.year)}`}</span>
      <span class="plan-pct">${percent(Math.floor(frac * 100))} ${tr('plan_paid')}</span></div>
    <div class="big num">${amount(s.left)}</div>
    <div class="lbl">${tr('plan_left_long')} · ${unitLabel()}</div>
    <div class="plan-split">${parts(s)}</div>
    <div class="row plan-stats">${stat(tr('plan_paid'), compact(s.paid), FLOW.income)}${stat(tr('plan_overdue'), compact(s.overdue), FLOW.expense)}${stat(tr('plan_upcoming'), compact(s.upcoming), FLOW.installments)}</div>
  </div>
  <div class="card plan-list rise" style="animation-delay:.05s">${rows}</div>
  ${st.yearly ? `<div class="hint" style="padding:0">${tr('plan_year_hint')}</div>` : ''}
</div>`;
};

function planRow(s, max, o) {
  if (!s.count) {
    return `<div class="plan-row empty"><span class="plan-name">${o.label}</span>${o.now ? `<span class="plan-now">${o.now}</span>` : ''}
      <span class="grow"></span><span class="muted" style="font-size:11.5px">${tr('plan_none')}</span></div>`;
  }
  return `<div class="plan-row click ${o.now ? 'now' : ''} ${o.open ? 'open' : ''}" ${o.attrs}>
    <div class="row" style="gap:8px"><span class="plan-name">${o.label}</span>${o.now ? `<span class="plan-now">${o.now}</span>` : ''}<span class="grow"></span>
      <span class="muted" style="font-size:11px">${t('x_of_y', num(s.done), num(s.count))}</span><span class="plan-chev ${o.open ? 'up' : ''}">${ic(o.chev, 14)}</span></div>
    <div class="plan-bar"><div style="width:${(s.total / max) * 100}%">${parts(s)}</div></div>
    <div class="row plan-nums"><span><i style="background:${FLOW.income}"></i>${tr('plan_paid')} <b>${amount(s.paid)}</b></span><span class="grow"></span>
      <span><i style="background:${s.overdue ? FLOW.expense : FLOW.installments}"></i>${tr('plan_left')} <b class="${s.overdue ? 'neg' : ''}">${amount(s.left)}</b></span></div>
    ${o.detail || ''}
  </div>`;
}

function details(list, today) {
  return `<div class="plan-detail">${list.map((i) => {
    const left = i.amount - i.paid;
    const [cls, note] = left <= 0 ? ['pos', tr('plan_done')] : i.due_date < today ? ['neg', tr('plan_overdue')] : ['muted', dayMonth(i.due_date)];
    return `<div class="row" style="gap:8px"><span class="sq" style="width:12px;height:12px;border-radius:4px;background:${loanColor(i.loan_id, S.dark)}"></span>
      <span class="grow ell">${esc(i.lender)} · ${t('inst_n', num(i.seq))}</span><span class="${cls}" style="font-size:11px">${note}</span><span class="sb">${amount(i.amount)}</span></div>`;
  }).join('')}</div>`;
}
