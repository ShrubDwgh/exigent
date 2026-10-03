import { supabase } from './supabase.js';
import { requireSession, toast } from './auth.js';
import { STRINGS, getLang, applyNavLabels } from './i18n.js';

const $ = (id) => document.getElementById(id);
const lang = getLang();
const t = (k) => (STRINGS[lang] && STRINGS[lang][k]) || STRINGS.en[k] || k;

let currentType = 'idea';
let screenshotFiles = [];
let audioBlob = null;
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingStart = 0;

const deviceInfo = () => {
  const ua = navigator.userAgent || '';
  const platform = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac/i.test(ua) ? 'Mac' : 'Unknown';
  const browser = /Edg/i.test(ua) ? 'Edge' : /Chrome/i.test(ua) ? 'Chrome' : /Safari/i.test(ua) ? 'Safari' : /Firefox/i.test(ua) ? 'Firefox' : 'Browser';
  return `${browser} di ${platform}`;
};

function setType(type) {
  currentType = type;
  $('tab-idea').setAttribute('aria-pressed', String(type === 'idea'));
  $('tab-bug').setAttribute('aria-pressed', String(type === 'bug'));
  $('f-message').placeholder = type === 'idea'
    ? 'Ceritakan ide atau saran kamu...'
    : 'Jelaskan masalah yang kamu temui, sedetail mungkin...';
}
$('tab-idea').onclick = () => setType('idea');
$('tab-bug').onclick = () => setType('bug');

/* ---------- Helper: file -> data URL ---------- */
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error || new Error('Gagal baca file'));
    r.readAsDataURL(file);
  });
}

/* ---------- Screenshot ---------- */
function renderShots() {
  const box = $('shot-list');
  box.innerHTML = screenshotFiles.map((s, i) => `
    <div class="shot-thumb">
      <img src="${s.url}" alt="" data-idx="${i}">
      <button type="button" class="shot-x" data-rm="${i}" aria-label="Hapus">×</button>
    </div>
  `).join('');

  // Fallback kalau <img> tetap gagal: pakai createImageBitmap -> canvas -> data URL
  box.querySelectorAll('img[data-idx]').forEach((img) => {
    img.onerror = async () => {
      const idx = +img.dataset.idx;
      const s = screenshotFiles[idx];
      if (!s) return;
      try {
        if (!('createImageBitmap' in window)) throw new Error('no bitmap');
        const bmp = await createImageBitmap(s.file);
        const c = document.createElement('canvas');
        c.width = bmp.width; c.height = bmp.height;
        c.getContext('2d').drawImage(bmp, 0, 0);
        img.src = c.toDataURL('image/jpeg', 0.85);
        bmp.close && bmp.close();
      } catch (e) {
        const div = document.createElement('div');
        div.textContent = 'Preview gagal';
        div.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#1E293B;border-radius:10px;color:#94A3B8;font-size:11px;text-align:center;padding:8px';
        img.replaceWith(div);
      }
    };
  });

  box.querySelectorAll('[data-rm]').forEach((b) => {
    b.onclick = () => {
      const i = +b.dataset.rm;
      screenshotFiles.splice(i, 1);
      renderShots();
    };
  });
}

$('f-shots').onchange = async (e) => {
  const files = Array.from(e.target.files || []);
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  for (const file of files) {
    if (!file.type || !allowed.includes(file.type)) {
      toast(`Format "${file.type || 'tidak dikenal'}" tidak didukung. Pakai JPG, PNG, WebP, atau GIF.`);
      continue;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast(`"${file.name}" terlalu besar (max 10 MB)`);
      continue;
    }
    if (screenshotFiles.length >= 5) { toast('Maksimal 5 screenshot'); break; }

    try {
      // Pakai data URL, bukan blob URL — lebih reliable di Android
      const dataUrl = await fileToDataURL(file);
      screenshotFiles.push({ file, url: dataUrl });
    } catch (err) {
      toast(`Gagal baca "${file.name}"`);
    }
  }
  renderShots();
  e.target.value = '';
};

/* ---------- Recording ---------- */
function pickAudioMime() {
  if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
  const opts = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ];
  for (const m of opts) {
    try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (_) {}
  }
  return '';
}

$('voice-record').onclick = async () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    return;
  }
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    return toast('Browser kamu tidak mendukung perekaman suara');
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    const mime = pickAudioMime();
    mediaRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (ev) => { if (ev.data && ev.data.size) audioChunks.push(ev.data); };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((tr) => tr.stop());
      const detectedType = (mediaRecorder.mimeType || mime || 'audio/webm').split(';')[0];
      audioBlob = new Blob(audioChunks, { type: detectedType });
      stopTimer();
      await showVoicePreview();
    };

    mediaRecorder.start(250);
    recordingStart = Date.now();
    startTimer();
    $('voice-record').innerHTML = '<i data-lucide="square" aria-hidden="true"></i><span>Stop rekaman</span><span class="rec-dot"></span>';
    window.lucide && window.lucide.createIcons();
  } catch (e) {
    toast('Tidak bisa akses mikrofon: ' + e.message);
  }
};

function startTimer() {
  recordingTimer = setInterval(() => {
    const s = Math.floor((Date.now() - recordingStart) / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    const label = $('voice-record').querySelector('span:not(.rec-dot)');
    if (label) label.textContent = `Rekam... ${mm}:${ss}`;
  }, 500);
}
function stopTimer() {
  if (recordingTimer) { clearInterval(recordingTimer); recordingTimer = null; }
  $('voice-record').innerHTML = '<i data-lucide="mic" aria-hidden="true"></i><span>Mulai merekam</span>';
  window.lucide && window.lucide.createIcons();
}

/* ---------- Custom Voice Player (Web Audio API) ---------- */
let audioCtx = null;
let audioBuffer = null;
let sourceNode = null;
let isPlaying = false;
let startedAt = 0;
let pausedAt = 0;
let progressRAF = null;

const playBtn = $('voice-play');
const trackWrap = $('voice-track-wrap');
const fillEl = $('voice-fill');
const dotEl = $('voice-dot');
const timeEl = $('voice-time');

function fmtTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function setPlayIcon(playing) {
  playBtn.innerHTML = playing
    ? '<i data-lucide="pause" aria-hidden="true"></i>'
    : '<i data-lucide="play" aria-hidden="true"></i>';
  window.lucide && window.lucide.createIcons();
}

function getCurrentTime() {
  if (!audioBuffer) return 0;
  if (isPlaying) return Math.min(audioCtx.currentTime - startedAt, audioBuffer.duration);
  return pausedAt;
}

function updateProgress() {
  if (!audioBuffer) {
    fillEl.style.width = '0%';
    dotEl.style.left = '0%';
    timeEl.textContent = '0:00 / 0:00';
    return;
  }
  const c = getCurrentTime();
  const d = audioBuffer.duration;
  const pct = d > 0 ? (c / d) * 100 : 0;
  fillEl.style.width = pct + '%';
  dotEl.style.left = pct + '%';
  timeEl.textContent = `${fmtTime(c)} / ${fmtTime(d)}`;
}

function tick() {
  if (!isPlaying || !audioBuffer) return;
  if (getCurrentTime() >= audioBuffer.duration - 0.03) {
    isPlaying = false;
    pausedAt = 0;
    setPlayIcon(false);
    updateProgress();
    progressRAF = null;
    return;
  }
  updateProgress();
  progressRAF = requestAnimationFrame(tick);
}

async function loadAudioBuffer(blob) {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  const arrayBuffer = await blob.arrayBuffer();
  audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  pausedAt = 0;
  isPlaying = false;
  updateProgress();
}

function playAudio() {
  if (!audioBuffer) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  sourceNode = audioCtx.createBufferSource();
  sourceNode.buffer = audioBuffer;
  sourceNode.connect(audioCtx.destination);
  sourceNode.onended = () => {
    if (!isPlaying) return;
    if (getCurrentTime() >= audioBuffer.duration - 0.05) {
      isPlaying = false;
      pausedAt = 0;
      setPlayIcon(false);
      updateProgress();
    }
  };
  sourceNode.start(0, pausedAt);
  startedAt = audioCtx.currentTime - pausedAt;
  isPlaying = true;
  setPlayIcon(true);
  if (progressRAF) cancelAnimationFrame(progressRAF);
  progressRAF = requestAnimationFrame(tick);
}

function pauseAudio() {
  if (!isPlaying) return;
  pausedAt = getCurrentTime();
  try { sourceNode.stop(); } catch (_) {}
  try { sourceNode.disconnect(); } catch (_) {}
  sourceNode = null;
  isPlaying = false;
  setPlayIcon(false);
  if (progressRAF) cancelAnimationFrame(progressRAF);
  progressRAF = null;
  updateProgress();
}

playBtn.onclick = () => {
  if (!audioBuffer) return;
  if (isPlaying) pauseAudio();
  else playAudio();
};

/* Seek */
let seeking = false;
function seekFromEvent(ev) {
  if (!audioBuffer) return;
  const rect = trackWrap.getBoundingClientRect();
  const x = (ev.clientX ?? 0) - rect.left;
  const ratio = Math.max(0, Math.min(1, x / rect.width));
  const newTime = ratio * audioBuffer.duration;
  if (isPlaying) {
    try { sourceNode.stop(); } catch (_) {}
    try { sourceNode.disconnect(); } catch (_) {}
    sourceNode = null;
    pausedAt = newTime;
    playAudio();
  } else {
    pausedAt = newTime;
    updateProgress();
  }
}
trackWrap.addEventListener('pointerdown', (e) => {
  seeking = true;
  try { trackWrap.setPointerCapture(e.pointerId); } catch (_) {}
  seekFromEvent(e);
});
trackWrap.addEventListener('pointermove', (e) => { if (seeking) seekFromEvent(e); });
trackWrap.addEventListener('pointerup', () => { seeking = false; });
trackWrap.addEventListener('pointercancel', () => { seeking = false; });

async function showVoicePreview() {
  $('voice-record').hidden = true;
  $('voice-preview').hidden = false;
  setPlayIcon(false);
  pausedAt = 0;
  try {
    await loadAudioBuffer(audioBlob);
  } catch (e) {
    console.error('[feedback] decode audio gagal:', e);
    toast('Audio tidak bisa diputar ulang, tapi tetap bisa dikirim');
    audioBuffer = null;
    updateProgress();
  }
}

$('voice-delete').onclick = () => {
  if (isPlaying) pauseAudio();
  audioBuffer = null;
  audioBlob = null;
  pausedAt = 0;
  updateProgress();
  $('voice-preview').hidden = true;
  $('voice-record').hidden = false;
};

/* ---------- Image compress dengan fallback ---------- */
function compressImage(file, maxSize = 1280, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth, h = img.naturalHeight;
      const scale = Math.min(1, maxSize / Math.max(w, h));
      w = Math.round(w * scale); h = Math.round(h * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      c.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('toBlob null'));
      }, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gagal baca gambar')); };
    img.src = url;
  });
}

async function prepareImage(file) {
  try {
    const blob = await compressImage(file);
    return { blob, ext: 'jpg', contentType: 'image/jpeg' };
  } catch (err) {
    console.warn('[feedback] compress gagal, pakai file asli:', err);
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const map = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
    return { blob: file, ext, contentType: file.type || map[ext] || 'image/png' };
  }
}

async function uploadTo(bucket, path, blob, contentType) {
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType, upsert: false });
  if (error) throw error;
  return path;
}

/* ---------- Submit ---------- */
$('fb-form').onsubmit = async (e) => {
  e.preventDefault();
  const message = $('f-message').value.trim();
  if (!message) return toast('Pesan tidak boleh kosong');

  const btn = e.target.querySelector('button[type="submit"]');
  const originalHTML = btn.innerHTML;

  btn.disabled = true;
  btn.style.opacity = '0.7';
  btn.innerHTML = '<span>Mengirim...</span>';

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Sesi habis, silakan login ulang');

    const ts = Date.now();
    const base = `${user.id}/${ts}`;
    const shotPaths = [];

    for (let i = 0; i < screenshotFiles.length; i++) {
      btn.innerHTML = `<span>Mengunggah gambar ${i + 1}/${screenshotFiles.length}...</span>`;
      const { blob, ext, contentType } = await prepareImage(screenshotFiles[i].file);
      const p = `${base}-${i}.${ext}`;
      await uploadTo('feedback-files', p, blob, contentType);
      shotPaths.push(p);
    }

    let audioPath = null;
    if (audioBlob) {
      btn.innerHTML = '<span>Mengunggah voice note...</span>';
      const t0 = (audioBlob.type || '').toLowerCase();
      const ext = t0.includes('ogg') ? 'ogg' : t0.includes('mp4') ? 'm4a' : 'webm';
      const ct = t0.includes('ogg') ? 'audio/ogg' : t0.includes('mp4') ? 'audio/mp4' : 'audio/webm';
      audioPath = `${base}-voice.${ext}`;
      await uploadTo('feedback-files', audioPath, audioBlob, ct);
    }

    btn.innerHTML = '<span>Menyimpan...</span>';
    const { error } = await supabase.from('feedback').insert({
      user_id: user.id,
      type: currentType,
      message,
      screenshot_urls: shotPaths,
      audio_url: audioPath,
      device_info: deviceInfo(),
      status: 'new',
    });
    if (error) throw error;

    toast('Terima kasih! Masukanmu sudah kami terima.');
    setTimeout(() => location.replace('/account.html'), 1200);
  } catch (err) {
    console.error('[feedback] gagal kirim:', err);
    toast('Gagal: ' + (err.message || 'Coba lagi'));
    btn.disabled = false;
    btn.style.opacity = '';
    btn.innerHTML = originalHTML;
    window.lucide && window.lucide.createIcons();
  }
};

$('back').onclick = () => (history.length > 1 ? history.back() : location.replace('/account.html'));

(async () => {
  applyNavLabels(t);
  window.lucide && window.lucide.createIcons();
  await requireSession();
})();
