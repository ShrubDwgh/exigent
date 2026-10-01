// ============================================================================
// HUBUNGI CS EXIGENT · Kontak WhatsApp & Telegram
// ----------------------------------------------------------------------------
// Semua isian ada di file ini (hardcode di source code) supaya bisa diganti
// kapan saja tanpa menyentuh kode UI. SEMUA NILAI DI BAWAH MASIH CONTOH —
// GANTI dengan kontak CS yang asli sebelum dipakai.
// ============================================================================

export const CS_CONTACT = {
  whatsapp: {
    // Nomor format internasional, hanya angka (tanpa +, spasi, atau 0 di depan).
    // Contoh nomor Indonesia 0812-3456-7890 → '6281234567890'
    number: '6280000000000',
    // Teks yang ditampilkan di kartu pilihan kontak.
    display: '+62 800-0000-0000',
    // Pesan awal yang otomatis terisi saat WhatsApp terbuka.
    message: {
      id: 'Halo CS Exigent, saya butuh bantuan.',
      en: 'Hello Exigent Support, I need help.',
    },
  },
  telegram: {
    // Username tanpa tanda @ (jika terlanjur ditulis dengan @, tidak masalah).
    username: 'exigent_cs',
    display: '@exigent_cs',
  },

  // OPSIONAL: isi salah satu tautan lengkap di bawah jika ingin memakai tautan
  // sendiri (mis. link grup/channel atau tautan wa.me dengan pesan khusus).
  // Jika diisi, tautan ini dipakai menggantikan tautan otomatis di atas.
  whatsappLink: '',
  telegramLink: '',
};
