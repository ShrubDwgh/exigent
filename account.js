import { supabase } from './supabase.js';
import { requireSession, signOut, busy, toast } from './auth.js';
import { STRINGS, LANGUAGES, getLang, setLang, applyNavLabels } from './i18n.js';
import { esc, openSheet } from './ui.js';
import { watchPermission, requestGeolocation } from './permissions.js';
import { canUseNfc } from './trial.js';
import { FAQ_ROOT, FAQ_TREE } from './help-config.js';
import { CS_CONTACT } from './cs-config.js';

const $ = (id) => document.getElementById(id);
const main = $('acct-main');
const icons = () => window.lucide && window.lucide.createIcons();
let lang = getLang();
const t = (k) => (STRINGS[lang] && STRINGS[lang][k]) || STRINGS.en[k] || k;
const T = (k) => esc(t(k));
const tr = (k, vars) => { let s = t(k); if (vars) for (const [kk, vv] of Object.entries(vars)) s = s.replace('{' + kk + '}', vv); return s; };
const pick = (o) => (o && (o[lang] ?? o.en ?? o.id)) ?? '';
const fail = (e) => toast(t('failed') + ((e && e.message) || e));

let session = null, card = null, profile = null, loadFailed = false;

/* ---------- Cache profil ---------- */
function cacheKey() {
  return session && session.user ? 'exigent_profile_cache_' + session.user.id : null;
}
function getCachedProfile() {
  try {
    const k = cacheKey();
    if (!k) return null;
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}
function setCachedProfile(p) {
  try {
    const k = cacheKey();
    if (!k) return;
    if (!p) { localStorage.removeItem(k); return; }
    localStorage.setItem(k, JSON.stringify({
      full_name: p.full_name || '',
      photo_data_url: p.photo_data_url || ''
    }));
  } catch (_) {}
}
function clearCachedProfile() {
  try {
    const k = cacheKey();
    if (k) localStorage.removeItem(k);
  } catch (_) {}
}

/* ---------- Data ---------- */
async function loadData() {
  loadFailed = false; card = null; profile = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error(t('session_expired'));

    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    card = data;
    if (card) {
      const p = await supabase.from('emergency_profiles').select('full_name, photo_data_url').eq('card_uuid', card.id).maybeSingle();
      profile = p.data || null;
      setCachedProfile(profile);
    } else {
      clearCachedProfile();
    }
  } catch (e) {
    loadFailed = true; card = null; profile = null; fail(e);
  }
}

const meta = () => session.user.user_metadata || {};
const googleName = () => String(meta().full_name || meta().name || '').trim();

const displayName = () => {
  const p = profile || getCachedProfile() || {};
  return String(p.full_name || '').trim()
    || googleName()
    || String(session.user.email || '').split('@')[0].trim();
};

const providers = () => { const a = session.user.app_metadata || {}; return a.providers || [a.provider || 'email']; };
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)); } catch (_) { return String(iso); }
};
const fmtRelative = (iso) => {
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return t('time_just_now');
    if (diff < 3600) return tr('time_min_ago', { n: Math.floor(diff / 60) });
    if (diff < 86400) return tr('time_hour_ago', { n: Math.floor(diff / 3600) });
    if (diff < 604800) return tr('time_day_ago', { n: Math.floor(diff / 86400) });
    return fmtDate(iso);
  } catch (_) { return ''; }
};
const deviceLabel = (ua) => {
  const platform = /Android/i.test(ua) ? 'Android'
                 : /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
                 : /Windows/i.test(ua) ? 'Windows'
                 : /Mac/i.test(ua) ? 'Mac'
                 : 'Unknown';
  const browser = /Edg/i.test(ua) ? 'Edge'
                : /Chrome/i.test(ua) ? 'Chrome'
                : /Safari/i.test(ua) ? 'Safari'
                : /Firefox/i.test(ua) ? 'Firefox'
                : 'Browser';
  return browser + ' · ' + platform;
};

function shortName(name) {
  return String(name || '').trim().split(/\s+/).slice(0, 2).join(' ');
}
function initials(name) {
  return String(name || '').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
}

/* ---------- Potongan HTML ---------- */
const row = ({ tag = 'a', href, id, icon, label, sub, value, danger, disabled, plain }) => {
  const attrs = tag === 'a' ? `href="${esc(href)}"` : 'type="button"';
  const off = disabled ? (tag === 'a' ? ' aria-disabled="true" tabindex="-1"' : ' disabled') : '';
  return `<${tag} class="mrow${danger ? ' danger' : ''}${plain ? ' plain' : ''}" ${attrs}${id ? ` id="${id}"` : ''}${off}>
    ${icon ? `<span class="mrow-ic"><i data-lucide="${icon}" aria-hidden="true"></i></span>` : ''}
    <span class="mrow-tx"><strong>${esc(label)}</strong>${sub ? `<small>${esc(sub)}</small>` : ''}</span>
    ${value ? `<span class="mrow-val">${esc(value)}</span>` : ''}
    <i data-lucide="chevron-right" class="mrow-go" aria-hidden="true"></i>
  </${tag}>`;
};
const kv = (rows) => `<dl class="kv">${rows.map(([k, v]) => `<div class="kv-row"><dt class="kv-k">${esc(k)}</dt><dd class="kv-v">${v}</dd></div>`).join('')}</dl>`;
const badge = (cls, text) => `<span class="badge ${cls}">${esc(text)}</span>`;
const badgeBox = (cls, text) => `<span class="badge ${cls}" style="border-radius:8px">${esc(text)}</span>`;
const empty = (icon, title, desc, extra = '') => `<div class="empty"><span class="empty-ic"><i data-lucide="${icon}" aria-hidden="true"></i></span><h2>${esc(title)}</h2>${desc ? `<p class="muted">${esc(desc)}</p>` : ''}${extra}</div>`;
const labelLine = (text) => `<div style="display:inline-block;padding-bottom:6px;margin-bottom:10px;border-bottom:1px solid #e5e7eb;min-width:60%"><p class="label" style="margin:0">${esc(text)}</p></div>`;

/* ---------- Layar ---------- */
function timeGreeting() {
  const h = new Date().getHours();
  if (h >= 4  && h < 11) return t('greet_morning');
  if (h >= 11 && h < 15) return t('greet_afternoon');
  if (h >= 15 && h < 18) return t('greet_evening');
  return t('greet_night');
}

function renderHome() {
  const fullName = displayName();
  const name = shortName(fullName);
  const googleAvatar = meta().avatar_url || meta().picture || '';
  const cached = getCachedProfile();
  const cardPhoto = (profile && profile.photo_data_url) || (cached && cached.photo_data_url) || '';
  const avatarUrl = cardPhoto || googleAvatar;

  const avatarHtml = avatarUrl
    ? `<img class="greet-avatar" src="${esc(avatarUrl)}" alt="" referrerpolicy="no-referrer">`
    : `<span class="greet-avatar">${esc(initials(fullName))}</span>`;

  const greetHtml = name
    ? `<div class="greet-card">
        ${avatarHtml}
        <div class="greet-text">
          <span class="greet-hello">${esc(timeGreeting())}</span>
          <span class="greet-name">${esc(name)}</span>
          <span class="greet-desc">${T('greet_desc')}</span>
        </div>
      </div>`
    : `<div class="greet-card">
        <div class="greet-text">
          <span class="greet-hello">${T('greet_anon')}</span>
          <span class="greet-desc">${T('greet_desc')}</span>
        </div>
      </div>`;

  main.innerHTML = `<section class="screen">
    ${greetHtml}
    <nav class="menu-stack" aria-label="${T('acct_title')}">
      <div class="card menu">${row({ href: '#/security', icon: 'lock', label: t('menu_security') })}</div>
      <div class="card menu">${row({ href: '#/settings', icon: 'settings', label: t('menu_settings') })}</div>
      <div class="card menu">${row({ href: '#/help', icon: 'circle-help', label: lang === 'id' ? 'Bantuan & Masukan' : 'Help & Feedback' })}</div>
      <div class="card menu">${row({ tag: 'button', id: 'row-cs', icon: 'headset', label: t('menu_cs') })}</div>
      <div class="card menu">${row({ href: '#/legal', icon: 'gavel', label: t('menu_legal') })}</div>
      <div class="card menu">${row({ href: '#/about', icon: 'info', label: t('menu_about') })}</div>
      <div class="card menu">${row({ tag: 'button', id: 'row-logout', icon: 'log-out', label: t('menu_logout'), danger: true })}</div>
    </nav>
  </section>`;

  const img = main.querySelector('img.greet-avatar');
  if (img) img.addEventListener('error', () => {
    const sp = document.createElement('span');
    sp.className = 'greet-avatar';
    sp.textContent = initials(fullName);
    img.replaceWith(sp);
  });

  $('row-cs').onclick = openCs;
  $('row-logout').onclick = askLogout;
}

function renderSettings() {
  const c = card;
  const cardLabel = c && !c.is_active ? t('set_activate') : t('set_deactivate');
  const cardSub = loadFailed ? t('set_card_error') : !c ? t('set_no_card') : '';
  const currentLangName = (LANGUAGES[lang] && LANGUAGES[lang].name) || lang;
  main.innerHTML = `<section class="screen"><nav class="menu-stack" aria-label="${T('menu_settings')}">
    <div class="card menu">${row({ href: '#/settings/gmail', icon: 'mail', label: t('set_gmail') })}</div>
    <div class="card menu">${row({ href: '#/settings/idcard', icon: 'credit-card', label: t('set_idcard') })}</div>
    <div class="card menu">${row({ tag: 'button', id: 'row-lang', icon: 'languages', label: t('set_language'), value: currentLangName })}</div>
    <div class="card menu">${row({ href: '#/settings/permissions', icon: 'shield-check', label: t('set_permissions') })}</div>
    <div class="card menu">${row({ href: '/my-feedback.html', icon: 'history', label: lang === 'id' ? 'Riwayat Masukan' : 'My Feedback', sub: lang === 'id' ? 'Lihat masukan yang pernah kamu kirim' : 'See your submitted feedback' })}</div>
    <div class="card menu">${row({ tag: 'button', id: 'row-card', icon: 'power', label: cardLabel, sub: cardSub, danger: !c || c.is_active, disabled: !c })}</div>
    <div class="card menu">${row({ tag: 'button', id: 'row-delete', icon: 'trash-2', label: t('delete_account'), danger: true })}</div>
  </nav></section>`;
  $('row-lang').onclick = openLang;
  $('row-card').onclick = onCardRow;
  $('row-delete').onclick = askDeleteAccount;
}

function renderGmail() {
  const u = session.user;
  const name = displayName();
  const googleAvatar = meta().avatar_url || meta().picture || '';
  const cached = getCachedProfile();
  const cardPhoto = (profile && profile.photo_data_url) || (cached && cached.photo_data_url) || '';
  const avatar = cardPhoto || googleAvatar;
  const pv = providers();
  const method = pv.map((p) => (p === 'google' ? 'Google' : p === 'email' ? t('gmail_prov_email') : p)).join(', ');
  const nameValue = String((profile && profile.full_name) || (cached && cached.full_name) || '').trim() || googleName() || '—';

  main.innerHTML = `<section class="screen stack-lg"><div class="card stack-lg">
    <div class="id-head">
      ${avatar ? `<img class="avatar" src="${esc(avatar)}" alt="" referrerpolicy="no-referrer">` : '<span class="avatar avatar-ph"><i data-lucide="user" aria-hidden="true"></i></span>'}
      <div class="id-who"><p class="id-name">${esc(name || '—')}</p><p class="muted">${esc(u.email || '—')}</p></div>
    </div>
    ${kv([
      [t('gmail_name'), esc(nameValue)],
      [t('gmail_email'), esc(u.email || '—')],
      [t('gmail_method'), esc(method)],
      [t('gmail_created'), esc(fmtDate(u.created_at))],
      [t('gmail_last'), esc(fmtDate(u.last_sign_in_at))]
    ])}
  </div></section>`;

  const img = main.querySelector('img.avatar');
  if (img) img.addEventListener('error', () => {
    const ph = document.createElement('span');
    ph.className = 'avatar avatar-ph'; ph.innerHTML = '<i data-lucide="user" aria-hidden="true"></i>';
    img.replaceWith(ph); icons();
  });
}

/* ---------- NFC Writer ---------- */
async function doWriteNfc(url) {
  const status = $('nfc-status'), btn = $('nfc-write');

  btn.classList.add('loading'); btn.disabled = true;
  status.textContent = t('nfc_tap');

  try {
    await new NDEFReader().write({ records: [{ recordType: 'url', data: url }] });
    toast(t('nfc_written'));
    status.textContent = t('nfc_saving');

    const { data: { user } } = await supabase.auth.getUser();
    const { data: updData, error: dbErr } = await supabase
      .from('cards')
      .update({ nfc_written_at: new Date().toISOString() })
      .eq('id', card.id)
      .eq('owner_id', user.id)
      .select();

    if (dbErr) {
      status.innerHTML = `<span class="err-line">${esc(tr('nfc_written_db_fail', { msg: dbErr.message }))}</span>`;
    } else if (!updData || updData.length === 0) {
      status.innerHTML = `<span class="err-line">${T('nfc_no_rows')}</span>`;
    } else {
      await loadData();
      render();
      const newStatus = $('nfc-status');
      if (newStatus) newStatus.textContent = t('nfc_written_ok');
    }
  } catch (err) {
    status.innerHTML = `<span class="err-line">${esc(err.message || err.name || t('nfc_write_failed'))}</span>${T('nfc_write_hint')}`;
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
}

async function writeNfc(url) {
  const status = $('nfc-status');

  if (!('NDEFReader' in window)) {
    status.textContent = t('nfc_unsupported');
    return;
  }
  if (!window.isSecureContext) {
    status.textContent = t('nfc_https');
    return;
  }

  if (card.nfc_written_at) {
    confirmSheet({
      title: t('nfc_rewrite_q'),
      text: t('nfc_rewrite_desc'),
      okLabel: t('nfc_rewrite'),
      danger: false,
      onConfirm: (c) => {
        c.close();
        doWriteNfc(url);
      },
    });
    return;
  }

  doWriteNfc(url);
}

function openNfcLockModal() {
  if (document.querySelector('.modal[data-nfc-lock]')) return;
  const wrap = document.createElement('div');
  wrap.className = 'modal';
  wrap.setAttribute('data-nfc-lock', '1');
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.innerHTML = `<div class="modal-box">
    <h2 style="display:flex;align-items:center;gap:8px"><i data-lucide="lock" style="width:20px;height:20px" aria-hidden="true"></i> Fitur NFC Terkunci</h2>
    <p class="muted">Untuk menulis data ke kartu NFC, kamu perlu punya kartu fisik.</p>
    <p class="muted small">QR kamu tetap bisa dipakai tanpa kartu fisik. Beli kartu NFC untuk pengalaman tap yang lebih cepat.</p>
    <div class="modal-actions">
      <button class="btn btn-outline" data-close>Nanti</button>
      <a class="btn" href="/upgrade.html">Beli Kartu</a>
    </div>
  </div>`;
  document.body.append(wrap);
  icons();
  const close = () => wrap.remove();
  wrap.querySelector('[data-close]').onclick = close;
  wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
  });
}

function renderIdCard() {
  if (loadFailed || !card) {
    const go = `<a class="btn btn-secondary" href="/dashboard.html">${T('idc_go')}</a>`;
    main.innerHTML = `<section class="screen"><div class="card">${loadFailed
      ? empty('circle-alert', t('set_card_error'), '', '<button type="button" class="btn btn-secondary" id="idc-retry">' + T('retry') + '</button>')
      : empty('credit-card', t('idc_empty_title'), t('idc_empty_desc'), go)}</div></section>`;
    const retry = $('idc-retry');
    if (retry) retry.onclick = (e) => busy(e.currentTarget, async () => { await loadData(); render(); });
    return;
  }
  const url = `${location.origin}/card/${card.card_id}`;
  const nfcUnlocked = canUseNfc(card);
  const nfcBtnClass = nfcUnlocked ? 'btn btn-secondary btn-block' : 'btn btn-outline btn-block';
  const nfcBtnLabel = nfcUnlocked ? T('write_nfc') : '<i data-lucide="lock" style="width:18px;height:18px" aria-hidden="true"></i> Beli Kartu untuk NFC';

  main.innerHTML = `<section class="screen"><div class="card stack-lg">
    <div>
      ${labelLine(T('card_id'))}
      <p class="big">${esc(card.card_id)}</p>
      <div style="margin-top:8px">${badgeBox(card.is_active ? 'badge-active' : 'badge-inactive', t(card.is_active ? 'active' : 'inactive'))}</div>
    </div>
    <div>
      ${labelLine(T('idc_nfc'))}
      <div>${badgeBox(card.nfc_written_at ? 'badge-active' : 'badge-inactive', t(card.nfc_written_at ? 'idc_nfc_yes' : 'idc_nfc_no'))}</div>
    </div>
    <div>
      ${labelLine(T('idc_created'))}
      <p>${esc(fmtDate(card.created_at))}</p>
    </div>
    <div>
      ${labelLine(T('card_url'))}
      <div class="btns">
        <button type="button" class="btn btn-secondary btn-sm" id="idc-copy">${T('copy_url')}</button>
        <a class="btn btn-outline btn-sm" href="/card/${esc(card.card_id)}" target="_blank" rel="noopener">${T('view_card')}</a>
      </div>
    </div>
  </div>
  <div class="card stack-lg" style="margin-top:12px">
    <button class="${nfcBtnClass}" id="nfc-write" type="button" style="display:inline-flex;align-items:center;justify-content:center;gap:8px">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36"/>
        <path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58"/>
        <path d="M12.91 4.1a15.91 15.91 0 0 1 .01 15.8"/>
        <path d="M16.37 2a20.16 20.16 0 0 1 0 20"/>
      </svg>
      ${nfcBtnLabel}
    </button>
    <p id="nfc-status" class="muted small" style="text-align:center"></p>
  </div>
  </section>`;
  $('idc-copy').onclick = () => (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast(t('copied')), () => toast(t('copy_manual')));
  $('nfc-write').onclick = () => {
    if (!canUseNfc(card)) { openNfcLockModal(); return; }
    writeNfc(url);
  };
}

function renderSecurity() {
  const pv = providers();
  main.innerHTML = `<section class="screen stack-lg">
    ${pv.includes('email') ? `<div class="card menu">${row({ href: '#/security/password', icon: 'key-round', label: t('sec_change_pw'), sub: t('sec_change_pw_sub') })}</div>` : ''}
    ${pv.includes('google') ? `<div class="card stack-lg"><h2>Google</h2><p class="muted">${T('sec_google_note')}</p>
      <a class="btn btn-outline btn-sm" href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer">${T('sec_google_manage')}</a></div>` : ''}
    <div class="card menu">${row({ href: '#/security/devices', icon: 'monitor-smartphone', label: t('sec_devices'), sub: t('sec_devices_sub') })}</div>
    <div class="card menu">${row({ tag: 'button', id: 'row-others', icon: 'smartphone', label: t('sec_others'), sub: t('sec_others_desc') })}</div>
  </section>`;
  $('row-others').onclick = askOthers;
}

function renderChangePassword() {
  const pv = providers();
  if (!pv.includes('email')) {
    main.innerHTML = `<section class="screen"><div class="card">${empty('circle-alert', t('sec_na'), t('sec_google_no_pw'))}</div></section>`;
    return;
  }
  main.innerHTML = `<section class="screen stack-lg">
    <form id="pw-form" class="card stack-lg" novalidate>
      <h2>${T('sec_password')}</h2>
      <div class="field" style="margin:0"><label for="pw1">${T('sec_new_pw')}</label><input class="input" id="pw1" type="password" autocomplete="new-password"></div>
      <div class="field" style="margin:0"><label for="pw2">${T('sec_confirm_pw')}</label><input class="input" id="pw2" type="password" autocomplete="new-password"></div>
      <p id="pw-msg" class="msg" role="alert" hidden></p>
      <button class="btn btn-secondary btn-block" type="submit">${T('sec_save_pw')}</button>
    </form>
  </section>`;

  const form = $('pw-form');
  form.onsubmit = (e) => {
    e.preventDefault();
    const msg = $('pw-msg'), a = $('pw1').value, b = $('pw2').value;
    const show = (text) => { msg.textContent = text; msg.hidden = false; };
    msg.hidden = true;
    if (a.length < 6) return show(t('sec_pw_short'));
    if (a !== b) return show(t('sec_pw_mismatch'));
    busy(form.querySelector('button[type="submit"]'), async () => {
      const { error } = await supabase.auth.updateUser({ password: a });
      if (error) return show(error.message);
      form.reset(); toast(t('sec_pw_saved'));
    });
  };
}

/* ---------- Perangkat Terhubung ---------- */
async function registerCurrentDevice() {
  try {
    const ua = navigator.userAgent || '';
    await supabase.rpc('register_device', { p_device_info: deviceLabel(ua), p_user_agent: ua });
  } catch (_) { /* diamkan */ }
}

async function renderDevices() {
  main.innerHTML = `<section class="screen stack-lg">
    <div class="card" style="text-align:center;padding:24px"><p class="muted">${T('loading')}</p></div>
  </section>`;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    main.innerHTML = `<section class="screen"><div class="card">${empty('circle-alert', t('session_expired'), '')}</div></section>`;
    return;
  }

  const { data, error } = await supabase
    .from('user_devices')
    .select('*')
    .eq('user_id', user.id)
    .order('last_active_at', { ascending: false });

  if (error) {
    main.innerHTML = `<section class="screen"><div class="card">${empty('circle-alert', t('load_failed'), error.message)}</div></section>`;
    return;
  }

  const devices = data || [];
  const uaNow = navigator.userAgent || '';
  const currentDevice = devices.find((d) => d.user_agent === uaNow);

  const deviceRow = (d) => {
    const isCurrent = currentDevice && d.id === currentDevice.id;
    const iconName = /Android|iPhone|iPad|iPod/i.test(d.user_agent) ? 'smartphone' : 'monitor';
    const iconBg = isCurrent ? 'background:rgba(34,197,94,.1);color:#22c55e' : 'background:rgba(107,114,128,.1);color:#6b7280';
    return `<div class="crow" style="padding:14px 4px;border-bottom:1px solid rgba(0,0,0,.06);display:flex;gap:12px;align-items:center">
      <span style="flex-shrink:0;width:38px;height:38px;display:flex;align-items:center;justify-content:center;border-radius:50%;${iconBg}">
        <i data-lucide="${iconName}" aria-hidden="true"></i>
      </span>
      <div style="flex:1;min-width:0">
        <strong style="display:block;font-size:14px;color:#111827">
          ${esc(d.device_info || 'Unknown')}
          ${isCurrent ? `<span class="badge badge-active" style="margin-left:6px;border-radius:8px">${T('device_this')}</span>` : ''}
        </strong>
        <small style="display:block;margin-top:4px;font-size:12px;color:#9ca3af">
          ${T('device_last_active')} ${esc(fmtRelative(d.last_active_at))}
        </small>
      </div>
      ${!isCurrent ? `<button type="button" class="btn btn-outline btn-sm" data-del-device="${d.id}" style="flex-shrink:0;color:#dc2626;border-color:rgba(220,38,38,.3)">${T('remove')}</button>` : ''}
    </div>`;
  };

  main.innerHTML = `<section class="screen stack-lg">
    <p class="muted">${T('devices_intro')}</p>
    <div class="card">
      ${devices.length ? devices.map(deviceRow).join('') : `<p class="muted" style="padding:12px 0">${T('devices_empty')}</p>`}
    </div>
  </section>`;

  icons();

  main.querySelectorAll('[data-del-device]').forEach((btn) => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-del-device');
      confirmSheet({
        title: t('device_remove_q'),
        text: t('device_remove_desc'),
        okLabel: t('remove'),
        onConfirm: (c, b) => busy(b, async () => {
          const { error } = await supabase.rpc('revoke_device', { p_device_id: id });
          if (error) return fail(error);
          c.close();
          toast(t('device_removed'));
          renderDevices();
        }),
      });
    };
  });
}

/* Visibilitas data di kartu darurat. */
const VIS_KEYS = ['medical', 'address', 'contacts'];
const visStoreKey = () => 'exigent_visibility_' + session.user.id;
function loadVis() {
  const all = { medical: true, address: true, contacts: true };
  try { const v = JSON.parse(localStorage.getItem(visStoreKey()) || 'null'); if (v) VIS_KEYS.forEach((k) => { all[k] = v[k] !== false; }); } catch (_) { /* abaikan */ }
  return all;
}
const saveVis = (v) => { try { localStorage.setItem(visStoreKey(), JSON.stringify(v)); } catch (_) { /* abaikan */ } };
const trow = (key, title, desc) => `<button type="button" class="trow" role="switch" aria-checked="true" data-vis="${key}">
  <span class="mrow-tx"><strong>${esc(title)}</strong><small>${esc(desc)}</small></span><span class="switch" aria-hidden="true"></span></button>`;

function renderPermissions() {
  main.innerHTML = `<section class="screen stack-lg">
    <div><p class="sec-label">${T('perm_vis_title')}</p>
      <div class="card menu">${trow('all', t('perm_all'), t('perm_all_desc'))}</div>
      <div class="card menu" style="margin-top:12px">
        ${trow('medical', t('perm_medical'), t('perm_medical_desc'))}
        ${trow('address', t('perm_address'), t('perm_address_desc'))}
        ${trow('contacts', t('perm_contacts'), t('perm_contacts_desc'))}
      </div></div>
    <div><p class="sec-label">${T('perm_device_title')}</p>
      <div class="card menu">
        <div class="crow" style="padding:16px 20px">
          <div><strong>${T('perm_geo')}</strong><p class="muted small">${T('perm_geo_desc')}</p></div>
          <span id="perm-geo" class="badge">${T('perm_checking')}</span>
        </div>
      </div>
      <div class="card menu" style="margin-top:12px">
        <div class="crow" style="padding:16px 20px">
          <div><strong>${T('perm_nfc')}</strong><p class="muted small">${T('perm_nfc_desc')}</p></div>
          <span id="perm-nfc" class="badge">${T('perm_checking')}</span>
        </div>
      </div>
      <div class="card menu" style="margin-top:12px">
        <div class="crow" style="padding:16px 20px">
          <div><strong>${lang === 'id' ? 'Mikrofon' : 'Microphone'}</strong><p class="muted small">${lang === 'id' ? 'Untuk kirim voice note di masukan' : 'For sending voice notes in feedback'}</p></div>
          <span id="perm-mic" class="badge">${T('perm_checking')}</span>
        </div>
      </div>
      <p class="muted small" style="margin-top:12px">${T('perm_hint')}</p></div>

    <div><p class="sec-label">${lang === 'id' ? 'Pengaturan Lanjutan' : 'Advanced Settings'}</p>
      <div class="card menu">
        <div class="crow" style="padding:16px 20px;gap:12px;align-items:center;display:flex">
          <span class="mrow-ic" style="flex-shrink:0"><i data-lucide="fingerprint" aria-hidden="true"></i></span>
          <div style="flex:1;min-width:0">
            <strong style="display:block">User ID</strong>
            <p class="muted" style="font-family:monospace;font-size:.6875rem;word-break:break-all;margin:4px 0 0;line-height:1.4">${esc(session.user.id)}</p>
          </div>
          <button type="button" class="icon-btn" id="copy-uuid" aria-label="${lang === 'id' ? 'Salin User ID' : 'Copy User ID'}" style="flex-shrink:0">
            <i data-lucide="copy" aria-hidden="true"></i>
          </button>
        </div>
      </div>
      <p class="muted small" style="margin-top:12px">${lang === 'id' ? 'User ID adalah identitas unik akunmu. Jangan bagikan ke orang lain kecuali untuk keperluan dukungan teknis.' : "User ID is your account's unique identifier. Do not share with others except for technical support purposes."}</p>
    </div>
  </section>`;

  const vis = loadVis();
  const rows = [...main.querySelectorAll('.trow[data-vis]')];
  const paint = () => rows.forEach((r) => {
    const k = r.dataset.vis;
    r.setAttribute('aria-checked', String(k === 'all' ? VIS_KEYS.every((x) => vis[x]) : vis[k]));
  });
  rows.forEach((r) => (r.onclick = () => {
    const k = r.dataset.vis;
    if (k === 'all') { const on = !VIS_KEYS.every((x) => vis[x]); VIS_KEYS.forEach((x) => { vis[x] = on; }); } else vis[k] = !vis[k];
    saveVis(vis); paint();
  }));
  paint();

  const geo = $('perm-geo'), nfc = $('perm-nfc'), mic = $('perm-mic');
  const MAP = { granted: ['perm_granted', 'badge-active'], denied: ['perm_denied', 'badge-emergency'], prompt: ['perm_prompt', 'badge-inactive'] };
  const setBadge = (el, st) => { if (!el || !el.isConnected) return; const [k, cls] = MAP[st] || ['perm_unknown', '']; el.textContent = t(k); el.className = 'badge ' + cls; };

  watchPermission('geolocation', (st) => setBadge(geo, st));
  watchPermission('nfc', (st) => setBadge(nfc, st));

  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: 'microphone' }).then((status) => {
      setBadge(mic, status.state);
      status.onchange = () => setBadge(mic, status.state);
    }).catch(() => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        if (mic && mic.isConnected) {
          mic.textContent = lang === 'id' ? 'Didukung' : 'Supported';
          mic.className = 'badge badge-inactive';
        }
      } else {
        if (mic && mic.isConnected) {
          mic.textContent = lang === 'id' ? 'Tidak didukung' : 'Not supported';
          mic.className = 'badge badge-emergency';
        }
      }
    });
  } else {
    if (mic && mic.isConnected) {
      mic.textContent = lang === 'id' ? 'Tidak didukung' : 'Not supported';
      mic.className = 'badge badge-emergency';
    }
  }

  const copyBtn = $('copy-uuid');
  if (copyBtn) {
    copyBtn.onclick = () => {
      const uuid = session.user.id;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(uuid).then(
          () => toast(lang === 'id' ? 'User ID disalin' : 'User ID copied'),
          () => toast(lang === 'id' ? 'Gagal menyalin' : 'Copy failed')
        );
      } else {
        toast(lang === 'id' ? 'Salin manual dari teks' : 'Copy manually');
      }
    };
  }
}

/* Bantuan & Masukan */
const helpHref = (id) => (id === FAQ_ROOT ? '#/help' : '#/help/' + encodeURIComponent(id));
const helpAction = (a) => {
  const label = esc(pick(a.label));
  if (a.type === 'cs') return `<button type="button" class="btn btn-secondary btn-block" data-cs>${label}</button>`;
  const href = a.type === 'go' ? '#' + a.to : a.href;
  return href ? `<a class="btn btn-secondary btn-block" href="${esc(href)}">${label}</a>` : '';
};

function renderHelp(nodeId) {
  const id = nodeId || FAQ_ROOT, node = FAQ_TREE[id];
  if (!node) {
    main.innerHTML = `<section class="screen"><div class="card">${empty('circle-help', t('help_missing'), '', `<a class="btn btn-secondary" href="#/help">${T('help_back')}</a>`)}</div></section>`;
    return;
  }
  const paras = pick(node.answer) || [], steps = pick(node.steps) || [];
  const body = node.options
    ? `<nav class="menu-stack" aria-label="${esc(pick(node.title))}">${node.options.map((o) => `<div class="card menu"><a class="mrow plain" href="${helpHref(o.next)}">
        <span class="mrow-tx"><strong>${esc(pick(o.label))}</strong></span><i data-lucide="chevron-right" class="mrow-go" aria-hidden="true"></i></a></div>`).join('')}</nav>`
    : `<div class="card stack-lg">${paras.map((p) => `<p>${esc(p)}</p>`).join('')}
        ${steps.length ? `<ol class="steps">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
        ${(node.actions || []).map(helpAction).join('')}</div>`;
  main.innerHTML = `<section class="screen stack-lg">
    <h2 class="sec-title">${esc(pick(node.title))}</h2>
    ${body}
    <div class="card menu">${row({ href: '/feedback.html', icon: 'message-square-plus', label: lang === 'id' ? 'Kirim Masukan' : 'Send Feedback', sub: lang === 'id' ? 'Ide, saran, atau laporan masalah' : 'Ideas, suggestions, or bug reports' })}</div>
    <div class="card menu">${row({ tag: 'button', id: 'help-cs', icon: 'headset', label: t('help_contact_q'), sub: t('menu_cs') })}</div>
  </section>`;
  main.querySelectorAll('[data-cs], #help-cs').forEach((b) => (b.onclick = openCs));
}

function renderLegal() {
  main.innerHTML = `<section class="screen stack-lg"><p class="muted">${T('legal_desc')}</p>
    <nav class="menu-stack" aria-label="${T('menu_legal')}">
      <div class="card menu">${row({ href: '/privacy-policy.html', icon: 'file-text', label: t('legal_privacy') })}</div>
      <div class="card menu">${row({ href: '/terms.html', icon: 'scale', label: t('legal_terms') })}</div>
    </nav></section>`;
}

function renderAbout() {
  main.innerHTML = `<section class="screen stack-lg"><div class="card about">
    <span class="about-logo"><i data-lucide="heart-pulse" aria-hidden="true"></i></span>
    <h2>Exigent-One</h2><p class="about-tag">${T('about_tagline')}</p><p class="muted">${T('about_desc')}</p>
  </div><p class="muted small center">© 2026 Proximate Labs. All rights reserved.</p></section>`;
}

/* ---------- Bottom sheet ---------- */
const FLAGS = {
  id: '<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="20" fill="#E70011"/><rect y="20" width="40" height="20" fill="#fff"/></svg>',
  en: '<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" fill="#012169"/><path d="M0 0L40 40M40 0L0 40" stroke="#fff" stroke-width="7"/><path d="M0 0L40 40M40 0L0 40" stroke="#C8102E" stroke-width="2.6"/><path d="M20 0V40M0 20H40" stroke="#fff" stroke-width="11"/><path d="M20 0V40M0 20H40" stroke="#C8102E" stroke-width="6.4"/></svg>',
  ja: '<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" fill="#fff"/><circle cx="20" cy="20" r="12" fill="#BC002D"/></svg>',
};

function applyLang(code) {
  lang = code; setLang(code);
  document.documentElement.lang = code;
  applyNavLabels(t);
  $('bell').setAttribute('aria-label', t('notif_title'));
  render();
  toast(t('lang_changed'));
  window.dispatchEvent(new Event('exigent:lang-changed'));
}

function openLang() {
  let sel = lang;
  const langOpt = (code, meta) => `<button type="button" class="opt" role="radio" aria-checked="${code === lang}" data-lang="${code}" tabindex="${code === lang ? 0 : -1}">
    <span class="opt-flag">${FLAGS[meta.flag] || ''}</span>
    <span class="opt-tx"><strong>${meta.name}</strong><small>${meta.sub}</small></span>
    <span class="radio" aria-hidden="true"></span>
  </button>`;
  const optsHtml = Object.entries(LANGUAGES).map(([code, meta]) => langOpt(code, meta)).join('');

  openSheet({
    title: t('lang_pick_title'),
    closeLabel: t('close'),
    body: `<div class="opts" role="radiogroup" aria-label="${T('lang_pick_title')}">${optsHtml}</div>`,
    actions: [
      { label: t('cancel'), variant: 'outline', onClick: (c) => c.close() },
      { label: t('save'), variant: 'secondary', onClick: (c) => { c.close(); if (sel !== lang) applyLang(sel); } },
    ],
    onOpen: (c) => {
      const radios = [...c.body.querySelectorAll('[role="radio"]')];
      const choose = (r, focus) => {
        sel = r.dataset.lang;
        radios.forEach((x) => { const on = x === r; x.setAttribute('aria-checked', String(on)); x.tabIndex = on ? 0 : -1; });
        if (focus) r.focus();
      };
      radios.forEach((r, i) => {
        r.onclick = () => choose(r);
        r.onkeydown = (e) => {
          const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
          if (!step) return;
          e.preventDefault(); choose(radios[(i + step + radios.length) % radios.length], true);
        };
      });
    },
  });
}

function openCs() {
  const wa = CS_CONTACT.whatsapp, tg = CS_CONTACT.telegram;
  const waHref = CS_CONTACT.whatsappLink || `https://wa.me/${String(wa.number).replace(/\D/g, '')}?text=${encodeURIComponent(pick(wa.message))}`;
  const tgUser = String(tg.username).replace(/^@/, '');
  const tgHref = CS_CONTACT.telegramLink || `https://t.me/${tgUser}`;
  const opt = (href, cls, icon, name, sub) => `<a class="opt" href="${esc(href)}" target="_blank" rel="noopener noreferrer">
    <span class="chip-ic ${cls}"><i data-lucide="${icon}" aria-hidden="true"></i></span>
    <span class="opt-tx"><strong>${name}</strong><small>${esc(sub)}</small></span><i data-lucide="external-link" class="mrow-go" aria-hidden="true"></i></a>`;
  openSheet({
    title: t('menu_cs'),
    closeLabel: t('close'),
    body: `<p class="muted sheet-text">${T('cs_desc')}</p><div class="opts">
      ${opt(waHref, 'wa', 'message-circle', 'WhatsApp', wa.display)}${opt(tgHref, 'tg', 'send', 'Telegram', tg.display || '@' + tgUser)}</div>`,
    actions: [{ label: t('close'), variant: 'outline', onClick: (c) => c.close() }],
  });
}

/* ---------- Notifikasi ---------- */
async function loadNotifCount() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null);
    if (error) throw error;
    const dot = $('bell-dot');
    if (dot) dot.hidden = !count;
  } catch (_) { /* diamkan */ }
}

function notifItemHtml(n) {
  const ic = n.type === 'security' ? 'shield-alert'
           : n.type === 'policy' ? 'file-text'
           : n.type === 'card' ? 'credit-card'
           : 'bell';
  const bg = n.type === 'security' ? 'background:rgba(220,38,38,.1);color:#dc2626'
           : n.type === 'policy' ? 'background:rgba(37,99,235,.1);color:#2563eb'
           : 'background:rgba(107,114,128,.1);color:#6b7280';
  const when = (() => { try { return new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(n.created_at)); } catch (_) { return ''; } })();
  const unread = !n.read_at;
  const link = n.data && n.data.link;
  const inner = `
    <span style="flex-shrink:0;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:50%;${bg}">
      <i data-lucide="${ic}" aria-hidden="true"></i>
    </span>
    <div style="flex:1;min-width:0">
      <strong style="display:block;font-size:14px;color:#111827">${esc(t(n.title))}</strong>
      ${n.body ? `<p style="margin:4px 0 0;font-size:13px;color:#4b5563;line-height:1.5">${esc(tr(n.body, n.data || {}))}</p>` : ''}
      <small style="display:block;margin-top:6px;font-size:12px;color:#9ca3af">${esc(when)}</small>
    </div>
    ${link ? '<i data-lucide="chevron-right" aria-hidden="true" style="flex-shrink:0;align-self:center;color:#9ca3af"></i>' : ''}`;
  const rowInner = `<div style="display:flex;gap:12px;padding:14px 4px;border-bottom:1px solid rgba(0,0,0,.06);${unread ? 'background:rgba(37,99,235,.03)' : ''}">${inner}</div>`;
  return link
    ? `<button type="button" data-notif-link="${esc(link)}" style="width:100%;text-align:left;border:none;background:transparent;font-family:inherit;cursor:pointer;padding:0;display:block">${rowInner}</button>`
    : rowInner;
}

function openNotifs() {
  openSheet({
    title: t('notif_title'),
    closeLabel: t('close'),
    body: `<div style="padding:24px 0;text-align:center"><p class="muted">${T('loading')}</p></div>`,
    actions: [{ label: t('close'), variant: 'outline', onClick: (c) => c.close() }],
    onOpen: async (c) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { c.body.innerHTML = empty('circle-alert', t('session_expired'), ''); icons(); return; }

        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        const items = data || [];
        if (!items.length) {
          c.body.innerHTML = empty('bell-off', t('notif_empty_title'), t('notif_empty_desc'));
          icons();
          return;
        }
        c.body.innerHTML = `<div>${items.map(notifItemHtml).join('')}</div>`;
        icons();

        c.body.querySelectorAll('[data-notif-link]').forEach((btn) => {
          btn.onclick = () => {
            const link = btn.getAttribute('data-notif-link');
            c.close();
            setTimeout(() => {
              if (link.startsWith('#')) location.hash = link;
              else location.href = link;
            }, 220);
          };
        });

        await supabase.rpc('mark_all_notifications_read');
        const dot = $('bell-dot');
        if (dot) dot.hidden = true;
      } catch (e) {
        c.body.innerHTML = empty('circle-alert', t('load_failed'), e.message || '');
        icons();
      }
    },
  });
}

function confirmSheet({ title, text, okLabel, danger = true, onConfirm }) {
  openSheet({
    title,
    closeLabel: t('close'),
    body: `<p class="muted sheet-text">${esc(text)}</p>`,
    actions: [
      { label: t('cancel'), variant: 'outline', onClick: (c) => c.close() },
      { label: okLabel, variant: danger ? 'danger' : 'secondary', onClick: (c, btn) => onConfirm(c, btn) },
    ],
  });
}

const askLogout = () => confirmSheet({
  title: t('logout_q'), text: t('logout_desc'), okLabel: t('logout'),
  onConfirm: (c, btn) => busy(btn, async () => {
    try {
      clearCachedProfile();
      await signOut();
    } catch (e) { fail(e); }
  }),
});

/* ---------- Hapus Akun ---------- */
const askDeleteAccount = () => {
  const email = String(session.user.email || '').toLowerCase();
  const warnIcon = '<span style="display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;background:rgba(220,38,38,.1);color:#dc2626;margin-bottom:12px"><i data-lucide="alert-triangle" aria-hidden="true"></i></span>';
  const items = [t('delete_item_medical'), t('delete_item_cards'), t('delete_item_events'), t('delete_item_account')];
  openSheet({
    title: t('delete_account_title'),
    closeLabel: t('close'),
    body: `<div style="text-align:center">${warnIcon}</div>
      <p class="muted sheet-text" style="text-align:center">${T('delete_account_desc')}</p>
      <ul style="color:#4b5563;font-size:14px;line-height:1.8;padding-left:20px;margin:12px 0">
        ${items.map((s) => `<li>${esc(s)}</li>`).join('')}
      </ul>
      <p class="muted sheet-text">${T('delete_confirm_hint')}</p>
      <input type="email" class="input" id="del-email" placeholder="${esc(email)}" autocomplete="off" style="width:100%;margin-top:8px">
      <p id="del-msg" class="msg" role="alert" hidden style="margin-top:8px"></p>`,
    actions: [
      { label: t('cancel'), variant: 'outline', onClick: (c) => c.close() },
      { label: t('delete_account'), variant: 'danger', onClick: (c, btn) => {
        const input = c.body.querySelector('#del-email');
        const msg = c.body.querySelector('#del-msg');
        const typed = String(input.value || '').trim().toLowerCase();
        msg.hidden = true;
        if (!typed) { msg.textContent = t('delete_enter_email'); msg.hidden = false; return; }
        if (typed !== email) { msg.textContent = t('delete_email_mismatch'); msg.hidden = false; return; }
        busy(btn, async () => {
          const { error } = await supabase.rpc('delete_user_account');
          if (error) { msg.textContent = t('failed') + error.message; msg.hidden = false; return; }
          c.close();
          try { clearCachedProfile(); await signOut(); } catch (_) { /* abaikan */ }
          toast(t('delete_success'));
          setTimeout(() => location.replace('/'), 900);
        });
      }}
    ],
    onOpen: () => icons(),
  });
};

const askOthers = () => confirmSheet({
  title: t('sec_others_q'), text: t('sec_others_body'), okLabel: t('sec_others_ok'),
  onConfirm: (c, btn) => busy(btn, async () => {
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    if (error) return fail(error);
    c.close(); toast(t('sec_others_done'));
  }),
});

async function setCardActive(active) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail({ message: t('session_expired') });
  const { error } = await supabase
    .from('cards')
    .update({ is_active: active })
    .eq('id', card.id)
    .eq('owner_id', user.id);
  if (error) return fail(error);
  await loadData(); render(); toast(t('card_updated'));
}
function onCardRow(e) {
  if (!card) return;
  if (!card.is_active) { busy(e.currentTarget, () => setCardActive(true)); return; }
  confirmSheet({
    title: t('deact_q'), text: t('deact_desc'), okLabel: t('set_deactivate'),
    onConfirm: (c, btn) => busy(btn, async () => { await setCardActive(false); c.close(); }),
  });
}

/* ---------- Router (hash) ---------- */
const ROUTES = {
  '/': { title: () => t('acct_title'), render: renderHome, root: true },
  '/security': { title: () => t('menu_security'), render: renderSecurity, parent: '/' },
  '/security/password': { title: () => t('sec_change_pw'), render: renderChangePassword, parent: '/security' },
  '/security/devices': { title: () => t('sec_devices'), render: renderDevices, parent: '/security' },
  '/settings': { title: () => t('menu_settings'), render: renderSettings, parent: '/' },
  '/settings/gmail': { title: () => t('set_gmail'), render: renderGmail, parent: '/settings' },
  '/settings/idcard': { title: () => t('set_idcard'), render: renderIdCard, parent: '/settings' },
  '/settings/permissions': { title: () => t('set_permissions'), render: renderPermissions, parent: '/settings' },
  '/help': { title: () => (lang === 'id' ? 'Bantuan & Masukan' : 'Help & Feedback'), render: renderHelp, parent: '/' },
  '/legal': { title: () => t('menu_legal'), render: renderLegal, parent: '/' },
  '/about': { title: () => t('menu_about'), render: renderAbout, parent: '/' },
};
const currentPath = () => location.hash.replace(/^#/, '') || '/';
function resolve(path) {
  if (ROUTES[path]) return { route: ROUTES[path], path };
  if (path.startsWith('/help/')) {
    let node = '';
    try { node = decodeURIComponent(path.slice(6)); } catch (_) { /* id rusak */ }
    return { route: ROUTES['/help'], path, node };
  }
  return { route: ROUTES['/'], path: '/', unknown: true };
}

const stack = [];
let replacing = false;
function goBack(route) {
  if (stack.length > 1) { history.back(); return; }
  replacing = true;
  location.replace('#' + (route.parent || '/'));
}

function renderAppbar(route) {
  $('appbar-lead').innerHTML = route.root
    ? `<h1 class="appbar-title">${esc(route.title())}</h1>`
    : `<button type="button" class="icon-btn" id="back" aria-label="${T('back')}"><i data-lucide="chevron-left" aria-hidden="true"></i></button><h1 class="appbar-title sub">${esc(route.title())}</h1>`;
  const back = $('back');
  if (back) back.onclick = () => goBack(route);
}

function render() {
  if (!session) return;
  const { route, node } = resolve(currentPath());
  renderAppbar(route);
  route.render(node);
  document.title = `${route.title()} · Emergency Card`;
  icons();
}

function onRoute() {
  const r = resolve(currentPath());
  if (r.unknown) history.replaceState(null, '', '#/');
  const path = r.path;
  if (replacing) { replacing = false; stack[Math.max(stack.length - 1, 0)] = path; }
  else if (stack.length > 1 && stack[stack.length - 2] === path) stack.pop();
  else if (stack[stack.length - 1] !== path) stack.push(path);
  render();
  window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
  loadNotifCount();
}

function validateFaq() {
  if (!FAQ_TREE[FAQ_ROOT]) console.warn(`[help-config] node awal "${FAQ_ROOT}" tidak ada`);
  Object.entries(FAQ_TREE).forEach(([id, n]) => (n.options || []).forEach((o) => {
    if (!FAQ_TREE[o.next]) console.warn(`[help-config] "${id}" → next "${o.next}" tidak ditemukan`);
  }));
}

/* ---------- Mulai ---------- */
document.documentElement.lang = lang;
applyNavLabels(t);
$('bell').setAttribute('aria-label', t('notif_title'));
$('bell').onclick = openNotifs;
renderAppbar(resolve(currentPath()).route);
icons();
validateFaq();

requireSession().then(async (s) => {
  if (!s) return;
  session = s;

  onRoute();

  loadData().then(() => {
    if (currentPath() === '/') {
      renderHome();
      icons();
    }
  });

  loadNotifCount();
  registerCurrentDevice();
  window.addEventListener('hashchange', onRoute);
});
