// Settings: theme, language, currency, reminder days.
import { isFa, num, prefs, tr } from '../core.js';
import { ic } from '../icons.js';
import { ring, seg, toggle, topbar } from '../ui/kit.js';

export const settingsScreen = () => {
  const themes = ['light', 'dark', 'auto'];
  const section = (title, body) => `<div class="muted" style="font-size:12px;padding:0 6px">${title}</div><div class="card col" style="gap:12px;padding:14px">${body}</div>`;
  return `<div class="page sub">
  ${topbar(tr('settings'), true)}
  ${section(tr('appearance'), seg(themes.map((x) => tr('theme_' + x)), themes.indexOf(prefs.theme), 'setTheme'))}
  ${section(tr('lang_unit'), seg(['فارسی', 'English'], isFa() ? 0 : 1, 'setLang') + seg([tr('toman'), tr('rial')], prefs.unit === 'rial' ? 1 : 0, 'setUnit') +
    (isFa() ? `<div class="row"><span class="grow" style="font-weight:500">${tr('fa_digits')}</span>${toggle(prefs.faDigits, 'setDigits')}</div>` : ''))}
  ${section(tr('reminders'), `<div class="row"><div class="grow"><div style="font-weight:500">${tr('remind_before')}</div><div class="muted" style="font-size:11px">${tr('calendar_sub')}</div></div>
    ${ring('minus', 'setDays', 'data-n="-1"', 'sm')}<span class="b center" style="width:26px;font-size:16px">${num(prefs.reminderDays)}</span>${ring('plus', 'setDays', 'data-n="1"', 'sm')}</div>
    <button class="obtn" data-a="calendar">${ic('calendar', 17)}${tr('calendar')}</button>`)}
  <div class="hint" style="font-size:11px">${tr('settings_note')}</div>
</div>`;
};
