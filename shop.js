import { supabase } from './supabase.js';
import { requireSession } from './auth.js';
import { STRINGS, getLang, applyNavLabels } from './i18n.js';

const $ = (id) => document.getElementById(id);
const main = $('shop-main');
const icons = () => window.lucide && window.lucide.createIcons();
const lang = getLang();
const t = (k) => (STRINGS[lang] && STRINGS[lang][k]) || STRINGS.en[k] || k;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let allProducts = [];
let activeCategory = 'all';
let searchQuery = '';

/* ---------- Utils ---------- */
const fmtPrice = (n) => {
  if (!n) return '-';
  try { return new Intl.NumberFormat(lang === 'id' ? 'id-ID' : 'en', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n); }
  catch (_) { return 'Rp ' + n; }
};

/* ---------- Header ---------- */
function renderHeader() {
  $('appbar-lead').innerHTML = `
    <button type="button" class="icon-btn" id="back" aria-label="${lang === 'id' ? 'Kembali' : 'Back'}">
      <i data-lucide="chevron-left" aria-hidden="true"></i>
    </button>
    <h1 class="appbar-title sub">${lang === 'id' ? 'Toko' : 'Shop'}</h1>`;
  const back = $('back');
  if (back) back.onclick = () => (history.length > 1 ? history.back() : location.replace('/dashboard.html'));
}

/* ---------- Product Card ---------- */
function productCard(p) {
  const hasDiscount = p.discount_percent && p.discount_percent > 0 && p.original_price;
  const img = p.image_url
    ? `<div style="width:100%;height:200px;border-radius:12px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;overflow:hidden">
         <img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy" style="max-width:100%;max-height:100%;object-fit:contain;display:block">
       </div>`
    : `<div style="width:100%;height:200px;background:linear-gradient(135deg,#dbeafe,#eff6ff);border-radius:12px;display:flex;align-items:center;justify-content:center;color:#2563eb">
         <i data-lucide="package" style="width:44px;height:44px" aria-hidden="true"></i>
       </div>`;

  let topBadge = '';
  if (hasDiscount) {
    topBadge = `<span style="position:absolute;top:10px;left:10px;background:#dc2626;color:#fff;font-size:11px;font-weight:700;padding:4px 8px;border-radius:6px;z-index:1">🔥 ${lang === 'id' ? 'Diskon' : 'Sale'} ${p.discount_percent}%</span>`;
  } else if (p.badge) {
    topBadge = `<span style="position:absolute;top:10px;left:10px;background:#2563eb;color:#fff;font-size:11px;font-weight:700;padding:4px 8px;border-radius:6px;z-index:1">${esc(p.badge)}</span>`;
  }

  const priceHtml = hasDiscount
    ? `<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
         <strong style="font-size:17px;color:#10b981">${fmtPrice(p.price)}</strong>
         <small style="text-decoration:line-through;color:#9ca3af;font-size:13px">${fmtPrice(p.original_price)}</small>
       </div>`
    : `<strong style="font-size:17px;color:#10b981">${fmtPrice(p.price)}</strong>`;

  const codeHtml = p.code
    ? `<div style="font-size:11px;color:#6b7280;font-family:monospace;background:#f3f4f6;padding:3px 8px;border-radius:6px;display:inline-block;margin-top:6px">${esc(p.code)}</div>`
    : '';

  const buyBtn = p.shopee_url
    ? `<a class="btn btn-secondary btn-sm" href="${esc(p.shopee_url)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;white-space:nowrap">
         <i data-lucide="external-link" style="width:14px;height:14px" aria-hidden="true"></i>
         ${lang === 'id' ? 'Beli' : 'Buy'}
       </a>`
    : `<span class="badge badge-inactive">${lang === 'id' ? 'Segera' : 'Soon'}</span>`;

  return `<div class="card stack-lg" style="padding:12px;position:relative;display:flex;flex-direction:column;gap:12px">
    ${topBadge}
    ${img}
    <div style="flex:1;min-width:0">
      <h3 style="margin:0;font-size:15px;font-weight:700;color:#111827;line-height:1.3">${esc(p.name)}</h3>
      ${p.description ? `<p class="muted small" style="margin:6px 0 0;line-height:1.5;font-size:13px">${esc(p.description)}</p>` : ''}
      ${codeHtml}
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
      ${priceHtml}
      ${buyBtn}
    </div>
  </div>`;
}

/* ---------- Filter & Search ---------- */
function renderFilters() {
  const cats = [
    { key: 'all', label: lang === 'id' ? 'Semua' : 'All' },
    { key: 'nfc', label: 'NFC' },
    { key: 'template', label: 'Template' },
  ];
  return `<div id="filter-tabs" style="display:flex;gap:8px;margin-bottom:12px;overflow-x:auto;padding-bottom:4px">
    ${cats.map((c) => {
      const active = activeCategory === c.key;
      return `<button type="button" data-cat="${c.key}" style="
        flex-shrink:0;
        padding:8px 16px;
        border-radius:20px;
        border:1px solid ${active ? '#2563eb' : '#e5e7eb'};
        background:${active ? '#2563eb' : '#fff'};
        color:${active ? '#fff' : '#374151'};
        font-size:13px;
        font-weight:600;
        cursor:pointer;
        font-family:inherit;
        transition:all .15s;
      ">${c.label}</button>`;
    }).join('')}
  </div>`;
}

function bindFilterButtons() {
  main.querySelectorAll('[data-cat]').forEach((btn) => {
    btn.onclick = () => {
      activeCategory = btn.dataset.cat;
      refreshFilterTabs();
      renderProductList();
    };
  });
}

function refreshFilterTabs() {
  const old = $('filter-tabs');
  if (!old) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = renderFilters();
  const fresh = tmp.firstElementChild;
  old.replaceWith(fresh);
  bindFilterButtons();
}

function renderSearchBar() {
  return `<div style="margin-bottom:16px;position:relative">
    <i data-lucide="search" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);width:18px;height:18px;color:#9ca3af;pointer-events:none" aria-hidden="true"></i>
    <input
      type="text"
      id="search-input"
      value="${esc(searchQuery)}"
      placeholder="${lang === 'id' ? 'Cari produk atau kode template...' : 'Search product or template code...'}"
      style="width:100%;padding:12px 14px 12px 42px;border:1px solid #e5e7eb;border-radius:10px;font-size:14px;font-family:inherit;box-sizing:border-box;background:#fff"
    >
  </div>`;
}

function bindSearch() {
  const input = $('search-input');
  if (!input) return;
  let timer;
  input.oninput = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      searchQuery = input.value.trim().toLowerCase();
      renderProductList(true);
    }, 250);
  };
}

/* ---------- Render List ---------- */
function filterProducts() {
  let list = allProducts;
  if (activeCategory !== 'all') list = list.filter((p) => p.category === activeCategory);
  if (searchQuery) {
    list = list.filter((p) =>
      (p.name || '').toLowerCase().includes(searchQuery) ||
      (p.description || '').toLowerCase().includes(searchQuery) ||
      (p.code || '').toLowerCase().includes(searchQuery)
    );
  }
  return list;
}

function renderProductList(keepFocus) {
  const filtered = filterProducts();
  const listEl = $('product-list');
  if (!listEl) return;

  if (!filtered.length) {
    listEl.innerHTML = `<div class="card"><p class="muted" style="text-align:center;padding:20px 0">
      ${lang === 'id' ? 'Tidak ada produk yang cocok.' : 'No matching products.'}
    </p></div>`;
    icons();
    return;
  }

  listEl.innerHTML = `<div style="display:grid;grid-template-columns:1fr;gap:12px">${filtered.map(productCard).join('')}</div>`;
  icons();

  if (keepFocus) {
    const inp = $('search-input');
    if (inp) {
      inp.focus();
      const len = inp.value.length;
      try { inp.setSelectionRange(len, len); } catch (_) {}
    }
  }
}

/* ---------- Load ---------- */
async function loadProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_available', true)
    .order('sort_order', { ascending: true });

  if (error) {
    main.innerHTML = `<h1>${lang === 'id' ? 'Toko' : 'Shop'}</h1>
      <div class="card"><p class="muted">${lang === 'id' ? 'Gagal memuat produk.' : 'Failed to load products.'}</p></div>`;
    return;
  }

  allProducts = data || [];

  main.innerHTML = `
    <h1>${lang === 'id' ? 'Toko' : 'Shop'}</h1>
    <p class="muted" style="margin-bottom:16px;line-height:1.5">${lang === 'id'
      ? 'Pilih produk kartu NFC & template favoritmu. Pembelian melalui Shopee untuk kemudahan & keamanan transaksi.'
      : 'Choose your favorite NFC card & template. Purchases via Shopee for secure & easy transactions.'}</p>
    ${renderSearchBar()}
    ${renderFilters()}
    <div id="product-list"></div>`;

  icons();
  bindFilterButtons();
  bindSearch();
  renderProductList();
}

/* ---------- Init ---------- */
(async () => {
  applyNavLabels(t);
  renderHeader();
  icons();
  const s = await requireSession();
  if (!s) return;
  loadProducts();
})();
