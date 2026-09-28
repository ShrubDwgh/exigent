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
let card = null, profile = null, contacts = [], lastEvent = null, cards = [], activeId = null, latest = {};

async function load() {
  const { data, error } = await supabase.from('cards').select('*, emergency_profiles(full_name, blood_type)').order('created_at');
  if (error) return fail(error);
  cards = data || [];
  card = cards.find((c) => c.id === activeId) || cards[0] || null;
  activeId = card ? card.id : null;
  profile = null; contacts = []; lastEvent = null; latest = {};
  if (cards.length) {
    const ev = await supabase.from('emergency_events').select('*').in('card_uuid', cards.map((c) => c.id)).order('triggered_at', { ascending: false });
    (ev.data || []).forEach((e) => { if (!latest[e.card_uuid]) latest[e.card_uuid] = e; });
  }
  if (card) {
    const [p, k] = await Promise.all([
      supabase.from('emergency_profiles').select('*').eq('card_uuid', card.id).single(),
      supabase.from('emergency_contacts').select('*').eq('card_uuid', card.id).order('sort_order').order('name'),
    ]);
    profile = p.data; contacts = k.data || []; lastEvent = latest[card.id] || null;
  }
  renderSwitcher(); renderSummary(); renderProfile(); renderHub(); renderTree();
  window.lucide && window.lucide.createIcons();
}

const when = (t) => new Date(t).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

const nameOf = (c) => {
  const pr = [].concat(c.emergency_profiles || [])[0];
  return (pr && pr.full_name) || 'Anggota ' + c.card_id.slice(-4);
};
const stat = (ev) => !ev ? { cls: 'badge-active', txt: '🟢 Normal' }
  : ev.status === 'active' ? { cls: 'badge-emergency', txt: '🔴 DARURAT', hot: true }
  : ev.status === 'attention' ? { cls: 'badge-attention', txt: '🟠 Perlu Perhatian' }
  : Date.now() - new Date(ev.resolved_at || ev.triggered_at) < 864e5 ? { cls: '', txt: '⚪ Selesai' }
  : { cls: 'badge-active', txt: '🟢 Normal' };

const TABS = ['ringkasan', 'profil', 'keluarga', 'pohon'];
function show(t) {
  document.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('active', x.dataset.tab === t));
  TABS.forEach((n) => ($('tab-' + n).hidden = n !== t));
  window.scrollTo(0, 0);
}

function renderSwitcher() {
  const box = $('switcher');
  if (!cards.length) { box.innerHTML = ''; return; }
  box.innerHTML = `<label for="sw" class="label">Anggota yang dikelola</label><div class="btns"><select class="input" id="sw">${cards.map((c) => `<option value="${c.id}"${c.id === activeId ? ' selected' : ''}>${esc(nameOf(c))}${c.relation ? ' · ' + esc(c.relation) : ''}</option>`).join('')}</select><button class="btn btn-secondary btn-sm" id="addm">Tambah anggota</button></div>`;
  $('sw').onchange = (e) => { activeId = e.target.value; load(); };
  $('addm').onclick = (e) => busy(e.currentTarget, async () => {
    const { data, error } = await supabase.rpc('create_card');
    if (error) return fail(error);
    activeId = data.id; await load(); show('profil'); toast('Anggota baru dibuat. Isi profilnya.');
  });
}

function renderHub() {
  const box = $('tab-keluarga');
  if (!cards.length) { box.innerHTML = '<h1>Family Hub</h1><p class="muted">Buat kartu dulu di menu Ringkasan.</p>'; return; }
  box.innerHTML = '<h1>Family Hub</h1>' + cards.map((c) => {
    const ev = latest[c.id], s = stat(ev), pr = [].concat(c.emergency_profiles || [])[0] || {}, act = ev && ev.status === 'active';
    return `<div class="card stack-sm" style="margin-bottom:12px"><div class="row" style="width:100%"><h2>👤 ${esc(nameOf(c))}</h2><span class="badge ${s.cls}">${s.txt}</span></div>
      <p class="muted small">${c.relation ? esc(c.relation) + ' · ' : ''}${pr.blood_type ? 'Gol. darah ' + esc(pr.blood_type) : 'Golongan darah belum diisi'}${c.is_active ? '' : ' · kartu nonaktif'}</p>
      ${act ? `<p><strong>Terjadi insiden pada</strong><br>${when(ev.triggered_at)}</p>` : ''}
      <div class="btns"><button class="btn btn-outline btn-sm" data-manage="${c.id}">Kelola</button>${act ? `<button class="btn btn-success btn-sm" data-done="${ev.id}">Tandai selesai</button>` : ''}</div></div>`;
  }).join('');
  box.querySelectorAll('[data-manage]').forEach((b) => (b.onclick = () => { activeId = b.dataset.manage; load().then(() => show('profil')); }));
  box.querySelectorAll('[data-done]').forEach((b) => (b.onclick = () => busy(b, async () => {
    const { error } = await supabase.from('emergency_events').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', b.dataset.done);
    if (error) return fail(error);
    await load(); toast('Status darurat ditandai selesai');
  })));
}

function renderTree() {
  const box = $('tab-pohon');
  if (!cards.length) { box.innerHTML = '<h1>Family Tree</h1><p class="muted">Belum ada anggota.</p>'; return; }
  const ids = new Set(cards.map((c) => c.id)), kids = {}, seen = new Set();
  cards.forEach((c) => { const k = c.parent_card_uuid && ids.has(c.parent_card_uuid) ? c.parent_card_uuid : 'root'; (kids[k] = kids[k] || []).push(c); });
  const node = (c) => {
    seen.add(c.id);
    const s = stat(latest[c.id]), sub = (kids[c.id] || []).filter((x) => !seen.has(x.id)).map(node).join('');
    return `<li><div class="tnode${s.hot ? ' hot' : ''}"><strong>${esc(nameOf(c))}</strong>${c.relation ? ` <span class="muted small">${esc(c.relation)}</span>` : ''} <span class="badge ${s.cls}">${s.txt}</span></div>${sub ? `<ul>${sub}</ul>` : ''}</li>`;
  };
  const html = (kids.root || []).map(node).join('') + cards.filter((c) => !seen.has(c.id)).map(node).join('');
  box.innerHTML = `<h1>Family Tree</h1><div class="card"><ul class="tree">${html}</ul></div><p class="muted small" style="margin-top:12px">Atur hubungan tiap anggota di menu Profil, bagian Hubungan keluarga.</p>`;
}

function statusHtml() {
  if (lastEvent && lastEvent.status === 'active') {
    return `<span class="badge badge-emergency">🔴 DARURAT</span><p class="muted small">Terjadi insiden pada ${when(lastEvent.triggered_at)}</p><button class="btn btn-success btn-block" id="resolve">Tandai selesai</button>`;
  }
  const s = stat(lastEvent);
  return `<span class="badge ${s.cls}">${s.txt}</span>`;
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
  const parentOpts = cards.filter((c) => c.id !== card.id).map((c) => `<option value="${c.id}"${c.id === card.parent_card_uuid ? ' selected' : ''}>${esc(nameOf(c))}</option>`).join('');
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
      <fieldset class="fs"><legend>Hubungan keluarga (Family Tree)</legend>
        <div class="field"><label for="f-rel">Hubungan</label><input class="input" id="f-rel" value="${esc(card.relation)}" placeholder="Mis. Ayah, Ibu, Anak"></div>
        <div class="field"><label for="f-parent">Berada di bawah anggota</label><select class="input" id="f-parent"><option value="">Posisi teratas</option>${parentOpts}</select></div></fieldset>
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
      const rel = await supabase.from('cards').update({ relation: $('f-rel').value.trim() || null, parent_card_uuid: $('f-parent').value || null }).eq('id', card.id);
      if (rel.error) return fail(rel.error);
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

document.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => show(b.dataset.tab)));
$('logout').onclick = signOut;
requireSession().then((s) => s && load());
