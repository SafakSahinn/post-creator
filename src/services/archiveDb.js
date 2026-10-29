/**
 * IndexedDB Tabanlı Arşiv Deposu
 * Görsellerin (Base64 / Blobs) localStorage kota sınırlarına takılmadan
 * kullanıcının yerel tarayıcısında güvenle saklanmasını sağlar.
 */

const DB_NAME = 'lore_magazine_db';
const DB_VERSION = 1;
const STORE_NAME = 'archives';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllArchivesFromDb() {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = req.result || [];
        // En yeniden en eskiye sırala
        results.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        resolve(results);
      };
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.warn('IndexedDB okunamadı, localStorage deneniyor:', err);
    try {
      const saved = localStorage.getItem('lore_archives');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }
}

export async function saveArchiveToDb(item) {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(item);
      req.onsuccess = () => resolve(item);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB kaydetme hatası:', err);
  }
}

export async function batchSaveArchivesToDb(items) {
  if (!items || items.length === 0) return items;
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const item of items) {
        store.put(item);
      }
      tx.oncomplete = () => resolve(items);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB toplu kaydetme hatası:', err);
    return items;
  }
}

export async function deleteArchiveFromDb(id) {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB silme hatası:', err);
  }
}

export async function clearAllArchivesFromDb() {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB temizleme hatası:', err);
  }
}
