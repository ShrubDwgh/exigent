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

function renderShots() {
  const box = $('shot-list');
  box.innerHTML = screenshotFiles.map((s, i) => `
    <div class="shot-thumb">
      <img src="${s.url}" alt="" onerror="this.style.display='none';this.parentElement.insertAdjacentHTML('beforeend','<div style=\\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#1E293B;border-radius:10px;color:#94A3B8;font-size:11px;text-align:center;padding:8px\\'>Preview gagal</div>')">
      <button type="button" class="shot-x" data-rm="${i}" aria-label="Hapus">×</button>
    </div>
  `).join('');
  box.querySelectorAll('[data-rm]').forEach((b) => {
    b.onclick = () => {
      const i = +b.dataset.rm;
      URL.revokeObjectURL(screenshotFiles[i].url);
      screenshotFiles.splice(i, 1);
      renderShots();
    };
  });
}

/* ---------- Screenshot input (dengan validasi format) ---------- */
$('f-shots').onchange = (e) => {
  const files = Array.from(e.target.files || []);
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  for (const file of files) {
    if (!file.type) {
      toast(`File "${file.name}" tidak dikenali. Pakai JPG atau PNG.`);
      continue;
    }
    if (!allowed.includes(file.type)) {
      toast(`Format "${file.type}" tidak didukung. Pakai JPG, PNG, WebP, atau GIF.`);
      continue;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast(`"${file.name}" terlalu besar (max 10 MB)`);
      continue;
    }
    if (screenshotFiles.length >= 5) { toast('Maksimal 5 screenshot'); break; }
    screenshotFiles.push({ file, url: URL.createObjectURL(file) });
  }
  renderShots();
  e.target.value = '';
};

/* ---------- Voice recording ---------- */
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
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (ev) => { if (ev.data.size) audioChunks.push(ev.data); };
    mediaRecorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      stopTimer();
      showVoicePreview();
    };
    mediaRecorder.start();
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

function showVoicePreview() {
  $('voice-record').hidden = true;
  $('voice-preview').hidden = false;
  const url = URL.createObjectURL(audioBlob);
  $('voice-audio').src = url;
}

$('voice-delete').onclick = () => {
  audioBlob = null;
  $('voice-preview').hidden = true;
  $('voice-record').hidden = false;
  $('voice-audio').src = '';
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

    // Upload screenshot
    for (let i = 0; i < screenshotFiles.length; i++) {
      btn.innerHTML = `<span>Mengunggah gambar ${i + 1}/${screenshotFiles.length}...</span>`;
      const { blob, ext, contentType } = await prepareImage(screenshotFiles[i].file);
      const p = `${base}-${i}.${ext}`;
      await uploadTo('feedback-files', p, blob, contentType);
      shotPaths.push(p);
    }

    // Upload audio
    let audioPath = null;
    if (audioBlob) {
      btn.innerHTML = '<span>Mengunggah voice note...</span>';
      const ext = audioBlob.type.includes('webm') ? 'webm' : 'ogg';
      audioPath = `${base}-voice.${ext}`;
      await uploadTo('feedback-files', audioPath, audioBlob, audioBlob.type);
    }

    // Insert row
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
