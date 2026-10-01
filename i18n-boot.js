// Auto-terjemahkan halaman statis saat dimuat.
// Pasang di tiap halaman HTML:  <script type="module" src="/i18n-boot.js"></script>
import { getLang, createT, applyI18n } from './i18n.js';

const t = createT(getLang());
applyI18n(t);

// Account.js memicu event ini setelah pengguna mengganti bahasa.
// Reload supaya semua teks (HTML statis maupun yang dibuat JS) dirender ulang.
window.addEventListener('exigent:lang-changed', () => location.reload());
