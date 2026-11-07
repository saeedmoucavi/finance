// Settings: theme, language, currency, reminder days.
import { isFa, num, prefs, tr } from '../core.js';
import { ic } from '../icons.js';
import { SKINS } from '../theme.js';
import { ring, seg, toggle, topbar } from '../ui/kit.js';
import { S } from '../ui/state.js';

/** One card per look, drawn as a tiny phone in that look's colours. */
const skinPicker = () => `<div class="skins">${SKINS.map((s) => {
  const [page, hero, card, accent] = s.pv;
  const on = S.skin === s.id;
  return `<button class="skin ${on ? 'on' : ''}" data-a="setTheme" data-t="${s.id}" aria-pressed="${on}">
    <span class="pv" style="background:${page}"><i class="h" style="background:${hero}"></i><i class="c" style="background:${card}"></i><i class="c" style="background:${card};width:70%"></i><i class="a" style="background:${accent}"></i></span>
    <span class="nm">${tr(themeKey(s.id))}<span class="ck">${on ? ic('check', 11, 3) : ''}</span></span></button>`;
}).join('')}</div>`;

export const themeKey = (id) => 'theme_' + id.replace('-', '_');

export const settingsScreen = () => {
  const section = (title, body) => `<div class="muted" style="font-size:12px;padding:0 6px">${title}</div><div class="card col" style="gap:12px;padding:14px">${body}</div>`;
  return `<div class="page sub">
  ${topbar(tr('settings'), true)}
  ${section(tr('appearance'), skinPicker())}
  ${section(tr('lang_unit'), seg(['فارسی', 'English'], isFa() ? 0 : 1, 'setLang') + seg([tr('toman'), tr('rial')], prefs.unit === 'rial' ? 1 : 0, 'setUnit') +
    (isFa() ? `<div class="row"><span class="grow" style="font-weight:500">${tr('fa_digits')}</span>${toggle(prefs.faDigits, 'setDigits')}</div>` : ''))}
  ${section(tr('reminders'), `<div class="row"><div class="grow"><div style="font-weight:500">${tr('remind_before')}</div><div class="muted" style="font-size:11px">${tr('calendar_sub')}</div></div>
    ${ring('minus', 'setDays', 'data-n="-1"', 'sm')}<span class="b center" style="width:26px;font-size:16px">${num(prefs.reminderDays)}</span>${ring('plus', 'setDays', 'data-n="1"', 'sm')}</div>
    <button class="obtn" data-a="calendar">${ic('calendar', 17)}${tr('calendar')}</button>`)}
  <div class="hint" style="font-size:11px">${tr('settings_note')}</div>
</div>`;
};
