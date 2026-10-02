import { supabase } from './supabase.js';
import { requireSession } from './auth.js';
import { STRINGS, getLang, applyNavLabels } from './i18n.js';

const $ = (id) => document.getElementById(id);
const lang = getLang();
const t = (k) => (STRINGS[lang] && STRINGS[lang][k]) || STRINGS.en[k] || k;
const L = (id, en) => (lang === 'id' ? id : en);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const TYPE_LABEL = { idea: { id: 'Ide & Saran', en: 'Idea & Suggestion', icon: 'lightbulb' }, bug: { id: 'Lapor Masalah', en: 'Report Bug', icon: 'bug' } };
const STATUS_LABEL = {
  new:         { id: 'Baru',       en: 'New',         cls: 'status-new' },
  read:        { id: 'Dibaca',     en: 'Read',        cls: 'status-read' },
  in_progress: { id: 'Diproses',   en: 'In progress', cls: 'status-in_progress' },
  resolved:    { id: 'Selesai',    en: 'Resolved',    cls: 'status-resolved' },
};

function fmtDate(iso) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch (_) { return String(iso); }
}

/* Batch generate signed URL untuk semua path (screenshot + audio) sekaligus */
async function signAll(paths) {
  const map = new Map();
  if (!paths.length) return map;
  const { data, error } = await supabase.storage.from('feedback-files').createSignedUrls(paths, 3600);
  if (error) return map;
  (data || []).forEach((d) => { if (d.signedUrl) map.set(d.path, d.signedUrl); });
  return map;
}

function itemHtml(f, urlMap) {
  const type = TYPE_LABEL[f.type] || TYPE_LABEL.idea;
  const status = STATUS_LABEL[f.status] || STATUS_LABEL.new;

  const shots = (f.screenshot_urls || []).map((p) => {
    const url = urlMap.get(p);
    if (!url) return '';
    return `<a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="" loading="lazy"></a>`;
  }).join('');

  const audioUrl = f.audio_url ? urlMap.get(f.audio_url) : null;
  const audioHtml = audioUrl
    ? `<div class="fb-audio"><i data-lucide="mic" aria-hidden="true"></i><audio controls preload="metadata" src="${esc(audioUrl)}"></audio></div>`
    : '';

  const noteHtml = f.admin_note
    ? `<div class="fb-note"><strong>${L('Catatan dari tim:', 'Note from team:')}</strong> ${esc(f.admin_note)}</div>`
    : '';

  return `<article class="card fb-item">
    <div class="fb-head">
      <span class="fb-type ${esc(f.type)}"><i data-lucide="${type.icon}" aria-hidden="true"></i>${esc(L(type.id, type.en))}</span>
      <span class="badge ${status.cls}">${esc(L(status.id, status.en))}</span>
    </div>
    <span class="fb-date">${esc(fmtDate(f.created_at))}</span>
    <p class="fb-msg">${esc(f.message)}</p>
    ${shots ? `<div class="fb-shots">${shots}</div>` : ''}
    ${audioHtml}
    ${noteHtml}
  </article>`;
}

function emptyHtml() {
  return `<div class="card">
    <div class="empty">
      <span class="empty-ic"><i data-lucide="inbox" aria-hidden="true"></i></span>
      <h2>${L('Belum ada masukan', 'No feedback yet')}</h2>
      <p class="muted">${L('Kirim ide atau laporkan masalah pertamamu.', 'Send your first idea or report a bug.')}</p>
      <a class="btn btn-secondary btn-sm" href="/feedback.html" style="margin-top:8px">
        <i data-lucide="send" aria-hidden="true"></i>${L('Kirim Masukan', 'Send Feedback')}
      </a>
    </div>
  </div>`;
}

async function load() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { location.replace('/'); return; }

  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  $('fb-skeleton').hidden = true;
  const list = $('fb-list');

  if (error) {
    list.innerHTML = `<div class="card"><p class="muted" style="text-align:center;padding:16px 0">${L('Gagal memuat riwayat.', 'Failed to load history.')}</p></div>`;
    window.lucide && window.lucide.createIcons();
    return;
  }

  const items = data || [];
  if (!items.length) {
    list.innerHTML = emptyHtml();
    window.lucide && window.lucide.createIcons();
    return;
  }

  // Kumpulkan semua path file yang perlu signed URL
  const allPaths = [];
  items.forEach((f) => {
    (f.screenshot_urls || []).forEach((p) => allPaths.push(p));
    if (f.audio_url) allPaths.push(f.audio_url);
  });

  const urlMap = await signAll(allPaths);
  list.innerHTML = `<div class="stack-lg">${items.map((f) => itemHtml(f, urlMap)).join('')}</div>`;
  window.lucide && window.lucide.createIcons();
}

/* Back button */
$('back').onclick = () => (history.length > 1 ? history.back() : location.replace('/account.html'));

/* Init */
(async () => {
  applyNavLabels(t);
  window.lucide && window.lucide.createIcons();
  await requireSession();
  load();
})();
