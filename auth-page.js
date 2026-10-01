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
// ERROR STATE PADA INPUT
// ==========================================
const emailEl = document.getElementById('email');
const passEl = document.getElementById('password');

const errStyle = (el, on) => {
  if (!el) return;
  if (on) {
    el.style.borderColor = '#dc2626';
    el.style.boxShadow = '0 0 0 3px rgba(220,38,38,.12)';
  } else {
    el.style.borderColor = '';
    el.style.boxShadow = '';
  }
};

// Clear error saat user mengetik
[emailEl, passEl].forEach((el) => {
  if (!el) return;
  el.addEventListener('input', () => {
    errStyle(el, false);
    msg.hidden = true;
  });
});

// ==========================================
// FUNGSI LOGIN DENGAN GOOGLE
// ==========================================
window.loginWithGoogle = async function() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: 'https://exigent-one.vercel.app/dashboard.html' }
  });
  if (error) alert('Gagal login dengan Google: ' + error.message);
};

// ==========================================
// FORM LOGIN / DAFTAR EMAIL
// ==========================================
form.addEventListener('submit', (e) => {
  e.preventDefault();
  msg.hidden = true;
  errStyle(emailEl, false);
  errStyle(passEl, false);

  const email = emailEl.value.trim();
  const password = passEl.value;

  // Validasi: kosong / password pendek → tandai merah di fieldnya
  if (!email) { errStyle(emailEl, true); return; }
  if (password.length < 6) { errStyle(passEl, true); return; }

  busy(form.querySelector('button'), async () => {
    // --- MODE LOGIN ---
    if (form.dataset.mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Kredensial salah → tandai kedua field merah
        errStyle(emailEl, true);
        errStyle(passEl, true);
        return;
      }
      try { await supabase.rpc('log_login_activity', { device_info: deviceInfo() }); } catch (_) {}
      location.replace('/dashboard.html');
      return;
    }

    // --- MODE DAFTAR (SIGN UP) ---
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      // Kalau email sudah terdaftar → tandai merah field email
      if (/already registered|already exists|user already/i.test(error.message)) {
        errStyle(emailEl, true);
      } else {
        show(error.message);
      }
      return;
    }
    show('Akun dibuat. Cek email untuk konfirmasi, lalu masuk.', true);
  });
});
