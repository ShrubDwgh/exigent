// PWA — service worker registration + install banner + auto reload

/* ============================================================
   1. REGISTRASI SERVICE WORKER
   ============================================================ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Cek update tiap 60 detik (kalau tab aktif)
      setInterval(() => { reg.update().catch(() => {}); }, 60000);

      // Detect service worker baru
      reg.addEventListener('updatefound', () => {
        const newSw = reg.installing;
        if (!newSw) return;
        newSw.addEventListener('statechange', () => {
          if (newSw.state === 'installed' && navigator.serviceWorker.controller) {
            // Versi baru siap. Auto reload.
            scheduleAutoReload();
          }
        });
      });
    }).catch((err) => console.warn('[pwa] SW register gagal:', err));

    // Kalau ada controller baru (artinya SW baru sudah ambil alih)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      // Tunggu 1 detik, baru reload
      setTimeout(() => location.reload(), 500);
    });
  });
}

/* ============================================================
   2. AUTO RELOAD SAAT VERSI BARU
   Cek apakah user lagi fokus di input/textarea. Kalau iya,
   tunggu sampai blur baru reload — biar tidak ganggu.
   ============================================================ */
function scheduleAutoReload() {
  const isTyping = () => {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
  };

  const tryReload = () => {
    if (isTyping()) {
      // Tunggu blur
      document.addEventListener('focusout', () => {
        setTimeout(tryReload, 800);
      }, { once: true });
      return;
    }
    // Kirim perintah skipWaiting ke SW yang waiting
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
      });
    }
  };

  // Kasih jeda 2 detik biar user sempat "selesai"
  setTimeout(tryReload, 2000);
}

/* ============================================================
   3. INSTALL BANNER
   Muncul setelah user aktif 30 detik (bisa disesuaikan)
   ============================================================ */
let deferredPrompt = null;
let installBannerShown = false;
let activeTimer = null;
let activeSeconds = 0;

const TRIGGER_SECONDS = 15;         // setelah 30 detik aktif
const DISMISS_KEY = 'exigent_install_dismiss_until';
const DISMISS_DAYS = 7;

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
}

function isDismissed() {
  try {
    const until = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
    return Date.now() < until;
  } catch (_) { return false; }
}

function setDismissed() {
  try {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
  } catch (_) {}
}

function canShowBanner() {
  return !isStandalone() && !isDismissed() && !installBannerShown;
}

/* ---------- Timer aktif ---------- */
function startActiveTimer() {
  if (activeTimer) return;
  activeTimer = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    activeSeconds += 1;
    if (activeSeconds >= TRIGGER_SECONDS && canShowBanner() && deferredPrompt) {
      showInstallBanner();
      stopActiveTimer();
    }
  }, 1000);
}
function stopActiveTimer() {
  if (activeTimer) { clearInterval(activeTimer); activeTimer = null; }
}

/* ---------- Event dari Chrome ---------- */
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!canShowBanner()) return;
  if (document.visibilityState === 'visible') startActiveTimer();
});

window.addEventListener('appinstalled', () => {
  installBannerShown = true;
  removeInstallBanner();
});

// Kalau user balik ke tab setelah lama, tetap hitung
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (canShowBanner() && deferredPrompt && activeSeconds < TRIGGER_SECONDS) startActiveTimer();
  } else {
    stopActiveTimer();
  }
});

/* ---------- Banner UI ---------- */
function showInstallBanner() {
  if (installBannerShown) return;
  installBannerShown = true;

  const banner = document.createElement('div');
  banner.className = 'install-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Install aplikasi');
  banner.innerHTML = `
    <div class="install-banner-in">
      <div class="install-banner-icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2v13"/>
          <path d="m19 9-7 7-7-7"/>
          <path d="M5 21h14"/>
        </svg>
      </div>
      <div class="install-banner-text">
        <strong>Install Exigent di HP</strong>
        <small>Akses lebih cepat, buka tanpa browser</small>
      </div>
      <div class="install-banner-actions">
        <button type="button" class="install-banner-later" data-dismiss>Nanti</button>
        <button type="button" class="install-banner-cta" data-install>Install</button>
      </div>
    </div>
  `;
  document.body.append(banner);

  // Animate in
  requestAnimationFrame(() => banner.classList.add('show'));

  banner.querySelector('[data-install]').onclick = async () => {
    if (!deferredPrompt) return;
    banner.querySelector('[data-install]').disabled = true;
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        // Biarkan event appinstalled yang handle
      } else {
        setDismissed();
        removeInstallBanner();
      }
    } catch (_) { /* diamkan */ }
    deferredPrompt = null;
  };

  banner.querySelector('[data-dismiss]').onclick = () => {
    setDismissed();
    removeInstallBanner();
  };
}

function removeInstallBanner() {
  const b = document.querySelector('.install-banner');
  if (!b) return;
  b.classList.remove('show');
  setTimeout(() => b.remove(), 250);
}

/* ---------- Fallback: iOS tidak trigger beforeinstallprompt ---------- */
// Untuk iOS, tampilkan banner dengan instruksi manual setelah 30 detik aktif
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
if (isIOS) {
  // iOS tidak punya beforeinstallprompt, jadi kita trigger sendiri
  const iosTrigger = () => {
    if (!canShowBanner()) return;
    if (document.visibilityState !== 'visible') return;
    activeSeconds += 1;
    if (activeSeconds >= TRIGGER_SECONDS) {
      showIOSInstallBanner();
      stopActiveTimer();
    }
  };
  const startIOSTimer = () => {
    if (activeTimer) return;
    activeTimer = setInterval(iosTrigger, 1000);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') startIOSTimer();
    else stopActiveTimer();
  });
  if (document.visibilityState === 'visible') startIOSTimer();
}

function showIOSInstallBanner() {
  if (installBannerShown) return;
  installBannerShown = true;

  const banner = document.createElement('div');
  banner.className = 'install-banner';
  banner.setAttribute('role', 'dialog');
  banner.innerHTML = `
    <div class="install-banner-in">
      <div class="install-banner-icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2v13"/>
          <path d="m19 9-7 7-7-7"/>
          <path d="M5 21h14"/>
        </svg>
      </div>
      <div class="install-banner-text">
        <strong>Install Exigent di HP</strong>
        <small>Tap <b>Share</b> lalu <b>Add to Home Screen</b></small>
      </div>
      <div class="install-banner-actions">
        <button type="button" class="install-banner-later" data-dismiss>Mengerti</button>
      </div>
    </div>
  `;
  document.body.append(banner);
  requestAnimationFrame(() => banner.classList.add('show'));

  banner.querySelector('[data-dismiss]').onclick = () => {
    setDismissed();
    removeInstallBanner();
  };
}
