// Bottom sheets and dialogs stacked over the screen, plus the generic confirm / date / name dialogs.
import * as J from '../jalali.js';
import { isFa, month, num, tr } from '../core.js';
import { field, ring, rtl } from './kit.js';
import { render } from './shell.js';
import { $layers } from './state.js';

/** Open sheets and dialogs, bottom to top. */
export let layers = [];

export const top = () => layers[layers.length - 1];
export function push(L) { layers.push(L); renderLayers(); }
export function pop() { layers.pop(); renderLayers(); }
export function closeAll() { layers = []; renderLayers(); }

export function renderLayers() {
  const scrolls = [...$layers.children].map((c) => c.firstElementChild?.scrollTop || 0);
  $layers.innerHTML = layers.map((L, i) => {
    const inner = L.render(L);
    const box = L.dialog ? `<div class="dialog">${inner}</div>` : `<div class="sheet"><div class="handle"></div>${inner}</div>`;
    return `<div class="layer ${L.dialog ? 'dlg' : ''} ${L.shown ? '' : 'enter'}" data-layer="${i}">${box}</div>`;
  }).join('');
  [...$layers.children].forEach((c, i) => { if (scrolls[i]) c.firstElementChild.scrollTop = scrolls[i]; });
  layers.forEach((L) => { L.shown = true; });
  document.body.style.overflow = layers.length ? 'hidden' : '';
}

export const sheetHead = (title) => `<div class="row"><h2>${title}</h2>${ring('close', 'close', '', 'sm')}</div>`;
export function dialogBox(title, body, acts) {
  return `<h2>${title}</h2>${body}<div class="acts">${acts.map((a) => `<button class="${a.cls || ''}" data-a="${a.a}">${a.label}</button>`).join('')}</div>`;
}

export function confirmDialog(title, body, okLabel, onOk, danger = true) {
  push({
    dialog: true,
    render: () => dialogBox(title, body ? `<div class="t2" style="font-size:13px">${body}</div>` : '', [
      { label: tr('cancel'), a: 'close' }, { label: okLabel, a: '.ok', cls: danger ? 'danger ok' : 'ok' }]),
    ok() { pop(); onOk(); },
  });
}

export function datePicker(initial, onPick) {
  const [y, m] = J.fromIso(initial || J.todayIso());
  push({
    dialog: true, y, m, sel: initial || J.todayIso(),
    render(L) {
      const names = isFa() ? J.WEEK_SHORT_FA : J.WEEK_SHORT_EN;
      const off = J.weekdayIndex(J.toIso(L.y, L.m, 1));
      const len = J.monthLength(L.y, L.m);
      const today = J.todayIso();
      let cells = names.map((n) => `<div class="wd">${n}</div>`).join('') + '<span></span>'.repeat(off);
      for (let d = 1; d <= len; d++) {
        const iso = J.toIso(L.y, L.m, d);
        cells += `<button class="${iso === L.sel ? 'sel' : ''} ${iso === today ? 'today' : ''}" data-a=".day" data-iso="${iso}">${num(d)}</button>`;
      }
      return `<h2>${tr('pick_date')}</h2>
        <div class="cal-head">${ring(rtl() ? 'chev_right' : 'chev_left', '.shift', 'data-n="-1"', 'sm')}
          <div class="grow center b">${month(L.y, L.m)}</div>${ring(rtl() ? 'chev_left' : 'chev_right', '.shift', 'data-n="1"', 'sm')}</div>
        <div class="cal-grid">${cells}</div>
        <div class="acts"><button data-a=".today" style="margin-inline-end:auto">${tr('today')}</button>
          <button data-a="close">${tr('cancel')}</button><button class="ok" data-a=".ok">${tr('ok')}</button></div>`;
    },
    shift(ds) { [this.y, this.m] = J.addMonths(this.y, this.m, Number(ds.n)); renderLayers(); },
    day(ds) { this.sel = ds.iso; renderLayers(); },
    today() { this.sel = J.todayIso(); [this.y, this.m] = J.today(); renderLayers(); },
    ok() { pop(); onPick(this.sel); },
  });
}

export function nameDialog(title, initial, onOk) {
  push({
    dialog: true, name: initial,
    render: (L) => dialogBox(title, field(tr('name'), 'name', L.name), [{ label: tr('cancel'), a: 'close' }, { label: tr('save'), a: '.ok', cls: 'ok' }]),
    ok() { if (this.name.trim()) onOk(this.name.trim()); closeAll(); render(); },
  });
}
