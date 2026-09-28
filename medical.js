window.lucide && window.lucide.createIcons();

const $ = (id) => document.getElementById(id);
const status = $('status'), results = $('results'), btn = $('locate');
const API = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
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
  let reason = 'Server peta tidak merespons.';
  for (const url of API) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    try {
      const r = await fetch(url, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(query) });
      if (r.status === 429) { reason = 'Server peta membatasi permintaan karena terlalu ramai. Tunggu sekitar satu menit lalu coba lagi.'; continue; }
      if (r.status >= 500) { reason = 'Server peta sedang sibuk atau bermasalah (kode ' + r.status + '). Coba lagi sebentar lagi.'; continue; }
      if (!r.ok) { reason = 'Server peta menolak permintaan (kode ' + r.status + ').'; continue; }
      const j = await r.json();
      if (j.remark && /timed out|out of memory/i.test(j.remark) && !(j.elements || []).length) { reason = 'Pencarian terlalu berat bagi server peta dan tidak selesai tepat waktu. Coba lagi.'; continue; }
      return j.elements || [];
    } catch (e) {
      reason = e.name === 'AbortError' ? 'Server peta terlalu lama merespons (timeout). Koneksi internet mungkin lambat, coba lagi.'
        : e instanceof SyntaxError ? 'Server peta mengirim data yang tidak valid. Coba lagi sebentar lagi.'
        : navigator.onLine ? 'Tidak dapat terhubung ke server peta. Sinyal tidak stabil atau jaringan memblokir layanan peta.'
        : 'Koneksi internet terputus.';
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
  } catch (e) {
    if (id === seq) status.textContent = e instanceof MapError ? e.message : 'Terjadi kesalahan tak terduga saat mencari: ' + e.message;
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
// Hanya jalan otomatis jika izin sudah pernah diberikan; tidak pernah memaksa.
navigator.permissions && navigator.permissions.query({ name: 'geolocation' }).then((s) => { if (s.state === 'granted') locate(); }).catch(() => {});
