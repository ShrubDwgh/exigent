import { supabase } from './supabase.js';
import { requireSession, signOut, busy, toast } from './auth.js';
import { STRINGS, getLang, setLang } from './i18n.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const list = (v) => v.split(',').map((x) => x.trim()).filter(Boolean);
const opts = (arr, cur) => arr.map((o) => `<option value="${o}"${o === cur ? ' selected' : ''}>${o}</option>`).join('');
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const CATS = ['keluarga', 'pasangan', 'teman', 'dokter', 'lainnya'];
const fail = (e) => toast('Gagal: ' + e.message);
const sub = (e) => e.submitter || e.target.querySelector('button[type="submit"]');
let card = null, profile = null, contacts = [], session = null, medisModal = null;
let lang = getLang();
const t = (k) => (STRINGS[lang] && STRINGS[lang][k]) || STRINGS.en[k] || k;

function applyNavLabels() {
  document.querySelector('[data-tab="dashboard"] span').textContent = t('nav_dashboard');
  document.querySelector('a.nav-btn span').textContent = t('nav_medical');
  document.querySelector('[data-tab="profil"] span').textContent = t('nav_profile');
}

async function load() {
  const { data, error } = await supabase.from('cards').select('*').order('created_at').limit(1).maybeSingle();
  if (error) return fail(error);
  card = data; profile = null; contacts = [];
  if (card) {
    const [p, k] = await Promise.all([
      supabase.from('emergency_profiles').select('*').eq('card_uuid', card.id).single(),
      supabase.from('emergency_contacts').select('*').eq('card_uuid', card.id).order('sort_order').order('name'),
    ]);
    profile = p.data; contacts = k.data || [];
  }
  applyNavLabels();
  renderDashboard(); renderAccount();
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

// Web NFC: Chrome Android + HTTPS saja. "nfc_written_at" ditandai di DB setelah
// tulis sukses, supaya lain kali dashboard bisa menampilkan info "sudah terdaftar".
async function writeNfc(url) {
  const status = $('nfc-status'), btn = $('nfc-write');
  if (!('NDEFReader' in window)) { status.textContent = 'Browser ini tidak mendukung tulis NFC langsung (perlu Chrome di Android). Salin URL di atas, lalu tulis lewat aplikasi seperti NFC Tools.'; return; }
  if (!window.isSecureContext) { status.textContent = 'Fitur ini hanya berjalan lewat koneksi aman (HTTPS).'; return; }
  btn.classList.add('loading'); btn.disabled = true;
  status.textContent = 'Dekatkan HP ke kartu NFC kosong…';
  try {
    await new NDEFReader().write({ records: [{ recordType: 'url', data: url }] });
    toast('✅ Berhasil ditulis ke kartu NFC');
    status.textContent = '';
    supabase.from('cards').update({ nfc_written_at: new Date().toISOString() }).eq('id', card.id).then(() => load(), () => {});
  } catch (err) {
    status.innerHTML = `<span class="err-line">${esc(err.message || err.name || 'Gagal menulis')}</span>Pastikan kartu menempel stabil di belakang HP, lalu coba lagi.`;
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
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
  box.innerHTML = `<h1>${t('dash_title')}</h1>
    <div class="card stack-lg">
      <div class="row"><h2>${t('card_status')}</h2>${card.is_active ? `<span class="badge badge-active">${t('active')}</span>` : `<span class="badge badge-inactive">${t('inactive')}</span>`}</div>
      <div><p class="label">${t('card_id')}</p><p class="big">${esc(card.card_id)}</p></div>
      <div><p class="label">${t('card_url')}</p><p class="url">${esc(url)}</p></div>
      <div class="btns"><button class="btn btn-secondary" id="copy">${t('copy_url')}</button>
        <a class="btn btn-outline" href="/card/${esc(card.card_id)}" target="_blank" rel="noopener">${t('view_card')}</a></div>
    </div>
    <div class="card stack-lg" style="margin-top:12px"><h2>${t('qr_title')}</h2><div id="qr" class="qr"></div><button class="btn btn-outline btn-sm" id="qrdl">${t('download_qr')}</button></div>
    <div class="card stack-lg" style="margin-top:12px">
      <h2>${t('nfc_title')}</h2>
      ${card.nfc_written_at ? `<p class="badge badge-active" style="margin-bottom:2px">${t('nfc_registered')}</p>` : ''}
      <p class="muted small">${t('nfc_desc')}</p>
      <button class="btn btn-secondary btn-block" id="nfc-write" type="button"><i data-lucide="nfc" aria-hidden="true"></i>${t('write_nfc')}</button>
      <p id="nfc-status" class="muted small"></p>
    </div>`;
  $('copy').onclick = () => navigator.clipboard.writeText(url).then(() => toast('URL disalin'), () => toast('Salin manual dari teks URL'));
  drawQR(url);
  $('nfc-write').onclick = () => writeNfc(url);
}

function renderAccount() {
  const box = $('tab-profil');
  box.innerHTML = `<h1>${t('profile_title')}</h1>
    <div class="card stack-lg">
      <div><p class="label">${t('account_label')}</p><p style="font-weight:600">${esc((session && session.user && session.user.email) || '—')}</p></div>
      ${card ? `<div><p class="label">${t('card_id')}</p><p>${esc(card.card_id)}</p></div>` : ''}
      ${card ? `<button class="btn btn-block ${card.is_active ? 'btn-danger' : 'btn-success'}" id="toggle">${card.is_active ? t('deactivate_card') : t('activate_card')}</button>` : ''}
    </div>
    <div class="card stack-lg" style="margin-top:16px">
      <div class="field" style="margin:0">
        <label for="lang-select">${t('language_label')}</label>
        <select class="input" id="lang-select">
          <option value="en"${lang === 'en' ? ' selected' : ''}>English</option>
          <option value="id"${lang === 'id' ? ' selected' : ''}>Bahasa Indonesia</option>
        </select>
      </div>
    </div>
    <a class="btn btn-outline btn-block" href="/settings" style="margin-top:16px"><i data-lucide="shield-check" aria-hidden="true"></i>Perizinan &amp; Pengaturan Lanjutan</a>
    <button class="btn btn-danger btn-block" id="logout-btn" style="margin-top:16px">${t('logout')}</button>`;
  if ($('toggle')) $('toggle').onclick = (e) => {
    if (card.is_active && !confirm('Nonaktifkan kartu? Halaman kartu tidak akan bisa dibuka.')) return;
    busy(e.currentTarget, async () => {
      const { error } = await supabase.from('cards').update({ is_active: !card.is_active }).eq('id', card.id);
      if (error) return fail(error);
      await load(); toast('Status kartu diperbarui');
    });
  };
  $('lang-select').onchange = (e) => {
    lang = e.target.value; setLang(lang);
    applyNavLabels(); renderDashboard(); renderAccount();
      if (medisModal) renderMedisModal(medisModal.querySelector('.modal-box'));
    window.lucide && window.lucide.createIcons();
  };
  $('logout-btn').onclick = signOut;
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

document.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => {
  document.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('active', x === b));
  ['dashboard', 'profil'].forEach((tab) => ($('tab-' + tab).hidden = tab !== b.dataset.tab));
  $('fab-edit').hidden = b.dataset.tab !== 'dashboard';
}));
$('fab-edit').onclick = openMedisModal;
requireSession().then((s) => { if (s) { session = s; applyNavLabels(); load(); } });
