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
  return `<div class="loader-wrap">
    <div class="loader">
      <svg id="cloud-medical" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <filter id="roundness-medical">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5"></feGaussianBlur>
            <feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 20 -10"></feColorMatrix>
          </filter>
          <mask id="shapes-medical">
            <g fill="white">
              <polygon points="50 37.5 80 75 20 75 50 37.5"></polygon>
              <circle cx="20" cy="60" r="15"></circle>
              <circle cx="80" cy="60" r="15"></circle>
              <g>
                <circle cx="20" cy="60" r="15"></circle>
                <circle cx="20" cy="60" r="15"></circle>
                <circle cx="20" cy="60" r="15"></circle>
              </g>
            </g>
          </mask>
          <mask id="clipping-medical" clipPathUnits="userSpaceOnUse">
            <g id="lines-medical" filter="url(#roundness-medical)">
              <g mask="url(#shapes-medical)" stroke="white">
                <line x1="-50" y1="-40" x2="150" y2="-40"></line>
                <line x1="-50" y1="-31" x2="150" y2="-31"></line>
                <line x1="-50" y1="-22" x2="150" y2="-22"></line>
                <line x1="-50" y1="-13" x2="150" y2="-13"></line>
                <line x1="-50" y1="-4" x2="150" y2="-4"></line>
                <line x1="-50" y1="5" x2="150" y2="5"></line>
                <line x1="-50" y1="14" x2="150" y2="14"></line>
                <line x1="-50" y1="23" x2="150" y2="23"></line>
                <line x1="-50" y1="32" x2="150" y2="32"></line>
                <line x1="-50" y1="41" x2="150" y2="41"></line>
                <line x1="-50" y1="50" x2="150" y2="50"></line>
                <line x1="-50" y1="59" x2="150" y2="59"></line>
                <line x1="-50" y1="68" x2="150" y2="68"></line>
                <line x1="-50" y1="77" x2="150" y2="77"></line>
                <line x1="-50" y1="86" x2="150" y2="86"></line>
                <line x1="-50" y1="95" x2="150" y2="95"></line>
                <line x1="-50" y1="104" x2="150" y2="104"></line>
                <line x1="-50" y1="113" x2="150" y2="113"></line>
                <line x1="-50" y1="122" x2="150" y2="122"></line>
                <line x1="-50" y1="131" x2="150" y2="131"></line>
                <line x1="-50" y1="140" x2="150" y2="140"></line>
              </g>
            </g>
          </mask>
        </defs>
        <rect x="0" y="0" width="100" height="100" rx="0" ry="0" mask="url(#clipping-medical)"></rect>
        <g>
          <path d="M33.52,68.12 C35.02,62.8 39.03,58.52 44.24,56.69 C49.26,54.93 54.68,55.61 59.04,58.4 C59.04,58.4 56.24,60.53 56.24,60.53 C55.45,61.13 55.68,62.37 56.63,62.64 C56.63,62.64 67.21,65.66 67.21,65.66 C67.98,65.88 68.75,65.3 68.74,64.5 C68.74,64.5 68.68,53.5 68.68,53.5 C68.67,52.51 67.54,51.95 66.75,52.55 C66.75,52.55 64.04,54.61 64.04,54.61 C57.88,49.79 49.73,48.4 42.25,51.03 C35.2,53.51 29.78,59.29 27.74,66.49 C27.29,68.08 28.22,69.74 29.81,70.19 C30.09,70.27 30.36,70.31 30.63,70.31 C31.94,70.31 33.14,69.44 33.52,68.12Z"></path>
          <path d="M69.95,74.85 C68.35,74.4 66.7,75.32 66.25,76.92 C64.74,82.24 60.73,86.51 55.52,88.35 C50.51,90.11 45.09,89.43 40.73,86.63 C40.73,86.63 43.53,84.51 43.53,84.51 C44.31,83.91 44.08,82.67 43.13,82.4 C43.13,82.4 32.55,79.38 32.55,79.38 C31.78,79.16 31.02,79.74 31.02,80.54 C31.02,80.54 31.09,91.54 31.09,91.54 C31.09,92.53 32.22,93.09 33.01,92.49 C33.01,92.49 35.72,90.43 35.72,90.43 C39.81,93.63 44.77,95.32 49.84,95.32 C52.41,95.32 55,94.89 57.51,94.01 C64.56,91.53 69.99,85.75 72.02,78.55 C72.47,76.95 71.54,75.3 69.95,74.85Z"></path>
        </g>
      </svg>
    </div>
    <p>Mencari fasilitas medis…</p>
  </div>`;
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
