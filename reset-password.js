import { supabase } from './supabase.js';

window.lucide && window.lucide.createIcons();
const form = document.getElementById('form');
const msg = document.getElementById('msg');
const passEl = document.getElementById('password');
const pass2El = document.getElementById('password2');

const show = (text, ok) => {
  msg.textContent = text;
  msg.className = 'msg' + (ok ? ' ok' : '');
  msg.hidden = false;
};
const errStyle = (el, on) => {
  if (on) {
    el.style.borderColor = '#dc2626';
    el.style.boxShadow = '0 0 0 3px rgba(220,38,38,.12)';
  } else {
    el.style.borderColor = '';
    el.style.boxShadow = '';
  }
};

[passEl, pass2El].forEach((el) => {
  el.addEventListener('input', () => { errStyle(el, false); msg.hidden = true; });
});

// Validasi password kuat (sama dengan auth-page.js)
function validatePassword(password) {
  const errors = [];
  if (password.length < 8) errors.push('minimal 8 karakter');
  if (!/[A-Z]/.test(password)) errors.push('huruf besar');
  if (!/[a-z]/.test(password)) errors.push('huruf kecil');
  if (!/[0-9]/.test(password)) errors.push('angka');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('simbol');
  return errors;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.hidden = true;
  errStyle(passEl, false);
  errStyle(pass2El, false);

  const a = passEl.value;
  const b = pass2El.value;

  if (!a) { errStyle(passEl, true); return; }
  if (!b) { errStyle(pass2El, true); return; }

  const pwErrors = validatePassword(a);
  if (pwErrors.length) {
    errStyle(passEl, true);
    show('Password lemah: ' + pwErrors.join(', ') + '.');
    return;
  }
  if (a !== b) {
    errStyle(pass2El, true);
    show('Konfirmasi password nggak cocok.');
    return;
  }

  const btn = form.querySelector('button');
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = 'Menyimpan...';

  try {
    const { error } = await supabase.auth.updateUser({ password: a });
    if (error) {
      show('Gagal: ' + error.message);
    } else {
      show('Password berhasil diubah! Mengalihkan ke login...', true);
      setTimeout(() => location.replace('/login.html'), 2000);
    }
  } catch (err) {
    show('Terjadi kesalahan: ' + (err.message || err));
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
});
