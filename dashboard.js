import { supabase } from './supabase.js';
import { requireSession, signOut, busy, toast } from './auth.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const list = (v) => v.split(',').map((x) => x.trim()).filter(Boolean);
const opts = (arr, cur) => arr.map((o) => `<option value="${o}"${o === cur ? ' selected' : ''}>${o}</option>`).join('');
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const CATS = ['keluarga', 'pasangan', 'teman', 'dokter', 'lainnya'];
const GENDERS = ['LAKI-LAKI', 'PEREMPUAN'];
const fail = (e) => toast('Gagal: ' + e.message);
const sub = (e) => e.submitter || e.target.querySelector('button[type="submit"]');
const when = (t) => new Date(t).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
let card = null, profile = null, contacts = [], lastEvent = null, identity = null;

async function load() {
  const { data, error } = await supabase.from('cards').select('*').order('created_at').limit(1).maybeSingle();
  if (error) return fail(error);
  card = data; profile = null; contacts = []; lastEvent = null; identity = null;
  if (card) {
    const [p, k, ev, idn] = await Promise.all([
      supabase.from('emergency_profiles').select('*').eq('card_uuid', card.id).single(),
      supabase.from('emergency_contacts').select('*').eq('card_uuid', card.id).order('sort_order').order('name'),
      supabase.from('emergency_events').select('*').eq('card_uuid', card.id).order('triggered_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('identity_documents').select('*').eq('card_uuid', card.id).maybeSingle(),
    ]);
    profile = p.data; contacts = k.data || []; lastEvent = ev.data || null; identity = idn.data || null;
  }
  renderSummary(); renderProfile(); renderKtp();
  window.lucide && window.lucide.createIcons();
}

function statusHtml() {
  if (lastEvent && lastEvent.status === 'active') {
    return `<span class="badge badge-emergency">🔴 DARURAT</span><p class="muted small">Terjadi insiden pada ${when(lastEvent.triggered_at)}</p><button class="btn btn-success btn-block" id="resolve">Tandai selesai</button>`;
  }
  return lastEvent ? '<span class="badge">⚪ Selesai</span>' : '<span class="badge badge-active">🟢 Normal</span>';
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
      <div><p class="label">Status keluarga</p><div class="stack-sm">${statusHtml()}</div></div>
      <div><p class="label">Card ID</p><p class="big">${esc(card.card_id)}</p></div>
      <div><p class="label">URL kartu (ditulis ke NFC)</p><p class="url">${esc(url)}</p></div>
      <div class="btns"><button class="btn btn-secondary" id="copy">Salin URL</button>
        <a class="btn btn-outline" href="/card/${esc(card.card_id)}" target="_blank" rel="noopener">Lihat kartu</a></div>
      <button class="btn btn-block ${card.is_active ? 'btn-danger' : 'btn-success'}" id="toggle">${card.is_active ? 'Nonaktifkan kartu' : 'Aktifkan kartu'}</button>
    </div>
    <div class="card stack-lg" style="margin-top:12px"><h2>QR Code</h2><div id="qr" class="qr"></div><button class="btn btn-outline btn-sm" id="qrdl">Unduh QR</button><p class="muted small">QR membuka URL yang sama dengan kartu NFC dan memakai profil yang sama.</p></div>
    <p class="muted small" style="margin-top:12px">Tulis URL ke kartu NFC dengan aplikasi NFC Tools. Data tidak disimpan di NFC, jadi perubahan profil langsung berlaku.</p>`;
  $('copy').onclick = () => navigator.clipboard.writeText(url).then(() => toast('URL disalin'), () => toast('Salin manual dari teks URL'));
  drawQR(url);
  if ($('resolve')) $('resolve').onclick = (e) => busy(e.currentTarget, async () => {
    const { error } = await supabase.from('emergency_events').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', lastEvent.id);
    if (error) return fail(error);
    await load(); toast('Status darurat ditandai selesai');
  });
  $('toggle').onclick = (e) => {
    if (card.is_active && !confirm('Nonaktifkan kartu? Halaman kartu tidak akan bisa dibuka.')) return;
    busy(e.currentTarget, async () => {
      const { error } = await supabase.from('cards').update({ is_active: !card.is_active }).eq('id', card.id);
      if (error) return fail(error);
      await load(); toast('Status kartu diperbarui');
    });
  };
}

function renderProfile() {
  const box = $('tab-profil');
  if (!card || !profile) { box.innerHTML = '<h1>Profil darurat</h1><p class="muted">Buat kartu dulu di menu Ringkasan.</p>'; return; }
  const p = profile;
  box.innerHTML = `<h1>Profil darurat</h1>
    <form id="pform" class="card">
      <div class="field"><label for="f-name">Nama lengkap</label><input class="input" id="f-name" value="${esc(p.full_name)}" required></div>
      <div class="field"><label for="f-blood">Golongan darah</label><select class="input" id="f-blood"><option value="">Belum diisi</option>${opts(BLOOD, p.blood_type)}</select></div>
      <fieldset class="fs"><legend>Telepon Rumah / Kepala Keluarga</legend>
        <div class="field"><label for="f-hname">Nama</label><input class="input" id="f-hname" value="${esc(p.home_contact_name)}" placeholder="Mis. Ayah / Kepala Keluarga"></div>
        <div class="field"><label for="f-hphone">Nomor telepon</label><input class="input" id="f-hphone" type="tel" value="${esc(p.home_phone)}"></div></fieldset>
      <div class="field"><label for="f-allergies">Alergi (pisahkan dengan koma)</label><input class="input" id="f-allergies" value="${esc(p.allergies.join(', '))}"></div>
      <div class="field"><label for="f-conditions">Kondisi medis (pisahkan dengan koma)</label><input class="input" id="f-conditions" value="${esc(p.conditions.join(', '))}"></div>
      <div class="field"><label for="f-notes">Catatan emergency</label><textarea class="input" id="f-notes" rows="3">${esc(p.emergency_notes)}</textarea></div>
      <label class="check"><input type="checkbox" id="f-organ"${p.organ_donor ? ' checked' : ''}> Bersedia menjadi donor organ</label>
      <button class="btn btn-success btn-block" type="submit">Simpan perubahan</button>
    </form>
    <h2 class="gap">Kontak darurat</h2>
    ${contacts.length ? `<div class="card">${contacts.map((c) => `<div class="crow"><div><strong>${esc(c.name)}</strong> <span class="badge">${esc(c.category)}</span><div class="muted">${esc(c.phone)}</div></div><button class="btn btn-danger btn-sm" data-del="${c.id}" aria-label="Hapus ${esc(c.name)}">Hapus</button></div>`).join('')}</div>` : '<p class="muted">Belum ada kontak.</p>'}
    <form id="cform" class="card" style="margin-top:12px">
      <div class="field"><label for="c-name">Nama kontak</label><input class="input" id="c-name" required></div>
      <div class="field"><label for="c-cat">Kategori</label><select class="input" id="c-cat">${opts(CATS, 'keluarga')}</select></div>
      <div class="field"><label for="c-phone">Nomor telepon</label><input class="input" id="c-phone" type="tel" required></div>
      <button class="btn btn-secondary btn-block" type="submit">Tambah kontak</button>
    </form>`;

  $('pform').onsubmit = (e) => {
    e.preventDefault();
    busy(sub(e), async () => {
      const { error } = await supabase.from('emergency_profiles').update({
        full_name: $('f-name').value.trim(),
        blood_type: $('f-blood').value || null,
        home_contact_name: $('f-hname').value.trim() || null,
        home_phone: $('f-hphone').value.trim() || null,
        allergies: list($('f-allergies').value),
        conditions: list($('f-conditions').value),
        emergency_notes: $('f-notes').value.trim() || null,
        organ_donor: $('f-organ').checked,
      }).eq('card_uuid', card.id);
      if (error) return fail(error);
      await load(); toast('Perubahan disimpan');
    });
  };
  $('cform').onsubmit = (e) => {
    e.preventDefault();
    busy(sub(e), async () => {
      const { error } = await supabase.from('emergency_contacts').insert({
        card_uuid: card.id, name: $('c-name').value.trim(), category: $('c-cat').value,
        phone: $('c-phone').value.trim(), sort_order: contacts.length,
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
}

/* ---------- Scan KTP / OCR ---------- */
const KTP_FIELDS = [
  ['nik', 'NIK', 'text'], ['full_name', 'Nama lengkap', 'text'],
  ['birth_place', 'Tempat lahir', 'text'], ['birth_date', 'Tanggal lahir', 'date'],
  ['gender', 'Jenis kelamin', 'gender'], ['address', 'Alamat', 'text'],
  ['rt_rw', 'RT/RW', 'text'], ['village', 'Kelurahan/Desa', 'text'],
  ['district', 'Kecamatan', 'text'], ['city', 'Kabupaten/Kota', 'text'],
  ['province', 'Provinsi', 'text'], ['religion', 'Agama', 'text'],
  ['marital_status', 'Status perkawinan', 'text'], ['occupation', 'Pekerjaan', 'text'],
  ['nationality', 'Kewarganegaraan', 'text'],
];
let ocrPreviewUrl = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('gagal memuat mesin OCR'));
    document.head.append(s);
  });
}

function parseKtp(raw) {
  const t = raw.replace(/\r/g, '');
  const lines = t.split('\n').map((l) => l.trim()).filter(Boolean);
  const grab = (label) => {
    const m = t.match(new RegExp(label + '\\s*[:;]?\\s*([^\\n]+)', 'i'));
    return m ? m[1].replace(/[|_~]/g, '').replace(/\s+/g, ' ').trim() : '';
  };
  const nik = grab('NIK').replace(/[^0-9OIlLSBZ]/gi, '')
    .replace(/O/gi, '0').replace(/[IlL]/g, '1').replace(/S/gi, '5').replace(/B/gi, '8').replace(/Z/gi, '2').slice(0, 16);
  const ttl = grab('Tempat\\W{0,3}Tgl\\W{0,3}Lahir');
  let birth_place = ttl, birth_date = '';
  const dm = ttl.match(/^(.*?),?\s*(\d{1,2})[\-\/. ](\d{1,2})[\-\/. ](\d{4})/);
  if (dm) { birth_place = dm[1].trim(); birth_date = `${dm[4]}-${dm[3].padStart(2, '0')}-${dm[2].padStart(2, '0')}`; }
  const genderRaw = grab('Jenis\\W?Kelamin');
  const gender = /PEREMPUAN/i.test(genderRaw) ? 'PEREMPUAN' : /LAKI/i.test(genderRaw) ? 'LAKI-LAKI' : '';
  const head = lines.slice(0, 4).filter((l) => !/NIK|Nama/i.test(l));
  return {
    nik, full_name: grab('Nama'), birth_place, birth_date, gender,
    address: grab('Alamat'), rt_rw: grab('RT\\W?RW').replace(/\s+/g, ''),
    village: grab('Kel\\W?Desa'), district: grab('Kecamatan'),
    city: head[1] || '', province: head[0] || '',
    religion: grab('Agama'), marital_status: grab('Status\\W?Perkawinan'),
    occupation: grab('Pekerjaan'), nationality: grab('Kewarganegaraan') || 'WNI',
  };
}

function ktpForm(data) {
  const g = (k) => esc((data && data[k]) || '');
  const rows = KTP_FIELDS.map(([key, label, type]) => {
    if (type === 'date') return `<div class="field"><label for="k-${key}">${label}</label><input class="input" id="k-${key}" type="date" value="${g(key)}"></div>`;
    if (type === 'gender') return `<div class="field"><label for="k-${key}">${label}</label><select class="input" id="k-${key}"><option value="">Belum diisi</option>${opts(GENDERS, data && data[key])}</select></div>`;
    return `<div class="field"><label for="k-${key}">${label}</label><input class="input" id="k-${key}" value="${g(key)}"></div>`;
  }).join('');
  return `<form id="kform" class="card">${rows}<button class="btn btn-success btn-block" type="submit">Simpan data KTP</button></form>`;
}

function bindKtpForm() {
  $('kform').onsubmit = (e) => {
    e.preventDefault();
    busy(sub(e), async () => {
      const row = { card_uuid: card.id };
      KTP_FIELDS.forEach(([key]) => { row[key] = $('k-' + key).value.trim() || null; });
      const { error } = await supabase.from('identity_documents').upsert(row, { onConflict: 'card_uuid' });
      if (error) return fail(error);
      await load(); toast('Data KTP disimpan');
    });
  };
}

async function runOcr(file) {
  const status = $('ktp-status');
  if (ocrPreviewUrl) URL.revokeObjectURL(ocrPreviewUrl);
  ocrPreviewUrl = URL.createObjectURL(file);
  $('ktp-preview').innerHTML = `<img src="${ocrPreviewUrl}" alt="Pratinjau KTP" class="ktp-preview-img">`;
  $('ktp-review').innerHTML = '';
  status.innerHTML = '<span class="spin-sm"></span>Menyiapkan mesin OCR (pertama kali mengunduh beberapa MB, sebaiknya pakai WiFi)…';
  try {
    if (!window.Tesseract) await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
    status.innerHTML = '<span class="spin-sm"></span>Membaca teks pada KTP…';
    let worker;
    try { worker = await Tesseract.createWorker('ind'); } catch (_) { worker = await Tesseract.createWorker('eng'); }
    const { data: { text } } = await worker.recognize(file);
    await worker.terminate();
    status.textContent = 'Hasil OCR di bawah. Hasil OCR tidak selalu akurat (terutama NIK) — periksa dan perbaiki dulu sebelum menyimpan.';
    $('ktp-review').innerHTML = ktpForm(parseKtp(text));
    bindKtpForm();
  } catch (err) {
    status.textContent = 'OCR gagal (' + err.message + '). Isi manual di bawah.';
    $('ktp-review').innerHTML = ktpForm(null);
    bindKtpForm();
  }
}

function renderKtp() {
  const box = $('tab-ktp');
  if (!card) { box.innerHTML = '<h1>Data KTP</h1><p class="muted">Buat kartu dulu di menu Ringkasan.</p>'; return; }
  box.innerHTML = `<h1>Data KTP</h1>
    <p class="muted small">Data ini privat, tidak pernah tampil di halaman kartu publik. Foto KTP hanya diproses di HP ini dan tidak diunggah ke server — hanya hasil teks yang kamu simpan.</p>
    <div class="card stack-lg">
      <label class="btn btn-secondary btn-block" for="ktp-file">📷 Pindai / Unggah Foto KTP</label>
      <input type="file" id="ktp-file" accept="image/*" capture="environment" hidden>
      <div id="ktp-preview"></div>
      <p id="ktp-status" class="muted small"></p>
    </div>
    <div id="ktp-review" style="margin-top:12px">${identity ? ktpForm(identity) : ''}</div>
    ${identity ? '' : '<button class="btn btn-outline btn-block" id="ktp-manual" style="margin-top:12px">Isi manual tanpa scan</button>'}`;
  if (identity) bindKtpForm();
  $('ktp-file').onchange = (e) => { const f = e.target.files[0]; if (f) runOcr(f); };
  if ($('ktp-manual')) $('ktp-manual').onclick = (e) => { $('ktp-review').innerHTML = ktpForm(null); bindKtpForm(); e.currentTarget.hidden = true; };
}

document.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => {
  document.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('active', x === b));
  ['ringkasan', 'profil', 'ktp'].forEach((t) => ($('tab-' + t).hidden = t !== b.dataset.tab));
}));
$('logout').onclick = signOut;
requireSession().then((s) => s && load());
