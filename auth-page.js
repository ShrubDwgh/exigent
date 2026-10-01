import { supabase } from './supabase.js';
import { busy } from './auth.js';

window.lucide && window.lucide.createIcons();
const form = document.getElementById('form');
const msg = document.getElementById('msg');
const show = (text, ok) => { msg.textContent = text; msg.className = 'msg' + (ok ? ' ok' : ''); msg.hidden = false; };

supabase.auth.getSession().then(({ data }) => { if (data.session) location.replace('/dashboard.html'); });

// ==========================================
// DETEKSI DEVICE SEDERHANA
// ==========================================
function deviceInfo() {
  const ua = navigator.userAgent || '';
  const platform = /Android/i.test(ua) ? 'Android'
                 : /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
                 : /Windows/i.test(ua) ? 'Windows'
                 : /Mac/i.test(ua) ? 'Mac'
                 : 'Unknown';
  const browser = /Edg/i.test(ua) ? 'Edge'
                : /Chrome/i.test(ua) ? 'Chrome'
                : /Safari/i.test(ua) ? 'Safari'
                : /Firefox/i.test(ua) ? 'Firefox'
                : 'Browser';
  return browser + ' di ' + platform;
}

// ==========================================
// FUNGSI LOGIN DENGAN GOOGLE
// ==========================================
window.loginWithGoogle = async function() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://exigent-one.vercel.app/dashboard.html'
    }
  });
  
  if (error) {
    alert('Gagal login dengan Google: ' + error.message);
  }
};

// ==========================================
// FORM LOGIN / DAFTAR EMAIL
// ==========================================
form.addEventListener('submit', (e) => {
  e.preventDefault();
  msg.hidden = true;
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || password.length < 6) return show('Isi email dan password minimal 6 karakter.');
  
  busy(form.querySelector('button'), async () => {
    // --- MODE LOGIN ---
    if (form.dataset.mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return show('Email atau password salah.');
      // Catat login sebagai notifikasi keamanan (fire and forget)
      try { await supabase.rpc('log_login_activity', { device_info: deviceInfo() }); } catch (_) { /* abaikan */ }
      location.replace('/dashboard.html');
      return;
    }
    
    // --- MODE DAFTAR (SIGN UP) ---
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return show(error.message);
    
    // Karena "Confirm email" sudah aktif, kita cuma kasih pesan sukses.
    show('Akun dibuat. Cek email untuk konfirmasi, lalu masuk.', true);
  });
});
