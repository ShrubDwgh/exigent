import { supabase } from './supabase.js';

const app = document.getElementById('app');

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const icon = (name) => {
  const i = document.createElement('i');
  i.setAttribute('data-lucide', name);
  i.setAttribute('aria-hidden', 'true');
  return i;
};
const withIcon = (tag, cls, name, text) => {
  const n = el(tag, cls);
  n.append(icon(name), document.createTextNode(text));
  return n;
};
const intl = (p) => {
  const d = String(p).replace(/\D/g, '');
  return d.startsWith('0') ? '62' + d.slice(1) : d;
};
const refreshIcons = () => window.lucide && window.lucide.createIcons();

// Card ID dari /card/EC-XXXXXXXX, atau ?id= jika host tanpa rewrite
const last = location.pathname.split('/').filter(Boolean).pop() || '';
const raw = /^EC-/i.test(last) ? last : new URLSearchParams(location.search).get('id');
const cardId = (raw || '').trim().toUpperCase();

const brand = () => withIcon('div', 'brand', 'heart-pulse', 'Emergency Card NFC');

function message(title, text) {
  const c = el('div', 'card');
  c.append(el('h1', null, title), el('p', 'muted', text));
  app.replaceChildren(brand(), c);
  refreshIcons();
}

const tags = (items, cls) => {
  const wrap = el('div', 'tags');
  items.forEach((t) => wrap.append(el('span', 'tag ' + cls, t)));
  return wrap;
};

const section = (iconName, title, ...nodes) => {
  const s = el('section', 'section');
  s.append(withIcon('h2', null, iconName, title), ...nodes);
  return s;
};

const linkBtn = (label, href, cls, iconName) => {
  const a = withIcon('a', 'btn ' + cls, iconName, label);
  a.href = href;
  if (href.startsWith('http')) { a.target = '_blank'; a.rel = 'noopener'; }
  return a;
};

function contactRow(c) {
  const row = el('div', 'contact');
  const info = el('div');
  const name = el('div');
  name.append(el('strong', null, c.name), el('span', 'badge cat', c.category));
  info.append(name, el('span', 'phone', c.phone));
  const actions = el('div', 'actions');
  actions.append(
    linkBtn('Telepon', 'tel:+' + intl(c.phone), 'btn-sm', 'phone'),
    linkBtn('WhatsApp', 'https://wa.me/' + intl(c.phone), 'btn-sm btn-success', 'message-circle')
  );
  row.append(info, actions);
  return row;
}

function askEmergency(phone) {
  const wrap = el('div', 'modal');
  wrap.setAttribute('role', 'alertdialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-labelledby', 'mt');
  const box = el('div', 'modal-box');
  const h = el('h2', null, '⚠️ Konfirmasi Keadaan Darurat'); h.id = 'mt';
  const no = el('button', 'btn btn-outline', 'TIDAK');
  const yes = el('button', 'btn btn-danger', 'YA, DARURAT');
  const actions = el('div', 'modal-actions'); actions.append(no, yes);
  box.append(h, el('p', null, 'Apakah Anda yakin ingin memberi tahu keluarga bahwa anggota ini sedang mengalami keadaan darurat?'), actions);
  wrap.append(box); document.body.append(wrap); no.focus();
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); };
  document.addEventListener('keydown', onKey);
  no.onclick = close; // TIDAK: batal, tidak ada event dan tidak menelepon
  yes.onclick = async () => {
    yes.classList.add('loading'); yes.disabled = true; no.disabled = true;
    // Catat event, tapi jangan menahan panggilan lebih dari 1,5 dtk; jika gagal, telepon tetap dilanjutkan.
    const log = supabase.rpc('trigger_emergency', { p_card_id: cardId }).then(() => {}, () => {});
    await Promise.race([log, new Promise((r) => setTimeout(r, 1500))]);
    location.href = 'tel:+' + intl(phone);
    setTimeout(close, 800);
  };
}

function render(d) {
  document.title = 'Emergency Card · ' + (d.full_name || d.card_id);
  const none = () => el('p', 'muted', 'Tidak ada data');

  const top = el('div', 'ec-top');
  top.append(withIcon('span', 'badge badge-active', 'shield-check', 'Kartu aktif'), el('span', 'muted small', d.card_id));
  const blood = el('div', 'blood');
  blood.append(withIcon('span', null, 'droplet', 'Golongan darah'), el('strong', null, d.blood_type || '—'));

  const ec = el('article', 'ec');
  ec.append(
    top,
    el('h1', null, d.full_name || 'Tanpa nama'),
    blood,
    section('triangle-alert', 'Alergi', d.allergies.length ? tags(d.allergies, 'tag-allergy') : none()),
    section('heart-pulse', 'Kondisi medis', d.conditions.length ? tags(d.conditions, 'tag-cond') : none()),
    section('phone', 'Kontak darurat', ...(d.contacts.length ? d.contacts.map(contactRow) : [el('p', 'muted', 'Belum ada kontak')]))
  );
  if (d.home_phone) {
    const row = el('div', 'contact'), info = el('div'), acts = el('div', 'actions');
    info.append(el('strong', null, d.home_contact_name || 'Keluarga'), el('span', 'phone', d.home_phone));
    const call = withIcon('button', 'btn btn-sm', 'phone', 'Telepon Keluarga');
    call.type = 'button'; call.onclick = () => askEmergency(d.home_phone);
    acts.append(call, linkBtn('WhatsApp', 'https://wa.me/' + intl(d.home_phone), 'btn-sm btn-success', 'message-circle'));
    row.append(info, acts);
    ec.append(section('home', 'Telepon Rumah / Kepala Keluarga', row));
  }
  if (d.emergency_notes) ec.append(section('file-text', 'Catatan emergency', el('p', 'notes', d.emergency_notes)));
  if (d.organ_donor) ec.append(section('heart', 'Donor organ', withIcon('span', 'badge badge-active', 'check', 'Bersedia menjadi donor organ')));

  const actions = el('div', 'stack');
  if (d.contacts[0]) actions.append(linkBtn('Panggil Kontak Darurat', 'tel:+' + intl(d.contacts[0].phone), 'btn-block', 'phone-call'));
  actions.append(linkBtn('Cari Fasilitas Medis Terdekat', '/medical-search.html', 'btn-secondary btn-block', 'map-pin'));

  const updated = el('p', 'muted small', 'Diperbarui ' + new Date(d.updated_at).toLocaleString('id-ID'));
  updated.style.marginTop = '16px';
  app.replaceChildren(brand(), ec, actions, updated);
  refreshIcons();
}

(async () => {
  if (!/^EC-[A-Z0-9]{8}$/.test(cardId)) return message('Kartu tidak valid', 'ID kartu tidak dikenali.');
  const { data, error } = await supabase.rpc('get_public_card', { p_card_id: cardId });
  if (error) return message('Gagal memuat kartu', 'Periksa koneksi internet, lalu muat ulang halaman.');
  if (!data) return message('Kartu tidak ditemukan', 'Kartu ini tidak ada atau sudah dinonaktifkan pemiliknya.');
  render(data);
})();
