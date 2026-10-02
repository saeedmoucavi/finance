// More: loans / debts tiles and the menu of tools and settings.
import * as D from '../db.js';
import * as J from '../jalali.js';
import { compact, isFa, prefs, tr, unitLabel } from '../core.js';
import { chip, toggle, topbar } from '../ui/kit.js';

export const moreScreen = () => {
  const [ty, tm] = J.today();
  const loanDebt = D.loanTotals(...J.monthRange(ty, tm)).remaining;
  const net = D.debtsOutstanding('receivable') - D.debtsOutstanding('payable');
  const tile = (icon, bg, ink, label, value, s) => `<button class="tile" data-a="go" data-s="${s}">${chip(icon, bg, ink, 36)}
    <span class="t2" style="font-size:12px;margin-top:4px">${label}</span><span class="sb ell" style="font-size:17px">${value}</span></button>`;
  const menu = (icon, title, sub, a, attrs = '', trailing = '') => `<div class="menu ${a ? 'click' : ''}" ${a ? `data-a="${a}"` : ''} ${attrs}>
    ${chip(icon, 'var(--field)', 'var(--accent)', 36)}<div class="grow"><div class="title">${title}</div><div class="sub">${sub}</div></div>${trailing}</div>`;
  const standalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  return `<div class="page">
  ${topbar(tr('nav_more'), false)}
  ${standalone ? '' : `<div class="card row" style="align-items:flex-start">${chip('share', 'var(--gold-bg)', 'var(--gold)', 34)}
     <div class="grow"><div class="b" style="font-size:13.5px">${tr('install_title')}</div><div class="t2" style="font-size:12px;line-height:1.7">${tr('install_hint')}</div></div></div>`}
  <div class="row">${tile('bank', 'var(--neg-bg)', 'var(--neg)', tr('loan_debt'), compact(loanDebt), 'loans')}${tile('swap', 'var(--gold-bg)', 'var(--gold)', tr('debts'), compact(net), 'debts')}</div>
  <div class="card tight">
    ${menu('bank', tr('nav_loans'), tr('loans_menu_sub'), 'go', 'data-s="loans"')}<div class="divider"></div>
    ${menu('chart', tr('reports'), tr('reports_sub'), 'go', 'data-s="reports"')}<div class="divider"></div>
    ${menu('calendar', tr('calendar'), tr('calendar_sub'), 'calendar')}<div class="divider"></div>
    ${menu('list', tr('lists'), tr('lists_sub'), 'go', 'data-s="lists"')}
  </div>
  <div class="card tight">
    ${menu('moon', tr('appearance'), tr('appearance_sub'), 'go', 'data-s="settings"', `<span class="t2" style="font-size:12px">${tr('theme_' + prefs.theme)}</span>`)}<div class="divider"></div>
    ${menu('globe', tr('lang_unit'), (isFa() ? 'فارسی' : 'English') + ' · ' + unitLabel(), 'go', 'data-s="settings"')}<div class="divider"></div>
    ${menu('lock', tr('pin_lock'), tr('pin_lock_sub'), '', '', toggle(!!localStorage.getItem('pin'), 'pinToggle'))}
  </div>
  <div class="card tight">
    ${menu('download', tr('import_pc'), tr('import_pc_sub'), 'importDb')}<div class="divider"></div>
    ${menu('share', tr('backup_send'), tr('backup_send_sub'), 'backup')}
  </div>
  <div class="hint" style="padding:4px 8px;font-size:11px;line-height:1.8">${tr('storage_note')}<br>${tr('about_line')}</div>
</div>`;
};
