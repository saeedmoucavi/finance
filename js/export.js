// Excel (.xlsx), calendar (.ics) and printable report builders. No libraries:
// the xlsx is a small zip written here, the PDF comes from the system print sheet.
import * as D from './db.js';
import * as J from './jalali.js';
import { prefs, tr, t, isFa, amount, percent, unitLabel, toDisplay, date, esc, num } from './core.js';

// ------------------------------------------------------------------ report data
export function reportData(start, end, label) {
  const [ty, tm] = J.today();
  const [ms, me] = J.monthRange(ty, tm);
  const totals = D.totals(start, end);
  const assets = D.assetsTotal();
  const receivable = D.debtsOutstanding('receivable');
  const payable = D.debtsOutstanding('payable');
  const loanDebt = D.loanTotals(ms, me).remaining;
  const final = assets + totals.net;
  return {
    label, start, end, totals, assets, receivable, payable, loanDebt, final,
    netWorth: final + receivable - payable - loanDebt,
    expenseCats: D.breakdown(start, end, 'expense'),
    incomeCats: D.breakdown(start, end, 'income'),
    txs: D.transactions(start, end).reverse(),
    installments: D.dueInstallments(start, end),
    loans: D.loans(),
  };
}

const catName = (c) => (isFa() || !c.name_en ? c.name_fa : c.name_en) || tr('uncategorized');
const txCat = (x) => (isFa() || !x.cen ? x.cfa : x.cen) || '';
const txAcc = (x) => (isFa() || !x.aen ? x.afa : x.aen) || '';
const jd = (iso) => {
  if (!iso) return '';
  const [y, m, d] = J.fromIso(iso);
  return `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
};

export function fileStem(r) {
  const [y, m] = J.fromIso(r.start);
  const [, em, ed] = J.fromIso(r.end);
  return m === 1 && em === 12 && ed >= 29 ? `report-${y}` : `report-${y}-${String(m).padStart(2, '0')}`;
}

// ------------------------------------------------------------------ zip (store, no compression)
const CRC = (() => {
  const tbl = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tbl[n] = c >>> 0;
  }
  return tbl;
})();
function crc32(b) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function zip(files) {
  const enc = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const [name, text] of files) {
    const nameB = enc.encode(name);
    const data = enc.encode(text);
    const crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
    h.setUint16(8, 0, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true);
    h.setUint32(22, data.length, true); h.setUint16(26, nameB.length, true);
    chunks.push(new Uint8Array(h.buffer), nameB, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
    c.setUint16(28, nameB.length, true); c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), nameB);
    offset += 30 + nameB.length + data.length;
  }
  const size = central.reduce((s, b) => s + b.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, size, true); e.setUint32(16, offset, true);
  return new Blob([...chunks, ...central, new Uint8Array(e.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ------------------------------------------------------------------ Excel
const xesc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const col = (i) => { let n = i + 1, s = ''; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };

function sheetXml(sheet) {
  const rtl = isFa() ? ' rightToLeft="1"' : '';
  let x = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView${rtl} workbookViewId="0"/></sheetViews><cols>`;
  sheet.widths.forEach((w, i) => { x += `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`; });
  x += '</cols><sheetData>';
  sheet.rows.forEach(([cells, style], r) => {
    x += `<row r="${r + 1}">`;
    cells.forEach((v, c) => {
      const ref = col(c) + (r + 1);
      if (v === null || v === undefined || v === '') return;
      if (typeof v === 'number') x += `<c r="${ref}" s="${style === 1 ? 3 : 2}"><v>${v}</v></c>`;
      else x += `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${xesc(v)}</t></is></c>`;
    });
    x += '</row>';
  });
  return x + '</sheetData></worksheet>';
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0"/></numFmts>
<fonts count="3"><font><sz val="11"/><name val="Tahoma"/></font><font><b/><sz val="11"/><name val="Tahoma"/></font><font><b/><sz val="14"/><name val="Tahoma"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE6E9ED"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="1" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

export function excel(r) {
  const n = (v) => toDisplay(v);
  const sheet = (name, widths) => ({ name, widths, rows: [], row(cells, style = 0) { this.rows.push([cells, style]); return this; } });
  const sheets = [];

  const s1 = sheet(tr('x_summary'), [34, 22]);
  s1.row([tr('report_title')], 4).row([tr('period'), r.label]).row([tr('unit'), unitLabel()]).row([])
    .row([tr('item'), tr('amount')], 1)
    .row([tr('income'), n(r.totals.income)]).row([tr('expenses'), n(r.totals.expense)])
    .row([tr('installments_paid'), n(r.totals.installments)]).row([tr('balance'), n(r.totals.net)]).row([])
    .row([tr('position'), tr('amount')], 1)
    .row([tr('assets_total'), n(r.assets)]).row([tr('final_total'), n(r.final)]).row([tr('receivables'), n(r.receivable)])
    .row([tr('payables'), n(r.payable)]).row([tr('loan_debt'), n(r.loanDebt)]).row([tr('net_worth'), n(r.netWorth)]);
  sheets.push(s1);

  const s2 = sheet(tr('x_categories'), [28, 12, 18, 10]);
  s2.row([tr('category'), tr('type'), tr('amount'), tr('percent')], 1);
  for (const [list, kind] of [[r.expenseCats, 'expense'], [r.incomeCats, 'income']]) {
    const total = Math.max(1, list.reduce((s, c) => s + c.total, 0));
    list.forEach((c) => s2.row([catName(c), tr(kind), n(c.total), Math.round((c.total * 1000) / total) / 10]));
  }
  sheets.push(s2);

  const s3 = sheet(tr('x_transactions'), [13, 10, 24, 16, 18, 34]);
  s3.row([tr('date'), tr('type'), tr('category'), tr('method'), tr('amount'), tr('note')], 1);
  r.txs.forEach((x) => s3.row([jd(x.date), tr(x.kind), txCat(x), txAcc(x), n(x.amount), x.note]));
  sheets.push(s3);

  const s4 = sheet(tr('x_installments'), [22, 8, 13, 18, 18, 13, 14]);
  s4.row([tr('lender'), tr('number'), tr('due_date'), tr('amount'), tr('paid_amount'), tr('pay_date'), tr('status')], 1);
  r.installments.forEach((i) => s4.row([i.lender, i.seq, jd(i.due_date), n(i.amount), n(i.paid), jd(i.paid_date), tr(i.paid < i.amount ? 'open' : 'paid_check')]));
  sheets.push(s4);

  const s5 = sheet(tr('x_loans'), [22, 18, 10, 12, 18]);
  s5.row([tr('lender'), tr('loan_total'), tr('inst_count'), tr('paid_count'), tr('remaining')], 1);
  r.loans.forEach((l) => s5.row([l.lender, n(l.total_amount), l.cnt, l.done, n(l.sched - l.paid_sum)]));
  sheets.push(s5);

  const files = [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets.map((s, i) => `<sheet name="${xesc(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', STYLES],
    ...sheets.map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)]),
  ];
  return new File([zip(files)], fileStem(r) + '.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ------------------------------------------------------------------ calendar
/** One all-day event per open installment, with alerts N days before and on the morning it's due. */
export function calendar() {
  const days = prefs.reminderDays;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Personal Finance Dashboard//FA', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:' + tr('notify_channel')];
  const icsText = (s) => String(s).replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
  for (const i of D.openInstallments()) {
    const d = i.due_date.replace(/-/g, '');
    const next = J.shiftIso(i.due_date, 1).replace(/-/g, '');
    lines.push('BEGIN:VEVENT', `UID:pfd-inst-${i.id}-${d}@finance`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${next}`,
      'SUMMARY:' + icsText(t('ics_title', num(i.seq), i.lender) + ' · ' + amount(i.amount - i.paid, { withUnit: true }).replace(/[\u2066\u2069]/g, '')),
      'TRANSP:TRANSPARENT',
      // all-day events start at 00:00: 9 am is +9h, and N days earlier at 9 am is -(N-1)d15h
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsText(i.lender), `TRIGGER:-P${days - 1}DT15H`, 'END:VALARM',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsText(i.lender), 'TRIGGER:PT9H', 'END:VALARM',
      'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return new File([lines.join('\r\n') + '\r\n'], 'installments.ics', { type: 'text/calendar' });
}

// ------------------------------------------------------------------ printable report
export function reportHtml(r) {
  const kv = [
    [tr('income'), r.totals.income], [tr('expenses'), r.totals.expense], [tr('installments_paid'), r.totals.installments],
    [tr('balance'), r.totals.net], [tr('assets_total'), r.assets], [tr('final_total'), r.final],
    [tr('receivables'), r.receivable], [tr('payables'), r.payable], [tr('loan_debt'), r.loanDebt], [tr('net_worth'), r.netWorth],
  ];
  const total = Math.max(1, r.expenseCats.reduce((s, c) => s + c.total, 0));
  const max = Math.max(1, ...r.expenseCats.map((c) => c.total));
  let h = `<div class="band"><h1>${tr('report_title')}</h1><div>${esc(r.label)} · ${unitLabel()}</div></div>`;
  h += `<h3>${tr('summary')}</h3><div class="kv">${kv.map(([k, v]) => `<div><span>${k}</span><b>${amount(v)}</b></div>`).join('')}</div>`;
  if (r.expenseCats.length) {
    h += `<h3>${tr('expenses_by_cat')}</h3><table>${r.expenseCats.map((c) => `<tr><td style="width:30%">${esc(catName(c))}</td>
      <td><div class="rbar" style="width:${(c.total / max) * 100}%;background:${esc(c.color || '#BFC9CA')}"></div></td>
      <td style="width:22%"><b>${amount(c.total)}</b> ${percent(Math.round((c.total * 100) / total))}</td></tr>`).join('')}</table>`;
  }
  if (r.txs.length) {
    h += `<h3>${tr('x_transactions')}</h3><table><tr><th>${tr('date')}</th><th>${tr('type')}</th><th>${tr('category')}</th><th>${tr('method')}</th><th>${tr('amount')}</th><th>${tr('note')}</th></tr>`;
    h += r.txs.map((x) => `<tr><td>${date(x.date, false)}</td><td>${tr(x.kind)}</td><td>${esc(txCat(x))}</td><td>${esc(txAcc(x))}</td><td>${amount(x.amount)}</td><td>${esc(x.note)}</td></tr>`).join('') + '</table>';
  }
  if (r.installments.length) {
    h += `<h3>${tr('x_installments')}</h3><table><tr><th>${tr('lender')}</th><th>${tr('number')}</th><th>${tr('due_date')}</th><th>${tr('amount')}</th><th>${tr('paid_amount')}</th><th>${tr('status')}</th></tr>`;
    h += r.installments.map((i) => `<tr><td>${esc(i.lender)}</td><td>${num(i.seq)}</td><td>${date(i.due_date, false)}</td><td>${amount(i.amount)}</td><td>${amount(i.paid)}</td><td>${tr(i.paid < i.amount ? 'open' : 'paid_check')}</td></tr>`).join('') + '</table>';
  }
  return h;
}

/** A standalone HTML file of the report (fallback when the print sheet isn't available). */
export function reportFile(r) {
  const html = `<!doctype html><html lang="${prefs.lang}" dir="${isFa() ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${tr('report_title')}</title>
<style>body{font-family:Tahoma,sans-serif;padding:16px;color:#1E2330}.band{background:#1B1F26;color:#fff;border-radius:14px;padding:14px 18px}table{width:100%;border-collapse:collapse}th{background:#F1F2F4;text-align:start;padding:5px}td{border-bottom:1px solid #E6E9ED;padding:5px}.kv{display:grid;grid-template-columns:1fr 1fr;gap:6px}.kv div{background:#F5F6F8;border-radius:8px;padding:6px 10px;display:flex;justify-content:space-between}.rbar{height:9px;border-radius:5px}</style>
</head><body>${reportHtml(r)}</body></html>`;
  return new File([html], fileStem(r) + '.html', { type: 'text/html' });
}

