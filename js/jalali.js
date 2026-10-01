// Jalali (Shamsi) calendar. Dates are stored as Gregorian ISO strings
// (YYYY-MM-DD), exactly like the Windows and Android apps, so all three share
// one database file. Borkowski algorithm, as in jalaali-js / jalali_core.

export const MONTHS_FA = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
export const MONTHS_EN = ['Farvardin', 'Ordibehesht', 'Khordad', 'Tir', 'Mordad', 'Shahrivar', 'Mehr', 'Aban', 'Azar', 'Dey', 'Bahman', 'Esfand'];
export const WEEKDAYS_FA = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
export const WEEKDAYS_EN = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
export const WEEK_SHORT_FA = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
export const WEEK_SHORT_EN = ['Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr'];

const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
const DAY = 86400000;
const div = (a, b) => Math.trunc(a / b);
const mod = (a, b) => a - div(a, b) * b;

function jalCal(jy) {
  const gy = jy + 621;
  let leapJ = -14, jp = BREAKS[0], jump = 0;
  for (let i = 1; i < BREAKS.length; i++) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

const epochDay = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / DAY);
const isoOfEpoch = (e) => new Date(e * DAY).toISOString().slice(0, 10);
const epochOfIso = (iso) => { const [y, m, d] = iso.split('-').map(Number); return epochDay(y, m, d); };

function epochOfJalali(jy, jm, jd) {
  const c = jalCal(jy);
  return epochDay(c.gy, 3, c.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

/** Gregorian ISO -> [jy, jm, jd] */
export function fromIso(iso) {
  const e = epochOfIso(iso);
  const gy = Number(iso.slice(0, 4));
  let jy = gy - 621;
  const c = jalCal(jy);
  let k = e - epochDay(c.gy, 3, c.march);
  if (k >= 0) {
    if (k <= 185) return [jy, 1 + div(k, 31), mod(k, 31) + 1];
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (c.leap === 1) k += 1;
  }
  return [jy, 7 + div(k, 30), mod(k, 30) + 1];
}

export const toIso = (jy, jm, jd) => isoOfEpoch(epochOfJalali(jy, jm, jd));
export const isLeap = (jy) => jalCal(jy).leap === 0;
export const monthLength = (jy, jm) => (jm <= 6 ? 31 : jm <= 11 ? 30 : isLeap(jy) ? 30 : 29);

export function addMonths(jy, jm, n) {
  const total = jy * 12 + (jm - 1) + n;
  return [Math.floor(total / 12), ((total % 12) + 12) % 12 + 1];
}

export const clampDay = (jy, jm, d) => Math.max(1, Math.min(d, monthLength(jy, jm)));
export const monthRange = (jy, jm) => [toIso(jy, jm, 1), toIso(jy, jm, monthLength(jy, jm))];
export const yearRange = (jy) => [toIso(jy, 1, 1), toIso(jy, 12, monthLength(jy, 12))];

export function todayIso() {
  const d = new Date();
  return isoOfEpoch(epochDay(d.getFullYear(), d.getMonth() + 1, d.getDate()));
}
export const today = () => fromIso(todayIso());
export const shiftIso = (iso, days) => isoOfEpoch(epochOfIso(iso) + days);
export const daysBetween = (a, b) => epochOfIso(b) - epochOfIso(a);

/** Saturday-first weekday index, as in the Iranian week. */
export function weekdayIndex(iso) {
  const dow = new Date(epochOfIso(iso) * DAY).getUTCDay(); // 0 = Sunday
  return (dow + 1) % 7;
}

export const monthName = (jm, fa) => (fa ? MONTHS_FA : MONTHS_EN)[jm - 1];
