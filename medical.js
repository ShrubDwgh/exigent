window.lucide && window.lucide.createIcons();

const $ = (id) => document.getElementById(id);
const status = $('status'), results = $('results'), btn = $('locate');
const API = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const CATS = {
  rumah_sakit: { label: 'Rumah Sakit', q: (a) => `nwr["amenity"="hospital"]${a};` },
  puskesmas: { label: 'Puskesmas', q: (a) => `nwr["name"~"puskesmas",i]${a};` },
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

async function overpass(query) {
  for (const url of API) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 20000);
      const r = await fetch(url, {
        method: 'POST', signal: ctl.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
      });
      clearTimeout(timer);
      if (r.ok) return (await r.json()).elements || [];
    } catch (_) { /* coba server berikutnya */ }
  }
  throw new Error('Layanan peta sibuk');
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

async function search() {
  if (!pos) return;
  const id = ++seq;
  results.replaceChildren();
  status.textContent = `Mencari ${CATS[cat].label} dalam ${radius / 1000} km…`;
  const around = `(around:${radius},${pos.lat},${pos.lon})`;
  try {
    const els = await overpass(`[out:json][timeout:20];(${CATS[cat].q(around)});out center tags 60;`);
    if (id !== seq) return;
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
      }
      return;
    }
    status.textContent = `${items.length} ${CATS[cat].label} terdekat, diurutkan berdasarkan jarak.`;
    results.append(...items.map(card));
  } catch (_) {
    if (id === seq) status.textContent = 'Gagal memuat data. Periksa koneksi internet lalu coba lagi.';
  }
}

function locate() {
  if (!navigator.geolocation) { status.textContent = 'Browser ini tidak mendukung lokasi.'; return; }
  btn.classList.add('loading');
  navigator.geolocation.getCurrentPosition(
    (p) => { btn.classList.remove('loading'); pos = { lat: p.coords.latitude, lon: p.coords.longitude }; btn.lastChild.textContent = 'Perbarui lokasi'; radius = 5000; search(); },
    (e) => {
      btn.classList.remove('loading');
      status.textContent = e.code === 1
        ? 'Izin lokasi ditolak. Aktifkan izin lokasi untuk situs ini di pengaturan browser, lalu coba lagi.'
        : 'Lokasi belum didapat. Pastikan GPS aktif lalu coba lagi.';
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
// Hanya jalan otomatis jika izin sudah pernah diberikan; tidak pernah memaksa.
navigator.permissions && navigator.permissions.query({ name: 'geolocation' }).then((s) => { if (s.state === 'granted') locate(); }).catch(() => {});
