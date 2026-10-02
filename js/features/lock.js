// PIN lock screen and PIN setup.
import { num, tr } from '../core.js';
import { ic } from '../icons.js';
import { closeAll, dialogBox, push, renderLayers } from '../ui/layers.js';
import { render, toast } from '../ui/shell.js';
import { $app, S } from '../ui/state.js';

export async function hash(pin) {
  let salt = localStorage.getItem('pin_salt');
  if (!salt) { salt = Math.random().toString(36).slice(2); localStorage.setItem('pin_salt', salt); }
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + pin));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export let pinEntry = '';
export function renderLock(msg = '') {
  $app.innerHTML = `<div class="lock"><div class="brand">${ic('lock', 32, 1.9)}</div><div class="b" style="font-size:20px">${tr('app_title')}</div>
    <div class="muted">${msg || tr('pin_enter')}</div><div class="pin-dots">${[0, 1, 2, 3].map((i) => `<span class="${i < pinEntry.length ? 'f' : ''}"></span>`).join('')}</div>
    <div class="keypad" style="width:260px">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '<'].map((k) => k ? `<button data-a="pinKey" data-k="${k}">${k === '<' ? ic('backspace', 24) : num(k)}</button>` : '<span></span>').join('')}</div></div>`;
}

export function pinSetup() {
  push({
    dialog: true, first: '', pin: '', msg: '',
    render(L) {
      return dialogBox(tr('pin_lock'), `<div class="muted center">${L.msg || (L.first ? tr('pin_again') : tr('pin_new'))}</div>
        <div class="pin-dots">${[0, 1, 2, 3].map((i) => `<span class="${i < L.pin.length ? 'f' : ''}"></span>`).join('')}</div>
        <div class="keypad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '<'].map((k) => k ? `<button data-a=".key" data-k="${k}">${k === '<' ? ic('backspace', 24) : num(k)}</button>` : '<span></span>').join('')}</div>`,
      [{ label: tr('cancel'), a: 'close' }]);
    },
    async key(ds) {
      this.pin = ds.k === '<' ? this.pin.slice(0, -1) : (this.pin + ds.k).slice(0, 4);
      this.msg = '';
      if (this.pin.length === 4) {
        if (!this.first) { this.first = this.pin; this.pin = ''; }
        else if (this.first === this.pin) { localStorage.setItem('pin', await hash(this.pin)); closeAll(); render(); toast(tr('saved')); return; }
        else { this.first = ''; this.pin = ''; this.msg = tr('pin_mismatch'); }
      }
      renderLayers();
    },
  });
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) S.hiddenAt = Date.now();
  else if (localStorage.getItem('pin') && S.hiddenAt && Date.now() - S.hiddenAt > 30000) { S.locked = true; pinEntry = ''; closeAll(); render(); }
});

export function lockIfNeeded() { S.locked = !!localStorage.getItem('pin'); }

export async function pinKey(ds) {
  pinEntry = ds.k === '<' ? pinEntry.slice(0, -1) : (pinEntry + ds.k).slice(0, 4);
  if (pinEntry.length === 4) {
    if ((await hash(pinEntry)) === localStorage.getItem('pin')) { S.locked = false; pinEntry = ''; render(false); return; }
    pinEntry = '';
    return renderLock(tr('pin_wrong'));
  }
  renderLock();
}
