// SQLite (sql.js) with the exact schema of the Windows and Android apps, so a
// finance.db file moves between all three. The whole database is kept as one
// blob in IndexedDB and saved after every change.
import * as J from './jalali.js';

let SQL = null;
let db = null;
let saveTimer = null;

// ------------------------------------------------------------------ IndexedDB
function idb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('finance', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function idbGet(key) {
  const d = await idb();
  return new Promise((resolve, reject) => {
    const r = d.transaction('files').objectStore('files').get(key);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => reject(r.error);
  });
}
async function idbSet(key, value) {
  const d = await idb();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('files', 'readwrite');
    tx.objectStore('files').put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ------------------------------------------------------------------ open / save
/** The other apps keep the file in WAL mode; sql.js reads it once the header says rollback-journal. */
function fromWal(bytes) {
  const b = new Uint8Array(bytes);
  if (b.length > 19 && b[18] === 2) { b[18] = 1; b[19] = 1; }
  return b;
}

export async function open() {
  SQL = await initSqlJs({ locateFile: (f) => 'vendor/' + f });
  const bytes = await idbGet('finance.db');
  db = bytes ? new SQL.Database(fromWal(bytes)) : new SQL.Database();
  initSchema();
  await saveNow();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}

export async function saveNow() {
  clearTimeout(saveTimer);
  const bytes = db.export(); // export reopens the database, which resets pragmas
  db.run('PRAGMA foreign_keys = ON');
  await idbSet('finance.db', bytes);
}

function changed() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveNow().catch(console.error), 120);
}

/** Current database as a file (for backup / sharing). */
export function exportBytes() {
  const bytes = db.export();
  db.run('PRAGMA foreign_keys = ON');
  return bytes;
}

/** Is this file a ledger from one of the apps? */
export function looksValid(bytes) {
  try {
    const t = new SQL.Database(fromWal(bytes));
    const names = t.exec("SELECT name FROM sqlite_master WHERE type='table'")[0]?.values.flat() || [];
    t.close();
    return ['transactions', 'loans', 'installments', 'categories'].every((n) => names.includes(n));
  } catch (e) {
    return false;
  }
}

export async function replaceWith(bytes) {
  const old = db.export();
  await idbSet('finance.before-import.db', old);
  db.close();
  db = new SQL.Database(fromWal(bytes));
  initSchema();
  await saveNow();
}

// ------------------------------------------------------------------ helpers
function q(sql, params = []) {
  const st = db.prepare(sql);
  st.bind(params.map((p) => (p === undefined ? null : p)));
  const rows = [];
  while (st.step()) rows.push(st.getAsObject());
  st.free();
  return rows;
}
const one = (sql, params) => q(sql, params)[0] || null;
function scalar(sql, params = []) {
  const r = db.exec(sql, params);
  const v = r[0]?.values[0]?.[0];
  return v == null ? 0 : v;
}
function run(sql, params = []) {
  db.run(sql, params.map((p) => (p === undefined ? null : p)));
  changed();
}
function insert(sql, params) {
  run(sql, params);
  return scalar('SELECT last_insert_rowid()');
}
function tx(fn) {
  db.run('BEGIN');
  try {
    const r = fn();
    db.run('COMMIT');
    changed();
    return r;
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
}

// ------------------------------------------------------------------ schema
const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name_fa TEXT NOT NULL, name_en TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('expense','income')), color TEXT NOT NULL DEFAULT '#8AA4C8',
  archived INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, name_fa TEXT NOT NULL, name_en TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'cash', archived INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL CHECK (kind IN ('expense','income')),
  date TEXT NOT NULL, amount INTEGER NOT NULL, category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL, note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS loans (id INTEGER PRIMARY KEY AUTOINCREMENT, lender TEXT NOT NULL, total_amount INTEGER NOT NULL,
  installment_count INTEGER NOT NULL, installment_amount INTEGER NOT NULL, due_day INTEGER NOT NULL DEFAULT 1,
  first_due_date TEXT NOT NULL, taken_date TEXT NOT NULL, account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  note TEXT NOT NULL DEFAULT '', archived INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS installments (id INTEGER PRIMARY KEY AUTOINCREMENT, loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL, due_date TEXT NOT NULL, amount INTEGER NOT NULL, paid INTEGER NOT NULL DEFAULT 0, paid_date TEXT,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL, note TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS assets (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'savings',
  amount INTEGER NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT '', archived INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS asset_history (id INTEGER PRIMARY KEY AUTOINCREMENT, asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  date TEXT NOT NULL, old_amount INTEGER NOT NULL, new_amount INTEGER NOT NULL, note TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS debts (id INTEGER PRIMARY KEY AUTOINCREMENT, direction TEXT NOT NULL CHECK (direction IN ('receivable','payable')),
  counterparty TEXT NOT NULL, amount INTEGER NOT NULL, settled INTEGER NOT NULL DEFAULT 0, date TEXT NOT NULL, due_date TEXT,
  settled_date TEXT, account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL, note TEXT NOT NULL DEFAULT '',
  archived INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS prices (market_key TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '', toman INTEGER NOT NULL,
  change_pct REAL NOT NULL DEFAULT 0, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS price_history (market_key TEXT NOT NULL, date TEXT NOT NULL, toman INTEGER NOT NULL,
  PRIMARY KEY (market_key, date));
CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_tx_kind ON transactions(kind, date);
CREATE INDEX IF NOT EXISTS idx_inst_due ON installments(due_date);
CREATE INDEX IF NOT EXISTS idx_inst_loan ON installments(loan_id, seq);
CREATE INDEX IF NOT EXISTS idx_debt_dir ON debts(direction, archived);
CREATE INDEX IF NOT EXISTS idx_hist_asset ON asset_history(asset_id, date);`;

const DEFAULT_CATEGORIES = [
  ['خوراک و خواربار', 'Food & Groceries', 'expense', '#E8A87C'], ['حمل و نقل', 'Transport', 'expense', '#7FB3D5'],
  ['اجاره و مسکن', 'Rent & Housing', 'expense', '#A9CCE3'], ['قبوض و شارژ', 'Bills & Utilities', 'expense', '#F5CBA7'],
  ['درمان و سلامت', 'Health & Medical', 'expense', '#F1948A'], ['پوشاک', 'Clothing', 'expense', '#D7BDE2'],
  ['آموزش', 'Education', 'expense', '#A3E4D7'], ['تفریح و سرگرمی', 'Entertainment', 'expense', '#F9E79F'],
  ['خانواده', 'Family', 'expense', '#FAD7A0'], ['موبایل و اینترنت', 'Phone & Internet', 'expense', '#AED6F1'],
  ['تعمیرات', 'Repairs', 'expense', '#CCD1D1'], ['متفرقه', 'Other', 'expense', '#BFC9CA'],
  ['حقوق', 'Salary', 'income', '#82C9A0'], ['درآمد آزاد', 'Freelance', 'income', '#7FCDBB'],
  ['پاداش', 'Bonus', 'income', '#A9DFBF'], ['سایر درآمد', 'Other Income', 'income', '#C5E1A5'],
];
const DEFAULT_SETTINGS = {
  lang: 'fa', unit: 'toman', fa_digits: '1', reminder_days: '3', reminder_on_start: '1',
  theme: 'light', animations: '1', schema_version: '3',
};
export const PALETTE = ['#E8A87C', '#7FB3D5', '#A9CCE3', '#F5CBA7', '#F1948A', '#D7BDE2', '#A3E4D7', '#F9E79F'];

function initSchema() {
  db.run('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) db.run('INSERT OR IGNORE INTO settings(key, value) VALUES(?, ?)', [k, v]);
  if (!scalar('SELECT COUNT(*) FROM categories')) {
    DEFAULT_CATEGORIES.forEach((c, i) => db.run('INSERT INTO categories(name_fa, name_en, kind, color, sort) VALUES(?,?,?,?,?)', [...c, i]));
  }
  migrate();
  if (!scalar('SELECT COUNT(*) FROM accounts')) {
    db.run("INSERT INTO accounts(name_fa, name_en, kind, sort) VALUES('نقدی', 'Cash', 'cash', 0)");
    db.run("INSERT INTO accounts(name_fa, name_en, kind, sort) VALUES('کارت بانکی', 'Bank Card', 'card', 1)");
  }
}

export const SCHEMA_VERSION = 3;

/** Bring an older ledger up to date (same steps as the Windows and Android apps). */
function migrate() {
  const cols = (db.exec('PRAGMA table_info(assets)')[0]?.values || []).map((r) => r[1]);
  if (!cols.includes('market_key')) db.run('ALTER TABLE assets ADD COLUMN market_key TEXT');
  if (!cols.includes('quantity')) db.run('ALTER TABLE assets ADD COLUMN quantity REAL NOT NULL DEFAULT 0');
  if (!cols.includes('since')) db.run('ALTER TABLE assets ADD COLUMN since TEXT');
  const v = Number(scalar("SELECT value FROM settings WHERE key = 'schema_version'")) || 1;
  if (v < SCHEMA_VERSION) db.run("INSERT OR REPLACE INTO settings(key, value) VALUES('schema_version', ?)", [String(SCHEMA_VERSION)]);
}

// ------------------------------------------------------------------ settings
export const settings = () => Object.fromEntries(q('SELECT key, value FROM settings').map((r) => [r.key, r.value]));
export const setSetting = (k, v) => run('INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?)', [k, String(v)]);

// ------------------------------------------------------------------ lookups
export function categories(kind = null, includeArchived = false) {
  let sql = 'SELECT * FROM categories WHERE 1=1';
  const p = [];
  if (kind) { sql += ' AND kind = ?'; p.push(kind); }
  if (!includeArchived) sql += ' AND archived = 0';
  return q(sql + ' ORDER BY sort, id', p);
}
export function addCategory(name, kind, fa) {
  const sort = scalar('SELECT COALESCE(MAX(sort), 0) + 1 FROM categories');
  run('INSERT INTO categories(name_fa, name_en, kind, color, sort) VALUES(?,?,?,?,?)', [name, fa ? '' : name, kind, PALETTE[sort % PALETTE.length], sort]);
}
export const renameCategory = (id, name, fa) => run(`UPDATE categories SET ${fa ? 'name_fa' : 'name_en'} = ? WHERE id = ?`, [name, id]);
export const archiveCategory = (id, a) => run('UPDATE categories SET archived = ? WHERE id = ?', [a ? 1 : 0, id]);

export const accounts = (includeArchived = false) => q('SELECT * FROM accounts' + (includeArchived ? '' : ' WHERE archived = 0') + ' ORDER BY sort, id');
export function addAccount(name, fa) {
  const sort = scalar('SELECT COALESCE(MAX(sort), 0) + 1 FROM accounts');
  run("INSERT INTO accounts(name_fa, name_en, kind, sort) VALUES(?,?,'card',?)", [name, fa ? '' : name, sort]);
}
export const renameAccount = (id, name, fa) => run(`UPDATE accounts SET ${fa ? 'name_fa' : 'name_en'} = ? WHERE id = ?`, [name, id]);
export const archiveAccount = (id, a) => run('UPDATE accounts SET archived = ? WHERE id = ?', [a ? 1 : 0, id]);

// ------------------------------------------------------------------ transactions
export function transactions(start, end, kind = null, categoryId = null) {
  let sql = `SELECT t.*, c.name_fa AS cfa, c.name_en AS cen, a.name_fa AS afa, a.name_en AS aen
             FROM transactions t LEFT JOIN categories c ON c.id = t.category_id LEFT JOIN accounts a ON a.id = t.account_id
             WHERE t.date BETWEEN ? AND ?`;
  const p = [start, end];
  if (kind) { sql += ' AND t.kind = ?'; p.push(kind); }
  if (categoryId) { sql += ' AND t.category_id = ?'; p.push(categoryId); }
  return q(sql + ' ORDER BY t.date DESC, t.id DESC', p);
}
export const addTransaction = (kind, date, amount, categoryId, accountId, note) => insert(
  'INSERT INTO transactions(kind, date, amount, category_id, account_id, note, created_at) VALUES(?,?,?,?,?,?,?)',
  [kind, date, amount, categoryId, accountId, note, J.todayIso()]);
export const updateTransaction = (id, kind, date, amount, categoryId, accountId, note) => run(
  'UPDATE transactions SET kind=?, date=?, amount=?, category_id=?, account_id=?, note=? WHERE id=?',
  [kind, date, amount, categoryId, accountId, note, id]);
export const deleteTransaction = (id) => run('DELETE FROM transactions WHERE id = ?', [id]);

export function totals(start, end) {
  const income = scalar("SELECT SUM(amount) FROM transactions WHERE kind='income' AND date BETWEEN ? AND ?", [start, end]);
  const expense = scalar("SELECT SUM(amount) FROM transactions WHERE kind='expense' AND date BETWEEN ? AND ?", [start, end]);
  const installments = scalar('SELECT SUM(paid) FROM installments WHERE paid > 0 AND paid_date BETWEEN ? AND ?', [start, end]);
  return { income, expense, installments, net: income - expense - installments };
}

export const breakdown = (start, end, kind = 'expense') => q(
  `SELECT c.id AS cid, c.name_fa, c.name_en, c.color, COALESCE(SUM(t.amount), 0) AS total
   FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
   WHERE t.kind = ? AND t.date BETWEEN ? AND ? GROUP BY c.id ORDER BY total DESC`, [kind, start, end]);

// ------------------------------------------------------------------ loans
export const loans = (includeArchived = false) => q(
  `SELECT l.*,
     COALESCE((SELECT SUM(amount) FROM installments WHERE loan_id = l.id), 0) AS sched,
     COALESCE((SELECT SUM(paid) FROM installments WHERE loan_id = l.id), 0) AS paid_sum,
     (SELECT COUNT(*) FROM installments WHERE loan_id = l.id AND paid >= amount) AS done,
     (SELECT COUNT(*) FROM installments WHERE loan_id = l.id) AS cnt,
     (SELECT MIN(due_date) FROM installments WHERE loan_id = l.id AND paid < amount) AS next_due
   FROM loans l` + (includeArchived ? '' : ' WHERE l.archived = 0') + ' ORDER BY l.archived, l.id DESC');

const INST = 'SELECT i.*, l.lender FROM installments i JOIN loans l ON l.id = i.loan_id';
export const installments = (loanId) => q(`${INST} WHERE i.loan_id = ? ORDER BY i.seq`, [loanId]);
export const installment = (id) => one(`${INST} WHERE i.id = ?`, [id]);
export const upcoming = (days) => q(`${INST} WHERE i.paid < i.amount AND l.archived = 0 AND i.due_date <= ? ORDER BY i.due_date`,
  [J.shiftIso(J.todayIso(), days)]);
export const openInstallments = () => q(`${INST} WHERE l.archived = 0 AND i.paid < i.amount ORDER BY i.due_date, l.lender`);
export const nextOpenInstallments = () => q(`${INST} WHERE l.archived = 0 AND i.paid < i.amount
  AND i.seq = (SELECT MIN(seq) FROM installments WHERE loan_id = i.loan_id AND paid < amount) ORDER BY i.due_date`);
export const paidInstallments = (start, end) => q(`${INST} WHERE i.paid > 0 AND i.paid_date BETWEEN ? AND ? ORDER BY i.paid_date DESC, i.id DESC`, [start, end]);
export const dueInstallments = (start, end) => q(`${INST} WHERE i.due_date BETWEEN ? AND ? ORDER BY i.due_date, l.lender`, [start, end]);

export function loanTotals(ms, me) {
  const base = 'FROM installments i JOIN loans l ON l.id = i.loan_id WHERE l.archived = 0';
  return {
    remaining: scalar(`SELECT COALESCE(SUM(i.amount - i.paid), 0) ${base} AND i.paid < i.amount`),
    done: scalar(`SELECT COUNT(*) ${base} AND i.paid >= i.amount`),
    count: scalar(`SELECT COUNT(*) ${base}`),
    dueThisMonth: scalar(`SELECT COALESCE(SUM(i.amount), 0) ${base} AND i.due_date BETWEEN ? AND ?`, [ms, me]),
    active: scalar('SELECT COUNT(*) FROM loans WHERE archived = 0'),
  };
}

/** Monthly installments: the rounded-down average, the last one taking the remainder;
 *  a due day past the month's end falls on its last real day. */
export function buildSchedule(total, count, firstDue, dueDay) {
  const n = Math.max(1, count);
  const per = Math.floor(total / n);
  const [fy, fm] = J.fromIso(firstDue);
  const out = [];
  for (let i = 0; i < n; i++) {
    const [y, m] = J.addMonths(fy, fm, i);
    out.push([i + 1, J.toIso(y, m, J.clampDay(y, m, dueDay)), i < n - 1 ? per : total - per * (n - 1)]);
  }
  return out;
}

export function createLoan(lender, total, count, dueDay, firstDue, taken, note) {
  return tx(() => {
    const s = buildSchedule(total, count, firstDue, dueDay);
    db.run(`INSERT INTO loans(lender, total_amount, installment_count, installment_amount, due_day, first_due_date, taken_date, note, created_at)
            VALUES(?,?,?,?,?,?,?,?,?)`, [lender, total, count, s[0][2], dueDay, firstDue, taken, note, J.todayIso()]);
    const id = scalar('SELECT last_insert_rowid()');
    for (const [seq, due, amt] of s) db.run('INSERT INTO installments(loan_id, seq, due_date, amount) VALUES(?,?,?,?)', [id, seq, due, amt]);
    return id;
  });
}

export function updateLoan(id, lender, total, count, dueDay, firstDue, taken, note, archived, rebuild) {
  tx(() => {
    let instAmount = scalar('SELECT installment_amount FROM loans WHERE id = ?', [id]);
    if (rebuild) {
      const paid = Object.fromEntries(installments(id).filter((i) => i.paid > 0).map((i) => [i.seq, i]));
      const s = buildSchedule(total, count, firstDue, dueDay);
      db.run('DELETE FROM installments WHERE loan_id = ?', [id]);
      for (const [seq, due, amt] of s) {
        const p = paid[seq];
        db.run('INSERT INTO installments(loan_id, seq, due_date, amount, paid, paid_date, account_id, note) VALUES(?,?,?,?,?,?,?,?)',
          [id, seq, due, amt, Math.min(p ? p.paid : 0, amt), p ? p.paid_date : null, p ? p.account_id : null, p ? p.note : '']);
      }
      instAmount = s[0][2];
    }
    db.run(`UPDATE loans SET lender=?, total_amount=?, installment_count=?, installment_amount=?, due_day=?, first_due_date=?,
            taken_date=?, note=?, archived=? WHERE id=?`, [lender, total, count, instAmount, dueDay, firstDue, taken, note, archived ? 1 : 0, id]);
  });
}

export function deleteLoan(id) {
  tx(() => {
    db.run('DELETE FROM installments WHERE loan_id = ?', [id]);
    db.run('DELETE FROM loans WHERE id = ?', [id]);
  });
}

export const payInstallment = (id, paid, date, accountId, note = '') => run(
  'UPDATE installments SET paid = ?, paid_date = ?, account_id = ?, note = ? WHERE id = ?',
  [paid, paid > 0 ? date : null, accountId, note, id]);

// ------------------------------------------------------------------ assets
// An asset is either "manual" (amount typed by the user, in Toman) or a market
// holding: market_key (a TGJU item id) + quantity. A market holding's amount is
// kept equal to quantity × the latest price, so every total stays current.
export const assets = () => q('SELECT * FROM assets WHERE archived = 0 ORDER BY sort, id');
export const asset = (id) => one('SELECT * FROM assets WHERE id = ?', [id]);
export const assetsTotal = () => scalar('SELECT COALESCE(SUM(amount), 0) FROM assets WHERE archived = 0');

export function addAsset(name, kind, amount, note, marketKey = null, quantity = 0, since = null) {
  tx(() => {
    const today = J.todayIso();
    const sort = scalar('SELECT COALESCE(MAX(sort), 0) + 1 FROM assets');
    db.run(`INSERT INTO assets(name, kind, amount, note, sort, updated_at, created_at, market_key, quantity, since)
            VALUES(?,?,?,?,?,?,?,?,?,?)`, [name, kind, amount, note, sort, today, today, marketKey, quantity, since || today]);
    const id = scalar('SELECT last_insert_rowid()');
    if (amount) db.run('INSERT INTO asset_history(asset_id, date, old_amount, new_amount, note) VALUES(?,?,?,?,?)', [id, since || today, 0, amount, note]);
  });
}
export function updateAsset(id, name, kind, amount, note, marketKey = null, quantity = 0, since = null) {
  tx(() => {
    const today = J.todayIso();
    const old = scalar('SELECT amount FROM assets WHERE id = ?', [id]);
    db.run('UPDATE assets SET name=?, kind=?, amount=?, note=?, updated_at=?, market_key=?, quantity=?, since=? WHERE id=?',
      [name, kind, amount, note, today, marketKey, quantity, since, id]);
    if (old !== amount && !marketKey) db.run('INSERT INTO asset_history(asset_id, date, old_amount, new_amount, note) VALUES(?,?,?,?,?)', [id, today, old, amount, note]);
  });
}
/** Manual asset: add / remove Toman. Market holding: add / remove quantity (delta is then a quantity). */
export function adjustAsset(id, delta, date, note) {
  tx(() => {
    const a = asset(id);
    if (a.market_key) {
      const qty = Math.max(0, a.quantity + delta);
      const price = scalar('SELECT toman FROM prices WHERE market_key = ?', [a.market_key]) || (a.quantity ? a.amount / a.quantity : 0);
      const amount = Math.round(qty * price);
      db.run('UPDATE assets SET quantity = ?, amount = ?, updated_at = ? WHERE id = ?', [qty, amount, date, id]);
      db.run('INSERT INTO asset_history(asset_id, date, old_amount, new_amount, note) VALUES(?,?,?,?,?)', [id, date, a.amount, amount, note]);
    } else {
      db.run('UPDATE assets SET amount = ?, updated_at = ? WHERE id = ?', [a.amount + delta, date, id]);
      db.run('INSERT INTO asset_history(asset_id, date, old_amount, new_amount, note) VALUES(?,?,?,?,?)', [id, date, a.amount, a.amount + delta, note]);
    }
  });
}
export function deleteAsset(id) {
  tx(() => {
    db.run('DELETE FROM asset_history WHERE asset_id = ?', [id]);
    db.run('DELETE FROM assets WHERE id = ?', [id]);
  });
}
export const assetHistory = (id) => q('SELECT * FROM asset_history WHERE asset_id = ? ORDER BY date DESC, id DESC LIMIT 30', [id]);
export const assetHistoryAll = () => q('SELECT * FROM asset_history ORDER BY date, id');

// ------------------------------------------------------------------ market prices
export const prices = () => Object.fromEntries(q('SELECT * FROM prices').map((r) => [r.market_key, r]));
export function savePrices(rows, updatedAt) {
  tx(() => {
    for (const r of rows) {
      db.run('INSERT OR REPLACE INTO prices(market_key, title, toman, change_pct, updated_at) VALUES(?,?,?,?,?)',
        [r.key, r.title || '', r.toman, r.change || 0, updatedAt]);
    }
  });
}
/** Re-price every market holding from the stored prices. */
export function revalueAssets() {
  tx(() => {
    db.run(`UPDATE assets SET amount = CAST(ROUND(quantity * (SELECT toman FROM prices p WHERE p.market_key = assets.market_key)) AS INTEGER)
            WHERE market_key IS NOT NULL AND EXISTS (SELECT 1 FROM prices p WHERE p.market_key = assets.market_key)`);
  });
}
export function saveHistory(key, points) {
  tx(() => {
    for (const [date, toman] of points) db.run('INSERT OR REPLACE INTO price_history(market_key, date, toman) VALUES(?,?,?)', [key, date, toman]);
  });
}
export const priceHistory = (key) => q('SELECT date, toman FROM price_history WHERE market_key = ? ORDER BY date', [key]);
export const historyLastDate = (key) => scalar('SELECT MAX(date) FROM price_history WHERE market_key = ?', [key]) || '';

// ------------------------------------------------------------------ debts
export const debts = (direction) => q(
  'SELECT * FROM debts WHERE archived = 0 AND direction = ? ORDER BY (settled >= amount), COALESCE(due_date, date), id DESC', [direction]);
export const debtsOutstanding = (direction) => scalar(
  'SELECT COALESCE(SUM(amount - settled), 0) FROM debts WHERE direction = ? AND archived = 0', [direction]);
export const addDebt = (direction, who, amount, date, due, note) => insert(
  'INSERT INTO debts(direction, counterparty, amount, date, due_date, note, created_at) VALUES(?,?,?,?,?,?,?)',
  [direction, who, amount, date, due || null, note, J.todayIso()]);
export const updateDebt = (id, direction, who, amount, date, due, note) => run(
  'UPDATE debts SET direction=?, counterparty=?, amount=?, date=?, due_date=?, note=? WHERE id=?',
  [direction, who, amount, date, due || null, note, id]);
export const settleDebt = (id, settled, date) => run('UPDATE debts SET settled=?, settled_date=? WHERE id=?', [settled, settled > 0 ? date : null, id]);
export const deleteDebt = (id) => run('DELETE FROM debts WHERE id = ?', [id]);
