import { requireSession } from './auth.js';

const $ = (id) => document.getElementById(id);
const LABEL = { granted: 'Diizinkan', denied: 'Ditolak', prompt: 'Belum diminta' };
const CLS = { granted: 'badge-active', denied: 'badge-emergency', prompt: 'badge-inactive' };

function setBadge(el, state) {
  el.textContent = LABEL[state] || 'Tidak diketahui di browser ini';
  el.className = 'badge ' + (CLS[state] || '');
}

async function watchPermission(name, badgeEl, onState) {
  if (!navigator.permissions || !navigator.permissions.query) { setBadge(badgeEl, null); return; }
  try {
    const status = await navigator.permissions.query({ name });
    setBadge(badgeEl, status.state);
    if (onState) onState(status.state);
    status.onchange = () => { setBadge(badgeEl, status.state); if (onState) onState(status.state); };
  } catch (_) {
    setBadge(badgeEl, null);
  }
}

requireSession().then((s) => {
  if (!s) return;
  const geoBtn = $('perm-geo-btn');
  watchPermission('geolocation', $('perm-geo'), (state) => { geoBtn.hidden = state !== 'prompt'; });
  geoBtn.onclick = () => navigator.geolocation && navigator.geolocation.getCurrentPosition(() => {}, () => {});
  watchPermission('nfc', $('perm-nfc'));
});
