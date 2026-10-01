window.lucide && window.lucide.createIcons();

const $ = (id) => document.getElementById(id);
const status = $('status'), results = $('results'), btn = $('locate');
const API = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
];
const CATS = {
  rumah_sakit: { label: 'Rumah Sakit', q: (a) => `nwr["amenity"="hospital"]${a};` },
  puskesmas: { label: 'Puskesmas', q: (a) => `nwr["amenity"~"^(clinic|hospital|doctors)$"]["name"~"puskesmas",i]${a};nwr["healthcare"]["name"~"puskesmas",i]${a};` },
  klinik: { label: 'Klinik', q: (a) => `nwr["amenity"~"^(clinic|doctors)$"]${a};` },
  igd: { label: 'IGD', q: (a) => `nwr["amenity"="hospital"]["emergency"="yes"]${a};nwr["name"~"IGD|UGD|gawat darurat",i]["amenity"~"^(hospital|clinic)$"]${a};` },
  apotek: { label: 'Apotek', q: (a) => `nwr["amenity"="pharmacy"]${a};` },
};
let pos = null, cat = 'rumah_sakit', radius = 5000, seq = 0;

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const dist = (a, b, c, d) => {
  const r = Math.PI / 180, h = Math.sin(((c - a) * r) / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
const fmt = (k) => (k < 1 ? Math.round(k * 1000) + ' m' : k.toFixed(1).replace('.', ',') + ' km');
const kind = (t) => (/puskesmas/i.test(t.name || '') ? 'Puskesmas' : t.amenity === 'hospital' ? 'Rumah Sakit' : t.amenity === 'pharmacy' ? 'Apotek' : 'Klinik');

class MapError extends Error {}

async function overpass(query) {
  if (!navigator.onLine) throw new MapError('Tidak ada koneksi internet. Sambungkan internet lalu coba lagi.');
  let reason = 'Layanan pencarian tidak merespons.';
  for (const url of API) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15000);
    try {
      const r = await fetch(url, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'ExigentOne-Web/1.0' }, body: 'data=' + encodeURIComponent(query) });
      if (r.status === 429) { reason = 'Layanan pencarian sedang sibuk. Coba lagi sebentar lagi.'; continue; }
      if (r.status >= 500) { reason = 'Layanan pencarian sedang sibuk. Coba lagi sebentar lagi.'; continue; }
      if (!r.ok) { reason = 'Layanan pencarian tidak tersedia. Coba lagi sebentar lagi.'; continue; }
      const j = await r.json();
      if (j.remark && /timed out|out of memory/i.test(j.remark) && !(j.elements || []).length) { reason = 'Pencarian memakan waktu terlalu lama. Coba lagi sebentar lagi.'; continue; }
      return j.elements || [];
    } catch (e) {
      reason = e.name === 'AbortError' ? 'Pencarian terlalu lama. Coba lagi sebentar lagi.'
        : e instanceof SyntaxError ? 'Layanan pencarian tidak tersedia. Coba lagi sebentar lagi.'
        : navigator.onLine ? 'Layanan pencarian sedang sibuk. Coba lagi 1-2 menit lagi.'
        : 'Koneksi internet terputus. Sambungkan internet lalu coba lagi.';
    } finally { clearTimeout(timer); }
  }
  throw new MapError(reason);
}

function card(p) {
  const t = p.tags, c = el('article', 'card place');
  const addr = t['addr:full'] || [t['addr:street'], t['addr:housenumber'], t['addr:suburb'] || t['addr:city']].filter(Boolean).join(' ');
  const badge = el('span', 'badge badge-medical', cat === 'igd' ? 'IGD' : kind(t));
  const actions = el('div', 'btns');
  const nav = el('a', 'btn btn-secondary btn-sm', 'Navigasi');
  nav.href = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`;
  nav.target = '_blank'; nav.rel = 'noopener';
  actions.append(nav);
  const phone = t.phone || t['contact:phone'];
  if (phone) { const tel = el('a', 'btn btn-outline btn-sm', 'Telepon'); tel.href = 'tel:' + phone.split(';')[0].replace(/[^\d+]/g, ''); actions.append(tel); }
  c.append(el('h3', null, t.name || 'Tanpa nama'), badge, el('p', 'muted', addr || 'Alamat tidak tersedia'), el('p', 'dist', fmt(p.d)), actions);
  return c;
}

function skeleton() {
  return Array.from({ length: 3 }).map(() =>
    `<div class="skeleton-card"><div class="skeleton-line w60"></div><div class="skeleton-line w40"></div><div class="skeleton-line w90"></div><div class="skeleton-btn"></div></div>`
  ).join('');
}

function renderFallbackMap() {
  const q = encodeURIComponent(CATS[cat].label + ' terdekat');
  const wrap = el('div', 'card');
  wrap.append(
    el('h3', null, 'Cari lewat Google Maps'),
    el('p', 'muted', 'Untuk hasil terbaik, cari ' + CATS[cat].label.toLowerCase() + ' terdekat langsung di Google Maps.')
  );
  const link = el('a', 'btn btn-secondary btn-block', 'Buka Google Maps');
  link.href = `https://www.google.com/maps/search/${q}/@${pos.lat},${pos.lon},14z`;
  link.target = '_blank';
  link.rel = 'noopener';
  link.style.marginTop = '12px';
  wrap.append(link);

  const retry = el('button', null, 'Coba lagi');
  retry.type = 'button';
  retry.style.cssText = 'display:block;margin:12px auto 0;background:none;border:none;color:#2563eb;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;text-decoration:underline;padding:4px 8px';
  retry.onclick = () => search();
  wrap.append(retry);

  results.append(wrap);
}

async function search() {
  if (!pos) return;
  const id = ++seq;
  results.innerHTML = skeleton();
  status.innerHTML = '<span class="spin-sm"></span>Mencari ' + CATS[cat].label + ' dalam ' + (radius / 1000) + ' km…';
  const around = `(around:${radius},${pos.lat},${pos.lon})`;
  try {
    const els = await overpass(`[out:json][timeout:10];(${CATS[cat].q(around)});out center tags 60;`);
    if (id !== seq) return;
    results.replaceChildren();
    const items = els
      .map((e) => ({ tags: e.tags || {}, lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon }))
      .filter((e) => e.lat != null && !(cat === 'klinik' && /puskesmas/i.test(e.tags.name || '')))
      .map((e) => ({ ...e, d: dist(pos.lat, pos.lon, e.lat, e.lon) }))
      .sort((a, b) => a.d - b.d).slice(0, 20);
    if (!items.length) {
      status.textContent = `Tidak ada ${CATS[cat].label} dalam ${radius / 1000} km.`;
      if (radius < 15000) {
        const more = el('button', 'btn btn-outline btn-block', 'Perluas ke 15 km');
        more.onclick = () => { radius = 15000; search(); };
        results.append(more);
      } else {
        renderFallbackMap();
      }
      return;
    }
    status.textContent = `${items.length} ${CATS[cat].label} terdekat, diurutkan berdasarkan jarak.`;
    results.append(...items.map(card));
  } catch (e) {
    if (id === seq) {
      results.replaceChildren();
      status.textContent = '';
      renderFallbackMap();
    }
  }
}

function locate() {
  if (!window.isSecureContext) { status.textContent = 'Lokasi hanya bisa dipakai lewat koneksi aman (HTTPS). Buka situs ini lewat alamat https://.'; return; }
  if (!navigator.geolocation) { status.textContent = 'Browser ini tidak mendukung fitur lokasi.'; return; }
  btn.classList.add('loading');
  navigator.geolocation.getCurrentPosition(
    (p) => { btn.classList.remove('loading'); pos = { lat: p.coords.latitude, lon: p.coords.longitude }; btn.lastChild.textContent = 'Perbarui lokasi'; radius = 5000; search(); },
    (e) => {
      btn.classList.remove('loading');
      status.textContent = e.code === 1
        ? 'Izin lokasi diperlukan untuk mencari fasilitas terdekat. Izinkan lokasi untuk situs ini (ikon di sebelah alamat situs, lalu Izin, Lokasi, Izinkan), kemudian tekan tombol lagi.'
        : e.code === 2 ? 'Lokasi tidak tersedia. Aktifkan GPS / Layanan Lokasi di HP, lalu coba lagi.'
        : e.code === 3 ? 'Mendapatkan lokasi terlalu lama. Pindah ke tempat terbuka atau periksa GPS, lalu coba lagi.'
        : 'Lokasi belum bisa didapat.';
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
  );
}

btn.addEventListener('click', locate);
document.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => {
  cat = b.dataset.cat; radius = 5000;
  document.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  search();
}));
navigator.permissions && navigator.permissions.query({ name: 'geolocation' }).then((s) => { if (s.state === 'granted') locate(); }).catch(() => {});
