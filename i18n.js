// ============================================================================
// i18n — Sistem multi-bahasa
// ----------------------------------------------------------------------------
// Cara nambah bahasa baru:
//   1. Buat file baru di /locales/  (contoh: /locales/ja.js)
//   2. Copy struktur dari /locales/en.js
//   3. Terjemahkan semua nilainya
//   4. Import di bawah + tambahkan ke objek LANGUAGES dan STRINGS
//   5. Bahasa baru otomatis muncul di menu Pilih Bahasa dan ikut auto-detect.
// ============================================================================

// ============================================================================
// Anti long-press context menu (Chrome Android tidak hiraukan -webkit-touch-callout)
// ============================================================================
if (typeof document !== 'undefined' && !window.__exigentCtxBlock) {
  window.__exigentCtxBlock = true;
  document.addEventListener('contextmenu', (e) => {
    const el = e.target;
    // Kecualikan input, textarea, contenteditable
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
    // Kecualikan elemen yang memang boleh disalin
    if (el && el.closest && el.closest('.big, .url, .selectable')) return;
    e.preventDefault();
  }, { capture: true });
}

import en from './locales/en.js';
import id from './locales/id.js';
import ja from './locales/ja.js';

// Daftar bahasa yang tersedia. Urutan menentukan urutan di menu.
export const LANGUAGES = {
  id: { name: 'Bahasa Indonesia', sub: 'Indonesian', flag: 'id' },
  en: { name: 'English',          sub: 'Inggris',    flag: 'en' },
  ja: { name: '日本語',            sub: 'Japanese',  flag: 'ja' },
};

// Peta semua terjemahan
export const STRINGS = { en, id, ja };

// Kode bahasa default (dipakai kalau tidak ada pilihan tersimpan & bahasa perangkat tidak didukung)
const DEFAULT_LANG = 'en';

// ----------------------------------------------------------------------------
// Deteksi bahasa perangkat
// 'id-ID' → 'id'. Urutan navigator.languages = urutan prioritas pengguna,
// jadi bahasa pertama yang didukung yang menang.
// ----------------------------------------------------------------------------
export function detectDeviceLang() {
  const candidates = [...(navigator.languages || []), navigator.language];
  for (const c of candidates) {
    const code = String(c || '').slice(0, 2).toLowerCase();
    if (STRINGS[code]) return code;
  }
  return DEFAULT_LANG;
}

// ----------------------------------------------------------------------------
// Penyimpanan & pengambilan bahasa
// Prioritas: pilihan tersimpan (localStorage) → bahasa perangkat → 'en'
// ----------------------------------------------------------------------------
export function getLang() {
  try {
    const stored = localStorage.getItem('exigent_lang');
    if (STRINGS[stored]) return stored;
  } catch (_) { /* storage diblokir, lanjut ke deteksi perangkat */ }
  return detectDeviceLang();
}

export function setLang(l) {
  if (!STRINGS[l]) return;
  try { localStorage.setItem('exigent_lang', l); } catch (_) { /* storage diblokir */ }
}

// ----------------------------------------------------------------------------
// Pembuat fungsi terjemah: t('key') atau t('key', { name: 'Budi' }) untuk {name}.
// Urutan fallback: bahasa aktif → English → key itu sendiri.
// ----------------------------------------------------------------------------
export function createT(lang = getLang()) {
  return (key, vars) => {
    let s = (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    return s;
  };
}

// ----------------------------------------------------------------------------
// Isi label navigasi: <span data-nav-label="dashboard|medical|account">
// ----------------------------------------------------------------------------
export function applyNavLabels(translate) {
  document.querySelectorAll('[data-nav-label]').forEach((el) => {
    el.textContent = translate('nav_' + el.dataset.navLabel);
  });
}

// ----------------------------------------------------------------------------
// Terjemahkan elemen statis di HTML:
//   [data-i18n]       → textContent
//   [data-i18n-ph]    → placeholder
//   [data-i18n-aria]  → aria-label
//   [data-i18n-title] → title
// Kalau key tidak ada di locale mana pun, teks asli di HTML dibiarkan (fallback).
// ----------------------------------------------------------------------------
export function applyI18n(translate) {
  const apply = (attr, fn) => {
    document.querySelectorAll(`[${attr}]`).forEach((el) => {
      const key = el.getAttribute(attr);
      const val = translate(key);
      if (val && val !== key) fn(el, val);
    });
  };
  apply('data-i18n',       (el, v) => { el.textContent = v; });
  apply('data-i18n-ph',    (el, v) => el.setAttribute('placeholder', v));
  apply('data-i18n-aria',  (el, v) => el.setAttribute('aria-label', v));
  apply('data-i18n-title', (el, v) => el.setAttribute('title', v));
  document.documentElement.lang = getLang();
}
