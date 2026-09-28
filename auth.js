import { supabase } from './supabase.js';

export async function requireSession() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) { location.replace('/login.html'); return null; }
  return data.session;
}
export async function signOut() {
  await supabase.auth.signOut();
  location.replace('/login.html');
}
export async function busy(btn, fn) {
  btn.classList.add('loading'); btn.disabled = true;
  try { return await fn(); } finally { btn.classList.remove('loading'); btn.disabled = false; }
}
export function toast(text) {
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = text;
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}
