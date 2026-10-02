/**
 * trial.js
 * Helper untuk cek status trial, paid, dan premium user.
 * Dipakai di dashboard.js, account.js, dan halaman lain.
 */

export const TRIAL_DAYS = 3;

/**
 * Ambil status lengkap dari objek card.
 * @param {Object} card - objek card dari Supabase
 * @returns {{ status: 'none'|'trial'|'paid'|'premium'|'expired', daysLeft?: number, hoursLeft?: number }}
 */
export function getTrialStatus(card) {
  if (!card) return { status: 'none' };

  // Sudah beli kartu fisik = akses penuh
  if (card.has_purchased_card === true) {
    return { status: 'paid' };
  }

  // Punya langganan premium aktif
  if (card.premium_until && new Date(card.premium_until) > new Date()) {
    return { status: 'premium' };
  }

  // Belum beli — cek trial
  if (!card.trial_ends_at) {
    return { status: 'expired' };
  }

  const now = new Date();
  const ends = new Date(card.trial_ends_at);
  const diffMs = ends.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { status: 'expired' };
  }

  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.ceil(diffMs / (1000 * 60 * 60));

  return { status: 'trial', daysLeft, hoursLeft };
}

/**
 * Bisa edit data medis atau tidak.
 * True jika: trial aktif, sudah beli, atau premium aktif.
 * @param {Object} card
 * @returns {boolean}
 */
export function canEdit(card) {
  const s = getTrialStatus(card);
  return s.status === 'trial' || s.status === 'paid' || s.status === 'premium';
}

/**
 * Bisa pakai fitur NFC atau tidak.
 * Hanya kalau sudah beli kartu fisik.
 * @param {Object} card
 * @returns {boolean}
 */
export function canUseNfc(card) {
  return card && card.has_purchased_card === true;
}

/**
 * Bisa akses fitur premium atau tidak.
 * @param {Object} card
 * @returns {boolean}
 */
export function isPremium(card) {
  if (!card) return false;
  if (card.has_purchased_card === true) return true;
  if (card.premium_until && new Date(card.premium_until) > new Date()) return true;
  return false;
}

/**
 * Format sisa waktu jadi string ramah baca.
 * Contoh: "3 hari", "5 jam", "Trial berakhir"
 * @param {Object} card
 * @returns {string}
 */
export function formatTimeLeft(card) {
  const s = getTrialStatus(card);
  if (s.status === 'paid') return 'Aktif';
  if (s.status === 'premium') return 'Premium';
  if (s.status === 'expired') return 'Trial berakhir';
  if (s.status === 'trial') {
    if (s.daysLeft >= 1) return `${s.daysLeft} hari tersisa`;
    return `${s.hoursLeft} jam tersisa`;
  }
  return '-';
}
