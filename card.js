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

function message(title, text) {
  const c = el('div', 'card');
  c.append(el('h1', null, title), el('p', 'muted', text));
  app.replaceChildren(c);
  refreshIcons();
}

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

function iconLink(href, iconName, label, extraCls) {
  const a = el('a', 'icon-link' + (extraCls ? ' ' + extraCls : ''));
  a.href = href; a.setAttribute('aria-label', label);
  a.append(icon(iconName));
  if (href.startsWith('http')) { a.target = '_blank'; a.rel = 'noopener'; }
  return a;
}

// Gaya ringkas: nama + nomor, aksi cukup ikon kecil (bukan kotak tombol besar)
function contactMini(name, category, phone) {
  const who = el('div', 'who');
  who.append(el('strong', null, name));
  if (category) who.append(el('span', 'badge cat', category));
  const info = el('div');
  info.append(who, el('span', 'phone', phone));
  const actions = el('div', 'icon-actions');
  actions.append(
    iconLink('tel:+' + intl(phone), 'phone', 'Telepon ' + name),
    iconLink('https://wa.me/' + intl(phone), 'message-circle', 'WhatsApp ' + name, 'wa')
  );
  const row = el('div', 'contact-mini');
  row.append(info, actions);
  return row;
}

function avatarEl(url) {
  if (url) { const img = el('img', 'avatar'); img.src = url; img.alt = ''; return img; }
  const ph = el('div', 'avatar avatar-ph');
  ph.append(icon('user'));
  return ph;
}

// Welcome modal: satu ketukan sekaligus jadi user-gesture untuk minta izin lokasi
// lebih awal, supaya nanti buka Medical Search tidak perlu izin ulang.
function showWelcome() {
  const wrap = el('div', 'modal');
  wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true');
  const box = el('div', 'modal-box');
  box.append(
    el('h2', null, 'Selamat Datang, Penolong'),
    el('p', null, 'Anda akan melihat informasi darurat medis. Aktifkan akses cepat sekarang agar pencarian fasilitas medis terdekat langsung siap dipakai nanti.')
  );
  const start = el('button', 'btn btn-block', 'Mulai Bantu & Aktifkan Akses Cepat');
  start.type = 'button';
  box.append(start);
  wrap.append(box);
  document.body.append(wrap);
  refreshIcons();
  start.onclick = () => {
    wrap.remove();
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 6000 });
  };
}

function render(d) {
  document.title = 'Emergency Card · ' + (d.full_name || d.card_id);
  const none = () => el('p', 'muted', 'Tidak ada data');

  // 1) Satu kotak Card Identitas / KTP Digital
  const top = el('div', 'ec-top');
  top.append(withIcon('span', 'badge badge-active', 'shield-check', 'Kartu aktif'), el('span', 'muted small', d.card_id));

  const nameCol = el('div');
  nameCol.append(el('h1', null, d.full_name || 'Tanpa nama'), withIcon('span', 'blood-badge', 'droplet', d.blood_type || '—'));
  const idRow = el('div', 'id-row');
  idRow.append(avatarEl(d.photo_data_url), nameCol);

  const history = [...d.allergies.map((x) => ({ t: x, cls: 'tag-allergy' })), ...d.conditions.map((x) => ({ t: x, cls: 'tag-cond' }))];
  const historyEl = history.length ? el('div', 'tags') : none();
  history.forEach((h) => historyEl.append(el('span', 'tag ' + h.cls, h.t)));

  const ec = el('article', 'ec');
  ec.append(
    top, idRow,
    section('heart-pulse', 'Riwayat Medis / Alergi', historyEl),
    section('heart', 'Status Donor Organ', d.organ_donor
      ? withIcon('span', 'badge badge-active', 'check', 'Bersedia menjadi donor organ')
      : el('span', 'badge badge-inactive', 'Belum terdaftar sebagai donor organ'))
  );

  // 2) Tombol aksi darurat — di bawah card identitas, di atas daftar kontak
  const actions = el('div', 'stack');
  actions.append(
    linkBtn('Panggil Darurat (112)', 'tel:112', 'btn-block', 'phone-call'),
    linkBtn('Cari Fasilitas Medis Terdekat', '/medical-search.html', 'btn-secondary btn-block', 'map-pin')
  );

  // 3) Daftar kontak darurat, terpisah dari card identitas
  const contactsCard = el('div', 'card');
  contactsCard.append(...(d.contacts.length ? d.contacts.map((c) => contactMini(c.name, c.category, c.phone)) : [el('p', 'muted', 'Belum ada kontak')]));
  const rest = [section('phone', 'Daftar Kontak Darurat', contactsCard)];
  if (d.home_phone) rest.push(section('home', 'Telepon Rumah / Kepala Keluarga', contactMini(d.home_contact_name || 'Keluarga', null, d.home_phone)));
  if (d.emergency_notes) rest.push(section('file-text', 'Catatan Emergency', el('p', 'notes', d.emergency_notes)));

  const updated = el('p', 'muted small', 'Diperbarui ' + new Date(d.updated_at).toLocaleString('id-ID'));
  updated.style.marginTop = '16px';

  // URUTAN: card identitas → tombol aksi → daftar kontak & catatan
  app.replaceChildren(ec, actions, ...rest, updated);
  refreshIcons();
}

(async () => {
  showWelcome();
  if (!/^EC-[A-Z0-9]{8,16}$/.test(cardId)) return message('Kartu tidak valid', 'ID kartu tidak dikenali.');
  const { data, error } = await supabase.rpc('get_public_card', { p_card_id: cardId });
  if (error) return message('Gagal memuat kartu', 'Periksa koneksi internet, lalu muat ulang halaman.');
  if (!data) return message('Kartu tidak ditemukan', 'Kartu ini tidak ada atau sudah dinonaktifkan pemiliknya.');
  render(data);
})();
