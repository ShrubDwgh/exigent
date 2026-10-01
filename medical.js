import { getLang, createT } from './i18n.js';

window.lucide && window.lucide.createIcons();

const lang = getLang();
const t = createT(lang);

const $ = (id) => document.getElementById(id);
const status = $('status'), results = $('results'), btn = $('locate');
const API = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
];
const CATS = {
  rumah_sakit: { labelKey: 'med_cat_hospital', q: (a) => `nwr["amenity"="hospital"]${a};` },
  puskesmas: { labelKey: 'med_cat_puskesmas', q: (a) => `nwr["amenity"~"^(clinic|hospital|doctors)$"]["name"~"puskesmas",i]${a};nwr["healthcare"]["name"~"puskesmas",i]${a};` },
  klinik: { labelKey: 'med_cat_clinic', q: (a) => `nwr["amenity"~"^(clinic|doctors)$"]${a};` },
  igd: { labelKey: 'med_cat_igd', q: (a) => `nwr["amenity"="hospital"]["emergency"="yes"]${a};nwr["name"~"IGD|UGD|gawat darurat",i]["amenity"~"^(hospital|clinic)$"]${a};` },
  apotek: { labelKey: 'med_cat_pharmacy', q: (a) => `nwr["amenity"="pharmacy"]${a};` },
};
let pos = null, cat = 'rumah_sakit', radius = 5000, seq = 0;
const catLabel = (c = cat) => t(CATS[c].labelKey);

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const dist = (a, b, c, d) => {
  const r = Math.PI / 180, h = Math.sin(((c - a) * r) / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
const fmt = (k) => (k < 1 ? Math.round(k * 1000) + ' m' : k.toFixed(1).replace('.', lang === 'id' ? ',' : '.') + ' km');
const kind = (tags) => t(/puskesmas/i.test(tags.name || '') ? 'med_cat_puskesmas' : tags.amenity === 'hospital' ? 'med_cat_hospital' : tags.amenity === 'pharmacy' ? 'med_cat_pharmacy' : 'med_cat_clinic');

class MapError extends Error {}

async function overpass(query) {
  if (!navigator.onLine) throw new MapError(t('med_err_offline'));
  let reason = t('med_err_no_response');
  for (const url of API) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15000);
    try {
      const r = await fetch(url, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'ExigentOne-Web/1.0' }, body: 'data=' + encodeURIComponent(query) });
      if (r.status === 429) { reason = t('med_err_busy'); continue; }
      if (r.status >= 500) { reason = t('med_err_busy'); continue; }
      if (!r.ok) { reason = t('med_err_busy'); continue; }
      const j = await r.json();
      if (j.remark && /timed out|out of memory/i.test(j.remark) && !(j.elements || []).length) { reason = t('med_err_busy'); continue; }
      return j.elements || [];
    } catch (e) {
      reason = e.name === 'AbortError' ? t('med_err_busy')
        : e instanceof SyntaxError ? t('med_err_busy')
        : navigator.onLine ? t('med_err_busy')
        : t('med_err_offline');
    } finally { clearTimeout(timer); }
  }
  throw new MapError(reason);
}

function card(p) {
  const tags = p.tags, c = el('article', 'card place');
  const addr = tags['addr:full'] || [tags['addr:street'], tags['addr:housenumber'], tags['addr:suburb'] || tags['addr:city']].filter(Boolean).join(' ');
  const badge = el('span', 'badge badge-medical', cat === 'igd' ? t('med_cat_igd') : kind(tags));
  const actions = el('div', 'btns');
  const nav = el('a', 'btn btn-secondary btn-sm', t('med_navigate'));
  nav.href = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`;
  nav.target = '_blank'; nav.rel = 'noopener';
  actions.append(nav);
  const phone = tags.phone || tags['contact:phone'];
  if (phone) { const tel = el('a', 'btn btn-outline btn-sm', t('med_call')); tel.href = 'tel:' + phone.split(';')[0].replace(/[^\d+]/g, ''); actions.append(tel); }
  c.append(el('h3', null, tags.name || t('med_no_name')), badge, el('p', 'muted', addr || t('med_no_address')), el('p', 'dist', fmt(p.d)), actions);
  return c;
}

function skeleton() {
  return Array.from({ length: 3 }).map(() =>
    `<div class="skeleton-card"><div class="skeleton-line w60"></div><div class="skeleton-line w40"></div><div class="skeleton-line w90"></div><div class="skeleton-btn"></div></div>`
  ).join('');
}

function renderFallbackMap() {
  const q = encodeURIComponent(t('med_gmaps_query', { cat: catLabel() }));
  const wrap = el('div', 'card');
  wrap.append(
    el('h3', null, t('med_gmaps_title')),
    el('p', 'muted', t('med_gmaps_desc', { cat: catLabel().toLowerCase() }))
  );
  const link = el('a', 'btn btn-secondary btn-block', t('med_gmaps_btn'));
  link.href = `https://www.google.com/maps/search/${q}/@${pos.lat},${pos.lon},14z`;
  link.target = '_blank';
  link.rel = 'noopener';
  link.style.marginTop = '12px';
  wrap.append(link);

  const retry = el('button', null, t('med_retry'));
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
  const spin = el('span', 'spin-sm');
  status.replaceChildren(spin, document.createTextNode(t('med_searching', { cat: catLabel(), km: radius / 1000 })));
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
      status.textContent = t('med_no_results', { cat: catLabel(), km: radius / 1000 });
      if (radius < 15000) {
        const more = el('button', 'btn btn-outline btn-block', t('med_expand_15km'));
        more.onclick = () => { radius = 15000; search(); };
        results.append(more);
      } else {
        renderFallbackMap();
      }
      return;
    }
    status.textContent = t('med_found', { n: items.length, cat: catLabel() });
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
  if (!window.isSecureContext) { status.textContent = t('med_err_insecure'); return; }
  if (!navigator.geolocation) { status.textContent = t('med_err_gps_unsupported'); return; }
  btn.classList.add('loading');
  navigator.geolocation.getCurrentPosition(
    (p) => { btn.classList.remove('loading'); pos = { lat: p.coords.latitude, lon: p.coords.longitude }; btn.lastChild.textContent = t('med_update_location'); radius = 5000; search(); },
    (e) => {
      btn.classList.remove('loading');
      status.textContent = e.code === 1 ? t('med_err_gps_denied')
        : e.code === 2 ? t('med_err_gps_unavailable')
        : e.code === 3 ? t('med_err_gps_timeout')
        : t('med_err_gps_unknown');
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
