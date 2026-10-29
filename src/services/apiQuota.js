/**
 * Gemini API Kota & İstek Takip Sistemi
 * Google AI Studio Ücretsiz Katman:
 * - 1,500 RPD (Requests Per Day - Günlük İstek)
 * - 15 RPM (Requests Per Minute - Dakikalık İstek)
 * - 1,000,000 TPM (Tokens Per Minute)
 */

const STORAGE_KEY = 'lore_gemini_api_quota';
const DAILY_LIMIT = 1500;
const RPM_LIMIT = 15;

function getTodayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function getQuotaStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const today = getTodayString();
    let data = raw ? JSON.parse(raw) : null;

    if (!data || data.date !== today) {
      data = {
        date: today,
        requestsToday: 0,
        lastRequestTime: null,
        history: data?.history || {}
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    const used = data.requestsToday || 0;
    const remaining = Math.max(0, DAILY_LIMIT - used);
    const percentUsed = Math.min(100, (used / DAILY_LIMIT) * 100);
    const percentRemaining = Math.max(0, 100 - percentUsed);

    return {
      date: today,
      used,
      remaining,
      dailyLimit: DAILY_LIMIT,
      rpmLimit: RPM_LIMIT,
      percentUsed: Number(percentUsed.toFixed(1)),
      percentRemaining: Number(percentRemaining.toFixed(1)),
      lastRequestTime: data.lastRequestTime
    };
  } catch (err) {
    console.warn('Kota istatistikleri okunamadı:', err);
    return {
      date: getTodayString(),
      used: 0,
      remaining: DAILY_LIMIT,
      dailyLimit: DAILY_LIMIT,
      rpmLimit: RPM_LIMIT,
      percentUsed: 0,
      percentRemaining: 100,
      lastRequestTime: null
    };
  }
}

export function recordApiRequest() {
  try {
    const today = getTodayString();
    const stats = getQuotaStats();
    const newUsed = stats.used + 1;
    const nowIso = new Date().toISOString();

    const data = {
      date: today,
      requestsToday: newUsed,
      lastRequestTime: nowIso
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    // Dispatch global event for realtime updates across components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lore_quota_updated', { detail: data }));
    }

    return newUsed;
  } catch (err) {
    console.warn('Kota kaydı güncellenemedi:', err);
    return 1;
  }
}

export function resetQuotaStats() {
  try {
    const today = getTodayString();
    const data = {
      date: today,
      requestsToday: 0,
      lastRequestTime: null
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lore_quota_updated', { detail: data }));
    }
  } catch (err) {
    console.warn('Kota sıfırlanamadı:', err);
  }
}
