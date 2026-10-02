// Backup (share the database file) and import of a finance.db from another device.
import * as D from '../db.js';
import * as J from '../jalali.js';
import { tr } from '../core.js';
import { confirmDialog } from '../ui/layers.js';
import { loadPrefs, render, toast } from '../ui/shell.js';
import { S } from '../ui/state.js';

export async function shareFile(file) {
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return true;
    } catch (e) {
      if (e.name === 'AbortError') return false;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return true;
}

export function backupName() {
  const [y, m, d] = J.today();
  return `finance-${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}.db`;
}

export async function backup() {
  const ok = await shareFile(new File([D.exportBytes()], backupName(), { type: 'application/octet-stream' }));
  if (ok) { localStorage.setItem('last_backup', String(Date.now())); render(); }
}

export function pickImport() {
  const input = document.getElementById('filein');
  input.value = '';
  input.click();
}
document.getElementById('filein').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!D.looksValid(bytes)) { toast(tr('import_invalid')); return; }
  confirmDialog(tr('import_q'), tr('import_help'), tr('import_do'), async () => {
    await D.replaceWith(bytes);
    loadPrefs();
    S.counts = {};
    S.loans.open = undefined;
    S.stack = ['home'];
    render(false);
    toast(tr('import_done'));
  });
});
