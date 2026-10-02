# Launch Checklist — Emergency Card NFC (Exigent-One)

> Centang satu-satu sebelum publish. Update terakhir: __/__/____

---

## 1. Teknis — Domain & Deploy

- [ ] Domain custom dibeli (mis. `exigent-one.com`)
- [ ] DNS pointing ke Vercel (A record / CNAME)
- [ ] SSL/HTTPS aktif otomatis
- [ ] Redirect www ↔ non-www konsisten
- [ ] Environment variables di Vercel sudah diset
- [ ] Production branch di GitHub → Vercel benar
- [ ] Preview deployments aman (tidak expose data production)

## 2. Backend — Supabase

- [ ] Row Level Security (RLS) aktif di **semua tabel**
  - [ ] `cards`
  - [ ] `emergency_profiles`
  - [ ] `notifications`
  - [ ] `user_devices`
  - [ ] (tabel lain: ________)
- [ ] Policy RLS dites: user A tidak bisa baca data user B
- [ ] Frontend hanya pakai `anon key` (bukan `service_role`)
- [ ] Backup database otomatis aktif
- [ ] Rate limiting di RPC sensitif (`delete_user_account`, `revoke_device`)
- [ ] Email confirmation wajib untuk signup
- [ ] Password policy minimal 8 karakter
- [ ] Captcha di signup/login (hCaptcha/Turnstile)

## 3. Keamanan Frontend

- [ ] CSP header (Content-Security-Policy) di `vercel.json`
- [ ] `X-Frame-Options: DENY`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `meta robots noindex` di halaman privat
- [ ] Tidak ada `console.log` sensitif di production
- [ ] Tidak ada API key hardcoded
- [ ] Validasi input di frontend & backend
- [ ] Semua output user pakai `esc()` / `textContent` (anti-XSS)

## 4. Domain & SEO

- [ ] `favicon.ico` + `apple-touch-icon` (180x180)
- [ ] `manifest.json` untuk PWA
- [ ] Open Graph tags (`og:title`, `og:description`, `og:image`)
- [ ] Twitter Card tags
- [ ] `sitemap.xml` (landing, privacy, terms)
- [ ] `robots.txt` di root
- [ ] 404 page custom
- [ ] 500 page custom

## 5. i18n & Konten

- [ ] Semua locale lengkap (`id.js`, `en.js`, `ja.js`)
- [ ] Test ganti bahasa EN / JA / ID — tidak ada key mentah
- [ ] Teks legal final & sesuai UU PDP
- [ ] Kontak CS (`cs-config.js`) benar (WA/Telegram aktif)
- [ ] Teks email Supabase di-branding
- [ ] Logo & branding konsisten

## 6. UX & Device Testing

- [ ] Test di HP Android (Chrome) — fitur NFC
- [ ] Test di iPhone (Safari) — fallback NFC muncul
- [ ] Test di desktop (Chrome, Firefox, Safari)
- [ ] Test layar kecil (360px) & tablet
- [ ] Dark mode OK
- [ ] Loading states semua jalan
- [ ] Error states informatif
- [ ] Test tulis NFC dengan kartu fisik
- [ ] Test scan QR dari kamera HP
- [ ] Test GPS outdoor

## 7. Testing Fungsional

- [ ] Signup email → verifikasi → login
- [ ] Signup Google → langsung masuk
- [ ] Lupa password → email masuk → reset → login
- [ ] Buat kartu → Card ID + QR muncul
- [ ] Tulis NFC → status "Terdaftar"
- [ ] Deactivate kartu → halaman publik "Kartu nonaktif"
- [ ] Hapus akun → data hilang
- [ ] Keluar dari perangkat lain → device lain logout
- [ ] Notifikasi muncul di bell → klik → halaman terbuka
- [ ] Medical search → GPS → hasil → navigasi Google Maps
- [ ] Ganti bahasa → semua teks berubah
- [ ] Emergency contact bisa ditelepon dari kartu publik

## 8. Monitoring & Analytics

- [ ] Vercel Analytics aktif (atau Plausible/Umami)
- [ ] Supabase logs dimonitor
- [ ] Error tracking (Sentry/Highlight/manual)
- [ ] Uptime monitoring (UptimeRobot)
- [ ] Alert kalau server down

## 9. Legal & Bisnis

- [ ] Privacy Policy halaman live
- [ ] Terms & Conditions halaman live
- [ ] Cookie consent (kalau pakai tracking)
- [ ] Brand tidak melanggar trademark
- [ ] Kontak bisnis jelas (email, WA, alamat)
- [ ] Kebijakan refund di terms
- [ ] Legal entity (kalau jual produk fisik)
- [ ] Syarat pembayaran jelas

## 10. Email & Notifikasi

- [ ] SMTP custom (bukan default Supabase)
- [ ] Sender = `noreply@domain.com`
- [ ] DKIM, SPF, DMARC diset di DNS
- [ ] Template email di-branding
- [ ] Email test ke Gmail, Outlook, Yahoo

## 11. Launch Day

- [ ] Backup database manual
- [ ] Test signup dengan email teman
- [ ] Test di HP teman (bukan HP sendiri)
- [ ] Screenshot semua halaman
- [ ] Posting di sosmed / komunitas
- [ ] Press kit siap (logo, screenshot, deskripsi)
- [ ] Video demo 30–60 detik

## 12. Post-Launch (1 bulan pertama)

- [ ] Cek logs tiap 2–3 hari
- [ ] Feedback form untuk user
- [ ] Update privacy policy kalau berubah
- [ ] Backup mingguan
- [ ] Track metric: jumlah user, kartu aktif, drop-off signup

---

## Prioritas Wajib (kalau waktu mepet)

1. [ ] Domain custom + HTTPS
2. [ ] RLS aktif di semua tabel Supabase
3. [ ] Test NFC di HP Android asli
4. [ ] Test flow lengkap: signup → login → create card → hapus akun
5. [ ] Privacy Policy & Terms live
6. [ ] Semua locale lengkap
7. [ ] Kontak CS aktif
8. [ ] Favicon + og:image
9. [ ] Test di iPhone (fallback NFC)
10. [ ] Backup database

---

## Bahaya yang Sering Dilupakan

- **RLS belum aktif** → data user bisa dibaca siapa saja
- **`service_role` key** bocor di frontend → database bisa dihapus siapa saja
- **Email default Supabase** → user tidak terima email (masuk spam)
- **Test cuma di HP sendiri** → bug muncul di device lain

---

## Catatan Tambahan

_2,10,2027________
