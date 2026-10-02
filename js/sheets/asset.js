// Asset form and the deposit / withdraw dialog.
import * as D from '../db.js';
import * as J from '../jalali.js';
import { amount, date, esc, fromDisplay, toDisplay, tr, unitLabel } from '../core.js';
import { forAsset, ic } from '../icons.js';
import { field, pick } from '../ui/kit.js';
import { closeAll, confirmDialog, dialogBox, push, renderLayers, sheetHead } from '../ui/layers.js';
import { render, toast } from '../ui/shell.js';
import { ASSET_KINDS } from '../ui/state.js';

export function openAsset(asset = null) {
  const hist = asset ? D.assetHistory(asset.id) : [];
  push({
    name: asset?.name ?? '', kind: asset?.kind ?? 'savings', amt: asset ? String(toDisplay(asset.amount)) : '', note: asset?.note ?? '',
    render(L) {
      return `${sheetHead(tr(asset ? 'edit_asset' : 'new_asset'))}
        ${field(tr('name'), 'name', L.name, { placeholder: tr('asset_hint') })}
        <div class="wrap">${ASSET_KINDS.map((k) => pick(tr('kind_' + k), k === L.kind, '.pickKind', `data-k="${k}"`, forAsset(k))).join('')}</div>
        ${field(tr('balance'), 'amt', L.amt, { amountField: true, placeholder: unitLabel() })}
        ${field(tr('note'), 'note', L.note, { placeholder: tr('optional') })}
        <button class="btn" data-a=".save">${tr('save')}</button>
        ${hist.length ? `<div class="b" style="font-size:13px;margin-top:6px">${tr('history')}</div>${hist.map((h) => {
          const d = h.new_amount - h.old_amount;
          return `<div class="row" style="font-size:12.5px;padding:3px 0"><span class="muted grow">${date(h.date)}</span><span class="sb ${d >= 0 ? 'pos' : 'neg'}">${amount(d, { signed: true })}</span></div>`;
        }).join('')}` : ''}
        ${asset ? `<button class="obtn neg" data-a=".del">${ic('trash', 17)}${tr('delete')}</button>` : ''}`;
    },
    pickKind(ds) { this.kind = ds.k; renderLayers(); },
    save() {
      if (!this.name.trim()) return;
      const v = fromDisplay(Number(this.amt) || 0);
      if (asset) D.updateAsset(asset.id, this.name.trim(), this.kind, v, this.note.trim());
      else D.addAsset(this.name.trim(), this.kind, v, this.note.trim());
      closeAll(); render(); toast(tr('saved'));
    },
    del() { confirmDialog(tr('delete_q'), '', tr('delete'), () => { D.deleteAsset(asset.id); closeAll(); render(); }); },
  });
}

export function openAdjust(asset, sign) {
  push({
    dialog: true, amt: '', note: '',
    render(L) {
      return dialogBox(`${tr(sign > 0 ? 'deposit' : 'withdraw')} · ${esc(asset.name)}`,
        field(tr('amount'), 'amt', L.amt, { amountField: true, placeholder: unitLabel() }) + field(tr('note'), 'note', L.note, { placeholder: tr('optional') }),
        [{ label: tr('cancel'), a: 'close' }, { label: tr('save'), a: '.ok', cls: 'ok' }]);
    },
    ok() {
      const v = fromDisplay(Number(this.amt) || 0);
      if (v > 0) { D.adjustAsset(asset.id, v * sign, J.todayIso(), this.note.trim()); toast(tr('saved')); }
      closeAll(); render();
    },
  });
}
