# Backup: Fitur Notifikasi Keluarga (disisihkan dari MVP)

Disisihkan agar Exigent-One lebih fokus untuk rilis MVP. Tidak dihapus dari
database — cukup UI/logic aktifnya yang dicabut. Bisa diaktifkan lagi nanti.

## Yang masih ada di Supabase (tidak disentuh)
- Tabel `public.emergency_events` (migration-002.sql)
- Fungsi `public.trigger_emergency(p_card_id text)`
- Kolom `home_contact_name` / `home_phone` di `emergency_profiles` — INI TETAP
  DIPAKAI di MVP sebagai kontak biasa, hanya lapisan notifikasi/eventnya yang
  dicabut.

## Yang dicabut dari kode (versi sebelumnya, untuk referensi)
- `card.js`: tombol "Telepon Keluarga" tadinya membuka modal konfirmasi
  "⚠️ Konfirmasi Keadaan Darurat" (TIDAK / YA, DARURAT) sebelum memanggil
  RPC `trigger_emergency` lalu membuka dialer. Sekarang jadi tombol Telepon
  biasa, tanpa konfirmasi maupun pencatatan event.
- `dashboard.js`: Ringkasan tadinya menampilkan badge status
  🟢 Normal / 🔴 DARURAT / ⚪ Selesai (dari tabel `emergency_events`) plus
  tombol "Tandai selesai". Bagian ini sudah dihapus dari Ringkasan.

## Cara mengaktifkan lagi nanti
1. Tambahkan kembali query `emergency_events` di `load()` dashboard.js.
2. Tambahkan kembali badge status + tombol "Tandai selesai" di Ringkasan.
3. Di `card.js`, bungkus tombol "Telepon Keluarga" dengan modal konfirmasi
   yang memanggil RPC `trigger_emergency` sebelum `tel:` dijalankan.

(Skema database tidak perlu diubah sama sekali untuk mengaktifkan ini lagi.)
