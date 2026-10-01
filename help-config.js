// ============================================================================
// PUSAT BANTUAN · Konfigurasi FAQ berbasis pohon pertanyaan (decision tree)
// ----------------------------------------------------------------------------
// File ini SENGAJA dipisah dari kode UI (account.js) supaya isi FAQ bisa
// diubah sendiri tanpa menyentuh logika aplikasi.
//
// CARA MENGUBAH
// 1. Setiap "node" adalah satu layar. Kuncinya (mis. 'start', 'a_create') adalah id unik.
// 2. Ada dua jenis node:
//    a) Node PILIHAN  -> punya `options`: daftar pertanyaan/pilihan yang menuju node lain.
//       { title, options: [ { label: {id, en}, next: 'id-node-tujuan' }, ... ] }
//    b) Node JAWABAN  -> punya `answer` (paragraf) dan/atau `steps` (langkah bernomor).
//       { title, answer: {id:[...], en:[...]}, steps: {id:[...], en:[...]}, actions: [...] }
// 3. Semua teks dwibahasa: { id: '...', en: '...' } (paragraf/langkah berupa array).
// 4. `actions` (opsional) = tombol di bawah jawaban:
//       { label: {id, en}, type: 'go',   to: '/settings' }      -> pindah layar di halaman Akun
//       { label: {id, en}, type: 'link', href: '/dashboard.html' } -> buka halaman lain
//       { label: {id, en}, type: 'cs' }                          -> buka pilihan Hubungi CS
//    Rute halaman Akun yang tersedia: '/', '/security', '/settings', '/settings/gmail',
//    '/settings/idcard', '/settings/permissions', '/help', '/legal', '/about'.
// 5. Node awal adalah FAQ_ROOT. Jangan hapus node itu.
// ============================================================================

export const FAQ_ROOT = 'root';

export const FAQ_TREE = {
  root: {
    title: { id: 'Apa yang bisa kami bantu?', en: 'How can we help?' },
    options: [
      { label: { id: 'Memulai & membuat kartu', en: 'Getting started' }, next: 'start' },
      { label: { id: 'Masalah NFC & QR Code', en: 'NFC & QR Code issues' }, next: 'nfc' },
      { label: { id: 'Privasi & keamanan kartu', en: 'Card privacy & safety' }, next: 'privacy' },
      { label: { id: 'Akun & pengaturan', en: 'Account & settings' }, next: 'account' },
      { label: { id: 'Saya menemukan kartu seseorang', en: "I found someone's card" }, next: 'helper' },
    ],
  },

  // ---------- Memulai ----------
  start: {
    title: { id: 'Memulai & membuat kartu', en: 'Getting started' },
    options: [
      { label: { id: 'Bagaimana cara membuat kartu?', en: 'How do I create a card?' }, next: 'a_create' },
      { label: { id: 'Bagaimana cara mengisi data medis?', en: 'How do I fill in my medical data?' }, next: 'a_medis' },
      { label: { id: 'Bagaimana cara menulis ke kartu NFC?', en: 'How do I write to an NFC card?' }, next: 'a_nfc' },
    ],
  },
  a_create: {
    title: { id: 'Bagaimana cara membuat kartu?', en: 'How do I create a card?' },
    steps: {
      id: ['Buka menu Dashboard.', 'Jika belum punya kartu, tekan tombol "Buat kartu".', 'Anda akan mendapat Card ID dan URL kartu yang siap ditulis ke NFC.'],
      en: ['Open the Dashboard.', 'If you have no card yet, tap "Create card".', 'You will get a Card ID and a card URL, ready to be written to NFC.'],
    },
    actions: [{ label: { id: 'Buka Dashboard', en: 'Open Dashboard' }, type: 'link', href: '/dashboard.html' }],
  },
  a_medis: {
    title: { id: 'Bagaimana cara mengisi data medis?', en: 'How do I fill in my medical data?' },
    steps: {
      id: ['Di Dashboard, tekan tombol biru (+) di kanan bawah.', 'Isi nama, golongan darah, alergi, kondisi medis, catatan emergency, dan kontak darurat.', 'Tekan "Simpan".'],
      en: ['On the Dashboard, tap the blue (+) button at the bottom right.', 'Fill in your name, blood type, allergies, medical conditions, emergency notes, and emergency contacts.', 'Tap "Save".'],
    },
    actions: [{ label: { id: 'Buka Dashboard', en: 'Open Dashboard' }, type: 'link', href: '/dashboard.html' }],
  },
  a_nfc: {
    title: { id: 'Bagaimana cara menulis ke kartu NFC?', en: 'How do I write to an NFC card?' },
    steps: {
      id: ['Di Dashboard, cari bagian "Tulis ke Kartu NFC".', 'Tempelkan HP ke kartu NFC kosong.', 'Tekan "Tulis ke NFC" dan tahan sampai muncul pesan berhasil.'],
      en: ['On the Dashboard, find the "Write to NFC Card" section.', 'Hold your phone against a blank NFC card.', 'Tap "Write to NFC" and hold until the success message appears.'],
    },
    actions: [{ label: { id: 'Buka Dashboard', en: 'Open Dashboard' }, type: 'link', href: '/dashboard.html' }],
  },

  // ---------- NFC & QR ----------
  nfc: {
    title: { id: 'Masalah NFC & QR Code', en: 'NFC & QR Code issues' },
    options: [
      { label: { id: 'Tombol "Tulis ke NFC" tidak berfungsi', en: 'The "Write to NFC" button does not work' }, next: 'a_nfc_unsupported' },
      { label: { id: 'Kartu tidak terbaca saat di-tap', en: "The card isn't read when tapped" }, next: 'a_nfc_read' },
      { label: { id: 'Bagaimana memakai QR Code?', en: 'How do I use the QR Code?' }, next: 'a_qr' },
    ],
  },
  a_nfc_unsupported: {
    title: { id: 'Tombol "Tulis ke NFC" tidak berfungsi', en: 'The "Write to NFC" button does not work' },
    answer: {
      id: ['Menulis NFC langsung dari web hanya berjalan di Chrome untuk Android lewat koneksi aman (HTTPS), dan NFC di HP harus aktif.', 'Jika browser Anda tidak mendukung, salin URL kartu di Dashboard lalu tulis lewat aplikasi seperti NFC Tools.'],
      en: ['Writing NFC directly from the web only works in Chrome for Android over a secure (HTTPS) connection, and NFC must be turned on on your phone.', 'If your browser is not supported, copy the card URL from the Dashboard and write it using an app such as NFC Tools.'],
    },
    actions: [{ label: { id: 'Buka Dashboard', en: 'Open Dashboard' }, type: 'link', href: '/dashboard.html' }],
  },
  a_nfc_read: {
    title: { id: 'Kartu tidak terbaca saat di-tap', en: "The card isn't read when tapped" },
    answer: {
      id: ['Pastikan NFC aktif di pengaturan HP, lalu tempelkan kartu di bagian belakang HP (dekat antena NFC) dan tahan beberapa detik.', 'Jika masih gagal, gunakan QR Code dari Dashboard sebagai cadangan.'],
      en: ['Make sure NFC is turned on in your phone settings, then hold the card against the back of the phone (near the NFC antenna) for a few seconds.', 'If it still fails, use the QR Code from the Dashboard as a backup.'],
    },
  },
  a_qr: {
    title: { id: 'Bagaimana memakai QR Code?', en: 'How do I use the QR Code?' },
    answer: {
      id: ['QR Code ada di Dashboard dan bisa diunduh lewat tombol "Unduh QR". Saat dipindai, QR membuka halaman kartu yang sama seperti saat kartu NFC di-tap.'],
      en: ['The QR Code is on the Dashboard and can be downloaded with the "Download QR" button. When scanned, it opens the same card page as tapping the NFC card.'],
    },
    actions: [{ label: { id: 'Buka Dashboard', en: 'Open Dashboard' }, type: 'link', href: '/dashboard.html' }],
  },

  // ---------- Privasi ----------
  privacy: {
    title: { id: 'Privasi & keamanan kartu', en: 'Card privacy & safety' },
    options: [
      { label: { id: 'Siapa yang bisa melihat data kartu saya?', en: 'Who can see my card data?' }, next: 'a_who' },
      { label: { id: 'Kartu saya hilang atau dicuri', en: 'My card is lost or stolen' }, next: 'a_lost' },
      { label: { id: 'Bagaimana mengaktifkan kartu kembali?', en: 'How do I reactivate my card?' }, next: 'a_react' },
    ],
  },
  a_who: {
    title: { id: 'Siapa yang bisa melihat data kartu saya?', en: 'Who can see my card data?' },
    answer: {
      id: ['Kartu NFC dan QR hanya menyimpan tautan, bukan data pribadi Anda. Siapa pun yang membuka tautan itu bisa melihat halaman darurat, supaya penolong bisa bertindak cepat.', 'Isi hanya data yang memang bersedia Anda tampilkan, dan nonaktifkan kartu jika hilang.'],
      en: ['NFC and QR cards only store a link, not your personal data. Anyone who opens that link can see the emergency page, so that helpers can act quickly.', 'Only fill in data you are comfortable showing, and deactivate the card if it is lost.'],
    },
  },
  a_lost: {
    title: { id: 'Kartu saya hilang atau dicuri', en: 'My card is lost or stolen' },
    steps: {
      id: ['Buka Akun → Pengaturan.', 'Pilih "Nonaktifkan Kartu" lalu konfirmasi.', 'Setelah nonaktif, halaman kartu tidak dapat dibuka.'],
      en: ['Open Account → Settings.', 'Choose "Deactivate Card" and confirm.', 'Once deactivated, the card page can no longer be opened.'],
    },
    actions: [{ label: { id: 'Buka Pengaturan', en: 'Open Settings' }, type: 'go', to: '/settings' }],
  },
  a_react: {
    title: { id: 'Bagaimana mengaktifkan kartu kembali?', en: 'How do I reactivate my card?' },
    steps: {
      id: ['Buka Akun → Pengaturan.', 'Pilih "Aktifkan Kartu" lalu konfirmasi.'],
      en: ['Open Account → Settings.', 'Choose "Activate Card" and confirm.'],
    },
    actions: [{ label: { id: 'Buka Pengaturan', en: 'Open Settings' }, type: 'go', to: '/settings' }],
  },

  // ---------- Akun ----------
  account: {
    title: { id: 'Akun & pengaturan', en: 'Account & settings' },
    options: [
      { label: { id: 'Bagaimana mengganti bahasa?', en: 'How do I change the language?' }, next: 'a_lang' },
      { label: { id: 'Bagaimana mengubah password?', en: 'How do I change my password?' }, next: 'a_pass' },
      { label: { id: 'Bagaimana keluar dari akun?', en: 'How do I log out?' }, next: 'a_logout' },
    ],
  },
  a_lang: {
    title: { id: 'Bagaimana mengganti bahasa?', en: 'How do I change the language?' },
    steps: {
      id: ['Buka Akun → Pengaturan → Pengaturan Bahasa.', 'Pilih Bahasa Indonesia atau English, lalu tekan "Simpan".'],
      en: ['Open Account → Settings → Language Settings.', 'Choose Bahasa Indonesia or English, then tap "Save".'],
    },
    actions: [{ label: { id: 'Buka Pengaturan', en: 'Open Settings' }, type: 'go', to: '/settings' }],
  },
  a_pass: {
    title: { id: 'Bagaimana mengubah password?', en: 'How do I change my password?' },
    steps: {
      id: ['Buka Akun → Keamanan.', 'Isi password baru dua kali, lalu tekan "Simpan password".'],
      en: ['Open Account → Security.', 'Enter your new password twice, then tap "Save password".'],
    },
    actions: [{ label: { id: 'Buka Keamanan', en: 'Open Security' }, type: 'go', to: '/security' }],
  },
  a_logout: {
    title: { id: 'Bagaimana keluar dari akun?', en: 'How do I log out?' },
    answer: {
      id: ['Tekan "Keluar Akun" (merah) di bagian paling bawah menu Akun, atau lewat Akun → Pengaturan → Keluar.'],
      en: ['Tap "Log out" (red) at the very bottom of the Account menu, or go to Account → Settings → Log out.'],
    },
  },

  // ---------- Penolong ----------
  helper: {
    title: { id: 'Saya menemukan kartu seseorang', en: "I found someone's card" },
    options: [
      { label: { id: 'Bagaimana melihat data darurat pemilik kartu?', en: "How do I see the card owner's emergency data?" }, next: 'a_open' },
      { label: { id: 'Bagaimana mencari fasilitas medis terdekat?', en: 'How do I find the nearest medical facility?' }, next: 'a_hospital' },
    ],
  },
  a_open: {
    title: { id: 'Bagaimana melihat data darurat pemilik kartu?', en: "How do I see the card owner's emergency data?" },
    answer: {
      id: ['Tempelkan HP ber-NFC ke kartu, atau pindai QR Code pada kartu. Halaman darurat akan terbuka dan menampilkan golongan darah, alergi, serta kontak darurat yang bisa langsung dihubungi.'],
      en: ['Hold an NFC-enabled phone against the card, or scan the QR Code on the card. The emergency page opens and shows blood type, allergies, and emergency contacts you can call right away.'],
    },
  },
  a_hospital: {
    title: { id: 'Bagaimana mencari fasilitas medis terdekat?', en: 'How do I find the nearest medical facility?' },
    answer: {
      id: ['Buka menu Medis atau tombol "Cari Fasilitas Medis" di halaman kartu, lalu izinkan akses lokasi.', 'Dalam keadaan darurat medis kritis, segera hubungi 112.'],
      en: ['Open the Medical menu or the "Find Medical Facilities" button on the card page, then allow location access.', 'In a critical medical emergency, call 112 immediately.'],
    },
    actions: [{ label: { id: 'Buka menu Medis', en: 'Open Medical' }, type: 'link', href: '/medical-search.html' }],
  },
};
