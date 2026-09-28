import { supabase } from './supabase.js';
import { requireSession, signOut, busy, toast } from './auth.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const list = (v) => v.split(',').map((x) => x.trim()).filter(Boolean);
const opts = (arr, cur) => arr.map((o) => `<option value="${o}"${o === cur ? ' selected' : ''}>${o}</option>`).join('');
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const CATS = ['keluarga', 'pasangan', 'teman', 'dokter', 'lainnya'];
const fail = (e) => toast('Gagal: ' + e.message);
let card = null, profile = null, contacts = [];

async function load() {
  const { data, error } = await supabase.from('cards').select('*').order('created_at').limit(1).maybeSingle();
  if (error) return fail(error);
  card = data;
  if (card) {
    const [p, k] = await Promise.all([
      supabase.from('emergency_profiles').select('*').eq('card_uuid', card.id).single(),
      supabase.from('emergency_contacts').select('*').eq('card_uuid', card.id).order('sort_order').order('name'),
    ]);
    profile = p.data; contacts = k.data || [];
  }
  renderSummary(); renderProfile();
  window.lucide && window.lucide.createIcons();
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
      <div><p class="label">URL kartu (ditulis ke NFC)</p><p class="url">${esc(url)}</p></div>
      <div class="btns"><button class="btn btn-secondary" id="copy">Salin URL</button>
        <a class="btn btn-outline" href="/card/${esc(card.card_id)}" target="_blank" rel="noopener">Lihat kartu</a></div>
      <button class="btn btn-block ${card.is_active ? 'btn-danger' : 'btn-success'}" id="toggle">${card.is_active ? 'Nonaktifkan kartu' : 'Aktifkan kartu'}</button>
    </div>
    <p class="muted small" style="margin-top:12px">Tulis URL ke kartu NFC dengan aplikasi NFC Tools. Data tidak disimpan di NFC, jadi perubahan profil langsung berlaku.</p>`;
  $('copy').onclick = () => navigator.clipboard.writeText(url).then(() => toast('URL disalin'), () => toast('Salin manual dari teks URL'));
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
      <div class="field"><label for="f-phone">Nomor telepon</label><input class="input" id="f-phone" type="tel" value="${esc(p.phone)}"></div>
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
    busy(e.submitter, async () => {
      const { error } = await supabase.from('emergency_profiles').update({
        full_name: $('f-name').value.trim(),
        blood_type: $('f-blood').value || null,
        phone: $('f-phone').value.trim() || null,
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
    busy(e.submitter, async () => {
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

document.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => {
  document.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('active', x === b));
  ['ringkasan', 'profil'].forEach((t) => ($('tab-' + t).hidden = t !== b.dataset.tab));
}));
$('logout').onclick = signOut;
requireSession().then((s) => s && load());
