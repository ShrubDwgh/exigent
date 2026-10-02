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

  if (card.has_purchased_card === true) {
    return { status: 'paid' };
  }

  if (card.premium_until && new Date(card.premium_until) > new Date()) {
    return { status: 'premium' };
  }

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
 */
export function canEdit(card) {
  const s = getTrialStatus(card);
  return s.status === 'trial' || s.status === 'paid' || s.status === 'premium';
}

/**
 * Bisa pakai fitur NFC atau tidak.
 */
export function canUseNfc(card) {
  return card && card.has_purchased_card === true;
}

/**
 * Bisa akses fitur premium atau tidak.
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

/**
 * Countdown ramah baca dengan format bertingkat.
 * Contoh: "2 hari 5 jam", "5 jam 30 menit", "45 menit", "< 1 menit"
 */
export function getTrialCountdown(card) {
  const s = getTrialStatus(card);
  if (s.status === 'paid') return 'Aktif selamanya';
  if (s.status === 'premium') return 'Premium aktif';
  if (s.status === 'expired') return 'Trial habis';
  if (s.status !== 'trial') return '';

  const now = Date.now();
  const ends = new Date(card.trial_ends_at).getTime();
  const diffMs = ends - now;
  if (diffMs <= 0) return 'Trial habis';

  const totalMin = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;

  if (days >= 1) return `${days} hari ${hours} jam`;
  if (hours >= 1) return `${hours} jam ${mins} menit`;
  if (mins >= 1) return `${mins} menit`;
  return 'Kurang dari 1 menit';
}
