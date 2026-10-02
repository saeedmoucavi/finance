// Live market prices from TGJU (tgju.org, the same service its WordPress
// plugin uses) and the value history of the user's assets.
//
//   current prices: GET https://api.tgju.org/v1/widget/tmp?keys=<id,id,...>
//   daily history:  GET https://api.tgju.org/v1/widget/history/<id>   -> [[ms, price], ...]
//
// Gold, coins and currencies are quoted in Rial; crypto in US dollars (with a
// Rial figure, p_irr). Everything is stored in Toman.
import * as D from './db.js';
import * as J from './jalali.js';

const API = 'https://api.tgju.org/v1/widget';
export const DOLLAR = '137203';

/** Items the user can hold. key = TGJU item id. unit: what one "quantity" means. */
export const CATALOG = [
  { key: '137121', group: 'gold', fa: 'طلای ۱۸ عیار', en: '18k gold', unitFa: 'گرم', unitEn: 'g' },
  { key: '137122', group: 'gold', fa: 'طلای ۲۴ عیار', en: '24k gold', unitFa: 'گرم', unitEn: 'g' },
  { key: '137120', group: 'gold', fa: 'مثقال طلا', en: 'Gold mesghal', unitFa: 'مثقال', unitEn: 'mesghal' },
  { key: '391295', group: 'gold', fa: 'طلای دست دوم', en: 'Used gold', unitFa: 'گرم', unitEn: 'g' },
  { key: '137138', group: 'coin', fa: 'سکه امامی', en: 'Emami coin', unitFa: 'عدد', unitEn: 'pcs' },
  { key: '137137', group: 'coin', fa: 'سکه بهار آزادی', en: 'Bahar Azadi coin', unitFa: 'عدد', unitEn: 'pcs' },
  { key: '137139', group: 'coin', fa: 'نیم سکه', en: 'Half coin', unitFa: 'عدد', unitEn: 'pcs' },
  { key: '137140', group: 'coin', fa: 'ربع سکه', en: 'Quarter coin', unitFa: 'عدد', unitEn: 'pcs' },
  { key: '137141', group: 'coin', fa: 'سکه گرمی', en: 'Gram coin', unitFa: 'عدد', unitEn: 'pcs' },
  { key: '137203', group: 'currency', fa: 'دلار آمریکا', en: 'US dollar', unitFa: 'دلار', unitEn: 'USD' },
  { key: '137205', group: 'currency', fa: 'یورو', en: 'Euro', unitFa: 'یورو', unitEn: 'EUR' },
  { key: '137207', group: 'currency', fa: 'پوند انگلیس', en: 'British pound', unitFa: 'پوند', unitEn: 'GBP' },
  { key: '137206', group: 'currency', fa: 'درهم امارات', en: 'UAE dirham', unitFa: 'درهم', unitEn: 'AED' },
  { key: '137225', group: 'currency', fa: 'لیر ترکیه', en: 'Turkish lira', unitFa: 'لیر', unitEn: 'TRY' },
  { key: '137222', group: 'currency', fa: 'یوان چین', en: 'Chinese yuan', unitFa: 'یوان', unitEn: 'CNY' },
  { key: '137221', group: 'currency', fa: 'دلار کانادا', en: 'Canadian dollar', unitFa: 'دلار کانادا', unitEn: 'CAD' },
  { key: '137220', group: 'currency', fa: 'دلار استرالیا', en: 'Australian dollar', unitFa: 'دلار استرالیا', unitEn: 'AUD' },
  { key: '137223', group: 'currency', fa: 'فرانک سوئیس', en: 'Swiss franc', unitFa: 'فرانک', unitEn: 'CHF' },
  { key: '137217', group: 'currency', fa: 'دینار عراق', en: 'Iraqi dinar', unitFa: 'دینار', unitEn: 'IQD' },
  { key: '137214', group: 'currency', fa: 'روبل روسیه', en: 'Russian ruble', unitFa: 'روبل', unitEn: 'RUB' },
  { key: '398096', group: 'crypto', fa: 'بیت‌کوین', en: 'Bitcoin', unitFa: 'BTC', unitEn: 'BTC', usd: true },
  { key: '398097', group: 'crypto', fa: 'اتریوم', en: 'Ethereum', unitFa: 'ETH', unitEn: 'ETH', usd: true },
  { key: '398110', group: 'crypto', fa: 'تتر', en: 'Tether', unitFa: 'USDT', unitEn: 'USDT', usd: true },
  { key: '398115', group: 'crypto', fa: 'بایننس‌کوین', en: 'BNB', unitFa: 'BNB', unitEn: 'BNB', usd: true },
  { key: '398098', group: 'crypto', fa: 'ریپل', en: 'XRP', unitFa: 'XRP', unitEn: 'XRP', usd: true },
  { key: '535605', group: 'crypto', fa: 'سولانا', en: 'Solana', unitFa: 'SOL', unitEn: 'SOL', usd: true },
  { key: '398109', group: 'crypto', fa: 'ترون', en: 'Tron', unitFa: 'TRX', unitEn: 'TRX', usd: true },
];
export const GROUPS = ['gold', 'coin', 'currency', 'crypto'];
export const item = (key) => CATALOG.find((c) => c.key === String(key));

const num = (s) => Number(String(s ?? '').replace(/,/g, '')) || 0;

/** Tehran calendar date of a TGJU timestamp (UTC+3:30). */
const tehranDate = (ms) => new Date(ms + 3.5 * 3600000).toISOString().slice(0, 10);

// ------------------------------------------------------------------ network
async function getJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch current prices for [keys] (Toman); stores them and re-prices the holdings. */
export async function refreshPrices(keys = CATALOG.map((c) => c.key)) {
  const data = await getJson(`${API}/tmp?keys=${keys.join(',')}`);
  const rows = (data.response?.indicators || []).map((i) => {
    const meta = item(i.item_id);
    const rial = meta && meta.usd ? num(i.p_irr) : num(i.p);
    return { key: String(i.item_id), title: (i.title || '').trim(), toman: Math.round(rial / 10), change: Number(i.dp) * (i.dt === 'low' ? -1 : 1) || 0 };
  }).filter((r) => r.toman > 0);
  if (!rows.length) throw new Error('no prices');
  D.savePrices(rows, new Date().toISOString());
  D.revalueAssets();
  return rows.length;
}

/** Daily history (Toman) for a key, fetched at most once a day. Crypto is converted with the dollar history. */
const historyFetched = new Map(); // key -> day it was last downloaded (some items publish with a delay)

export async function refreshHistory(key) {
  const today = J.todayIso();
  if (D.historyLastDate(key) >= J.shiftIso(today, -1) || historyFetched.get(key) === today) return;
  historyFetched.set(key, today);
  const raw = await getJson(`${API}/history/${key}`);
  let points;
  if (item(key)?.usd) {
    await refreshHistory(DOLLAR);
    const usd = new Map(D.priceHistory(DOLLAR).map((r) => [r.date, r.toman]));
    let lastRate = 0;
    const rate = (d) => (usd.has(d) ? (lastRate = usd.get(d)) : lastRate);
    points = raw.map(([ms, p]) => [tehranDate(ms), Math.round(num(p) * rate(tehranDate(ms)))]).filter(([, v]) => v > 0);
  } else {
    points = raw.map(([ms, p]) => [tehranDate(ms), Math.round(num(p) / 10)]);
  }
  D.saveHistory(key, points);
}

/** Refresh prices, and the history of every key the user holds. Errors are reported, never thrown. */
export async function refreshAll() {
  const held = [...new Set(D.assets().filter((a) => a.market_key).map((a) => a.market_key))];
  try {
    await refreshPrices();
    for (const k of held) await refreshHistory(k).catch(() => {});
    return true;
  } catch (e) {
    return false;
  }
}

export const lastUpdate = () => {
  const ts = Object.values(D.prices()).map((p) => p.updated_at).sort().pop();
  return ts ? new Date(ts) : null;
};

// ------------------------------------------------------------------ value history
export const PERIODS = [7, 30, 182, 365];

/**
 * Total asset value for each day of the last [days] days (today = live value).
 * Market holdings count from their purchase date at that day's price; manual
 * assets follow their recorded balance changes.
 */
export function valueSeries(days) {
  const today = J.todayIso();
  const dates = [];
  for (let i = days - 1; i >= 0; i--) dates.push(J.shiftIso(today, -i));
  const totals = dates.map(() => 0);
  const live = D.prices();
  const histAll = D.assetHistoryAll();

  for (const a of D.assets()) {
    const start = a.since || a.created_at;
    if (a.market_key) {
      const hist = D.priceHistory(a.market_key);
      const current = live[a.market_key]?.toman || (a.quantity ? a.amount / a.quantity : 0);
      let h = 0;
      let price = hist.length ? hist[0].toman : current;
      dates.forEach((d, i) => {
        while (h < hist.length && hist[h].date <= d) price = hist[h++].toman;
        if (d < start) return;
        totals[i] += a.quantity * (d === today ? current : price);
      });
    } else {
      const changes = histAll.filter((x) => x.asset_id === a.id);
      dates.forEach((d, i) => {
        if (d < start && !changes.some((c) => c.date <= d)) return;
        let v = changes.length ? changes[0].old_amount : a.amount;
        for (const c of changes) if (c.date <= d) v = c.new_amount;
        if (d === today) v = a.amount;
        totals[i] += v;
      });
    }
  }
  const values = totals.map(Math.round);
  const firstNonZero = values.find((v) => v > 0) || 0;
  const last = values[values.length - 1];
  return { dates, values, change: firstNonZero ? ((last - firstNonZero) * 100) / firstNonZero : null };
}

// ------------------------------------------------------------------ auto refresh
let timer = null;
/** Refresh now and every minute while [active]() stays true; calls [onUpdate] after each refresh.
 *  Safe to call on every render: it only starts once. */
export function startAutoRefresh(active, onUpdate) {
  if (timer) return; // already running
  const tick = async () => {
    if (!active()) return stopAutoRefresh();
    const ok = await refreshAll();
    if (active()) onUpdate(ok);
  };
  tick();
  timer = setInterval(tick, 60000);
}
export function stopAutoRefresh() {
  if (timer) clearInterval(timer);
  timer = null;
}
