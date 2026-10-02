// Assets (savings) with deposit / withdraw.
import * as D from '../db.js';
import * as J from '../jalali.js';
import { amount, compact, date, esc, t, tr, unitLabel } from '../core.js';
import { forAsset, ic } from '../icons.js';
import { chip, hint, ring, topbar } from '../ui/kit.js';
import { S } from '../ui/state.js';

export const assetsScreen = () => {
  const assets = D.assets();
  const [ty, tm] = J.today();
  const final = D.assetsTotal() + D.totals(...J.monthRange(ty, tm)).net;
  return `<div class="page sub">
  ${topbar(tr('assets'), true, ring('plus', 'assetNew'))}
  <div class="hero"><div class="lbl">${tr('assets_total')}</div><div class="big num" style="font-size:27px" data-count="${assets.reduce((s, a) => s + a.amount, 0)}" data-key="assets">${amount(S.counts.assets ?? 0)}</div>
    <div class="lbl">${unitLabel()}</div><div class="lbl" style="margin-top:8px;font-size:11.5px">${t('final_line', compact(final))}</div></div>
  ${assets.length ? '' : hint(tr('no_assets'))}
  ${assets.map((a) => `<div class="card" style="padding:14px">
    <div class="row click" data-a="assetEdit" data-id="${a.id}">${chip(forAsset(a.kind), 'var(--pos-bg)', 'var(--pos)', 38)}
      <div class="grow"><div class="sb ell">${esc(a.name)}</div><div class="muted ell" style="font-size:11px">${tr('kind_' + a.kind)} · ${date(a.updated_at)}</div></div>
      <span class="b">${amount(a.amount)}</span></div>
    <div class="row" style="margin-top:10px;gap:8px"><button class="obtn pos grow" data-a="assetAdjust" data-id="${a.id}" data-s="1">${ic('plus', 17)}${tr('deposit')}</button>
      <button class="obtn neg grow" data-a="assetAdjust" data-id="${a.id}" data-s="-1">${ic('minus', 17)}${tr('withdraw')}</button></div></div>`).join('')}
</div>`;
};
