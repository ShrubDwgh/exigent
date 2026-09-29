import { supabase } from './supabase.js';
import { requireSession, signOut, busy, toast } from './auth.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const list = (v) => v.split(',').map((x) => x.trim()).filter(Boolean);
const opts = (arr, cur) => arr.map((o) => `<option value="${o}"${o === cur ? ' selected' : ''}>${o}</option>`).join('');
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const CATS = ['keluarga', 'pasangan', 'teman', 'dokter', 'lainnya'];
const fail = (e) => toast('Gagal: ' + e.message);
const sub = (e) => e.submitter || e.target.querySelector('button[type="submit"]');
let card = null, profile = null, contacts = [], session = null, medisModal = null;

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
  renderSummary(); renderAccount();
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

// Web NFC: hanya Chrome Android + HTTPS. Menulis URL kartu langsung ke tag NFC kosong.
async function writeNfc(url) {
  const status = $('nfc-status'), btn = $('nfc-write');
  if (!('NDEFReader' in window)) { status.textContent = 'Browser ini tidak mendukung tulis NFC langsung (perlu Chrome di Android). Salin URL di atas, lalu tulis lewat aplikasi seperti NFC Tools.'; return; }
  if (!window.isSecureContext) { status.textContent = 'Fitur ini hanya berjalan lewat koneksi aman (HTTPS).'; return; }
  btn.classList.add('loading'); btn.disabled = true;
  status.textContent = 'Dekatkan HP ke kartu NFC kosong…';
  try {
    await new NDEFReader().write({ records: [{ recordType: 'url', data: url }] });
    status.textContent = '✅ Berhasil ditulis ke kartu NFC.';
  } catch (err) {
    status.textContent = err.name === 'NotAllowedError' ? 'Izin NFC ditolak. Aktifkan izin NFC untuk situs ini, lalu coba lagi.'
      : err.name === 'NotSupportedError' ? 'HP ini sepertinya tidak punya NFC, atau NFC belum diaktifkan di pengaturan HP.'
      : 'Gagal menulis (' + err.message + '). Pastikan kartu menempel stabil di belakang HP, lalu coba lagi.';
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
}

function renderSummary() {
  const box = $('tab-ringkasan');
  if (!card) {
    box.innerHTML = `<h1>Ringkasan</h1><div class="card stack-lg"><h2>Kamu belum punya kartu</h2>
      <p class="muted">Buat kartu untuk mendapat Card ID dan URL yang ditulis ke NFC.</p>
      <button class="btn btn-block" id="create">Buat kartu</button></div>`;
    $('create').onclick = (e) => busy(e.currentTarget, async () => {
      const { error } = await supabase.rpc('create_card');
      if (error) return fail(error);
      await load(); toast('Kartu dibuat');
    });
    return;
  }
  const url = `${location.origin}/card/${card.card_id}`;
  box.innerHTML = `<h1>Ringkasan</h1>
    <div class="card stack-lg">
      <div class="row"><h2>Status kartu</h2>${card.is_active ? '<span class="badge badge-active">Aktif</span>' : '<span class="badge badge-inactive">Nonaktif</span>'}</div>
      <div><p class="label">Card ID</p><p class="big">${esc(card.card_id)}</p></div>
      <div><p class="label">URL kartu</p><p class="url">${esc(url)}</p></div>
      <div class="btns"><button class="btn btn-secondary" id="copy">Salin URL</button>
        <a class="btn btn-outline" href="/card/${esc(card.card_id)}" target="_blank" rel="noopener">Lihat kartu</a></div>
    </div>
    <div class="card stack-lg" style="margin-top:12px"><h2>QR Code</h2><div id="qr" class="qr"></div><button class="btn btn-outline btn-sm" id="qrdl">Unduh QR</button></div>
    <div class="card stack-lg" style="margin-top:12px">
      <h2>Tulis ke Kartu NFC</h2>
      <p class="muted small">Tempelkan HP ke kartu NFC kosong, lalu tekan tombol ini.</p>
      <button class="btn btn-secondary btn-block" id="nfc-write" type="button"><i data-lucide="nfc" aria-hidden="true"></i>Tulis ke NFC</button>
      <p id="nfc-status" class="muted small"></p>
    </div>
    <button class="btn btn-block" id="edit-medis" type="button" style="margin-top:16px">Edit Data Medis</button>
    <button class="btn btn-block ${card.is_active ? 'btn-danger' : 'btn-success'}" id="toggle" style="margin-top:12px">${card.is_active ? 'Nonaktifkan kartu' : 'Aktifkan kartu'}</button>`;
  $('copy').onclick = () => navigator.clipboard.writeText(url).then(() => toast('URL disalin'), () => toast('Salin manual dari teks URL'));
  drawQR(url);
  $('nfc-write').onclick = () => writeNfc(url);
  $('edit-medis').onclick = openMedisModal;
  $('toggle').onclick = (e) => {
    if (card.is_active && !confirm('Nonaktifkan kartu? Halaman kartu tidak akan bisa dibuka.')) return;
    busy(e.currentTarget, async () => {
      const { error } = await supabase.from('cards').update({ is_active: !card.is_active }).eq('id', card.id);
      if (error) return fail(error);
      await load(); toast('Status kartu diperbarui');
    });
  };
}

function renderAccount() {
  const box = $('tab-profil');
  box.innerHTML = `<h1>Profil</h1>
    <div class="card stack-lg">
      <div><p class="label">Akun</p><p style="font-weight:600">${esc(session && session.user && session.user.email || '—')}</p></div>
      ${card ? `<div><p class="label">Card ID</p><p>${esc(card.card_id)}</p></div>` : ''}
    </div>
    <button class="btn btn-danger btn-block" id="logout-btn" style="margin-top:32px">Keluar</button>`;
  $('logout-btn').onclick = signOut;
}

/* ---------- Modal: Edit Data Medis ---------- */
function medisFormHtml() {
  const p = profile;
  return `<h2>Edit Data Medis</h2>
    <form id="pform">
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
  ['ringkasan', 'profil'].forEach((t) => ($('tab-' + t).hidden = t !== b.dataset.tab));
}));
requireSession().then((s) => { if (s) { session = s; load(); } });
