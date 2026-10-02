import { supabase } from './supabase.js';
import { requireSession, busy, toast } from './auth.js';
import { STRINGS, getLang, applyNavLabels } from './i18n.js';
import { esc, openSheet } from './ui.js';

const $ = (id) => document.getElementById(id);
const main = $('upg-main');
const icons = () => window.lucide && window.lucide.createIcons();
let lang = getLang();
const t = (k) => (STRINGS[lang] && STRINGS[lang][k]) || STRINGS.en[k] || k;
const esc2 = esc;

let session = null;

// ==========================================
// KONFIGURASI — GANTI DI SINI
// ==========================================
const SHOPEE_URL = 'https://shopee.co.id/'; // TODO: ganti dengan link toko kamu

const PACKAGES = [
  { id: 'single',    cards: 1, price: 69000,  priceLabel: 'Rp69.000',  saveAmount: null,       popular: false },
  { id: 'family',    cards: 3, price: 179000, priceLabel: 'Rp179.000', saveAmount: 'Rp28.000', popular: true  },
  { id: 'community', cards: 5, price: 269000, priceLabel: 'Rp269.000', saveAmount: 'Rp76.000', popular: false },
];

const FAQS = [
  { q: 'upgrade_faq_q1', a: 'upgrade_faq_a1' },
  { q: 'upgrade_faq_q2', a: 'upgrade_faq_a2' },
  { q: 'upgrade_faq_q3', a: 'upgrade_faq_a3' },
  { q: 'upgrade_faq_q4', a: 'upgrade_faq_a4' },
];

// ==========================================
// RENDER
// ==========================================
function renderAppbar() {
  $('appbar-lead').innerHTML = `
    <button type="button" class="icon-btn" id="back" aria-label="${esc2(t('upgrade_back'))}">
      <i data-lucide="chevron-left" aria-hidden="true"></i>
    </button>
    <h1 class="appbar-title sub">${esc2(t('upgrade_title'))}</h1>`;
  const back = $('back');
  if (back) back.onclick = () => {
    if (history.length > 1) history.back();
    else location.href = '/dashboard.html';
  };
}

function packageHtml(pkg) {
  const idx = PACKAGES.indexOf(pkg);
  const name = t(`upgrade_pkg${idx + 1}_name`);
  const desc = t(`upgrade_pkg${idx + 1}_desc`);
  const popular = pkg.popular
    ? `<span class="badge badge-active" style="position:absolute;top:-10px;right:14px;border-radius:8px;display:inline-flex;align-items:center;gap:4px"><i data-lucide="star" style="width:14px;height:14px" aria-hidden="true"></i> ${esc2(t('upgrade_popular'))}</span>`
    : '';
  const save = pkg.saveAmount
    ? `<p class="muted small" style="margin:6px 0 0;color:#16a34a;font-weight:600">${esc2(t('upgrade_save').replace('{amount}', pkg.saveAmount))}</p>`
    : '';
  const cardsIcon = Array(pkg.cards).fill(0).map(() => `<i data-lucide="credit-card" style="width:22px;height:22px;color:var(--red)" aria-hidden="true"></i>`).join('');

  return `<div class="card stack-lg" style="position:relative;${pkg.popular ? 'border-color:#DC2626;border-width:2px' : ''}">
    ${popular}
    <div style="display:flex;justify-content:center;gap:4px;padding:8px 0 4px">${cardsIcon}</div>
    <div style="text-align:center">
      <h3 style="margin:0 0 4px;font-size:1.125rem;font-weight:700">${esc2(name)}</h3>
      <p class="muted small" style="margin:0">${esc2(desc)}</p>
    </div>
    <div style="text-align:center">
      <p style="margin:8px 0 0;font-size:1.75rem;font-weight:800;color:var(--red)">${pkg.priceLabel}</p>
      ${save}
    </div>
    <button class="btn ${pkg.popular ? '' : 'btn-secondary'} btn-block" data-buy="${pkg.id}">
      <i data-lucide="shopping-bag" aria-hidden="true"></i> ${esc2(t('upgrade_buy'))}
    </button>
  </div>`;
}

function render() {
  renderAppbar();
  main.innerHTML = `<section class="screen stack-lg">
    <div>
      <h2 style="font-size:1.5rem;font-weight:800;margin:0 0 8px">${esc2(t('upgrade_title'))}</h2>
      <p class="muted" style="margin:0">${esc2(t('upgrade_lead'))}</p>
    </div>

    <div class="card stack-sm">
      <h3 style="margin:0 0 8px;font-size:1rem;font-weight:700;display:flex;align-items:center;gap:6px"><i data-lucide="sparkles" style="width:18px;height:18px;color:var(--red)" aria-hidden="true"></i> ${esc2(t('upgrade_benefit_title'))}</h3>
      <ul style="margin:0;padding-left:20px;color:#4b5563;font-size:0.9375rem;line-height:1.8">
        <li>${esc2(t('upgrade_b1'))}</li>
        <li>${esc2(t('upgrade_b2'))}</li>
        <li>${esc2(t('upgrade_b3'))}</li>
        <li>${esc2(t('upgrade_b4'))}</li>
      </ul>
    </div>

    ${PACKAGES.map(packageHtml).join('')}

    <div>
      <h3 style="font-size:1.125rem;font-weight:700;margin:8px 0 12px">${esc2(t('upgrade_faq_title'))}</h3>
      <div class="menu-stack">
        ${FAQS.map((f) => `<div class="card menu" style="padding:0">
          <details class="faq-item" style="padding:0">
            <summary style="cursor:pointer;font-weight:600;list-style:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px">
              <span>${esc2(t(f.q))}</span>
              <i data-lucide="chevron-down" style="width:20px;height:20px;flex:none;color:var(--muted);transition:transform .2s" aria-hidden="true"></i>
            </summary>
            <p class="muted small" style="margin:0;padding:0 16px 16px;line-height:1.6">${esc2(t(f.a))}</p>
          </details>
        </div>`).join('')}
      </div>
    </div>

    <div class="card stack-sm" style="text-align:center">
      <h3 style="margin:0;font-size:1rem;font-weight:700">${esc2(t('upgrade_help_title'))}</h3>
      <p class="muted small" style="margin:4px 0 8px">${esc2(t('upgrade_help_desc'))}</p>
      <button class="btn btn-outline btn-block" id="cs-btn">
        <i data-lucide="headset" aria-hidden="true"></i> ${esc2(t('upgrade_help_btn'))}
      </button>
    </div>
  </section>`;

  icons();

  main.querySelectorAll('[data-buy]').forEach((btn) => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-buy');
      const pkg = PACKAGES.find((p) => p.id === id);
      if (!pkg) return;
      window.open(SHOPEE_URL, '_blank', 'noopener');
      toast(`Membuka Shopee: ${pkg.priceLabel}`);
    };
  });

  const csBtn = $('cs-btn');
  if (csBtn) csBtn.onclick = () => { location.href = '/account.html#/help'; };
}

// ==========================================
// MULAI
// ==========================================
document.documentElement.lang = lang;
applyNavLabels(t);
render();

requireSession().then((s) => {
  if (!s) return;
  session = s;
});
