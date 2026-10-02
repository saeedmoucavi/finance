// Shared app state and DOM roots. Screens keep their own UI state (filters, open cards) here.


export const $app = document.getElementById('app');
export const $layers = document.getElementById('layers');
export const $report = document.getElementById('report');
export const TABS = ['home', 'tx', 'loans', 'more'];
export const ASSET_KINDS = ['savings', 'bank', 'cash', 'gold', 'currency', 'property', 'investment', 'other'];

export const S = {
  stack: ['home'], last: null, counts: {},
  tx: { filter: 0, ym: null, q: '', searching: false, cat: null },
  loans: { archived: false, open: undefined, all: {} },
  rep: { yearly: 0, ym: null },
  debts: { tab: 0 }, lists: { tab: 0 },
  locked: false, hiddenAt: 0, dark: false,
};
