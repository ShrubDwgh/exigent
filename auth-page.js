import { supabase } from './supabase.js';
import { busy } from './auth.js';

window.lucide && window.lucide.createIcons();
const form = document.getElementById('form');
const msg = document.getElementById('msg');
const show = (text, ok) => { msg.textContent = text; msg.className = 'msg' + (ok ? ' ok' : ''); msg.hidden = false; };

supabase.auth.getSession().then(({ data }) => { if (data.session) location.replace('/dashboard.html'); });

form.addEventListener('submit', (e) => {
  e.preventDefault();
  msg.hidden = true;
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || password.length < 6) return show('Isi email dan password minimal 6 karakter.');
  busy(form.querySelector('button'), async () => {
    if (form.dataset.mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? show('Email atau password salah.') : location.replace('/dashboard.html');
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return show(error.message);
    if (data.session) return location.replace('/dashboard.html');
    show('Akun dibuat. Cek email untuk konfirmasi, lalu masuk.', true);
  });
});
