// Helper status izin browser (Lokasi & NFC). Dipakai layar
// Akun → Pengaturan → Perizinan & Pengaturan Lanjutan (account.js).

// Memantau izin `name` ('geolocation' | 'nfc'). `onState` dipanggil dengan
// 'granted' | 'denied' | 'prompt', atau null bila browser tidak mendukung.
export async function watchPermission(name, onState) {
  if (!navigator.permissions || !navigator.permissions.query) { onState(null); return; }
  try {
    const status = await navigator.permissions.query({ name });
    onState(status.state);
    status.onchange = () => onState(status.state);
  } catch (_) {
    onState(null);
  }
}

// Memicu dialog izin lokasi bawaan sistem (hanya jika status masih "prompt").
export function requestGeolocation() {
  if (navigator.geolocation) navigator.geolocation.getCurrentPosition(() => {}, () => {});
}
