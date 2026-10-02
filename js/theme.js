// Colours used by charts and loan marks. Interface colours (backgrounds, text,
// accents) are CSS variables in css/tokens.css.

/** Donut / legend colours shared with the desktop dashboard. */
export const FLOW = { income: '#4FCBA4', expense: '#F08A7E', installments: '#E3C06A' };
/** Category bars, by rank. */
export const BAR_COLORS = ['#F08A7E', '#E3C06A', '#7FA7E0', '#4FCBA4', '#B39DDB', '#9AA3AE'];
/** Loan marks (light rim / dark body), picked by loan id as in the other apps. */
const ORB = [['#E3E7EC', '#9AA3AE'], ['#6FE0BD', '#2F9C7A'], ['#F59E92', '#C2574A'], ['#EBCB7A', '#B08A35'], ['#94B2EC', '#4E6FB0'], ['#C4A6EC', '#7E5BB0']];
export const loanColor = (id, dark) => ORB[id % ORB.length][dark ? 0 : 1];

/** Darken a hex colour toward black (for icon ink on light chips). */
export function shade(hex, k = 0.38) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - k)));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}
export const alpha = (hex, a) => hex + Math.round(a * 255).toString(16).padStart(2, '0');

/** Asset groups: [chip background alpha base, ink]. Market groups first, then manual kinds. */
export const ASSET_COLORS = {
  gold: '#E3C06A', coin: '#D9A84E', currency: '#4FCBA4', crypto: '#7FA7E0',
  savings: '#9AA3AE', bank: '#7FA7E0', cash: '#4FCBA4', property: '#B39DDB', investment: '#F08A7E', other: '#9AA3AE',
};
/** The asset value chart. */
export const CHART_LINE = '#8FB0EA';
