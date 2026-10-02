// Shared app state and DOM roots. Screens keep their own UI state (filters, open cards) here.

export const $app = document.getElementById('app');
export const $layers = document.getElementById('layers');
export const $report = document.getElementById('report');
export const TABS = ['home', 'tx', 'assets', 'more'];
/** Kinds of manually valued assets (market holdings use their group: gold, coin, currency, crypto). */
export const ASSET_KINDS = ['savings', 'bank', 'cash', 'property', 'investment', 'other'];

export const S = {
  stack: ['home'], last: null, counts: {},
  tx: { filter: 0, ym: null, q: '', searching: false, cat: null },
  loans: { archived: false, open: undefined, all: {} },
  rep: { yearly: 0, ym: null },
  debts: { tab: 0 }, lists: { tab: 0 },
  assets: { period: 1, offline: false, refreshing: false },
  locked: false, hiddenAt: 0, dark: false,
};
