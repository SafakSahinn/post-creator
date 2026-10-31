/**
 * Dergi Sayıları (Magazine Issues)
 * Her proje kendi dergi sayılarına sahiptir. Bir sayı, arşivdeki gönderilerin
 * kopyasını değil kimliklerini (postIds) sıralı olarak tutar; böylece gönderide
 * yapılan düzeltmeler ve kadraj ayarları dergiye de yansır. Arşivden silinen
 * gönderi sayıdan da düşer. Proje silinse bile sayıları saklanır.
 *
 * Kayıt biçimi: { id, projectId, number, title, postIds: [], createdAt, updatedAt }
 */

const STORAGE_KEY = 'pc_magazine_issues';

function readAll() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((i) => i && typeof i === 'object' && i.id && i.projectId && Array.isArray(i.postIds))
      : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/** Projenin sayılarını sayı numarasına göre sıralı getirir */
export function getIssuesForProject(projectId) {
  return readAll()
    .filter((i) => i.projectId === projectId)
    .sort((a, b) => a.number - b.number);
}

/** Projede sıradaki sayı numarası: mevcut en büyük numara + 1 */
export function getNextIssueNumber(projectId) {
  const nums = getIssuesForProject(projectId).map((i) => Number(i.number) || 0);
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

/** Yeni sayı ekler ya da var olanı günceller; kaydedilen sayıyı döndürür */
export function saveIssue(issue) {
  const list = readAll();
  const now = new Date().toISOString();
  const idx = list.findIndex((i) => i.id === issue.id);
  const saved = {
    ...issue,
    id: issue.id || 'issue_' + Date.now(),
    postIds: [...new Set(issue.postIds || [])],
    createdAt: issue.createdAt || now,
    updatedAt: now
  };
  if (idx >= 0) list[idx] = saved;
  else list.push(saved);
  writeAll(list);
  return saved;
}

export function deleteIssue(id) {
  writeAll(readAll().filter((i) => i.id !== id));
}

/** Projedeki sayı adedi (proje silme uyarısı için) */
export function countIssuesForProject(projectId) {
  return readAll().filter((i) => i.projectId === projectId).length;
}
