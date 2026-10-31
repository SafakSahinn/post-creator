/**
 * Görsel İndirme ve URL Servisi
 * Pinterest, Google Görseller veya web'den yapıştırılan görsel bağlantılarını
 * indirip kalıcı Base64 dataURL formatına dönüştürür.
 */

export async function convertUrlToDataUrl(url) {
  if (!url || typeof url !== 'string') throw new Error('Geçersiz görsel bağlantısı.');
  if (url.startsWith('data:')) return url;

  // 1. Doğrudan fetch denemesi (Wikimedia, Imgur, Unsplash, GitHub vb. CORS destekler)
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    }
  } catch {
    // CORS engeli durumunda Canvas fallback'ine geç
  }

  // 2. Tarayıcı Image nesnesi + HTML5 Canvas denemesi
  try {
    const canvasData = await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 800;
          canvas.height = img.naturalHeight || 1000;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.95));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error('Görsel yüklenemedi.'));
      img.src = url;
    });
    return canvasData;
  } catch {
    // Canvas güvenlik kısıtlaması olursa doğrudan URL'yi koru
  }

  // 3. Doğrudan URL'yi döndür (Stüdyoda <img> etiketi yine de gösterir)
  return url;
}
