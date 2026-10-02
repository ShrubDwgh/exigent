import { supabase } from './supabase.js';
import { requireSession, busy, toast } from './auth.js';
import { STRINGS, getLang, applyNavLabels } from './i18n.js';
import { getTrialStatus, canEdit, formatTimeLeft } from './trial.js';

// ==========================================
// LOG LOGIN GOOGLE
// ==========================================
function deviceInfo() {
  const ua = navigator.userAgent || '';
  const platform = /Android/i.test(ua) ? 'Android'
                 : /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
                 : /Windows/i.test(ua) ? 'Windows'
                 : /Mac/i.test(ua) ? 'Mac'
                 : 'Unknown';
  const browser = /Edg/i.test(ua) ? 'Edge'
                : /Chrome/i.test(ua) ? 'Chrome'
                : /Safari/i.test(ua) ? 'Safari'
                : /Firefox/i.test(ua) ? 'Firefox'
                : 'Browser';
  return browser + ' di ' + platform;
}

async function logLoginIfNeeded() {
  const key = 'exigent_logged_activity';
  if (sessionStorage.getItem(key)) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const providers = (user.app_metadata && user.app_metadata.providers) || [];
    if (!providers.includes('google')) {
      sessionStorage.setItem(key, '1');
      return;
    }
    await supabase.rpc('log_login_activity', { device_info: deviceInfo() });
    sessionStorage.setItem(key, '1');
  } catch (_) { /* diamkan */ }
}

logLoginIfNeeded();

// ==========================================
// REGISTER DEVICE
// ==========================================
async function registerCurrentDevice() {
  try {
    const ua = navigator.userAgent || '';
    await supabase.rpc('register_device', {
      p_device_info: deviceInfo(),
      p_user_agent: ua,
    });
  } catch (_) { /* diamkan */ }
}

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const list = (v) => v.split(',').map((x) => x.trim()).filter(Boolean);
const opts = (arr, cur) => arr.map((o) => `<option value="${o}"${o === cur ? ' selected' : ''}>${o}</option>`).join('');
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const CATS = ['keluarga', 'pasangan', 'teman', 'dokter', 'lainnya'];
const fail = (e) => toast('Gagal: ' + e.message);
const sub = (e) => e.submitter || e.target.querySelector('button[type="submit"]');
let card = null, profile = null, contacts = [], medisModal = null;
const lang = getLang();
const t = (k) => (STRINGS[lang] && STRINGS[lang][k]) || STRINGS.en[k] || k;

async function load() {
  // Ambil user yang sedang login
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail({ message: 'Sesi habis, silakan login ulang.' });

  // Filter by owner_id — double layer, biar RLS + client-side filter dua-duanya aktif
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at')
    .limit(1)
    .maybeSingle();
  if (error) return fail(error);

  card = data; profile = null; contacts = [];
  if (card) {
    const [p, k] = await Promise.all([
      supabase.from('emergency_profiles').select('*').eq('card_uuid', card.id).single(),
      supabase.from('emergency_contacts').select('*').eq('card_uuid', card.id).order('sort_order').order('name'),
    ]);
    profile = p.data; contacts = k.data || [];
  }
  applyNavLabels(t);
  renderDashboard();
  if (medisModal) renderMedisModal(medisModal.querySelector('.modal-box'));
  window.lucide && window.lucide.createIcons();
}

function drawQR(url) {
  const box = $('qr');
  if (!window.qrcode) { box.textContent = 'QR tidak dapat dimuat. Periksa koneksi internet.'; $('qrdl').hidden = true; return; }
  const q = window.qrcode(0, 'M');
  q.addData(url); q.make();
  box.innerHTML = q.createSvgTag(6, 2);
  $('qrdl').onclick = () => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = 640;
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 640, 640); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, 640, 640);
      const a = document.createElement('a'); a.download = `exigent-${card.card_id}.png`; a.href = c.toDataURL('image/png'); a.click();
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(box.querySelector('svg')));
  };
}

function renderDashboard() {
  const box = $('tab-dashboard');
  if (!card) {
    box.innerHTML = `<h1>${t('dash_title')}</h1><div class="card stack-lg"><h2>${t('no_card_title')}</h2>
      <p class="muted">${t('no_card_desc')}</p>
      <button class="btn btn-block" id="create">${t('create_card')}</button></div>`;
    $('create').onclick = (e) => busy(e.currentTarget, async () => {
      const { error } = await supabase.rpc('create_card');
      if (error) return fail(error);
      await load(); toast('Kartu dibuat');
    });
    return;
  }
  const url = `${location.origin}/card/${card.card_id}`;
  const trialStatus = getTrialStatus(card);
  const bannerHtml = (trialStatus.status === 'trial' || trialStatus.status === 'expired')
    ? `<div class="card stack-sm" style="background:${trialStatus.status === 'expired' ? '#FEF2F2' : '#EFF6FF'};border-color:${trialStatus.status === 'expired' ? '#FECACA' : '#BFDBFE'};margin-bottom:12px">
        <strong>${trialStatus.status === 'expired' ? '🔒 Trial habis' : '⏱️ Trial aktif'}</strong>
        <p class="muted small" style="margin:4px 0 0">${trialStatus.status === 'expired'
          ? 'Beli kartu untuk lanjut edit data medis. Data kamu tetap aman.'
          : formatTimeLeft(card) + ' — nikmati semua fitur gratis.'}</p>
      </div>`
    : '';

  box.innerHTML = `<h1>${t('dash_title')}</h1>
    ${bannerHtml}
    <div class="card stack-lg">
      <div class="row"><h2>${t('card_status')}</h2>${card.is_active ? `<span class="badge badge-active">${t('active')}</span>` : `<span class="badge badge-inactive">${t('inactive')}</span>`}</div>
      <div><p class="label">${t('card_id')}</p><p class="big">${esc(card.card_id)}</p></div>
      <div><p class="label">${t('card_url')}</p><p class="url">${esc(url)}</p></div>
      <div class="btns"><button class="btn btn-secondary" id="copy">${t('copy_url')}</button>
        <a class="btn btn-outline" href="/card/${esc(card.card_id)}" target="_blank" rel="noopener">${t('view_card')}</a></div>
    </div>
    <div class="card stack-lg" style="margin-top:12px"><h2>${t('qr_title')}</h2><div id="qr" class="qr"></div><button class="btn btn-outline btn-sm" id="qrdl">${t('download_qr')}</button></div>`;
  $('copy').onclick = () => navigator.clipboard.writeText(url).then(() => toast('URL disalin'), () => toast('Salin manual dari teks URL'));
  drawQR(url);
}

/* ---------- Modal: Edit Data Medis ---------- */
let pendingPhoto;

function photoFieldHtml(p) {
  pendingPhoto = p.photo_data_url || null;
  return `<div class="field">
    <label>Foto profil</label>
    <div id="photo-preview" style="margin-bottom:8px">${pendingPhoto ? `<img src="${pendingPhoto}" alt="" class="avatar-lg">` : '<p class="muted small">Belum ada foto.</p>'}</div>
    <input type="file" id="f-photo" accept="image/*" hidden>
    <div class="btns"><label class="btn btn-outline btn-sm" for="f-photo">Pilih foto</label>${pendingPhoto ? '<button type="button" class="btn btn-outline btn-sm" id="f-photo-remove">Hapus foto</button>' : ''}</div>
  </div>`;
}

function compressPhoto(file, maxSize = 320, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth, h = img.naturalHeight;
      const scale = Math.min(1, maxSize / Math.max(w, h));
      w = Math.round(w * scale); h = Math.round(h * scale);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Foto tidak dapat dibaca.')); };
    img.src = url;
  });
}

function medisFormHtml() {
  const p = profile;
  return `<h2>Edit Data Medis</h2>
    <form id="pform">
      ${photoFieldHtml(p)}
      <div class="field"><label for="f-name">Nama lengkap</label><input class="input" id="f-name" value="${esc(p.full_name)}" required></div>
      <div class="field"><label for="f-blood">Golongan darah</label><select class="input" id="f-blood"><option value="">Belum diisi</option>${opts(BLOOD, p.blood_type)}</select></div>
      <fieldset class="fs"><legend>Telepon Rumah / Kepala Keluarga</legend>
        <div class="field"><label for="f-hname">Nama</label><input class="input" id="f-hname" value="${esc(p.home_contact_name)}" placeholder="Mis. Ayah / Kepala Keluarga"></div>
        <div class="field"><label for="f-hphone">Nomor telepon</label><input class="input" id="f-hphone" type="tel" value="${esc(p.home_phone)}"></div></fieldset>
      <div class="field"><label for="f-allergies">Alergi (pisahkan dengan koma)</label><input class="input" id="f-allergies" value="${esc(p.allergies.join(', '))}"></div>
      <div class="field"><label for="f-conditions">Kondisi medis (pisahkan dengan koma)</label><input class="input" id="f-conditions" value="${esc(p.conditions.join(', '))}"></div>
      <div class="field"><label for="f-notes">Catatan emergency</label><textarea class="input" id="f-notes" rows="3">${esc(p.emergency_notes)}</textarea></div>
      <label class="check"><input type="checkbox" id="f-organ"${p.organ_donor ? ' checked' : ''}> Bersedia menjadi donor organ</label>
      <div class="btns"><button type="button" class="btn btn-outline" id="medis-cancel">Tutup</button><button class="btn btn-success" type="submit">Simpan</button></div>
    </form>
    <h2 class="gap">Kontak darurat</h2>
    ${contacts.length ? `<div class="card">${contacts.map((c) => `<div class="crow"><div><strong>${esc(c.name)}</strong> <span class="badge">${esc(c.category)}</span><div class="muted">${esc(c.phone)}</div></div><button class="btn btn-danger btn-sm" data-del="${c.id}" aria-label="Hapus ${esc(c.name)}">Hapus</button></div>`).join('')}</div>` : '<p class="muted">Belum ada kontak.</p>'}
    <form id="cform" class="card" style="margin-top:12px">
      <div class="field"><label for="c-name">Nama kontak</label><input class="input" id="c-name" required></div>
      <div class="field"><label for="c-cat">Kategori</label><select class="input" id="c-cat">${opts(CATS, 'keluarga')}</select></div>
      <div class="field"><label for="c-phone">Nomor telepon</label><input class="input" id="c-phone" type="tel" required></div>
      <button class="btn btn-secondary btn-block" type="submit">Tambah kontak</button>
    </form>`;
}

function bindMedisForm(box) {
  box.querySelector('#pform').onsubmit = (e) => {
    e.preventDefault();
    busy(sub(e), async () => {
      const { error } = await supabase.from('emergency_profiles').update({
        full_name: box.querySelector('#f-name').value.trim(),
        blood_type: box.querySelector('#f-blood').value || null,
        home_contact_name: box.querySelector('#f-hname').value.trim() || null,
        home_phone: box.querySelector('#f-hphone').value.trim() || null,
        allergies: list(box.querySelector('#f-allergies').value),
        conditions: list(box.querySelector('#f-conditions').value),
        emergency_notes: box.querySelector('#f-notes').value.trim() || null,
        organ_donor: box.querySelector('#f-organ').checked,
        photo_data_url: pendingPhoto,
      }).eq('card_uuid', card.id);
      if (error) return fail(error);
      await load(); toast('Perubahan disimpan');
    });
  };
  box.querySelector('#cform').onsubmit = (e) => {
    e.preventDefault();
    busy(sub(e), async () => {
      const { error } = await supabase.from('emergency_contacts').insert({
        card_uuid: card.id, name: box.querySelector('#c-name').value.trim(), category: box.querySelector('#c-cat').value,
        phone: box.querySelector('#c-phone').value.trim(), sort_order: contacts.length,
      });
      if (error) return fail(error);
      await load(); toast('Kontak ditambahkan');
    });
  };
  box.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => busy(b, async () => {
    const { error } = await supabase.from('emergency_contacts').delete().eq('id', b.dataset.del);
    if (error) return fail(error);
    await load(); toast('Kontak dihapus');
  })));
  box.querySelector('#medis-cancel').onclick = closeMedisModal;
  box.querySelector('#f-photo').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      pendingPhoto = await compressPhoto(file);
      box.querySelector('#photo-preview').innerHTML = `<img src="${pendingPhoto}" alt="" class="avatar-lg">`;
    } catch (err) { fail(err); }
  };
  if (box.querySelector('#f-photo-remove')) box.querySelector('#f-photo-remove').onclick = () => {
    pendingPhoto = null;
    box.querySelector('#photo-preview').innerHTML = '<p class="muted small">Belum ada foto.</p>';
  };
}

function renderMedisModal(box) {
  box.innerHTML = medisFormHtml();
  bindMedisForm(box);
  window.lucide && window.lucide.createIcons();
}

function openMedisModal() {
  if (medisModal || !card || !profile) return;
  if (!canEdit(card)) { openUpgradeModal(); return; }
  const wrap = document.createElement('div'); wrap.className = 'modal';
  wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true');
  const box = document.createElement('div'); box.className = 'modal-box tall';
  wrap.append(box); document.body.append(wrap);
  medisModal = wrap;
  renderMedisModal(box);
  const onKey = (e) => { if (e.key === 'Escape') closeMedisModal(); };
  document.addEventListener('keydown', onKey);
  wrap._onKey = onKey;
  wrap.addEventListener('click', (e) => { if (e.target === wrap) closeMedisModal(); });
}
function closeMedisModal() {
  if (!medisModal) return;
  document.removeEventListener('keydown', medisModal._onKey);
  medisModal.remove();
  medisModal = null;
}

// Modal upgrade — muncul saat trial habis
function openUpgradeModal() {
  if (document.querySelector('.modal[data-upgrade]')) return;
  const wrap = document.createElement('div');
  wrap.className = 'modal';
  wrap.setAttribute('data-upgrade', '1');
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.innerHTML = `<div class="modal-box">
    <h2>🔒 Trial Habis</h2>
    <p class="muted">Trial 3 hari kamu sudah berakhir. Beli kartu NFC untuk lanjut edit data medis.</p>
    <p class="muted small">Data yang sudah kamu isi tetap tersimpan dan tetap bisa dilihat penolong lewat QR / kartu.</p>
    <div class="modal-actions">
      <button class="btn btn-outline" data-close>Tutup</button>
      <a class="btn" href="https://shopee.co.id/" target="_blank" rel="noopener">Beli Kartu</a>
    </div>
  </div>`;
  document.body.append(wrap);
  const close = () => wrap.remove();
  wrap.querySelector('[data-close]').onclick = close;
  wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
  });
}

$('fab-edit').onclick = openMedisModal;
requireSession().then((s) => { if (s) { applyNavLabels(t); load(); registerCurrentDevice(); } });
