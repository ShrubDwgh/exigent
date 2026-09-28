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
const KTP_MARKERS = [/\bNIK\b/i, /Jenis\W?Kelamin/i, /Tempat\W{0,3}Tgl\W{0,3}Lahir/i, /Kewarganegaraan/i, /Kecamatan/i, /Kel\W?Desa/i, /Status\W?Perkawinan/i, /Berlaku\W?Hingga/i, /Alamat/i, /Agama/i, /Pekerjaan/i, /Provinsi/i, /Kabupaten|Kota/i];
const NON_KTP_DOCS = [
  { re: /BPJS|JAMINAN\s+SOSIAL|KARTU\s+INDONESIA\s+SEHAT|\bFASKES\b/i, label: 'kartu BPJS' },
  { re: /SURAT\s+IZIN\s+MENGEMUDI|\bSIM\b/i, label: 'SIM' },
  { re: /PASPOR|PASSPORT/i, label: 'paspor' },
  { re: /NPWP/i, label: 'kartu NPWP' },
  { re: /KARTU\s+KELUARGA|\bKK\b/i, label: 'Kartu Keluarga' },
];
function checkDocType(text) {
  for (const d of NON_KTP_DOCS) if (d.re.test(text)) return { ok: false, message: `Foto ini sepertinya ${d.label}, bukan KTP. Pastikan yang difoto adalah KTP (kartu tanda penduduk).` };
  const hits = KTP_MARKERS.filter((re) => re.test(text)).length;
  if (hits < 2) return { ok: false, message: 'Foto ini sepertinya bukan KTP, atau tulisannya belum cukup jelas terbaca. Pastikan yang difoto benar KTP dan ikuti tips di atas.' };
  return { ok: true };
}
const FIELD_MSGS = ['Membaca NIK…', 'Membaca nama lengkap…', 'Membaca tempat & tanggal lahir…', 'Membaca alamat…', 'Membaca kecamatan & kelurahan…', 'Menyusun hasil…'];
const spin = (t) => `<span class="spin-sm"></span>${t}`;
let ocrPreviewUrl = null, fieldTimer = null, camStream = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('gagal memuat mesin OCR'));
    document.head.append(s);
  });
}

function startFieldMessages(status) {
  if (fieldTimer) return;
  let i = 0;
  status.innerHTML = spin(FIELD_MSGS[0]);
  fieldTimer = setInterval(() => { i = (i + 1) % FIELD_MSGS.length; status.innerHTML = spin(FIELD_MSGS[i]); }, 1400);
}
function stopFieldMessages() { clearInterval(fieldTimer); fieldTimer = null; }

// Pastikan dulu FOTONYA sendiri tidak bermasalah, sebelum menyalahkan mesin OCR.
function validateImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type || !file.type.startsWith('image/')) return reject(new Error('File yang dipilih bukan gambar. Pilih foto KTP berformat JPG atau PNG.'));
    if (file.size > 15 * 1024 * 1024) return reject(new Error('Ukuran foto terlalu besar (maksimal 15MB). Coba ambil ulang.'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth, h = img.naturalHeight;
      URL.revokeObjectURL(url);
      if (!w || !h) return reject(new Error('Foto tidak valid atau rusak. Coba ambil ulang.'));
      if (w < 300 || h < 200) return reject(new Error('Foto beresolusi terlalu kecil. Coba ambil foto lebih dekat dan jelas.'));
      resolve();
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Foto tidak dapat dibuka, kemungkinan file rusak. Coba ambil ulang.')); };
    img.src = url;
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
  stopFieldMessages();
  $('ktp-review').innerHTML = '';
  $('ktp-preview').innerHTML = '';
  status.textContent = 'Memeriksa foto…';
  try {
    await validateImage(file);
  } catch (err) {
    status.textContent = '⚠️ ' + err.message;
    return;
  }
  if (ocrPreviewUrl) URL.revokeObjectURL(ocrPreviewUrl);
  ocrPreviewUrl = URL.createObjectURL(file);
  $('ktp-preview').innerHTML = `<img src="${ocrPreviewUrl}" alt="Pratinjau KTP" class="ktp-preview-img">`;
  status.innerHTML = spin('Menyiapkan mesin OCR…');
  try {
    if (!window.Tesseract) await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
    const onLog = (m) => {
      const s = (m.status || '').toLowerCase();
      if (s.includes('recogniz')) startFieldMessages(status);
      else if (s.includes('language')) status.innerHTML = spin('Mengunduh data bahasa Indonesia (beberapa MB, sekali saja)…');
      else if (s.includes('core')) status.innerHTML = spin('Memuat mesin OCR…');
      else if (s.includes('init')) status.innerHTML = spin('Menyiapkan pembaca teks…');
    };
    let worker;
    try { worker = await Tesseract.createWorker('ind', 1, { logger: onLog }); }
    catch (_) { worker = await Tesseract.createWorker('eng', 1, { logger: onLog }); }
    const { data: { text } } = await worker.recognize(file);
    await worker.terminate();
    stopFieldMessages();
    const check = checkDocType(text);
    if (!check.ok) {
      status.textContent = '⚠️ ' + check.message;
      $('ktp-review').innerHTML = '<button class="btn btn-outline btn-block" id="ktp-anyway" type="button">Tetap isi manual</button>';
      $('ktp-anyway').onclick = () => { $('ktp-review').innerHTML = ktpForm(null); bindKtpForm(); };
      return;
    }
    status.textContent = 'Hasil OCR di bawah. Hasil OCR tidak selalu akurat (terutama NIK) — periksa dan perbaiki dulu sebelum menyimpan.';
    $('ktp-review').innerHTML = ktpForm(parseKtp(text));
    bindKtpForm();
  } catch (err) {
    stopFieldMessages();
    status.textContent = 'Fotonya sudah terbaca baik, tapi mesin OCR gagal memprosesnya (' + err.message + '). Coba lagi, atau isi manual di bawah.';
    $('ktp-review').innerHTML = ktpForm(null);
    bindKtpForm();
  }
}

async function openCamera() {
  if (!window.isSecureContext) return toast('Kamera hanya bisa dipakai lewat koneksi aman (HTTPS).');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return toast('Kamera tidak didukung di browser ini. Pilih dari galeri.');
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
  } catch (err) {
    toast('Tidak bisa membuka kamera (' + (err.message || err.name || 'izin ditolak') + '). Coba pilih dari galeri.');
    return;
  }
  $('ktp-video').srcObject = camStream;
  $('ktp-cam').hidden = false;
}
function closeCamera() {
  if (camStream) { camStream.getTracks().forEach((t) => t.stop()); camStream = null; }
  $('ktp-cam').hidden = true;
}
function shootPhoto() {
  const video = $('ktp-video');
  const c = document.createElement('canvas');
  c.width = video.videoWidth || 1280; c.height = video.videoHeight || 720;
  c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
  c.toBlob((blob) => {
    closeCamera();
    if (blob) runOcr(new File([blob], 'ktp.jpg', { type: 'image/jpeg' }));
  }, 'image/jpeg', 0.92);
}

function renderKtp() {
  const box = $('tab-ktp');
  if (!card) { box.innerHTML = '<h1>Data KTP</h1><p class="muted">Buat kartu dulu di menu Ringkasan.</p>'; return; }
  box.innerHTML = `<h1>Data KTP</h1>
    <p class="muted small">Data ini privat, tidak pernah tampil di halaman kartu publik. Foto hanya diproses di HP ini, tidak diunggah ke server — hanya hasil teks yang kamu simpan.</p>
    <div class="card stack-lg">
      <div><p class="label">Tips agar OCR terbaca jelas</p>
        <ul class="tips muted small">
          <li>Foto di tempat terang, hindari cahaya yang memantul dan menutupi tulisan</li>
          <li>Letakkan KTP di permukaan rata dan gelap, kamera tegak lurus (tidak miring)</li>
          <li>Isi seluruh kotak panduan dengan KTP, jangan sampai terpotong</li>
          <li>Tunggu gambar fokus (tidak buram) sebelum menekan tombol foto</li>
        </ul>
      </div>
      <button class="btn btn-secondary btn-block" id="ktp-open-cam" type="button"><i data-lucide="camera" aria-hidden="true"></i>Pindai Foto KTP</button>
      <label class="btn btn-outline btn-block" for="ktp-file">Pilih dari Galeri</label>
      <input type="file" id="ktp-file" accept="image/*" hidden>
      <div id="ktp-preview"></div>
      <p id="ktp-status" class="muted small"></p>
    </div>
    <div id="ktp-review" style="margin-top:12px">${identity ? ktpForm(identity) : ''}</div>
    ${identity ? '' : '<button class="btn btn-outline btn-block" id="ktp-manual" style="margin-top:12px">Isi manual tanpa scan</button>'}`;
  if (identity) bindKtpForm();
  $('ktp-open-cam').onclick = openCamera;
  $('ktp-file').onchange = (e) => { const f = e.target.files[0]; if (f) runOcr(f); };
  if ($('ktp-manual')) $('ktp-manual').onclick = (e) => { $('ktp-review').innerHTML = ktpForm(null); bindKtpForm(); e.currentTarget.hidden = true; };
}

document.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => {
  document.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('active', x === b));
  ['ringkasan', 'profil', 'ktp'].forEach((t) => ($('tab-' + t).hidden = t !== b.dataset.tab));
}));
$('ktp-cam-cancel').onclick = closeCamera;
$('ktp-cam-shot').onclick = shootPhoto;
$('logout').onclick = signOut;
requireSession().then((s) => s && load());
