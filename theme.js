// theme.js — Dark/Light mode toggle
const THEME_KEY = 'exigent_theme';

function getStoredTheme() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'dark' || v === 'light') return v;
  } catch (_) {}
  return null;
}

function getSystemTheme() {
  try {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch (_) { return 'light'; }
}

function getActiveTheme() {
  return document.documentElement.getAttribute('data-theme') || getStoredTheme() || getSystemTheme();
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  updateButton();
}

function toggleTheme() {
  const cur = getActiveTheme();
  const next = cur === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
  applyTheme(next);
}

function updateButton() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const cur = getActiveTheme();
  const iconName = cur === 'dark' ? 'sun' : 'moon';
  btn.innerHTML = `<i data-lucide="${iconName}" aria-hidden="true"></i>`;
  btn.setAttribute('aria-label', cur === 'dark' ? 'Mode terang' : 'Mode gelap');
  if (window.lucide) window.lucide.createIcons();
}

function injectToggle() {
  if (document.getElementById('theme-toggle')) return;
  const bell = document.getElementById('bell');
  if (!bell) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'theme-toggle';
  btn.className = 'icon-btn';
  btn.addEventListener('click', toggleTheme);
  bell.parentNode.insertBefore(btn, bell.nextSibling);
  updateButton();
}

// Apply theme ASAP
applyTheme(getActiveTheme());

// Inject button
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectToggle);
} else {
  injectToggle();
}

// Listen OS preference changes (hanya kalau user belum set manual)
try {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!getStoredTheme()) applyTheme(e.matches ? 'dark' : 'light');
  });
} catch (_) {}
