// Screen registry: the shell looks screens up here by id.
import { homeScreen } from './home.js';
import { transactionsScreen } from './transactions.js';
import { loansScreen } from './loans.js';
import { moreScreen } from './more.js';
import { assetsScreen } from './assets.js';
import { debtsScreen } from './debts.js';
import { reportsScreen } from './reports.js';
import { listsScreen } from './lists.js';
import { settingsScreen } from './settings.js';

export const SCREENS = {
  home: homeScreen, tx: transactionsScreen, loans: loansScreen, more: moreScreen,
  assets: assetsScreen, debts: debtsScreen, reports: reportsScreen, lists: listsScreen, settings: settingsScreen,
};
