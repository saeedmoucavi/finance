// Editable lists: expense and income categories, payment methods.
import * as D from '../db.js';
import { esc, tr } from '../core.js';
import { forCategory } from '../icons.js';
import { accName, catName, chip, ring, seg, toggle, topbar } from '../ui/kit.js';
import { S } from '../ui/state.js';

export const listsScreen = () => {
  const tab = S.lists.tab;
  const rows = tab < 2
    ? D.categories(tab === 1 ? 'income' : 'expense', true).map((c) => ({ id: c.id, icon: forCategory(c.name_fa, c.name_en, c.kind), name: catName(c), on: !c.archived, acc: 0 }))
    : D.accounts(true).map((a) => ({ id: a.id, icon: 'wallet', name: accName(a), on: !a.archived, acc: 1 }));
  return `<div class="page sub">
  ${topbar(tr('lists'), true, ring('plus', 'listAdd'))}
  ${seg([tr('expense'), tr('income'), tr('methods')], tab, 'listTab')}
  <div class="muted" style="font-size:11px;padding:0 6px">${tr('lists_help')}</div>
  <div class="card tight">${rows.map((r, i) => `${i ? '<div class="divider"></div>' : ''}<div class="row" style="padding:6px 8px">
    ${chip(r.icon, 'var(--field)', r.on ? 'var(--accent)' : 'var(--muted)', 34)}<span class="grow ell" style="font-weight:500;${r.on ? '' : 'color:var(--muted)'}">${esc(r.name)}</span>
    ${ring('edit', 'listRename', `data-id="${r.id}" data-acc="${r.acc}"`, 'sm')}${toggle(r.on, 'listToggle" data-id="' + r.id + '" data-acc="' + r.acc)}</div>`).join('')}</div>
</div>`;
};
