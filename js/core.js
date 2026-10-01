// Preferences, text and number/date formatting shared by every screen.
import { TEXT } from './strings.js';
import * as J from './jalali.js';

/** Live preferences; loaded from the database's settings table (same keys as the other apps). */
export const prefs = { lang: 'fa', unit: 'toman', faDigits: true, theme: 'auto', reminderDays: 3 };

export const isFa = () => prefs.lang === 'fa';

export function tr(key) {
  const p = TEXT[key];
  if (!p) return key;
  return isFa() ? p[0] : p[1];
}

/** Fill `%s` / `%1$s` slots. */
export function f(str, ...args) {
  let i = 0;
  return str.replace(/%(\d)\$s|%s/g, (_, n) => String(n ? args[Number(n) - 1] : args[i++]));
}

export const t = (key, ...args) => f(tr(key), ...args);

// ------------------------------------------------------------------ numbers
const FA = '۰۱۲۳۴۵۶۷۸۹';
const LRI = '⁦', PDI = '⁩'; // keeps a minus sign attached to its digits in RTL text

export function digits(text) {
  text = String(text);
  if (!prefs.faDigits || !isFa()) return text;
  return text.replace(/[0-9]/g, (d) => FA[d]);
}
export const num = (n) => digits(n);

export function toLatin(text) {
  return String(text).replace(/[۰-۹]/g, (d) => FA.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

export const group = (v) => digits(Math.round(v).toLocaleString('en-US'));
export const toDisplay = (toman) => (prefs.unit === 'rial' ? toman * 10 : toman);
export const fromDisplay = (v) => (prefs.unit === 'rial' ? Math.round(v / 10) : v);

export function unitLabel() {
  if (isFa()) return prefs.unit === 'rial' ? 'ریال' : 'تومان';
  return prefs.unit === 'rial' ? 'Rial' : 'Toman';
}

const isolate = (s) => LRI + s + PDI;

/** `1,234,000` (optionally signed / with the unit). Amounts are whole Toman. */
export function amount(toman, { withUnit = false, signed = false } = {}) {
  const v = toDisplay(toman);
  let text = group(Math.abs(v));
  if (v < 0) text = '−' + text;
  else if (signed && v > 0) text = '+' + text;
  if (v !== 0 || signed) text = isolate(text);
  return withUnit ? `${text} ${unitLabel()}` : text;
}

/** Short form for tiles: `۱٫۲ میلیون`, `1.2M`. */
export function compact(toman) {
  const v = toDisplay(toman);
  const sign = v < 0 ? '−' : '';
  const a = Math.abs(v);
  const steps = isFa()
    ? [[1e9, 'میلیارد'], [1e6, 'میلیون'], [1e3, 'هزار']]
    : [[1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  for (const [size, name] of steps) {
    if (a >= size) {
      let s = (a / size).toFixed(1).replace(/\.0$/, '');
      s = digits(s).replace('.', isFa() && prefs.faDigits ? '٫' : '.');
      const body = sign ? isolate(sign + s) : s;
      return isFa() ? `${body} ${name}` : body + name;
    }
  }
  return sign ? isolate(sign + group(a)) : group(a);
}

export const percent = (p) => (isFa() ? digits(p) + '٪' : p + '%');

// ------------------------------------------------------------------ dates
export function date(iso, long = true) {
  if (!iso) return '';
  const [y, m, d] = J.fromIso(iso);
  if (long) return digits(`${d} ${J.monthName(m, isFa())} ${y}`);
  return digits(`${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`);
}
export function dayMonth(iso) {
  const [, m, d] = J.fromIso(iso);
  return digits(`${d} ${J.monthName(m, isFa())}`);
}
export const month = (jy, jm) => digits(`${J.monthName(jm, isFa())} ${jy}`);
export const weekday = (iso) => (isFa() ? J.WEEKDAYS_FA : J.WEEKDAYS_EN)[J.weekdayIndex(iso)];

/** Escape text for HTML. */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
