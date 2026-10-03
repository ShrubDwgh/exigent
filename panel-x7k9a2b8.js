import { supabase } from './supabase.js';
import { requireSession } from './auth.js';

const ADMIN_EMAIL = 'microsofttrazz@gmail.com';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let me = null;
let currentTab = 'dashboard';
let cache = { feedback: [], products: [], users: [] };

let toastTimer = null;
function toast(msg, type = '') {
  const el = $('admin-toast');
  el.textContent = msg;
  el.className = 'admin-toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'admin-toast'; }, 2600);
}

const fmtDate = (iso) => {
  if (!iso) return '-';
  try { return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)); }
  catch (_) { return String(iso); }
};
const fmtPrice = (n) => {
  if (!n && n !== 0) return '-';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
};
const fmtSeconds = (s) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${String(ss).padStart(2, '0')}`;
};
const icons = () => window.lucide && window.lucide.createIcons();

let searchInputHandler = null;
function setupSearch(placeholder, value, onInput, opts = {}) {
  const bar = $('admin-search-bar');
  const input = $('admin-search-input');
  const addBtn = $('admin-fab-add');

  bar.classList.add('active');
  input.placeholder = placeholder;
  if (input.value !== value) input.value = value || '';

  if (opts.showAdd) {
    addBtn.hidden = false;
    addBtn.onclick = opts.onAdd || null;
  } else {
    addBtn.hidden = true;
    addBtn.onclick = null;
  }

  if (searchInputHandler) input.removeEventListener('input', searchInputHandler);
  searchInputHandler = (e) => onInput(e.target.value);
  input.addEventListener('input', searchInputHandler);
}
function hideSearch() {
  const bar = $('admin-search-bar');
  const addBtn = $('admin-fab-add');
  bar.classList.remove('active');
  bar.style.transform = '';
  addBtn.hidden = true;
  addBtn.onclick = null;
  const input = $('admin-search-input');
  if (searchInputHandler) input.removeEventListener('input', searchInputHandler);
  searchInputHandler = null;
  input.value = '';
  input.blur();
}

/* ============================================================
   MODAL — dukungan back button HP
   ============================================================ */
let activeModal = null;
let modalHistoryActive = false;

function openModal(innerHtml, onMount) {
  const wrap = document.createElement('div');
  wrap.className = 'admin-modal-bg';
  wrap.innerHTML = `<div class="admin-modal">${innerHtml}</div>`;
  document.body.append(wrap);
  wrap.addEventListener('click', (e) => { if (e.target === wrap) closeModal(wrap); });
  icons();
  if (onMount) onMount(wrap);
  activeModal = wrap;

  try {
    history.pushState({ adminModal: true }, '');
    modalHistoryActive = true;
  } catch (_) {}

  return wrap;
}

function closeModal(wrap, opts = {}) {
  if (!wrap || !wrap.parentNode) return;
  wrap.remove();
  if (activeModal === wrap) activeModal = null;

  if (modalHistoryActive && !opts.fromPopstate) {
    modalHistoryActive = false;
    try { history.back(); } catch (_) {}
  } else if (opts.fromPopstate) {
    modalHistoryActive = false;
  }
}

window.addEventListener('popstate', () => {
  if (activeModal) {
    closeModal(activeModal, { fromPopstate: true });
  }
});

async function loadAudioBufferFor(url) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') await ctx.resume();
  const res = await fetch(url);
  const ab = await res.arrayBuffer();
  return { ctx, buffer: await ctx.decodeAudioData(ab) };
}

function initMiniPlayer(root, url) {
  if (!root || !url) return;
  const btn = root.querySelector('[data-play]');
  const bar = root.querySelector('.bar');
  const fill = root.querySelector('.bar-fill');
  const time = root.querySelector('.time');
  if (!btn || !bar || !fill || !time) return;

  let ctx, buffer, src = null, playing = false, startAt = 0, pausedAt = 0, raf = null;

  const setIcon = (p) => {
    btn.innerHTML = p
      ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>';
  };
  const update = () => {
    if (!buffer) { fill.style.width = '0%'; time.textContent = '0:00 / 0:00'; return; }
    const cur = playing ? Math.min(ctx.currentTime - startAt, buffer.duration) : pausedAt;
    const pct = buffer.duration > 0 ? (cur / buffer.duration) * 100 : 0;
    fill.style.width = pct + '%';
    time.textContent = `${fmtSeconds(cur)} / ${fmtSeconds(buffer.duration)}`;
  };
  const tick = () => {
    if (!playing || !buffer) return;
    if (ctx.currentTime - startAt >= buffer.duration - 0.03) {
      playing = false; pausedAt = 0; setIcon(false); update(); raf = null; return;
    }
    update();
    raf = requestAnimationFrame(tick);
  };
  const play = () => {
    if (!buffer) return;
    src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(0, pausedAt);
    startAt = ctx.currentTime - pausedAt;
    playing = true; setIcon(true);
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  };
  const pause = () => {
    if (!playing) return;
    pausedAt = Math.min(ctx.currentTime - startAt, buffer.duration);
    try { src.stop(); } catch (_) {}
    playing = false; setIcon(false);
    if (raf) cancelAnimationFrame(raf);
    raf = null; update();
  };

  btn.onclick = async () => {
    if (!ctx) {
      try {
        time.textContent = 'Memuat...';
        const r = await loadAudioBufferFor(url);
        ctx = r.ctx; buffer = r.buffer;
        update();
      } catch (e) {
        time.textContent = 'Error';
        console.error('[admin audio]', e);
        return;
      }
    }
    if (ctx.state === 'suspended') await ctx.resume();
    if (playing) pause();
    else play();
  };

  bar.addEventListener('pointerdown', (e) => {
    if (!buffer) return;
    const r = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const newT = ratio * buffer.duration;
    const wasPlaying = playing;
    if (playing) { try { src.stop(); } catch (_) {} playing = false; }
    pausedAt = newT;
    update();
    if (wasPlaying) play();
  });

  setIcon(false);
  update();
}

function setActiveTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.admin-tab').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  window.scrollTo(0, 0);
  renderCurrentTab();
}

document.querySelectorAll('.admin-tab').forEach((b) => {
  b.onclick = () => setActiveTab(b.dataset.tab);
});

$('admin-reload').onclick = () => {
  renderCurrentTab();
  toast('Dimuat ulang');
};

function renderCurrentTab() {
  if (currentTab === 'dashboard') return renderDashboard();
  if (currentTab === 'feedback') return renderFeedback();
  if (currentTab === 'products') return renderProducts();
  if (currentTab === 'users') return renderUsers();
  if (currentTab === 'notif') return renderNotif();
}

/* ============================================================
   TAB 1: DASHBOARD
   ============================================================ */
async function renderDashboard() {
  hideSearch();
  const content = $('admin-content');
  content.innerHTML = `<div class="admin-loading">Memuat statistik...</div>`;

  const [cardsRes, feedbackRes, productsRes] = await Promise.all([
    supabase.from('cards').select('id, is_active, has_purchased_card, created_at'),
    supabase.from('feedback').select('id, status, type, created_at'),
    supabase.from('products').select('id, is_available'),
  ]);

  const cards = cardsRes.data || [];
  const feedback = feedbackRes.data || [];
  const products = productsRes.data || [];

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const totalUsers = cards.length;
  const activeCards = cards.filter((c) => c.is_active).length;
  const premiumUsers = cards.filter((c) => c.has_purchased_card).length;

  const fbTotal = feedback.length;
  const fbNew = feedback.filter((f) => f.status === 'new').length;
  const fbThisWeek = feedback.filter((f) => new Date(f.created_at).getTime() > sevenDaysAgo).length;

  const prodTotal = products.length;
  const prodActive = products.filter((p) => p.is_available).length;

  content.innerHTML = `
    <div class="admin-stats">
      <div class="admin-stat">
        <p class="admin-stat-label">Total User</p>
        <p class="admin-stat-value">${totalUsers}</p>
        <p class="admin-stat-sub">${activeCards} kartu aktif</p>
      </div>
      <div class="admin-stat">
        <p class="admin-stat-label">Premium</p>
        <p class="admin-stat-value">${premiumUsers}</p>
        <p class="admin-stat-sub">sudah beli kartu</p>
      </div>
      <div class="admin-stat">
        <p class="admin-stat-label">Masukan</p>
        <p class="admin-stat-value">${fbTotal}</p>
        <p class="admin-stat-sub">${fbNew} belum dibaca</p>
      </div>
      <div class="admin-stat">
        <p class="admin-stat-label">Masukan (7 hari)</p>
        <p class="admin-stat-value">${fbThisWeek}</p>
        <p class="admin-stat-sub">minggu ini</p>
      </div>
      <div class="admin-stat">
        <p class="admin-stat-label">Produk</p>
        <p class="admin-stat-value">${prodTotal}</p>
        <p class="admin-stat-sub">${prodActive} aktif</p>
      </div>
    </div>
    <p class="muted small" style="text-align:center;margin-top:24px">Terakhir dimuat: ${new Date().toLocaleString('id-ID')}</p>
  `;
}

/* ============================================================
   TAB 2: FEEDBACK
   ============================================================ */
let fbFilters = { search: '', status: 'all', type: 'all' };

async function renderFeedback() {
  const content = $('admin-content');
  content.innerHTML = `<div class="admin-loading">Memuat masukan...</div>`;

  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    hideSearch();
    content.innerHTML = `<div class="admin-empty">Gagal memuat: ${esc(error.message)}</div>`;
    return;
  }

  cache.feedback = data || [];
  drawFeedback();
}

function chipHtml(group, value, label) {
  const active = group === 'status' ? fbFilters.status === value : fbFilters.type === value;
  return `<button type="button" class="admin-chip${active ? ' active' : ''}" data-group="${group}" data-value="${value}">${esc(label)}</button>`;
}

function drawFeedback() {
  const content = $('admin-content');
  const list = filterFeedback();

  content.innerHTML = `
    <div class="admin-filters" id="fb-status-filters">
      ${chipHtml('status', 'all', 'Semua status')}
      ${chipHtml('status', 'new', 'Baru')}
      ${chipHtml('status', 'read', 'Dibaca')}
      ${chipHtml('status', 'in_progress', 'Diproses')}
      ${chipHtml('status', 'resolved', 'Selesai')}
    </div>
    <div class="admin-filters" id="fb-type-filters">
      ${chipHtml('type', 'all', 'Semua tipe')}
      ${chipHtml('type', 'idea', 'Ide & Saran')}
      ${chipHtml('type', 'bug', 'Lapor Masalah')}
    </div>
    <p class="muted small" style="margin:0 0 12px">${list.length} masukan</p>
    <div id="fb-list"></div>
  `;
  icons();

  $('fb-status-filters').querySelectorAll('.admin-chip').forEach((c) => {
    c.onclick = () => { fbFilters.status = c.dataset.value; drawFeedback(); };
  });
  $('fb-type-filters').querySelectorAll('.admin-chip').forEach((c) => {
    c.onclick = () => { fbFilters.type = c.dataset.value; drawFeedback(); };
  });

  setupSearch('Cari pesan, device, atau user ID...', fbFilters.search, (v) => {
    fbFilters.search = v.trim();
    drawFeedback();
  });

  drawFeedbackList();
}

function filterFeedback() {
  return cache.feedback.filter((f) => {
    if (fbFilters.status !== 'all' && f.status !== fbFilters.status) return false;
    if (fbFilters.type !== 'all' && f.type !== fbFilters.type) return false;
    if (fbFilters.search) {
      const q = fbFilters.search.toLowerCase();
      return (f.message || '').toLowerCase().includes(q)
          || (f.device_info || '').toLowerCase().includes(q)
          || (f.user_id || '').toLowerCase().includes(q);
    }
    return true;
  });
}

function drawFeedbackList() {
  const list = filterFeedback();
  const listEl = $('fb-list');
  if (!listEl) return;

  if (!list.length) {
    listEl.innerHTML = `<div class="admin-empty">Tidak ada masukan yang cocok.</div>`;
    return;
  }

  listEl.innerHTML = list.map(fbItemHtml).join('');
  icons();

  listEl.querySelectorAll('[data-fb-action]').forEach((btn) => {
    btn.onclick = () => handleFeedbackAction(btn.dataset.fbAction, btn.dataset.id);
  });

  listEl.querySelectorAll('[data-shot-paths]').forEach(async (box) => {
    const paths = JSON.parse(box.dataset.shotPaths || '[]');
    if (!paths.length) return;
    const { data } = await supabase.storage.from('feedback-files').createSignedUrls(paths, 3600);
    if (!data) return;
    box.innerHTML = data.map((d) => d.signedUrl
      ? `<a href="${esc(d.signedUrl)}" target="_blank" rel="noopener"><img src="${esc(d.signedUrl)}" loading="lazy" alt=""></a>`
      : '').join('');
  });

  listEl.querySelectorAll('[data-audio-path]').forEach(async (el) => {
    const path = el.dataset.audioPath;
    if (!path) return;
    const { data } = await supabase.storage.from('feedback-files').createSignedUrl(path, 3600);
    if (data?.signedUrl) initMiniPlayer(el, data.signedUrl);
  });
}

function fbItemHtml(f) {
  const typeLabel = f.type === 'idea' ? 'Ide & Saran' : 'Lapor Masalah';
  const shots = f.screenshot_urls || [];
  const shotsHtml = shots.length
    ? `<div class="admin-shot-grid" data-shot-paths='${esc(JSON.stringify(shots))}'></div>`
    : '';
  const audioHtml = f.audio_url
    ? `<div class="admin-audio" data-audio-path="${esc(f.audio_url)}">
         <button type="button" data-play aria-label="Putar"></button>
         <div class="bar"><div class="bar-fill"></div></div>
         <span class="time">0:00 / 0:00</span>
       </div>`
    : '';
  const noteVal = f.admin_note || '';
  const noteHtml = `<div class="admin-note">
    <label style="font-size:.75rem;font-weight:600;color:var(--muted)">Catatan internal (muncul di riwayat user)</label>
    <textarea data-note-id="${f.id}" rows="2" placeholder="Tulis catatan...">${esc(noteVal)}</textarea>
  </div>`;

  return `<article class="admin-item">
    <div class="admin-item-head">
      <div style="min-width:0;flex:1">
        <p class="admin-item-title">${esc(typeLabel)}</p>
        <p class="admin-item-sub">${esc(fmtDate(f.created_at))} · ${esc(f.device_info || '-')}</p>
        <p class="admin-item-sub" style="font-family:monospace;font-size:.7rem;word-break:break-all">${esc(f.user_id || '-')}</p>
      </div>
      <span class="admin-badge ${esc(f.status)}">${esc(statusLabel(f.status))}</span>
    </div>
    <p class="admin-item-msg">${esc(f.message)}</p>
    ${shotsHtml}
    ${audioHtml}
    ${noteHtml}
    <div class="admin-item-actions">
      ${statusBtn('read', 'Tandai Dibaca', f.id)}
      ${statusBtn('in_progress', 'Diproses', f.id)}
      ${statusBtn('resolved', 'Selesai', f.id)}
      <button type="button" class="admin-btn" data-fb-action="save-note" data-id="${f.id}">Simpan Catatan</button>
    </div>
  </article>`;
}

function statusLabel(s) {
  return { new: 'Baru', read: 'Dibaca', in_progress: 'Diproses', resolved: 'Selesai' }[s] || s;
}
function statusBtn(status, label, id) {
  return `<button type="button" class="admin-btn" data-fb-action="set-${status}" data-id="${id}">${label}</button>`;
}

async function handleFeedbackAction(action, id) {
  const item = cache.feedback.find((x) => x.id === id);
  if (!item) return;

  if (action.startsWith('set-')) {
    const newStatus = action.slice(4);
    const { error } = await supabase.from('feedback').update({ status: newStatus }).eq('id', id);
    if (error) return toast('Gagal: ' + error.message, 'error');
    item.status = newStatus;
    drawFeedback();
    toast('Status diperbarui', 'success');
  } else if (action === 'save-note') {
    const ta = document.querySelector(`[data-note-id="${id}"]`);
    const note = ta ? ta.value.trim() : '';
    const { error } = await supabase.from('feedback').update({ admin_note: note || null }).eq('id', id);
    if (error) return toast('Gagal: ' + error.message, 'error');
    item.admin_note = note;
    toast('Catatan disimpan', 'success');
  }
}

/* ============================================================
   TAB 3: PRODUCTS
   ============================================================ */
let prodFilters = { search: '', category: 'all' };

async function renderProducts() {
  const content = $('admin-content');
  content.innerHTML = `<div class="admin-loading">Memuat produk...</div>`;

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    hideSearch();
    content.innerHTML = `<div class="admin-empty">Gagal memuat: ${esc(error.message)}</div>`;
    return;
  }
  cache.products = data || [];
  drawProducts();
}

function prodCatChip(value, label) {
  const active = prodFilters.category === value;
  return `<button type="button" class="admin-chip${active ? ' active' : ''}" data-value="${value}">${esc(label)}</button>`;
}

function drawProducts() {
  const content = $('admin-content');
  const list = cache.products.filter((p) => {
    if (prodFilters.category !== 'all' && p.category !== prodFilters.category) return false;
    if (prodFilters.search) {
      const q = prodFilters.search.toLowerCase();
      return (p.name || '').toLowerCase().includes(q)
          || (p.code || '').toLowerCase().includes(q)
          || (p.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  content.innerHTML = `
    <div class="admin-filters" id="prod-cat-filters">
      ${prodCatChip('all', 'Semua')}
      ${prodCatChip('nfc', 'NFC')}
      ${prodCatChip('template', 'Template')}
    </div>
    <p class="muted small" style="margin:0 0 12px">${list.length} produk</p>
    <div class="admin-products" id="prod-list"></div>
  `;
  icons();

  $('prod-cat-filters').querySelectorAll('.admin-chip').forEach((c) => {
    c.onclick = () => { prodFilters.category = c.dataset.value; drawProducts(); };
  });

  setupSearch(
    'Cari nama, kode, deskripsi produk...',
    prodFilters.search,
    (v) => { prodFilters.search = v.trim(); drawProducts(); },
    { showAdd: true, onAdd: () => openProductForm(null) }
  );

  const listEl = $('prod-list');
  if (!list.length) {
    listEl.innerHTML = `<div class="admin-empty" style="grid-column:1/-1">Belum ada produk.</div>`;
    return;
  }
  listEl.innerHTML = list.map(prodCardHtml).join('');
  icons();
  listEl.querySelectorAll('[data-prod-edit]').forEach((b) => {
    b.onclick = () => openProductForm(cache.products.find((p) => p.id === b.dataset.prodEdit));
  });
  listEl.querySelectorAll('[data-prod-toggle]').forEach((b) => {
    b.onclick = () => toggleProduct(b.dataset.prodToggle);
  });
  listEl.querySelectorAll('[data-prod-del]').forEach((b) => {
    b.onclick = () => deleteProduct(b.dataset.prodDel);
  });
}

function prodCardHtml(p) {
  const imgHtml = p.image_url
    ? `<img src="${esc(p.image_url)}" alt="" loading="lazy">`
    : `<i data-lucide="package" style="width:40px;height:40px;color:var(--muted)"></i>`;
  const inactive = p.is_available ? '' : ' <span style="color:var(--muted);font-weight:600">(nonaktif)</span>';
  return `<div class="admin-product">
    <div class="admin-product-img">${imgHtml}</div>
    <div class="admin-product-body">
      <p class="admin-product-name">${esc(p.name)}${inactive}</p>
      <p class="admin-product-meta">${esc(p.code || '-')} · ${esc(p.category || '-')}</p>
      <p class="admin-product-price">${p.price === 0 ? 'Gratis' : fmtPrice(p.price)}</p>
      <div class="admin-item-actions" style="margin-top:auto">
        <button type="button" class="admin-btn" data-prod-edit="${p.id}"><i data-lucide="pencil" aria-hidden="true"></i>Edit</button>
        <button type="button" class="admin-btn" data-prod-toggle="${p.id}">${p.is_available ? 'Nonaktifkan' : 'Aktifkan'}</button>
        <button type="button" class="admin-btn danger" data-prod-del="${p.id}">Hapus</button>
      </div>
    </div>
  </div>`;
}

function openProductForm(p) {
  const isNew = !p;
  const d = p || { name: '', code: '', description: '', price: 0, original_price: null, discount_percent: 0, category: 'nfc', shopee_url: '', badge: '', image_url: '', is_available: true, sort_order: 0 };

  const html = `
    <h2>${isNew ? 'Tambah Produk' : 'Edit Produk'}</h2>
    <div class="field"><label for="p-name">Nama</label><input class="input" id="p-name" value="${esc(d.name)}"></div>
    <div class="field"><label for="p-code">Kode</label><input class="input" id="p-code" value="${esc(d.code || '')}"></div>
    <div class="field"><label for="p-desc">Deskripsi</label><textarea class="input" id="p-desc" rows="3">${esc(d.description || '')}</textarea></div>
    <div class="field"><label for="p-price">Harga (Rp)</label><input class="input" id="p-price" type="number" min="0" value="${d.price || 0}"></div>
    <div class="field"><label for="p-orig">Harga Asli (opsional)</label><input class="input" id="p-orig" type="number" min="0" value="${d.original_price || ''}"></div>
    <div class="field"><label for="p-disc">Diskon (%)</label><input class="input" id="p-disc" type="number" min="0" max="100" value="${d.discount_percent || 0}"></div>
    <div class="field"><label for="p-cat">Kategori</label>
      <select class="input" id="p-cat">
        <option value="nfc"${d.category === 'nfc' ? ' selected' : ''}>NFC</option>
        <option value="template"${d.category === 'template' ? ' selected' : ''}>Template</option>
      </select>
    </div>
    <div class="field"><label for="p-shopee">URL Shopee</label><input class="input" id="p-shopee" value="${esc(d.shopee_url || '')}"></div>
    <div class="field"><label for="p-badge">Badge (opsional)</label><input class="input" id="p-badge" value="${esc(d.badge || '')}" placeholder="Mis. Baru, Populer"></div>
    <div class="field"><label for="p-sort">Urutan</label><input class="input" id="p-sort" type="number" value="${d.sort_order || 0}"></div>
    <div class="field">
      <label>Gambar Produk</label>
      <div class="admin-photo-box">
        <div id="p-photo-preview">${d.image_url ? `<img src="${esc(d.image_url)}" alt="">` : '<p class="muted small">Belum ada gambar.</p>'}</div>
        <input type="file" id="p-photo" accept="image/*" hidden>
        <div class="btns">
          <label for="p-photo" class="admin-btn"><i data-lucide="image-plus" aria-hidden="true"></i>Pilih Gambar</label>
          ${d.image_url ? '<button type="button" class="admin-btn danger" id="p-photo-del">Hapus Gambar</button>' : ''}
        </div>
      </div>
    </div>
    <label class="check" style="display:flex;align-items:center;gap:8px;margin:12px 0"><input type="checkbox" id="p-active"${d.is_available ? ' checked' : ''}> Aktif (tampil di toko)</label>
    <div class="admin-modal-actions">
      <button type="button" class="admin-btn" data-cancel>Batal</button>
      <button type="button" class="admin-btn primary" data-save>${isNew ? 'Tambah' : 'Simpan'}</button>
    </div>
  `;

  let pendingImage = d.image_url || null;
  let pendingFile = null;

  const wrap = openModal(html, (w) => {
    w.querySelector('[data-cancel]').onclick = () => closeModal(w);
    w.querySelector('#p-photo').onchange = (e) => {
      const f = e.target.files[0];
      if (!f) return;
      pendingFile = f;
      const url = URL.createObjectURL(f);
      w.querySelector('#p-photo-preview').innerHTML = `<img src="${esc(url)}" alt="">`;
    };
    const delBtn = w.querySelector('#p-photo-del');
    if (delBtn) delBtn.onclick = () => {
      pendingImage = null;
      pendingFile = null;
      w.querySelector('#p-photo-preview').innerHTML = '<p class="muted small">Belum ada gambar.</p>';
    };
    w.querySelector('[data-save]').onclick = async () => {
      const btn = w.querySelector('[data-save]');
      btn.disabled = true; btn.textContent = 'Menyimpan...';
      try {
        let imageUrl = pendingImage;
        if (pendingFile) {
          const blob = await compressAdminImage(pendingFile);
          const ts = Date.now();
          const path = `prod-${ts}.jpg`;
          const { error: upErr } = await supabase.storage.from('product-images').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
          if (upErr) throw upErr;
          const { data: pub } = supabase.storage.from('product-images').getPublicUrl(path);
          imageUrl = pub.publicUrl;
        }

        const payload = {
          name: w.querySelector('#p-name').value.trim(),
          code: w.querySelector('#p-code').value.trim() || null,
          description: w.querySelector('#p-desc').value.trim() || null,
          price: parseInt(w.querySelector('#p-price').value) || 0,
          original_price: parseInt(w.querySelector('#p-orig').value) || null,
          discount_percent: parseInt(w.querySelector('#p-disc').value) || 0,
          category: w.querySelector('#p-cat').value,
          shopee_url: w.querySelector('#p-shopee').value.trim() || null,
          badge: w.querySelector('#p-badge').value.trim() || null,
          sort_order: parseInt(w.querySelector('#p-sort').value) || 0,
          is_available: w.querySelector('#p-active').checked,
          image_url: imageUrl,
        };
        if (!payload.name) throw new Error('Nama wajib diisi');

        let err;
        if (isNew) {
          const res = await supabase.from('products').insert(payload);
          err = res.error;
        } else {
          const res = await supabase.from('products').update(payload).eq('id', d.id);
          err = res.error;
        }
        if (err) throw err;
        closeModal(w);
        await renderProducts();
        toast(isNew ? 'Produk ditambahkan' : 'Produk disimpan', 'success');
      } catch (e) {
        toast('Gagal: ' + (e.message || e), 'error');
        btn.disabled = false; btn.textContent = isNew ? 'Tambah' : 'Simpan';
      }
    };
  });
}

async function toggleProduct(id) {
  const p = cache.products.find((x) => x.id === id);
  if (!p) return;
  const { error } = await supabase.from('products').update({ is_available: !p.is_available }).eq('id', id);
  if (error) return toast('Gagal: ' + error.message, 'error');
  await renderProducts();
  toast('Status diubah', 'success');
}

async function deleteProduct(id) {
  if (!confirm('Hapus produk ini? Tidak bisa dibatalkan.')) return;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return toast('Gagal: ' + error.message, 'error');
  await renderProducts();
  toast('Produk dihapus', 'success');
}

function compressAdminImage(file, maxSize = 800, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth, h = img.naturalHeight;
      const scale = Math.min(1, maxSize / Math.max(w, h));
      w = Math.round(w * scale); h = Math.round(h * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      c.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob null')), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gagal baca gambar')); };
    img.src = url;
  });
}

/* ============================================================
   TAB 4: USERS
   ============================================================ */
let userFilters = { search: '' };

async function renderUsers() {
  const content = $('admin-content');
  content.innerHTML = `<div class="admin-loading">Memuat user...</div>`;

  const { data, error } = await supabase.rpc('admin_list_users');

  if (error) {
    hideSearch();
    content.innerHTML = `<div class="admin-empty">Gagal memuat: ${esc(error.message)}<br><br>
      Pastikan RPC <code>admin_list_users</code> sudah dibuat di Supabase.</div>`;
    return;
  }

  cache.users = data || [];
  drawUsers();
}

function drawUsers() {
  const content = $('admin-content');
  const list = cache.users.filter((u) => {
    if (!userFilters.search) return true;
    const q = userFilters.search.toLowerCase();
    return (u.card_code || '').toLowerCase().includes(q)
        || (u.email || '').toLowerCase().includes(q)
        || (u.google_name || '').toLowerCase().includes(q)
        || (u.profile_name || '').toLowerCase().includes(q)
        || (u.user_id || '').toLowerCase().includes(q);
  });

  content.innerHTML = `
    <p class="muted small" style="margin:0 0 12px">${list.length} user</p>
    <div id="user-list"></div>
  `;

  setupSearch('Cari email, nama, atau card ID...', userFilters.search, (v) => {
    userFilters.search = v.trim();
    drawUsers();
  });

  const listEl = $('user-list');
  if (!list.length) {
    listEl.innerHTML = `<div class="admin-empty">Tidak ada user.</div>`;
    return;
  }
  listEl.innerHTML = list.map(userRowHtml).join('');
  icons();
  listEl.querySelectorAll('[data-user-toggle]').forEach((b) => {
    b.onclick = () => toggleUserCard(b.dataset.userToggle);
  });
  listEl.querySelectorAll('[data-user-reset-trial]').forEach((b) => {
    b.onclick = () => resetUserTrial(b.dataset.userResetTrial);
  });
  listEl.querySelectorAll('[data-user-del-card]').forEach((b) => {
    b.onclick = () => deleteUserCard(b.dataset.userDelCard);
  });
}

function userRowHtml(u) {
  const displayName = u.profile_name || u.google_name || (u.email || '?').split('@')[0];
  const avatarUrl = u.profile_photo || u.google_avatar || '';
  const initial = (displayName || '?')[0].toUpperCase();

  const avatar = avatarUrl
    ? `<img src="${esc(avatarUrl)}" alt="" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex:none" referrerpolicy="no-referrer">`
    : `<span style="width:44px;height:44px;border-radius:50%;background:var(--blue);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;flex:none;font-size:1.125rem">${esc(initial)}</span>`;

  const trialActive = u.trial_ends_at && new Date(u.trial_ends_at).getTime() > Date.now();
  const trialStr = u.trial_ends_at
    ? (trialActive ? `Aktif s/d ${fmtDate(u.trial_ends_at)}` : `Habis ${fmtDate(u.trial_ends_at)}`)
    : 'Tidak ada trial';

  const cardCode = u.card_code || '(belum punya kartu)';

  const p = (u.provider || '').toLowerCase();
  const providerLabel = p === 'google' ? 'Google'
                      : p === 'email' ? 'Email'
                      : p ? p.charAt(0).toUpperCase() + p.slice(1)
                      : 'Tidak diketahui';

  return `<div class="admin-item">
    <div class="admin-item-head">
      <div style="display:flex;gap:12px;align-items:center;min-width:0;flex:1">
        ${avatar}
        <div style="min-width:0;flex:1">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <p class="admin-item-title" style="word-break:break-word;margin:0">${esc(displayName)}</p>
            <span class="admin-provider-badge">${esc(providerLabel)}</span>
          </div>
          <p class="admin-item-sub" style="font-family:monospace;word-break:break-all">${esc(u.email || '-')}</p>
          <p class="admin-item-sub" style="font-family:monospace">${esc(cardCode)}</p>
          <p class="admin-item-sub" style="font-family:monospace;font-size:.7rem;word-break:break-all;color:var(--muted)">${esc(u.user_id || '-')}</p>
        </div>
      </div>
      <span class="admin-badge ${u.card_active ? 'resolved' : 'read'}">${u.card_active ? 'Aktif' : 'Nonaktif'}</span>
    </div>

    <div class="admin-info-box">
      <div class="admin-info-row"><span>Daftar</span><strong>${esc(fmtDate(u.account_created))}</strong></div>
      <div class="admin-info-row"><span>Login terakhir</span><strong>${esc(fmtDate(u.last_sign_in_at))}</strong></div>
      <div class="admin-info-row"><span>Trial</span><strong>${esc(trialStr)}</strong></div>
      ${u.has_purchased ? '<div class="admin-info-row"><span>Status</span><strong style="color:var(--green)">Premium</strong></div>' : ''}
    </div>

    <div class="admin-item-actions">
      ${u.card_row_id ? `
        <button type="button" class="admin-btn" data-user-toggle="${u.card_row_id}">${u.card_active ? 'Nonaktifkan Kartu' : 'Aktifkan Kartu'}</button>
        <button type="button" class="admin-btn" data-user-reset-trial="${u.card_row_id}">Reset Trial</button>
        <button type="button" class="admin-btn danger" data-user-del-card="${u.card_row_id}"><i data-lucide="trash-2" aria-hidden="true"></i>Hapus Kartu</button>
      ` : '<span class="muted small">User belum punya kartu</span>'}
    </div>
  </div>`;
}

async function toggleUserCard(id) {
  const u = cache.users.find((x) => x.card_row_id === id);
  if (!u) return;
  const { error } = await supabase.from('cards').update({ is_active: !u.card_active }).eq('id', id);
  if (error) return toast('Gagal: ' + error.message, 'error');
  u.card_active = !u.card_active;
  drawUsers();
  toast('Kartu diperbarui', 'success');
}

async function resetUserTrial(id) {
  if (!confirm('Reset trial user ini? Trial akan di-set mulai dari sekarang + 3 hari.')) return;
  const now = new Date();
  const end = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const { error } = await supabase.from('cards').update({
    trial_started_at: now.toISOString(),
    trial_ends_at: end.toISOString(),
  }).eq('id', id);
  if (error) return toast('Gagal: ' + error.message, 'error');
  const u = cache.users.find((x) => x.card_row_id === id);
  if (u) u.trial_ends_at = end.toISOString();
  drawUsers();
  toast('Trial direset', 'success');
}

async function deleteUserCard(id) {
  const u = cache.users.find((x) => x.card_row_id === id);
  if (!u) return;

  const name = u.profile_name || u.google_name || u.email || 'user ini';
  const code = u.card_code || '-';

  const answer = prompt(
    `Hapus kartu PERMANEN?\n\n` +
    `User: ${name}\n` +
    `Email: ${u.email}\n` +
    `Card ID: ${code}\n\n` +
    `Semua data kartu, profil medis, dan kontak darurat akan terhapus.\n` +
    `Tindakan ini tidak bisa dibatalkan.\n\n` +
    `Ketik HAPUS (huruf besar) untuk konfirmasi:`
  );

  if (answer !== 'HAPUS') {
    if (answer !== null) toast('Dibatalkan (ketikan salah)', 'error');
    return;
  }

  try {
    const { error } = await supabase.from('cards').delete().eq('id', id);
    if (error) throw error;
    toast('Kartu dihapus permanen', 'success');
    await renderUsers();
  } catch (e) {
    toast('Gagal: ' + (e.message || e), 'error');
  }
}

/* ============================================================
   TAB 5: NOTIFIKASI
   ============================================================ */
function renderNotif() {
  hideSearch();
  const content = $('admin-content');
  content.innerHTML = `
    <p class="muted" style="margin:0 0 16px">Kirim notifikasi ke user. Notif akan muncul di ikon lonceng.</p>
    <div class="admin-item">
      <h3 style="margin:0 0 12px;font-size:1rem">Komposisi Notifikasi</h3>
      <div class="field">
        <label>Target</label>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <button type="button" class="admin-chip active" id="notif-t-all">Semua User</button>
          <button type="button" class="admin-chip" id="notif-t-one">User Tertentu</button>
        </div>
        <select class="input" id="notif-user" style="display:none">
          <option value="">-- Pilih user --</option>
        </select>
      </div>
      <div class="field">
        <label>Tipe</label>
        <select class="input" id="notif-type">
          <option value="info">Info</option>
          <option value="security">Keamanan</option>
          <option value="policy">Kebijakan</option>
          <option value="card">Kartu</option>
        </select>
      </div>
      <div class="field"><label>Judul</label><input class="input" id="notif-title" placeholder="Mis. Update Aplikasi"></div>
      <div class="field"><label>Isi Pesan</label><textarea class="input" id="notif-body" rows="3" placeholder="Tulis isi notifikasi..."></textarea></div>
      <div class="field"><label>Link (opsional)</label><input class="input" id="notif-link" placeholder="Mis. /dashboard.html atau #/settings"></div>
      <button type="button" class="admin-btn primary" id="notif-send" style="width:100%;min-height:44px;justify-content:center">
        <i data-lucide="send" aria-hidden="true"></i>Kirim Notifikasi
      </button>
    </div>
  `;
  icons();

  let targetMode = 'all';
  const allBtn = $('notif-t-all');
  const oneBtn = $('notif-t-one');
  const userSelect = $('notif-user');

  allBtn.onclick = () => {
    targetMode = 'all';
    allBtn.classList.add('active'); oneBtn.classList.remove('active');
    userSelect.style.display = 'none';
  };
  oneBtn.onclick = async () => {
    targetMode = 'one';
    oneBtn.classList.add('active'); allBtn.classList.remove('active');
    userSelect.style.display = 'block';
    if (userSelect.options.length <= 1) {
      userSelect.innerHTML = '<option value="">Memuat...</option>';
      const { data } = await supabase.from('cards').select('owner_id, card_id, id');
      const { data: profs } = await supabase.from('emergency_profiles').select('card_uuid, full_name');
      const pm = new Map((profs || []).map((p) => [p.card_uuid, p.full_name]));
      const cards = data || [];
      userSelect.innerHTML = '<option value="">-- Pilih user --</option>' + cards.map((c) => {
        const name = pm.get(c.id) || 'Tanpa nama';
        return `<option value="${esc(c.owner_id)}">${esc(name)} — ${esc(c.card_id)}</option>`;
      }).join('');
    }
  };

  $('notif-send').onclick = () => sendNotif(targetMode);
}

async function sendNotif(targetMode) {
  const btn = $('notif-send');
  const title = $('notif-title').value.trim();
  const body = $('notif-body').value.trim();
  const type = $('notif-type').value;
  const link = $('notif-link').value.trim();

  if (!title) return toast('Judul wajib diisi', 'error');
  if (!body) return toast('Isi pesan wajib diisi', 'error');

  btn.disabled = true; btn.textContent = 'Mengirim...';

  try {
    let recipients = [];
    if (targetMode === 'all') {
      const { data } = await supabase.from('cards').select('owner_id');
      recipients = (data || []).map((c) => c.owner_id).filter(Boolean);
    } else {
      const uid = $('notif-user').value;
      if (!uid) throw new Error('Pilih user dulu');
      recipients = [uid];
    }

    if (!recipients.length) throw new Error('Tidak ada penerima');

    const rows = recipients.map((uid) => ({
      user_id: uid,
      type,
      title,
      body,
      data: link ? { link } : {},
    }));

    const { error } = await supabase.from('notifications').insert(rows);
    if (error) throw error;

    toast(`Notifikasi terkirim ke ${recipients.length} user`, 'success');
    $('notif-title').value = '';
    $('notif-body').value = '';
    $('notif-link').value = '';
  } catch (e) {
    toast('Gagal: ' + (e.message || e), 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="send" aria-hidden="true"></i>Kirim Notifikasi';
    icons();
  }
}

/* ============================================================
   INIT
   ============================================================ */
(async () => {
  const session = await requireSession();
  if (!session) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (user.email !== ADMIN_EMAIL) {
    document.body.innerHTML = `<div style="padding:40px;text-align:center;font-family:system-ui">
      <h2>Akses ditolak</h2>
      <p style="color:#64748B">Halaman ini hanya untuk admin.</p>
      <a href="/dashboard.html" style="color:#2563EB">Kembali ke Dashboard</a>
    </div>`;
    return;
  }

  me = user;
  icons();
  setActiveTab('dashboard');
})();

/* ============================================================
   SCROLL BEHAVIOR: sembunyikan appbar saat scroll ke bawah
   ============================================================ */
(function () {
  const appbar = document.getElementById('admin-appbar');
  const tabs = document.getElementById('admin-tabs');
  if (!appbar || !tabs) return;

  let lastY = window.scrollY;
  let ticking = false;
  const THRESHOLD_TOP = 40;
  const THRESHOLD_DELTA = 6;

  function update() {
    const y = window.scrollY;

    if (y < THRESHOLD_TOP) {
      appbar.classList.remove('appbar-hidden');
      tabs.classList.remove('appbar-hidden');
    } else if (y > lastY + THRESHOLD_DELTA) {
      appbar.classList.add('appbar-hidden');
      tabs.classList.add('appbar-hidden');
    } else if (y < lastY - THRESHOLD_DELTA) {
      appbar.classList.remove('appbar-hidden');
      tabs.classList.remove('appbar-hidden');
    }

    lastY = y;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
})();

/* ============================================================
   KEYBOARD BEHAVIOR: search bar ikut naik saat keyboard muncul.
   Pakai visualViewport API. FAB & elemen lain tetap.
   ============================================================ */
(function () {
  const searchBar = document.getElementById('admin-search-bar');
  if (!searchBar) return;
  if (!window.visualViewport) return; // browser lama, skip

  const vv = window.visualViewport;
  let rafId = null;
  let lastKbHeight = 0;

  function update() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      const windowH = window.innerHeight;
      const visibleBottom = vv.height + vv.offsetTop;
      const keyboardHeight = Math.max(0, windowH - visibleBottom);

      // Biar nggak "getar" — cuma update kalau selisih cukup besar (>2px)
      if (Math.abs(keyboardHeight - lastKbHeight) < 2) return;
      lastKbHeight = keyboardHeight;

      if (keyboardHeight > 100) {
        searchBar.style.transform = `translateY(-${keyboardHeight}px)`;
      } else {
        searchBar.style.transform = '';
      }
    });
  }

  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);

  // Fallback reset saat input blur (kadang vv.height nggak update tepat waktu)
  const input = document.getElementById('admin-search-input');
  if (input) {
    input.addEventListener('blur', () => {
      setTimeout(() => {
        lastKbHeight = 0;
        searchBar.style.transform = '';
      }, 100);
    });
  }
})();
