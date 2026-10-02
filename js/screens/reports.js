// Reports: monthly / yearly totals, overall position, categories, Excel / PDF export.
import * as J from '../jalali.js';
import * as X from '../export.js';
import { amount, esc, month, num, percent, tr } from '../core.js';
import { ic } from '../icons.js';
import { FLOW } from '../theme.js';
import { catName, donut, hint, ring, rtl, seg, topbar } from '../ui/kit.js';
import { S } from '../ui/state.js';

export const reportsScreen = () => {
  const st = S.rep;
  if (!st.ym) st.ym = J.today().slice(0, 2);
  const [start, end] = st.yearly ? J.yearRange(st.ym[0]) : J.monthRange(st.ym[0], st.ym[1]);
  const label = st.yearly ? `${tr('year')} ${num(st.ym[0])}` : month(st.ym[0], st.ym[1]);
  const r = X.reportData(start, end, label);
  S.report = r;
  const lg = (c, l, v) => `<div class="legend"><span class="dot" style="background:${c}"></span><span class="t2">${l}</span><span class="v">${amount(v)}</span></div>`;
  const pos = [[tr('assets_total'), r.assets], [tr('final_total'), r.final], [tr('receivables'), r.receivable], [tr('payables'), r.payable], [tr('loan_debt'), r.loanDebt], [tr('net_worth'), r.netWorth]];
  return `<div class="page sub">
  ${topbar(tr('reports'), true)}
  ${seg([tr('monthly'), tr('yearly')], st.yearly, 'repYearly')}
  <div class="row">${ring(rtl() ? 'chev_right' : 'chev_left', 'repShift', 'data-n="-1"', 'sm')}<div class="grow center b" style="font-size:15px">${label}</div>${ring(rtl() ? 'chev_left' : 'chev_right', 'repShift', 'data-n="1"', 'sm')}</div>
  <div class="card row" style="gap:14px"><div class="grow col" style="gap:8px;font-size:12.5px">${lg(FLOW.income, tr('income'), r.totals.income)}${lg(FLOW.expense, tr('expenses'), r.totals.expense)}${lg(FLOW.installments, tr('installments'), r.totals.installments)}
    <div class="divider"></div><div class="row"><span class="b grow">${tr('balance')}</span><span class="b ${r.totals.net < 0 ? 'neg' : 'pos'}">${amount(r.totals.net)}</span></div></div>
    ${donut([r.totals.income, r.totals.expense, r.totals.installments], [FLOW.income, FLOW.expense, FLOW.installments], 96, 12, 'var(--track)')}</div>
  <div class="card"><div class="b" style="font-size:13.5px;margin-bottom:6px">${tr('position')}</div>
    ${pos.map(([k, v]) => `<div class="row" style="padding:4px 0;font-size:12.5px"><span class="t2 grow">${k}</span><span class="sb">${amount(v)}</span></div>`).join('')}</div>
  ${catList(tr('expenses_by_cat'), r.expenseCats)}
  ${r.incomeCats.length ? catList(tr('income_by_cat'), r.incomeCats) : ''}
  <div class="row"><button class="obtn grow" data-a="exportExcel">${ic('file', 17)}${tr('export_excel')}</button><button class="obtn grow" data-a="exportPdf">${ic('print', 17)}${tr('export_pdf')}</button></div>
  <button class="link" style="align-self:center" data-a="exportHtml">${tr('report_view')}</button>
</div>`;
};

export function catList(title, cats) {
  if (!cats.length) return `<div class="card"><div class="b" style="font-size:13.5px">${title}</div>${hint(tr('nothing_period'))}</div>`;
  const total = Math.max(1, cats.reduce((s, c) => s + c.total, 0));
  const max = Math.max(1, ...cats.map((c) => c.total));
  return `<div class="card"><div class="b" style="font-size:13.5px;margin-bottom:8px">${title}</div>${cats.map((c, i) => `
    <div style="padding:5px 0"><div class="row" style="gap:8px;font-size:12.5px"><span class="dot" style="width:9px;height:9px;background:${esc(c.color || '#BFC9CA')}"></span>
      <span class="grow ell">${esc(catName(c))}</span><span class="muted" style="font-size:11px">${percent(Math.round((c.total * 100) / total))}</span><span class="sb">${amount(c.total)}</span></div>
      <div style="margin-top:5px;height:6px;border-radius:3px;background:var(--track);overflow:hidden"><div style="height:100%;width:${(c.total / max) * 100}%;border-radius:3px;background:${esc(c.color || '#BFC9CA')};animation:fillx .8s cubic-bezier(.16,.84,.34,1) ${0.15 + i * 0.05}s both"></div></div></div>`).join('')}</div>`;
}
