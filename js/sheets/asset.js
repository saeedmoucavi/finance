// Asset form (live market holding or manual amount) and the buy / sell or deposit / withdraw dialog.
import * as D from '../db.js';
import * as J from '../jalali.js';
import { amount, date, esc, fromDisplay, isFa, toDisplay, toLatin, tr, unitLabel } from '../core.js';
import { forAsset, ic } from '../icons.js';
import { CATALOG, GROUPS, item } from '../market.js';
import { dateField, field, pick, qty, seg } from '../ui/kit.js';
import { closeAll, confirmDialog, dialogBox, push, renderLayers, sheetHead } from '../ui/layers.js';
import { render, toast } from '../ui/shell.js';
import { ASSET_KINDS } from '../ui/state.js';

const decimal = (s) => Number(toLatin(String(s)).replace(/[^\d.]/g, '')) || 0;
const itemName = (m) => (isFa() ? m.fa : m.en);
const itemUnit = (m) => (isFa() ? m.unitFa : m.unitEn);

/** Best catalog match for a manual asset's name ("ربع سکه" -> quarter coin, "دلار" -> US dollar). */
function guessKey(name) {
  const n = (name || '').trim();
  if (!n) return null;
  const hit = CATALOG.find((c) => c.fa === n || c.en.toLowerCase() === n.toLowerCase())
    || CATALOG.find((c) => c.fa.includes(n) || n.includes(c.fa.split(' ')[0]));
  return hit ? hit.key : null;
}

export function openAsset(asset = null) {
  const hist = asset ? D.assetHistory(asset.id) : [];
  const prices = D.prices();
  const startKey = asset?.market_key || null;
  push({
    mode: asset && !asset.market_key ? 1 : 0,
    group: startKey ? item(startKey)?.group || 'gold' : 'gold',
    key: startKey,
    qty: asset?.market_key ? String(asset.quantity) : '',
    since: asset?.since || asset?.created_at || J.todayIso(),
    name: asset?.name ?? '', kind: asset && !asset.market_key ? asset.kind : 'savings',
    amt: asset && !asset.market_key ? String(toDisplay(asset.amount)) : '', note: asset?.note ?? '',
    render(L) {
      const head = `${sheetHead(tr(asset ? 'edit_asset' : 'new_asset'))}${seg([tr('market_price'), tr('manual_amount')], L.mode, '.setMode')}`;
      let body;
      if (L.mode === 0) {
        const items = CATALOG.filter((c) => c.group === L.group);
        const m = L.key ? item(L.key) : null;
        const p = m ? prices[m.key] : null;
        body = `${seg(GROUPS.map((g) => tr('grp_' + g)), GROUPS.indexOf(L.group), '.setGroup')}
          <div class="wrap">${items.map((c) => pick(itemName(c), c.key === L.key, '.pickItem', `data-k="${c.key}"`)).join('')}</div>
          ${m ? `<div class="field" style="justify-content:space-between"><span class="muted" style="font-size:12px">${tr('unit_price').replace('%s', itemUnit(m))}</span>
              <span class="sb">${p ? amount(p.toman, { withUnit: true }) : tr('no_price')}</span></div>
            ${field(tr('quantity'), 'qty', L.qty, { placeholder: itemUnit(m), decimal: true })}
            <div class="field" id="assetvalue" style="justify-content:space-between">${valueLine(L)}</div>
            ${dateField(tr('bought_on'), 'since', L.since)}` : `<div class="hint">${tr('pick_item')}</div>`}
          ${field(tr('note'), 'note', L.note, { placeholder: tr('optional') })}`;
      } else {
        body = `${field(tr('name'), 'name', L.name, { placeholder: tr('asset_hint') })}
          <div class="wrap">${ASSET_KINDS.map((k) => pick(tr('kind_' + k), k === L.kind, '.pickKind', `data-k="${k}"`, forAsset(k))).join('')}</div>
          ${field(tr('balance'), 'amt', L.amt, { amountField: true, placeholder: unitLabel() })}
          ${field(tr('note'), 'note', L.note, { placeholder: tr('optional') })}`;
      }
      const history = hist.length ? `<div class="b" style="font-size:13px;margin-top:6px">${tr('history')}</div>${hist.map((h) => {
        const d = h.new_amount - h.old_amount;
        return `<div class="row" style="font-size:12.5px;padding:3px 0"><span class="muted grow">${date(h.date)}${h.note ? ' · ' + esc(h.note) : ''}</span><span class="sb ${d >= 0 ? 'pos' : 'neg'}">${amount(d, { signed: true })}</span></div>`;
      }).join('')}` : '';
      return `${head}${body}<button class="btn" data-a=".save">${tr('save')}</button>${history}
        ${asset ? `<button class="obtn neg" data-a=".del">${ic('trash', 17)}${tr('delete')}</button>` : ''}`;
    },
    onInput(field_) { if (field_ === 'qty') { const el = document.getElementById('assetvalue'); if (el) el.innerHTML = valueLine(this); } },
    setMode(ds) {
      this.mode = Number(ds.i);
      // switching a manual asset to live pricing: guess the item and the quantity from its value
      if (this.mode === 0 && !this.key && asset) {
        const k = guessKey(asset.name);
        if (k) {
          this.key = k;
          this.group = item(k).group;
          const p = prices[k];
          if (p && p.toman) this.qty = String(Math.round((asset.amount / p.toman) * 100) / 100);
        }
      }
      renderLayers();
    },
    setGroup(ds) { this.group = GROUPS[Number(ds.i)]; renderLayers(); },
    pickItem(ds) { this.key = ds.k; renderLayers(); },
    pickKind(ds) { this.kind = ds.k; renderLayers(); },
    save() {
      if (this.mode === 0) {
        const m = this.key ? item(this.key) : null;
        const q = decimal(this.qty);
        if (!m || q <= 0) return;
        const price = prices[m.key]?.toman || 0;
        const value = Math.round(q * price);
        if (asset) D.updateAsset(asset.id, m.fa, m.group, value, this.note.trim(), m.key, q, this.since);
        else D.addAsset(m.fa, m.group, value, this.note.trim(), m.key, q, this.since);
      } else {
        if (!this.name.trim()) return;
        const v = fromDisplay(Number(this.amt) || 0);
        if (asset) D.updateAsset(asset.id, this.name.trim(), this.kind, v, this.note.trim(), null, 0, asset.since || asset.created_at);
        else D.addAsset(this.name.trim(), this.kind, v, this.note.trim());
      }
      closeAll(); render(); toast(tr('saved'));
    },
    del() { confirmDialog(tr('delete_q'), '', tr('delete'), () => { D.deleteAsset(asset.id); closeAll(); render(); }); },
  });
}

function valueLine(L) {
  const m = L.key ? item(L.key) : null;
  const p = m ? D.prices()[m.key] : null;
  const v = p ? Math.round(decimal(L.qty) * p.toman) : 0;
  return `<span class="muted" style="font-size:12px">${tr('current_value')}</span><span class="b">${p ? amount(v, { withUnit: true }) : '—'}</span>`;
}

/** Buy / sell (quantity) for market holdings, deposit / withdraw (Toman) for manual assets. */
export function openAdjust(asset, sign) {
  const m = asset.market_key ? item(asset.market_key) : null;
  push({
    dialog: true, amt: '', note: '',
    render(L) {
      const title = m ? `${tr(sign > 0 ? 'buy' : 'sell')} · ${esc(itemName(m))}` : `${tr(sign > 0 ? 'deposit' : 'withdraw')} · ${esc(asset.name)}`;
      const input = m ? field(tr('quantity'), 'amt', L.amt, { placeholder: `${itemUnit(m)} (${qty(asset.quantity)})`, decimal: true })
        : field(tr('amount'), 'amt', L.amt, { amountField: true, placeholder: unitLabel() });
      return dialogBox(title, input + field(tr('note'), 'note', L.note, { placeholder: tr('optional') }),
        [{ label: tr('cancel'), a: 'close' }, { label: tr('save'), a: '.ok', cls: 'ok' }]);
    },
    ok() {
      const v = m ? decimal(this.amt) : fromDisplay(Number(this.amt) || 0);
      if (v > 0) {
        D.adjustAsset(asset.id, v * sign, J.todayIso(), this.note.trim() || (m ? `${sign > 0 ? '+' : '−'}${qty(v)} ${itemUnit(m)}` : ''));
        toast(tr('saved'));
      }
      closeAll(); render();
    },
  });
}
