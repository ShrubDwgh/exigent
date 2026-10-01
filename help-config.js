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
      { label: { id: 'Data medis & kontak darurat', en: 'Medical data & emergency contacts' }, next: 'medical' },
      { label: { id: 'Tulis & baca kartu NFC', en: 'Write & read NFC card' }, next: 'nfc' },
      { label: { id: 'Akun & login', en: 'Account & login' }, next: 'account' },
      { label: { id: 'Keamanan & notifikasi', en: 'Security & notifications' }, next: 'security' },
      { label: { id: 'Toko, kartu & template', en: 'Shop, cards & templates' }, next: 'shop' },
      { label: { id: 'Privasi & legal', en: 'Privacy & legal' }, next: 'privacy' },
      { label: { id: 'Saya menemukan kartu seseorang', en: "I found someone's card" }, next: 'helper' },
      { label: { id: 'Belum terjawab? Hubungi CS', en: 'Not answered? Contact us' }, next: 'a_cs' },
    ],
  },

  a_cs: {
    title: { id: 'Hubungi CS', en: 'Contact Support' },
    answer: {
      id: ['Tim kami siap membantu. Klik tombol di bawah untuk terhubung via WhatsApp atau Telegram.'],
      en: ['Our team is ready to help. Tap the button below to connect via WhatsApp or Telegram.'],
    },
    actions: [{ label: { id: 'Buka pilihan kontak CS', en: 'Open contact options' }, type: 'cs' }],
  },

  // ---------- Memulai ----------
  start: {
    title: { id: 'Memulai & membuat kartu', en: 'Getting started' },
    options: [
      { label: { id: 'Bagaimana cara membuat kartu?', en: 'How do I create a card?' }, next: 'a_create' },
      { label: { id: 'Di mana saya lihat Card ID saya?', en: 'Where can I see my Card ID?' }, next: 'a_cardid' },
      { label: { id: 'Bagaimana cara mengunduh QR Code?', en: 'How do I download the QR Code?' }, next: 'a_downloadqr' },
      { label: { id: 'Apa itu kartu darurat NFC?', en: 'What is an NFC emergency card?' }, next: 'a_whatis' },
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
  a_cardid: {
    title: { id: 'Di mana saya lihat Card ID saya?', en: 'Where can I see my Card ID?' },
    steps: {
      id: ['Card ID terlihat di Dashboard dan di Akun → Pengaturan → Informasi ID Card.', 'Format Card ID: EC-XXXXXXX (7 karakter acak).'],
      en: ['Your Card ID is visible on the Dashboard and under Account → Settings → ID Card Info.', 'Card ID format: EC-XXXXXXX (7 random characters).'],
    },
    actions: [{ label: { id: 'Buka Dashboard', en: 'Open Dashboard' }, type: 'link', href: '/dashboard.html' }],
  },
  a_downloadqr: {
    title: { id: 'Bagaimana cara mengunduh QR Code?', en: 'How do I download the QR Code?' },
    steps: {
      id: ['Buka Dashboard.', 'Cari bagian "QR Code".', 'Tekan tombol "Unduh QR" untuk menyimpan gambar QR ke perangkat Anda.'],
      en: ['Open the Dashboard.', 'Find the "QR Code" section.', 'Tap "Download QR" to save the QR image to your device.'],
    },
  },
  a_whatis: {
    title: { id: 'Apa itu kartu darurat NFC?', en: 'What is an NFC emergency card?' },
    answer: {
      id: ['Kartu darurat NFC adalah kartu fisik berisi chip NFC yang menyimpan tautan ke halaman data medis Anda. Saat penolong menempelkan HP ke kartu, data darurat Anda (golongan darah, alergi, kontak) langsung terbuka tanpa aplikasi tambahan.', 'Kartu ini bukan pengganti pertolongan medis profesional, tetapi membantu penolong mengambil keputusan cepat.'],
      en: ['An NFC emergency card is a physical card with an NFC chip that stores a link to your medical data page. When a helper taps their phone on the card, your emergency data (blood type, allergies, contacts) opens instantly without extra apps.', 'This card is not a substitute for professional medical help, but helps helpers make quick decisions.'],
    },
  },

  // ---------- Data Medis ----------
  medical: {
    title: { id: 'Data medis & kontak darurat', en: 'Medical data & emergency contacts' },
    options: [
      { label: { id: 'Bagaimana cara mengisi data medis?', en: 'How do I fill in my medical data?' }, next: 'a_medis' },
      { label: { id: 'Bagaimana cara menambah kontak darurat?', en: 'How do I add emergency contacts?' }, next: 'a_addcontact' },
      { label: { id: 'Bagaimana cara update golongan darah?', en: 'How do I update my blood type?' }, next: 'a_updateblood' },
      { label: { id: 'Apakah foto profil bisa diganti?', en: 'Can I change my profile photo?' }, next: 'a_photo' },
      { label: { id: 'Bagaimana mengatur visibilitas data?', en: 'How do I control data visibility?' }, next: 'a_visibility' },
    ],
  },
  a_medis: {
    title: { id: 'Bagaimana cara mengisi data medis?', en: 'How do I fill in my medical data?' },
    steps: {
      id: ['Di Dashboard, tekan tombol biru (+) di kanan bawah.', 'Isi nama, golongan darah, alergi, kondisi medis, catatan emergency, dan kontak darurat.', 'Tekan "Simpan".'],
      en: ['On the Dashboard, tap the blue (+) button at the bottom right.', 'Fill in your name, blood type, allergies, medical conditions, emergency notes, and emergency contacts.', 'Tap "Save".'],
    },
    actions: [{ label: { id: 'Buka Dashboard', en: 'Open Dashboard' }, type: 'link', href: '/dashboard.html' }],
  },
  a_addcontact: {
    title: { id: 'Bagaimana cara menambah kontak darurat?', en: 'How do I add emergency contacts?' },
    steps: {
      id: ['Buka Dashboard → tombol (+) → bagian "Kontak darurat".', 'Isi nama, kategori (keluarga/pasangan/teman/dokter), dan nomor telepon.', 'Tekan "Tambah kontak".'],
      en: ['Open Dashboard → (+) button → "Emergency contacts" section.', 'Fill in the name, category (family/partner/friend/doctor), and phone number.', 'Tap "Add contact".'],
    },
  },
  a_updateblood: {
    title: { id: 'Bagaimana cara update golongan darah?', en: 'How do I update my blood type?' },
    steps: {
      id: ['Buka Dashboard → tombol (+) → cari "Golongan darah".', 'Pilih golongan darah yang benar dari menu.', 'Tekan "Simpan".'],
      en: ['Open Dashboard → (+) button → find "Blood type".', 'Choose the correct blood type from the list.', 'Tap "Save".'],
    },
  },
  a_photo: {
    title: { id: 'Apakah foto profil bisa diganti?', en: 'Can I change my profile photo?' },
    answer: {
      id: ['Ya. Di modal Edit Data Medis, tekan "Pilih foto" untuk mengunggah foto baru, atau "Hapus foto" untuk menghapusnya. Foto akan dikompresi otomatis sebelum disimpan.'],
      en: ['Yes. In the Edit Medical Data modal, tap "Choose photo" to upload a new photo, or "Remove photo" to delete it. Photos are automatically compressed before saving.'],
    },
  },
  a_visibility: {
    title: { id: 'Bagaimana mengatur visibilitas data?', en: 'How do I control data visibility?' },
    steps: {
      id: ['Buka Akun → Pengaturan → Perizinan.', 'Aktifkan/nonaktifkan data yang ingin ditampilkan di kartu darurat (medis, alamat, kontak).'],
      en: ['Open Account → Settings → Permissions.', 'Toggle which data to show on your emergency card (medical, address, contacts).'],
    },
    actions: [{ label: { id: 'Buka Perizinan', en: 'Open Permissions' }, type: 'go', to: '/settings/permissions' }],
  },

  // ---------- NFC ----------
  nfc: {
    title: { id: 'Tulis & baca kartu NFC', en: 'Write & read NFC card' },
    options: [
      { label: { id: 'Bagaimana cara menulis ke kartu NFC?', en: 'How do I write to an NFC card?' }, next: 'a_nfc' },
      { label: { id: 'Tombol "Tulis NFC" tidak berfungsi', en: 'The "Write NFC" button does not work' }, next: 'a_nfc_unsupported' },
      { label: { id: 'Kartu tidak terbaca saat di-tap', en: "The card isn't read when tapped" }, next: 'a_nfc_read' },
      { label: { id: 'Apa arti status "Terdaftar"?', en: 'What does "Registered" status mean?' }, next: 'a_nfc_status' },
      { label: { id: 'Bagaimana memakai QR Code?', en: 'How do I use the QR Code?' }, next: 'a_qr' },
    ],
  },
  a_nfc: {
    title: { id: 'Bagaimana cara menulis ke kartu NFC?', en: 'How do I write to an NFC card?' },
    steps: {
      id: ['Buka Akun → Pengaturan → Informasi ID Card.', 'Tempelkan HP ke kartu NFC kosong.', 'Tekan "Tulis NFC" dan tahan sampai muncul pesan berhasil.'],
      en: ['Open Account → Settings → ID Card Info.', 'Hold your phone against a blank NFC card.', 'Tap "Write NFC" and hold until the success message appears.'],
    },
    actions: [{ label: { id: 'Buka Info ID Card', en: 'Open ID Card Info' }, type: 'go', to: '/settings/idcard' }],
  },
  a_nfc_unsupported: {
    title: { id: 'Tombol "Tulis NFC" tidak berfungsi', en: 'The "Write NFC" button does not work' },
    answer: {
      id: ['Menulis NFC langsung dari web hanya berjalan di Chrome untuk Android lewat koneksi aman (HTTPS), dan NFC di HP harus aktif.', 'Jika browser Anda tidak mendukung, salin URL kartu di Informasi ID Card lalu tulis lewat aplikasi seperti NFC Tools.'],
      en: ['Writing NFC directly from the web only works in Chrome for Android over a secure (HTTPS) connection, and NFC must be turned on on your phone.', 'If your browser is not supported, copy the card URL from ID Card Info and write it using an app such as NFC Tools.'],
    },
    actions: [{ label: { id: 'Buka Info ID Card', en: 'Open ID Card Info' }, type: 'go', to: '/settings/idcard' }],
  },
  a_nfc_read: {
    title: { id: 'Kartu tidak terbaca saat di-tap', en: "The card isn't read when tapped" },
    answer: {
      id: ['Pastikan NFC aktif di pengaturan HP, lalu tempelkan kartu di bagian belakang HP (dekat antena NFC) dan tahan beberapa detik.', 'Jika masih gagal, gunakan QR Code dari Dashboard sebagai cadangan.'],
      en: ['Make sure NFC is turned on in your phone settings, then hold the card against the back of the phone (near the NFC antenna) for a few seconds.', 'If it still fails, use the QR Code from the Dashboard as a backup.'],
    },
  },
  a_nfc_status: {
    title: { id: 'Apa arti status "Terdaftar"?', en: 'What does "Registered" status mean?' },
    answer: {
      id: ['Status "Terdaftar" berarti kartu NFC Anda sudah pernah berhasil ditulis dan siap dipakai. Jika status masih "Belum ditulis", tulis dulu kartu NFC-nya.', 'Jika Anda tulis ulang kartu, statusnya tetap "Terdaftar".'],
      en: ['"Registered" means your NFC card has been successfully written and is ready to use. If status shows "Not written", write the NFC card first.', 'If you rewrite the card, the status stays "Registered".'],
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

  // ---------- Akun ----------
  account: {
    title: { id: 'Akun & login', en: 'Account & login' },
    options: [
      { label: { id: 'Bagaimana login dengan Google?', en: 'How do I log in with Google?' }, next: 'a_google' },
      { label: { id: 'Kenapa saya harus konfirmasi email dulu?', en: 'Why do I need to confirm my email first?' }, next: 'a_confirm' },
      { label: { id: 'Bagaimana mengubah password?', en: 'How do I change my password?' }, next: 'a_pass' },
      { label: { id: 'Bagaimana mengganti bahasa?', en: 'How do I change the language?' }, next: 'a_lang' },
      { label: { id: 'Bagaimana keluar dari akun?', en: 'How do I log out?' }, next: 'a_logout' },
      { label: { id: 'Bagaimana menghapus akun saya?', en: 'How do I delete my account?' }, next: 'a_delete' },
    ],
  },
  a_google: {
    title: { id: 'Bagaimana login dengan Google?', en: 'How do I log in with Google?' },
    steps: {
      id: ['Di halaman login, tekan tombol "Masuk dengan Google".', 'Pilih akun Google Anda.', 'Anda akan langsung masuk ke Dashboard tanpa perlu konfirmasi email.'],
      en: ['On the login page, tap the "Sign in with Google" button.', 'Choose your Google account.', 'You will go straight to the Dashboard without email confirmation.'],
    },
  },
  a_confirm: {
    title: { id: 'Kenapa saya harus konfirmasi email dulu?', en: 'Why do I need to confirm my email first?' },
    answer: {
      id: ['Untuk keamanan akun, kami mewajibkan konfirmasi email agar tidak ada yang mendaftar dengan email orang lain.', 'Cek inbox (dan folder spam) setelah mendaftar, lalu klik tautan konfirmasi yang kami kirim.'],
      en: ['For account security, we require email confirmation so nobody can register with someone else\'s email.', 'Check your inbox (and spam folder) after signing up, then click the confirmation link we sent.'],
    },
  },
  a_pass: {
    title: { id: 'Bagaimana mengubah password?', en: 'How do I change my password?' },
    steps: {
      id: ['Buka Akun → Keamanan.', 'Isi password baru dua kali, lalu tekan "Simpan password".'],
      en: ['Open Account → Security.', 'Enter your new password twice, then tap "Save password".'],
    },
    actions: [{ label: { id: 'Buka Keamanan', en: 'Open Security' }, type: 'go', to: '/security' }],
  },
  a_lang: {
    title: { id: 'Bagaimana mengganti bahasa?', en: 'How do I change the language?' },
    steps: {
      id: ['Buka Akun → Pengaturan → Pengaturan Bahasa.', 'Pilih Bahasa Indonesia atau English, lalu tekan "Simpan".'],
      en: ['Open Account → Settings → Language Settings.', 'Choose Bahasa Indonesia or English, then tap "Save".'],
    },
    actions: [{ label: { id: 'Buka Pengaturan', en: 'Open Settings' }, type: 'go', to: '/settings' }],
  },
  a_logout: {
    title: { id: 'Bagaimana keluar dari akun?', en: 'How do I log out?' },
    answer: {
      id: ['Tekan "Keluar Akun" (merah) di bagian paling bawah menu Akun.'],
      en: ['Tap "Log out" (red) at the very bottom of the Account menu.'],
    },
  },
  a_delete: {
    title: { id: 'Bagaimana menghapus akun saya?', en: 'How do I delete my account?' },
    steps: {
      id: ['Buka Akun → Pengaturan.', 'Pilih "Hapus Akun" (merah) di bagian bawah.', 'Ketik email Anda untuk konfirmasi, lalu tekan "Hapus Akun".', 'Semua data (kartu, profil medis, kontak, akun) akan dihapus permanen.'],
      en: ['Open Account → Settings.', 'Choose "Delete Account" (red) at the bottom.', 'Type your email to confirm, then tap "Delete Account".', 'All data (cards, medical profile, contacts, account) will be permanently deleted.'],
    },
    actions: [{ label: { id: 'Buka Pengaturan', en: 'Open Settings' }, type: 'go', to: '/settings' }],
  },

  // ---------- Keamanan ----------
  security: {
    title: { id: 'Keamanan & notifikasi', en: 'Security & notifications' },
    options: [
      { label: { id: 'Bagaimana melihat perangkat yang login?', en: 'How do I see logged-in devices?' }, next: 'a_devices' },
      { label: { id: 'Bagaimana logout dari perangkat lain?', en: 'How do I log out from other devices?' }, next: 'a_logoutothers' },
      { label: { id: 'Kenapa saya dapat notifikasi login?', en: 'Why do I get login notifications?' }, next: 'a_notiflogin' },
      { label: { id: 'Bagaimana membaca notifikasi?', en: 'How do I read notifications?' }, next: 'a_notifread' },
    ],
  },
  a_devices: {
    title: { id: 'Bagaimana melihat perangkat yang login?', en: 'How do I see logged-in devices?' },
    steps: {
      id: ['Buka Akun → Keamanan.', 'Pilih "Perangkat Terhubung".', 'Anda akan melihat daftar perangkat, waktu aktif terakhir, dan bisa menghapus perangkat tertentu.'],
      en: ['Open Account → Security.', 'Choose "Connected Devices".', 'You will see a list of devices, last active time, and can remove specific devices.'],
    },
    actions: [{ label: { id: 'Buka Keamanan', en: 'Open Security' }, type: 'go', to: '/security' }],
  },
  a_logoutothers: {
    title: { id: 'Bagaimana logout dari perangkat lain?', en: 'How do I log out from other devices?' },
    steps: {
      id: ['Buka Akun → Keamanan.', 'Pilih "Keluar dari Perangkat Lain".', 'Konfirmasi untuk logout semua perangkat selain yang sedang dipakai.'],
      en: ['Open Account → Security.', 'Choose "Log out from other devices".', 'Confirm to log out all devices except the current one.'],
    },
    actions: [{ label: { id: 'Buka Keamanan', en: 'Open Security' }, type: 'go', to: '/security' }],
  },
  a_notiflogin: {
    title: { id: 'Kenapa saya dapat notifikasi login?', en: 'Why do I get login notifications?' },
    answer: {
      id: ['Setiap kali ada login baru ke akun Anda (dari perangkat baru atau browser baru), kami mengirim notifikasi keamanan.', 'Jika Anda tidak mengenali login tersebut, segera ganti password dan logout semua perangkat lain.'],
      en: ['Every time there is a new login to your account (from a new device or browser), we send a security notification.', 'If you don\'t recognize the login, change your password immediately and log out all other devices.'],
    },
    actions: [{ label: { id: 'Buka Keamanan', en: 'Open Security' }, type: 'go', to: '/security' }],
  },
  a_notifread: {
    title: { id: 'Bagaimana membaca notifikasi?', en: 'How do I read notifications?' },
    steps: {
      id: ['Buka menu Akun.', 'Tekan ikon lonceng di kanan atas.', 'Notifikasi terbaru akan muncul di paling atas. Klik notifikasi untuk langsung menuju halaman terkait.'],
      en: ['Open the Account menu.', 'Tap the bell icon at the top right.', 'The latest notifications appear at the top. Tap a notification to go directly to the related page.'],
    },
  },

  // ---------- Toko ----------
  shop: {
    title: { id: 'Toko, kartu & template', en: 'Shop, cards & templates' },
    options: [
      { label: { id: 'Bagaimana cara beli kartu NFC?', en: 'How do I buy an NFC card?' }, next: 'a_buycard' },
      { label: { id: 'Bagaimana cara beli template?', en: 'How do I buy a template?' }, next: 'a_buytemplate' },
      { label: { id: 'Apakah template bisa saya edit sendiri?', en: 'Can I edit the template myself?' }, next: 'a_edittemplate' },
      { label: { id: 'Bagaimana cara mencari template?', en: 'How do I search for a template?' }, next: 'a_searchtemplate' },
    ],
  },
  a_buycard: {
    title: { id: 'Bagaimana cara beli kartu NFC?', en: 'How do I buy an NFC card?' },
    steps: {
      id: ['Buka menu Toko di Dashboard.', 'Pilih kartu yang diinginkan.', 'Tekan tombol "Beli" dan Anda akan diarahkan ke Shopee untuk menyelesaikan pembelian.'],
      en: ['Open the Shop menu on the Dashboard.', 'Choose the card you want.', 'Tap the "Buy" button and you will be redirected to Shopee to complete the purchase.'],
    },
  },
  a_buytemplate: {
    title: { id: 'Bagaimana cara beli template?', en: 'How do I buy a template?' },
    steps: {
      id: ['Buka menu Toko → filter "Template".', 'Pilih template yang diinginkan.', 'Setelah pembelian selesai, Anda akan menerima tautan template untuk diedit sesuai data Anda.'],
      en: ['Open the Shop menu → filter "Template".', 'Choose the template you want.', 'After purchase, you will receive a template link to edit with your own data.'],
    },
  },
  a_edittemplate: {
    title: { id: 'Apakah template bisa saya edit sendiri?', en: 'Can I edit the template myself?' }, 
    answer: {
      id: ['Ya. Setelah pembelian, Anda akan menerima tautan editor template. Anda bisa mengisi nama, golongan darah, alergi, dan mengunggah foto.', 'Setelah selesai, unduh hasilnya sebagai gambar PNG siap cetak.'],
      en: ['Yes. After purchase, you will receive a template editor link. You can fill in your name, blood type, allergies, and upload a photo.', 'Once done, download the result as a print-ready PNG image.'],
    },
  },
  a_searchtemplate: {
    title: { id: 'Bagaimana cara mencari template?', en: 'How do I search for a template?' },
    answer: {
      id: ['Di halaman Toko, gunakan kolom pencarian dan ketik nama template atau kode template (contoh: TPL-ABC123).', 'Anda juga bisa memfilter berdasarkan kategori: Semua, NFC, atau Template.'],
      en: ['On the Shop page, use the search field to type the template name or code (example: TPL-ABC123).', 'You can also filter by category: All, NFC, or Template.'],
    },
  },

  // ---------- Privasi ----------
  privacy: {
    title: { id: 'Privasi & legal', en: 'Privacy & legal' },
    options: [
      { label: { id: 'Siapa yang bisa melihat data kartu saya?', en: 'Who can see my card data?' }, next: 'a_who' },
      { label: { id: 'Kartu saya hilang atau dicuri', en: 'My card is lost or stolen' }, next: 'a_lost' },
      { label: { id: 'Bagaimana mengaktifkan kartu kembali?', en: 'How do I reactivate my card?' }, next: 'a_react' },
      { label: { id: 'Di mana saya baca Kebijakan Privasi?', en: 'Where can I read the Privacy Policy?' }, next: 'a_readprivacy' },
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
  a_readprivacy: {
    title: { id: 'Di mana saya baca Kebijakan Privasi?', en: 'Where can I read the Privacy Policy?' },
    answer: {
      id: ['Buka Akun → Legal. Anda bisa membaca Kebijakan Privasi dan Syarat & Ketentuan di sana.'],
      en: ['Open Account → Legal. You can read the Privacy Policy and Terms & Conditions there.'],
    },
    actions: [{ label: { id: 'Buka Legal', en: 'Open Legal' }, type: 'go', to: '/legal' }],
  },

  // ---------- Penolong ----------
  helper: {
    title: { id: 'Saya menemukan kartu seseorang', en: "I found someone's card" },
    options: [
      { label: { id: 'Bagaimana melihat data darurat pemilik kartu?', en: "How do I see the card owner's emergency data?" }, next: 'a_open' },
      { label: { id: 'Bagaimana mencari fasilitas medis terdekat?', en: 'How do I find the nearest medical facility?' }, next: 'a_hospital' },
      { label: { id: 'Bagaimana menghubungi kontak darurat?', en: 'How do I contact the emergency contact?' }, next: 'a_callcontact' },
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
  a_callcontact: {
    title: { id: 'Bagaimana menghubungi kontak darurat?', en: 'How do I contact the emergency contact?' },
    answer: {
      id: ['Di halaman kartu, bagian "Kontak Darurat" menampilkan nomor telepon yang bisa langsung ditekan untuk menelepon.', 'Anda juga bisa menekan nomor untuk membuka aplikasi telepon di HP Anda.'],
      en: ['On the card page, the "Emergency Contacts" section shows phone numbers you can tap to call directly.', 'You can also tap the number to open the phone app on your device.'],
    },
  },
};
