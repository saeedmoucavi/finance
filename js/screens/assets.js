// Assets: value chart over time, live-priced holdings (gold, coins, currency, crypto) and manual assets.
import * as D from '../db.js';
import { amount, date, esc, isFa, percent, t, tr, unitLabel } from '../core.js';
import { forAsset, ic } from '../icons.js';
import { item, lastUpdate, PERIODS, valueSeries } from '../market.js';
import { ASSET_COLORS, CHART_LINE, alpha, shade } from '../theme.js';
import { chip, hint, lineChart, qty, ring, topbar } from '../ui/kit.js';
import { S } from '../ui/state.js';

const PERIOD_KEYS = ['period_week', 'period_month', 'period_6m', 'period_year'];

const clock = (d) => d.toLocaleTimeString(isFa() ? 'fa-IR' : 'en-GB', { hour: '2-digit', minute: '2-digit' });

export const assetsScreen = () => {
  const st = S.assets;
  const list = D.assets();
  const live = D.prices();
  const total = D.assetsTotal();
  const series = valueSeries(PERIODS[st.period]);
  const updated = lastUpdate();
  const status = !updated ? tr('prices_never')
    : st.offline ? t('prices_offline', clock(updated)) : t('prices_from', clock(updated));
  const change = series.change;
  const badge = change === null ? '' : `<span class="badge ${change >= 0 ? 'up' : 'down'}">${change >= 0 ? '▲' : '▼'} ${percent(Math.abs(change).toFixed(change && Math.abs(change) < 10 ? 2 : 1))}</span>`;

  return `<div class="page">
  ${topbar(tr('nav_assets'), false, ring('plus', 'assetNew'))}
  <div class="hero rise" style="padding:18px 16px 14px">
    <div class="row"><span class="lbl grow">${tr('my_assets')}</span>${badge}</div>
    <div class="row" style="align-items:baseline;gap:8px;margin:2px 0 8px"><span class="big num" data-count="${total}" data-key="assets">${amount(S.counts.assets ?? 0)}</span><span class="lbl">${unitLabel()}</span></div>
    ${lineChart(series, CHART_LINE)}
    <div class="seg on-dark" style="margin-top:10px">${PERIOD_KEYS.map((k, i) => `<button class="${i === st.period ? 'on' : ''}" data-a="assetPeriod" data-i="${i}">${tr(k)}</button>`).join('')}</div>
    <div class="row" style="margin-top:10px"><span class="lbl grow" style="font-size:10.5px">${status}</span>
      <button class="ring dark sm ${st.refreshing ? 'spin' : ''}" data-a="assetRefresh" aria-label="refresh">${ic('refresh', 15, 1.9)}</button></div>
  </div>
  ${list.length ? '' : hint(tr('no_assets_long'))}
  ${list.map((a) => holdingCard(a, live, total)).join('')}
</div>`;
};

function holdingCard(a, live, total) {
  const meta = a.market_key ? item(a.market_key) : null;
  const group = meta ? meta.group : a.kind;
  const color = ASSET_COLORS[group] || ASSET_COLORS.other;
  const ink = S.dark ? color : shade(color);
  const share = total > 0 ? (a.amount * 100) / total : 0;
  let title;
  let sub;
  if (meta) {
    const unit = isFa() ? meta.unitFa : meta.unitEn;
    const name = isFa() ? meta.fa : meta.en;
    title = meta.group === 'gold' ? `${qty(a.quantity)} ${unit} ${name}` : `${qty(a.quantity)} ${name}`;
    const p = live[a.market_key];
    const ch = p && p.change ? ` · <span class="${p.change >= 0 ? 'pos' : 'neg'}">${p.change >= 0 ? '▲' : '▼'} ${percent(Math.abs(p.change))}</span>` : '';
    sub = p ? `${t('each', unit)} ${amount(p.toman)}${ch}` : tr('no_price');
  } else {
    title = esc(a.name);
    sub = `${tr('kind_' + a.kind)} · ${date(a.updated_at)}`;
  }
  return `<div class="card holding" style="padding:14px">
    <div class="row click" data-a="assetEdit" data-id="${a.id}">
      ${chip(meta ? forAsset(meta.group) : forAsset(a.kind), alpha(color, S.dark ? 0.22 : 0.2), ink, 40, 18)}
      <div class="grow" style="min-width:0"><div class="sb ell" style="font-size:14px">${title}</div><div class="muted ell" style="font-size:11px">${sub}</div></div>
      <div class="col" style="align-items:flex-end;gap:4px"><span class="b" style="font-size:14px">${amount(a.amount)}</span>
        <span class="share"><i style="background:${color}"></i>${percent(share.toFixed(1))}</span></div>
    </div>
    <div class="row" style="margin-top:10px;gap:8px">
      <button class="mini grow" data-a="assetAdjust" data-id="${a.id}" data-s="1">${ic('plus', 13)} ${tr(meta ? 'buy' : 'deposit')}</button>
      <button class="mini grow" data-a="assetAdjust" data-id="${a.id}" data-s="-1">${ic('minus', 13)} ${tr(meta ? 'sell' : 'withdraw')}</button>
    </div>
  </div>`;
}

