// i18n ringan untuk Dashboard & Profil. Default: en (English).
// Halaman lain (landing, login, register, kartu publik, medical search)
// belum diterjemahkan — masih berbahasa Indonesia.
export const STRINGS = {
  en: {
    nav_dashboard: 'Dashboard', nav_medical: 'Medical', nav_profile: 'Profile',
    dash_title: 'Dashboard', card_status: 'Card status', active: 'Active', inactive: 'Inactive',
    card_id: 'Card ID', card_url: 'Card URL', copy_url: 'Copy URL', view_card: 'View card',
    qr_title: 'QR Code', download_qr: 'Download QR',
    nfc_title: 'Write to NFC Card', nfc_desc: 'Tap your phone to a blank NFC card, then press this button.',
    write_nfc: 'Write to NFC', nfc_registered: 'ℹ️ This card is already registered on NFC.',
    no_card_title: "You don't have a card yet", no_card_desc: 'Create a card to get a Card ID and URL to write to NFC.',
    create_card: 'Create card',
    profile_title: 'Profile', account_label: 'Account',
    deactivate_card: 'Deactivate card', activate_card: 'Activate card',
    language_label: 'Language', logout: 'Log out',
    footer_emergency: 'In a critical medical emergency, call 112 immediately.',
    footer_privacy: 'Privacy Policy', footer_terms: 'Terms & Conditions', footer_help: 'Help',
  },
  id: {
    nav_dashboard: 'Dashboard', nav_medical: 'Medis', nav_profile: 'Profil',
    dash_title: 'Dashboard', card_status: 'Status kartu', active: 'Aktif', inactive: 'Nonaktif',
    card_id: 'Card ID', card_url: 'URL kartu', copy_url: 'Salin URL', view_card: 'Lihat kartu',
    qr_title: 'QR Code', download_qr: 'Unduh QR',
    nfc_title: 'Tulis ke Kartu NFC', nfc_desc: 'Tempelkan HP ke kartu NFC kosong, lalu tekan tombol ini.',
    write_nfc: 'Tulis ke NFC', nfc_registered: 'ℹ️ Card NFC ini sudah terdaftar.',
    no_card_title: 'Kamu belum punya kartu', no_card_desc: 'Buat kartu untuk mendapat Card ID dan URL yang ditulis ke NFC.',
    create_card: 'Buat kartu',
    profile_title: 'Profil', account_label: 'Akun',
    deactivate_card: 'Nonaktifkan kartu', activate_card: 'Aktifkan kartu',
    language_label: 'Bahasa', logout: 'Keluar',
    footer_emergency: 'Dalam keadaan darurat medis kritis, segera hubungi 112.',
    footer_privacy: 'Kebijakan Privasi', footer_terms: 'Syarat & Ketentuan', footer_help: 'Bantuan',
  },
};

export function getLang() {
  try { return localStorage.getItem('exigent_lang') || 'en'; } catch (_) { return 'en'; }
}
export function setLang(l) {
  try { localStorage.setItem('exigent_lang', l); } catch (_) { /* abaikan jika storage diblokir */ }
}
