// Small HTML builders used by every screen: buttons, chips, segmented controls, fields, charts.
import * as J from '../jalali.js';
import { compact, date, dayMonth, digits, esc, f, group, isFa, num, percent, prefs, tr } from '../core.js';
import { ic } from '../icons.js';
import { back } from './shell.js';

export const rtl = () => isFa();

// ================================================================== small builders
export const ring = (icon, a, attrs = '', cls = '') => `<button class="ring ${cls}" data-a="${a}" ${attrs}>${ic(icon, 16, 1.9)}</button>`;
export const backBtn = () => ring(rtl() ? 'chev_right' : 'chev_left', 'back');
export const topbar = (title, back, actions = '') => `<div class="topbar">${back ? backBtn() : ''}<h1>${title}</h1>${actions}</div>`;
export const chip = (icon, bg, ink, size = 34, isz = 16) =>
  `<span class="chip" style="width:${size}px;height:${size}px;background:${bg};color:${ink}">${ic(icon, isz, 1.9)}</span>`;
export const pill = (frac, onDark) => {
  const fr = Math.max(0, Math.min(1, frac || 0));
  return `<div class="pill ${onDark ? 'on-dark' : ''}"><div class="tr"><div class="fl" style="width:${fr * 100}%"></div></div><span class="pc">${percent(Math.floor(fr * 100))}</span></div>`;
};
export const seg = (opts, sel, a) => `<div class="seg">${opts.map((o, i) => `<button class="${i === sel ? 'on' : ''}" data-a="${a}" data-i="${i}">${o}</button>`).join('')}</div>`;
export const pick = (label, on, a, attrs = '', icon = '') =>
  `<button class="pick ${on ? 'on' : ''}" data-a="${a}" ${attrs}>${icon ? ic(icon, 14) : ''}${esc(label)}</button>`;
export const toggle = (on, a) => `<button class="toggle ${on ? 'on' : ''}" data-a="${a}" aria-pressed="${on}"></button>`;
export const hint = (text) => `<div class="hint">${text}</div>`;
export const catName = (c) => (isFa() || !c.name_en ? c.name_fa : c.name_en) || tr('uncategorized');
export const txCat = (x) => (isFa() || !x.cen ? x.cfa : x.cen) || '';
export const txAcc = (x) => (isFa() || !x.aen ? x.afa : x.aen) || '';
export const accName = (a) => (isFa() || !a.name_en ? a.name_fa : a.name_en);
export const kindColors = (k) => (k === 'income' ? ['var(--pos-bg)', 'var(--pos)'] : k === 'installment' ? ['var(--gold-bg)', 'var(--gold)'] : ['var(--neg-bg)', 'var(--neg)']);

export function miniRing(frac, size = 44, label = '') {
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, frac));
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="flex-shrink:0">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--track)" stroke-width="4"/>
    ${f > 0 ? `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"
      stroke-dasharray="${c * f} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/>` : ''}
    ${label ? `<text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="10" font-weight="700" fill="var(--text)" font-family="Vazir">${label}</text>` : ''}</svg>`;
}

/** Share `usable` degrees in proportion to `values`, but give every value at least
 *  `minSpan` so a tiny slice still has room for its rounded ends instead of
 *  spilling into its neighbours. The extra comes out of the larger slices. */
export function fairSpans(values, usable, minSpan) {
  const fixed = new Set();
  let free = usable;
  let rest = 0;
  for (;;) {
    free = usable - minSpan * fixed.size;
    rest = values.reduce((s, v, i) => (fixed.has(i) ? s : s + v), 0);
    let grew = false;
    values.forEach((v, i) => {
      if (!fixed.has(i) && (rest <= 0 || (free * v) / rest < minSpan)) { fixed.add(i); grew = true; }
    });
    if (!grew || fixed.size === values.length) break;
  }
  return values.map((v, i) => (fixed.has(i) ? minSpan : (free * v) / rest));
}

/** Segmented donut with rounded, separated ends (income / expenses / installments). */
export function donut(values, colors, size, stroke, track, center = '') {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const idx = values.map((v, i) => i).filter((i) => values[i] > 0);
  // round caps reach past each arc's end by capDeg, so every slot gives that
  // back on both sides plus a visible 4° gap
  const capDeg = (stroke / 2 / r) * (180 / Math.PI);
  const many = idx.length > 1;
  const gap = many ? capDeg * 2 + 4 : 0;
  const slots = many ? fairSpans(idx.map((i) => values[i]), 360, gap + 1.5) : [360];
  let arcs = '';
  let start = 0;
  idx.forEach((i, k) => {
    const draw = slots[k] - gap;
    if (draw > 0) {
      arcs += `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${colors[i]}" stroke-width="${stroke}" stroke-linecap="round"
        pathLength="360" stroke-dasharray="${draw} 360" stroke-dashoffset="${-(start + gap / 2)}" transform="rotate(-90 ${cx} ${cx})"/>`;
    }
    start += slots[k];
  });
  return `<div style="position:relative;width:${size}px;height:${size}px;flex-shrink:0" class="rise">
    <svg width="${size}" height="${size}"><circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/>${arcs}</svg>
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">${center}</div></div>`;
}

export const legend = (color, label, value) =>
  `<div class="legend"><span class="dot" style="background:${color}"></span><span style="color:var(--hero-muted)">${label}</span><span class="v">${value}</span></div>`;

export function field(label, key, value, { placeholder = '', type = 'text', amountField = false, decimal = false } = {}) {
  const v = amountField ? (value ? group(Number(value)) : '') : value ?? '';
  const mode = decimal ? 'inputmode="decimal"' : amountField || type === 'number' ? 'inputmode="numeric"' : '';
  return `<div class="field"><label>${label}</label><input type="text" ${mode} data-bind="${key}" ${amountField ? 'data-amount="1"' : ''}
    ${type === 'number' ? 'data-int="1"' : ''} ${decimal ? 'data-dec="1"' : ''} value="${esc(v)}" placeholder="${esc(placeholder)}" autocomplete="off"></div>`;
}

export function dateField(label, key, iso, optional = false) {
  const text = !iso ? tr('none') : iso === J.todayIso() ? `${date(iso)} · ${tr('today')}` : date(iso);
  return `<div class="field tap" data-a="pickDate" data-k="${key}" data-opt="${optional ? 1 : ''}"><label>${label}</label>
    <span class="val ell">${text}</span>${ic('calendar', 16, 1.8, 'muted')}</div>`;
}


/** Quantity with up to 4 decimals (Persian digits and separator when enabled). */
export function qty(v) {
  const s = (Math.round(v * 10000) / 10000).toLocaleString('en-US', { maximumFractionDigits: 4 });
  return digits(s).replace(/\./g, isFa() && prefs.faDigits ? '٫' : '.');
}

/** Area line chart of a value series ({dates, values}); time runs left to right. */
export function lineChart(series, color, { w = 340, h = 190 } = {}) {
  const { dates, values } = series;
  const pad = { l: 58, r: 12, t: 12, b: 26 };
  const W = w - pad.l - pad.r;
  const H = h - pad.t - pad.b;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const base = min > max * 0.4 ? min * 0.97 : 0;
  const top = max * 1.03;
  const x = (i) => pad.l + (values.length < 2 ? W : (i * W) / (values.length - 1));
  const y = (v) => pad.t + H - ((v - base) / (top - base || 1)) * H;
  let line = '';
  values.forEach((v, i) => { line += `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `; });
  const area = `${line}L${x(values.length - 1).toFixed(1)} ${pad.t + H} L${x(0).toFixed(1)} ${pad.t + H} Z`;
  let grid = '';
  for (let k = 0; k <= 4; k++) {
    const v = base + ((top - base) * k) / 4;
    const yy = y(v).toFixed(1);
    grid += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${yy}" y2="${yy}" stroke="rgba(255,255,255,${k ? 0.07 : 0.18})"/>`;
    grid += `<text x="${pad.l - 8}" y="${yy}" text-anchor="end" dominant-baseline="middle" font-size="9.5" fill="rgba(255,255,255,.55)" font-family="Vazir">${esc(v ? compact(v) : num(0))}</text>`;
  }
  const lx = x(values.length - 1);
  const ly = y(values[values.length - 1]);
  const mid = Math.floor(dates.length / 2);
  const xl = (i, anchor) => `<text x="${x(i).toFixed(1)}" y="${h - 6}" text-anchor="${anchor}" font-size="9.5" fill="rgba(255,255,255,.55)" font-family="Vazir">${dayMonth(dates[i])}</text>`;
  return `<svg class="linechart" viewBox="0 0 ${w} ${h}" width="100%" style="display:block;direction:ltr">
    <defs><linearGradient id="lcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".38"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    ${grid}<path d="${area}" fill="url(#lcg)"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${lx}" cy="${ly}" r="6" fill="${color}" opacity=".25"/><circle cx="${lx}" cy="${ly}" r="3.4" fill="${color}"/>
    ${xl(0, 'start')}${dates.length > 20 ? xl(mid, 'middle') : ''}${xl(dates.length - 1, 'end')}</svg>`;
}
