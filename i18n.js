// i18n ringan untuk Dashboard & Halaman Akun. Default: en (English).
// Halaman lain (landing, login, register, kartu publik, medical search)
// belum diterjemahkan — masih berbahasa Indonesia.
// Isi Pusat Bantuan (FAQ) ada di help-config.js, kontak CS di cs-config.js.
export const STRINGS = {
  en: {
    // Navigasi bawah
    nav_dashboard: 'Dashboard', nav_medical: 'Medical', nav_account: 'Account',
    // Dashboard
    dash_title: 'Dashboard', card_status: 'Card status', active: 'Active', inactive: 'Inactive',
    card_id: 'Card ID', card_url: 'Card URL', copy_url: 'Copy URL', view_card: 'View card',
    qr_title: 'QR Code', download_qr: 'Download QR',
    nfc_title: 'Write to NFC Card', nfc_desc: 'Tap your phone to a blank NFC card, then press this button.',
    write_nfc: 'Write to NFC', nfc_registered: 'This card is already registered on NFC.',
    no_card_title: "You don't have a card yet", no_card_desc: 'Create a card to get a Card ID and URL to write to NFC.',
    create_card: 'Create card',

    // Umum (Halaman Akun)
    acct_title: 'Account', notif_title: 'Notifications',
    notif_empty_title: 'No notifications yet', notif_empty_desc: 'Important updates about your card will appear here.',
    back: 'Back', close: 'Close', cancel: 'Cancel', retry: 'Try again', failed: 'Failed: ', logout: 'Log out',

    // Menu utama
    greet: 'Hi, {name}!', greet_anon: 'Hi there!', greet_desc: 'Manage your emergency data and card privacy here.',
    menu_security: 'Security', menu_settings: 'Settings', menu_help: 'Help Center',
    menu_cs: 'Contact Exigent Support', menu_legal: 'Legal', menu_about: 'About Exigent-One', menu_logout: 'Log out',

    // Pengaturan
    set_gmail: 'Gmail Account Info', set_idcard: 'ID Card Info', set_language: 'Language Settings',
    set_permissions: 'Permissions & Advanced Settings', set_deactivate: 'Deactivate Card', set_activate: 'Activate Card',
    set_logout: 'Log out', set_no_card: 'No card yet', set_card_error: "Couldn't load card data",
    deact_q: 'Deactivate card?', deact_desc: 'The card page will not open until you activate it again.',
    card_updated: 'Card status updated',
    logout_q: 'Log out?', logout_desc: 'You will need to log in again to manage your card.',

    // Bahasa
    lang_changed: 'Language changed to English',

    // Informasi Akun Gmail
    gmail_name: 'Name', gmail_email: 'Email', gmail_method: 'Sign-in method', gmail_prov_email: 'Email',
    gmail_created: 'Account created', gmail_last: 'Last sign-in',
    gmail_note: 'This account signs in with email & password, so no Google name is available.',

    // Informasi ID Card
    idc_empty_title: "You don't have a card yet", idc_empty_desc: 'Create a card from the Dashboard to get a Card ID.',
    idc_go: 'Go to Dashboard', idc_status: 'Status', idc_nfc: 'NFC card', idc_nfc_yes: 'Registered', idc_nfc_no: 'Not written yet',
    idc_created: 'Created', copied: 'URL copied', copy_manual: 'Copy the URL text manually',

    // Keamanan
    sec_password: 'Password', sec_new_pw: 'New password', sec_confirm_pw: 'Confirm new password', sec_save_pw: 'Save password',
    sec_pw_short: 'Password must be at least 6 characters.', sec_pw_mismatch: 'Passwords do not match.', sec_pw_saved: 'Password updated',
    sec_google_note: 'You signed in with Google. Your password and two-step verification are managed in your Google Account.',
    sec_google_manage: 'Manage Google Account',
    sec_others: 'Sign out other devices', sec_others_desc: 'End every session except this one.',
    sec_others_q: 'Sign out other devices?', sec_others_body: 'Other phones and browsers signed in to your account will be logged out.',
    sec_others_ok: 'Sign out', sec_others_done: 'Other devices signed out',

    // Perizinan & Pengaturan Lanjutan
    perm_vis_title: 'Visible on the emergency card',
    perm_all: 'Allow all', perm_all_desc: 'Show or hide all data at once.',
    perm_medical: 'Medical data', perm_medical_desc: 'Blood type, allergies, conditions, and notes.',
    perm_address: 'Address', perm_address_desc: 'Your home address.',
    perm_contacts: 'Emergency contacts', perm_contacts_desc: 'People helpers can call.',
    perm_device_title: 'Device permissions',
    perm_geo: 'Location (GPS)', perm_geo_desc: 'Used to find the nearest medical facilities.',
    perm_nfc: 'NFC access', perm_nfc_desc: 'Used to write the Card URL to an NFC card.',
    perm_checking: 'Checking…', perm_granted: 'Allowed', perm_denied: 'Denied', perm_prompt: 'Not asked yet', perm_unknown: 'Unknown in this browser',
    perm_request: 'Request permission',
    perm_hint: 'Browsers do not let websites change permissions directly. If a status says "Denied", enable it from the site settings in your browser (the icon next to the address bar).',

    // Pusat Bantuan & CS
    help_contact_q: "Can't find your answer?", help_back: 'Back to help menu', help_missing: 'This help page could not be found.',
    cs_desc: 'Choose the channel that suits you best.',

    // Legal & Tentang
    legal_privacy: 'Privacy Policy', legal_terms: 'Terms & Conditions', legal_desc: 'Official documents about using Exigent-One.',
    about_tagline: 'Your vital information, available when needed.',
    about_desc: 'Store your blood type, allergies, and emergency contacts on one card. Anyone who taps an NFC-enabled phone to it can see them within seconds, no app needed.',
  },
  id: {
    nav_dashboard: 'Dashboard', nav_medical: 'Medis', nav_account: 'Akun',
    dash_title: 'Dashboard', card_status: 'Status kartu', active: 'Aktif', inactive: 'Nonaktif',
    card_id: 'Card ID', card_url: 'URL kartu', copy_url: 'Salin URL', view_card: 'Lihat kartu',
    qr_title: 'QR Code', download_qr: 'Unduh QR',
    nfc_title: 'Tulis ke Kartu NFC', nfc_desc: 'Tempelkan HP ke kartu NFC kosong, lalu tekan tombol ini.',
    write_nfc: 'Tulis ke NFC', nfc_registered: 'ℹ️ Card NFC ini sudah terdaftar.',
    no_card_title: 'Kamu belum punya kartu', no_card_desc: 'Buat kartu untuk mendapat Card ID dan URL yang ditulis ke NFC.',
    create_card: 'Buat kartu',

    acct_title: 'Akun', notif_title: 'Notifikasi',
    notif_empty_title: 'Belum ada notifikasi', notif_empty_desc: 'Pemberitahuan penting tentang kartu Anda akan muncul di sini.',
    back: 'Kembali', close: 'Tutup', cancel: 'Batal', retry: 'Coba lagi', failed: 'Gagal: ', logout: 'Keluar',

    greet: 'Hai, {name}!', greet_anon: 'Hai!', greet_desc: 'Kelola data darurat dan privasi kartu Anda di sini.',
    menu_security: 'Keamanan', menu_settings: 'Pengaturan', menu_help: 'Pusat Bantuan',
    menu_cs: 'Hubungi CS Exigent', menu_legal: 'Legal', menu_about: 'Tentang Exigent-One', menu_logout: 'Keluar Akun',

    set_gmail: 'Informasi Akun', set_idcard: 'Informasi ID Card', set_language: 'Pengaturan Bahasa',
    set_permissions: 'Perizinan & Pengaturan Lanjutan', set_deactivate: 'Nonaktifkan Kartu', set_activate: 'Aktifkan Kartu',
    set_logout: 'Keluar', set_no_card: 'Belum ada kartu', set_card_error: 'Data kartu gagal dimuat',
    deact_q: 'Nonaktifkan kartu?', deact_desc: 'Halaman kartu tidak akan bisa dibuka sampai Anda mengaktifkannya kembali.',
    card_updated: 'Status kartu diperbarui',
    logout_q: 'Keluar dari akun?', logout_desc: 'Anda perlu masuk lagi untuk mengelola kartu.',

    lang_changed: 'Bahasa diubah ke Bahasa Indonesia',

    gmail_name: 'Nama', gmail_email: 'Email', gmail_method: 'Metode masuk', gmail_prov_email: 'Email & password',
    gmail_created: 'Akun dibuat', gmail_last: 'Terakhir masuk',
    gmail_note: 'Akun ini masuk dengan email & password, jadi nama Google tidak tersedia.',

    idc_empty_title: 'Anda belum punya kartu', idc_empty_desc: 'Buat kartu dari Dashboard untuk mendapatkan Card ID.',
    idc_go: 'Buka Dashboard', idc_status: 'Status', idc_nfc: 'Kartu NFC', idc_nfc_yes: 'Terdaftar', idc_nfc_no: 'Belum ditulis',
    idc_created: 'Dibuat', copied: 'URL disalin', copy_manual: 'Salin manual dari teks URL',

    sec_password: 'Password', sec_new_pw: 'Password baru', sec_confirm_pw: 'Ulangi password baru', sec_save_pw: 'Simpan password',
    sec_pw_short: 'Password minimal 6 karakter.', sec_pw_mismatch: 'Password tidak sama.', sec_pw_saved: 'Password diperbarui',
    sec_google_note: 'Anda masuk dengan Google. Password dan verifikasi dua langkah dikelola di Akun Google Anda.',
    sec_google_manage: 'Kelola Akun Google',
    sec_others: 'Keluar dari perangkat lain', sec_others_desc: 'Akhiri semua sesi selain perangkat ini.',
    sec_others_q: 'Keluar dari perangkat lain?', sec_others_body: 'HP dan browser lain yang masuk ke akun Anda akan dikeluarkan.',
    sec_others_ok: 'Keluarkan', sec_others_done: 'Perangkat lain telah dikeluarkan',

    perm_vis_title: 'Tampil di kartu darurat',
    perm_all: 'Izinkan Semua', perm_all_desc: 'Tampilkan atau sembunyikan semua data sekaligus.',
    perm_medical: 'Data medis', perm_medical_desc: 'Golongan darah, alergi, kondisi medis, dan catatan.',
    perm_address: 'Alamat', perm_address_desc: 'Alamat rumah Anda.',
    perm_contacts: 'Kontak darurat', perm_contacts_desc: 'Orang yang bisa dihubungi penolong.',
    perm_device_title: 'Izin perangkat',
    perm_geo: 'Izin Lokasi (GPS)', perm_geo_desc: 'Dipakai untuk mencari fasilitas medis terdekat.',
    perm_nfc: 'Akses NFC', perm_nfc_desc: 'Dipakai untuk menulis Card URL ke kartu NFC.',
    perm_checking: 'Memeriksa…', perm_granted: 'Diizinkan', perm_denied: 'Ditolak', perm_prompt: 'Belum diminta', perm_unknown: 'Tidak diketahui di browser ini',
    perm_request: 'Minta izin',
    perm_hint: 'Browser tidak mengizinkan situs mengubah izin secara langsung. Jika statusnya "Ditolak", aktifkan lewat pengaturan situs di browser (ikon di sebelah alamat situs).',

    help_contact_q: 'Tidak menemukan jawabannya?', help_back: 'Kembali ke menu bantuan', help_missing: 'Halaman bantuan ini tidak ditemukan.',
    cs_desc: 'Pilih saluran yang paling nyaman untuk Anda.',

    legal_privacy: 'Kebijakan Privasi', legal_terms: 'Syarat & Ketentuan', legal_desc: 'Dokumen resmi terkait penggunaan Exigent-One.',
    about_tagline: 'Informasi penting Anda, tersedia saat dibutuhkan.',
    about_desc: 'Simpan golongan darah, alergi, dan kontak darurat di satu kartu. Siapa pun yang menempelkan HP ber-NFC ke kartu bisa melihatnya dalam hitungan detik, tanpa aplikasi.',
  },
};

export function getLang() {
  try { return localStorage.getItem('exigent_lang') || 'en'; } catch (_) { return 'en'; }
}
export function setLang(l) {
  try { localStorage.setItem('exigent_lang', l); } catch (_) { /* abaikan jika storage diblokir */ }
}

// Isi label navigasi bawah/samping: <span data-nav-label="dashboard|medical|account">
export function applyNavLabels(translate) {
  document.querySelectorAll('[data-nav-label]').forEach((el) => { el.textContent = translate('nav_' + el.dataset.navLabel); });
}
