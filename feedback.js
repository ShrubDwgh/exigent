import { supabase } from './supabase.js';
import { requireSession, busy, toast } from './auth.js';
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
      <img src="${s.url}" alt="">
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

$('f-shots').onchange = (e) => {
  const files = Array.from(e.target.files || []);
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    if (screenshotFiles.length >= 5) { toast('Maksimal 5 screenshot'); break; }
    screenshotFiles.push({ file, url: URL.createObjectURL(file) });
  }
  renderShots();
  e.target.value = '';
};

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
      c.toBlob((b) => resolve(b), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gagal baca gambar')); };
    img.src = url;
  });
}

async function uploadTo(bucket, path, blob, contentType) {
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType, upsert: false });
  if (error) throw error;
  return path;
}

$('fb-form').onsubmit = (e) => {
  e.preventDefault();
  const message = $('f-message').value.trim();
  if (!message) return toast('Pesan tidak boleh kosong');

  const btn = e.target.querySelector('button[type="submit"]');
  busy(btn, async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Sesi habis, silakan login ulang');

    const ts = Date.now();
    const base = `${user.id}/${ts}`;
    const shotPaths = [];

    for (let i = 0; i < screenshotFiles.length; i++) {
      const blob = await compressImage(screenshotFiles[i].file);
      const p = `${base}-${i}.jpg`;
      await uploadTo('feedback-files', p, blob, 'image/jpeg');
      shotPaths.push(p);
    }

    let audioPath = null;
    if (audioBlob) {
      const ext = audioBlob.type.includes('webm') ? 'webm' : 'ogg';
      audioPath = `${base}-voice.${ext}`;
      await uploadTo('feedback-files', audioPath, audioBlob, audioBlob.type);
    }

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
  });
};

$('back').onclick = () => (history.length > 1 ? history.back() : location.replace('/account.html'));

(async () => {
  applyNavLabels(t);
  window.lucide && window.lucide.createIcons();
  await requireSession();
})();
