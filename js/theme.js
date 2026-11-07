// Colours used by charts and loan marks. Interface colours (backgrounds, text,
// accents) are CSS variables in css/tokens.css.

/** The looks the user can pick (css/skins.css). `dark` picks the dark base palette,
 *  `bar` is the browser / status bar colour, `pv` the picker preview: [page, headline card, card, accent]. */
export const SKINS = [
  { id: 'light', dark: false, bar: '#ECEDEF', pv: ['#ECEDEF', '#1B1F26', '#FFFFFF', '#2E3440'] },
  { id: 'dark', dark: true, bar: '#121419', pv: ['#121419', '#0B0D11', '#1D2027', '#E6E9EE'] },
  { id: 'glass-night', dark: true, bar: '#0B1220', pv: ['linear-gradient(160deg,#2B4A8C,#0B1220 60%)', 'rgba(255,255,255,.16)', 'rgba(255,255,255,.10)', '#8FB4FF'] },
  { id: 'glass-graphite', dark: true, bar: '#141517', pv: ['linear-gradient(160deg,#3A3B3F,#141517 60%)', 'rgba(255,255,255,.16)', 'rgba(255,255,255,.10)', '#FFFFFF'] },
  { id: 'glass-snow', dark: false, bar: '#EEF2F8', pv: ['linear-gradient(160deg,#BFD6FF,#EEF2F8 60%)', 'rgba(255,255,255,.85)', 'rgba(255,255,255,.7)', '#0A84FF'] },
  { id: 'brutal', dark: false, bar: '#FAFAF7', pv: ['#FAFAF7', '#FFD43B', '#FFFFFF', '#3D5AFE'] },
  { id: 'soft', dark: false, bar: '#E7EAF0', pv: ['#E7EAF0', '#E7EAF0', '#E7EAF0', '#5361D9'] },
];
/** The saved choice ('auto' follows the phone between light and dark). */
export function resolveSkin(saved, sysDark) {
  return SKINS.find((s) => s.id === saved) || SKINS[sysDark ? 1 : 0];
}

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
