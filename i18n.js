// ============================================================================
// i18n — Sistem multi-bahasa
// ----------------------------------------------------------------------------
// Cara nambah bahasa baru:
//   1. Buat file baru di /locales/  (contoh: /locales/ja.js)
//   2. Copy struktur dari /locales/en.js
//   3. Terjemahkan semua nilainya
//   4. Import di bawah + tambahkan ke objek LANGUAGES dan STRINGS
//   5. Bahasa baru otomatis muncul di menu Pilih Bahasa.
// ============================================================================

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

// Kode bahasa default
const DEFAULT_LANG = 'en';

// ----------------------------------------------------------------------------
// Fungsi penyimpanan & pengambilan bahasa
// ----------------------------------------------------------------------------
export function getLang() {
  try {
    const stored = localStorage.getItem('exigent_lang');
    return STRINGS[stored] ? stored : DEFAULT_LANG;
  } catch (_) {
    return DEFAULT_LANG;
  }
}

export function setLang(l) {
  if (!STRINGS[l]) return;
  try { localStorage.setItem('exigent_lang', l); } catch (_) { /* storage diblokir */ }
}

// ----------------------------------------------------------------------------
// Isi label navigasi: <span data-nav-label="dashboard|medical|account">
// ----------------------------------------------------------------------------
export function applyNavLabels(translate) {
  document.querySelectorAll('[data-nav-label]').forEach((el) => {
    el.textContent = translate('nav_' + el.dataset.navLabel);
  });
}
