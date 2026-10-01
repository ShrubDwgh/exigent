import { supabase } from './supabase.js';

window.lucide && window.lucide.createIcons();
const form = document.getElementById('form');
const msg = document.getElementById('msg');
const emailEl = document.getElementById('email');

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

emailEl.addEventListener('input', () => {
  errStyle(emailEl, false);
  msg.hidden = true;
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.hidden = true;
  errStyle(emailEl, false);

  const email = emailEl.value.trim().toLowerCase();
  if (!email) { errStyle(emailEl, true); return; }

  const btn = form.querySelector('button');
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = 'Mengirim...';

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://exigent-one.vercel.app/reset-password.html',
    });
    if (error) {
      show('Gagal mengirim email: ' + error.message);
    } else {
      show('Link reset sudah dikirim. Cek inbox (dan folder spam) email kamu.', true);
      form.reset();
    }
  } catch (err) {
    show('Terjadi kesalahan: ' + (err.message || err));
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
});
