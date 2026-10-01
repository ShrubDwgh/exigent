// Komponen UI kustom bersama: bottom sheet / modal buatan sendiri.
// Tidak memakai alert(), confirm(), <select>, atau <dialog> bawaan browser.
//
// openSheet({ title, body, actions, closeLabel, onOpen }) → ctx
//   body    : string HTML (nilai dinamis WAJIB di-escape dengan esc())
//   actions : [{ label, variant: 'outline'|'secondary'|'danger'|..., onClick(ctx, button) }]
//   ctx     : { el, body, close(), closeNow() }
//             close()    → tutup + ikut menutup entri history (tombol Back HP menutup sheet)
//             closeNow() → tutup seketika tanpa history.back() (pakai sebelum pindah halaman)

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const FOCUSABLE = 'a[href], button:not([disabled]), [role="radio"], input:not([disabled]), [tabindex]:not([tabindex="-1"])';
let cur = null; // sheet yang sedang terbuka (hanya satu pada satu waktu)

// Jika halaman di-reload saat sheet terbuka, buang penanda history yang tertinggal.
try { if (history.state && history.state.exSheet) history.replaceState(null, ''); } catch (_) { /* abaikan */ }

function onKey(e) {
  if (!cur) return;
  if (e.key === 'Escape') { e.preventDefault(); close(); return; }
  if (e.key !== 'Tab') return;
  const items = [...cur.bg.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
  if (!items.length) return;
  const first = items[0], last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function finish() {
  if (!cur) return;
  const { bg, opener } = cur;
  cur = null;
  window.removeEventListener('popstate', finish);
  document.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
  bg.classList.add('closing');
  setTimeout(() => bg.remove(), 180);
  if (opener && opener.isConnected) opener.focus({ preventScroll: true });
}

function close() {
  if (!cur) return;
  // Sheet membuat 1 entri history; kembali satu langkah → popstate → finish().
  if (history.state && history.state.exSheet) history.back(); else finish();
}

export function openSheet({ title, body = '', actions = [], closeLabel = 'Close', onOpen } = {}) {
  if (cur) finish(); // jangan buka sheet bertumpuk/berantai
  const bg = document.createElement('div');
  bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabindex="-1">
    <div class="sheet-grab" aria-hidden="true"></div>
    <div class="sheet-head"><h2 id="sheet-title">${esc(title)}</h2>
      <button type="button" class="icon-btn" data-close aria-label="${esc(closeLabel)}"><i data-lucide="x" aria-hidden="true"></i></button></div>
    <div class="sheet-body">${body}</div>
    ${actions.length ? '<div class="sheet-actions"></div>' : ''}
  </div>`;
  const sheet = bg.querySelector('.sheet');
  const ctx = { el: bg, body: bg.querySelector('.sheet-body'), close, closeNow: finish };

  const bar = bg.querySelector('.sheet-actions');
  actions.forEach((a) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn' + (a.variant ? ' btn-' + a.variant : '');
    b.textContent = a.label;
    b.onclick = () => a.onClick(ctx, b);
    bar.append(b);
  });

  // Tutup: tap area gelap di luar sheet, atau tombol X.
  bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-close]')) close(); });

  // Geser ke bawah pada pegangan/judul untuk menutup.
  const drag = (el) => {
    let y0 = null, dy = 0;
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      y0 = e.clientY; dy = 0; sheet.style.transition = 'none';
      try { el.setPointerCapture(e.pointerId); } catch (_) { /* abaikan */ }
    });
    el.addEventListener('pointermove', (e) => {
      if (y0 == null) return;
      dy = Math.max(0, e.clientY - y0);
      sheet.style.transform = `translateY(${dy}px)`;
    });
    const end = () => {
      if (y0 == null) return;
      y0 = null; sheet.style.transition = '';
      if (dy > 90) close(); else sheet.style.transform = '';
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  };
  drag(bg.querySelector('.sheet-grab'));
  drag(bg.querySelector('.sheet-head'));

  if (!(history.state && history.state.exSheet)) history.pushState({ exSheet: true }, '');
  window.addEventListener('popstate', finish);
  document.addEventListener('keydown', onKey);
  document.body.style.overflow = 'hidden';
  document.body.append(bg);
  cur = { bg, opener: document.activeElement };
  if (window.lucide) window.lucide.createIcons();
  if (onOpen) onOpen(ctx);

  const first = bg.querySelector('[aria-checked="true"]') || bg.querySelector('.sheet-body a[href], .sheet-body button, .sheet-actions button') || bg.querySelector('[data-close]');
  (first || sheet).focus({ preventScroll: true });
  return ctx;
}
