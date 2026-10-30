/**
 * Akıllı Görsel ve Medya Servisi (Image & Media Service)
 * 1. Kültürel & Tarih Arşivlerinden Otomatik Görsel Arama (Wikimedia Commons API - Sıfır Kurulum & Ücretsiz)
 * 2. Pinterest / Google / Web Görsel URL'lerini Base64'e Çevirip İndirme
 * 3. Pexels & Unsplash API Desteği (İsteğe Bağlı)
 * 4. Yapay Zeka Editoryal Fotoğraf Üretimi (Flux AI)
 */

export function getStoredPexelsKey() {
  return localStorage.getItem('lore_pexels_api_key') || '';
}

export function setStoredPexelsKey(key) {
  if (key) {
    localStorage.setItem('lore_pexels_api_key', key.trim());
  } else {
    localStorage.removeItem('lore_pexels_api_key');
  }
}

export function getStoredUnsplashKey() {
  return localStorage.getItem('lore_unsplash_api_key') || '';
}

export function setStoredUnsplashKey(key) {
  if (key) {
    localStorage.setItem('lore_unsplash_api_key', key.trim());
  } else {
    localStorage.removeItem('lore_unsplash_api_key');
  }
}

/**
 * Verilen URL'deki görseli indirip kalıcı Base64 dataURL formatına dönüştürür.
 * CORS engeliyle karşılaşırsa Canvas ve doğrudan proxy yedeklerini dener.
 */
export async function convertUrlToDataUrl(url) {
  if (!url || typeof url !== 'string') throw new Error('Geçersiz görsel bağlantısı.');
  if (url.startsWith('data:')) return url;

  // 1. Doğrudan fetch denemesi (Wikimedia, Pexels, Unsplash, Imgur, GitHub vb. CORS destekler)
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
  } catch (err) {
    // CORS engeli durumunda sonraki adımlara geç
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
  } catch (err) {
    // Canvas güvenlik kısıtlaması
  }

  // 3. Doğrudan URL'yi koru (Stüdyoda <img> etiketi yine de gösterebilir)
  return url;
}

/**
 * Wikimedia Commons API üzerinden telifsiz, kültürel ve tarihi yüksek çözünürlüklü fotoğrafları arar.
 */
export async function searchArchivalImages(query, count = 4) {
  try {
    const cleanQuery = query.replace(/[^\w\s-]/gi, ' ').trim();
    const endpoint = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      cleanQuery
    )}&gsrnamespace=6&gsrlimit=16&prop=imageinfo&iiprop=url|thumburl|mime&iiurlwidth=1080&format=json&origin=*`;

    const res = await fetch(endpoint);
    if (!res.ok) return [];

    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return [];

    const validImages = [];
    for (const key of Object.keys(pages)) {
      const page = pages[key];
      const info = page.imageinfo?.[0];
      if (!info) continue;

      const mime = info.mime || '';
      const targetUrl = info.thumburl || info.url;

      // Sadece gerçek fotoğraf/görsel formatlarını kabul et (pdf, svg, djvu vb. filtrele)
      if (
        (mime.includes('jpeg') || mime.includes('png') || mime.includes('webp')) &&
        !page.title.toLowerCase().endsWith('.pdf') &&
        !page.title.toLowerCase().endsWith('.svg')
      ) {
        validImages.push({
          url: targetUrl,
          title: page.title.replace(/^File:/i, '').replace(/\.[^/.]+$/, ''),
          source: 'Wikimedia Commons'
        });
      }
      if (validImages.length >= count) break;
    }

    return validImages;
  } catch (err) {
    console.warn('Wikimedia arşivi taranamadı:', err);
    return [];
  }
}

/**
 * Pexels API (Kullanıcı anahtarı varsa çalışır)
 */
export async function searchPexelsImages(query, apiKey, count = 4) {
  if (!apiKey) return [];
  try {
    const endpoint = `https://api.pexels.com/v1/search?query=${encodeURIComponent(
      query
    )}&orientation=portrait&per_page=${count}`;
    const res = await fetch(endpoint, {
      headers: { Authorization: apiKey }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.photos || []).map((p) => ({
      url: p.src.large2x || p.src.large || p.src.portrait,
      title: p.alt || query,
      photographer: p.photographer,
      source: 'Pexels'
    }));
  } catch (err) {
    console.warn('Pexels API hatası:', err);
    return [];
  }
}

/**
 * Unsplash API (Kullanıcı anahtarı varsa çalışır)
 */
export async function searchUnsplashImages(query, apiKey, count = 4) {
  if (!apiKey) return [];
  try {
    const endpoint = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
      query
    )}&orientation=portrait&per_page=${count}`;
    const res = await fetch(endpoint, {
      headers: { Authorization: `Client-ID ${apiKey}` }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((p) => ({
      url: p.urls.regular || p.urls.full,
      title: p.alt_description || query,
      photographer: p.user?.name,
      source: 'Unsplash'
    }));
  } catch (err) {
    console.warn('Unsplash API hatası:', err);
    return [];
  }
}

/**
 * Yapay Zeka ile Tekil Editoryal Fotoğraf Üretimi (Flux Modeli)
 */
export function getAiGeneratedImageUrl(prompt, seed = Math.floor(Math.random() * 100000)) {
  const enhancedPrompt = `${prompt}, vintage editorial luxury magazine photography, 35mm archival film grain, cinematic lighting, 4:5 portrait orientation`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=720&height=900&nologo=true&seed=${seed}&model=flux`;
}

/**
 * Gönderi için Akıllı Görsel Getirme Motoru
 * Sırasıyla: Pexels (varsa) -> Unsplash (varsa) -> Wikimedia Arşivi -> AI Fotoğraf
 * Bulunan 4 görseli indirip galeri öğelerine dönüştürür.
 */
export async function autoFetchImagesForPost(post, onProgress) {
  if (!post) throw new Error('Gönderi bulunamadı.');

  const pexelsKey = getStoredPexelsKey();
  const unsplashKey = getStoredUnsplashKey();

  const searchQuery = post.visualNote || `${post.category} ${post.decade} ${post.title}`;

  if (onProgress) onProgress('Fotoğraf ve kültür arşivleri taranıyor...');

  let candidates = [];

  // 1. Pexels Denemesi
  if (pexelsKey) {
    if (onProgress) onProgress('Pexels arşivinden portre fotoğraflar aranıyor...');
    candidates = await searchPexelsImages(searchQuery, pexelsKey, 4);
  }

  // 2. Unsplash Denemesi
  if (candidates.length < 4 && unsplashKey) {
    if (onProgress) onProgress('Unsplash arşivinden editoryal fotoğraflar aranıyor...');
    const unsplashResults = await searchUnsplashImages(searchQuery, unsplashKey, 4 - candidates.length);
    candidates = [...candidates, ...unsplashResults];
  }

  // 3. Wikimedia Commons Kültür & Tarih Arşivi (Ücretsiz & Sıfır Anahtar)
  if (candidates.length < 4) {
    if (onProgress) onProgress('Kültür ve tarih arşivleri taranıyor...');
    const wikimediaResults = await searchArchivalImages(searchQuery, 4 - candidates.length);
    candidates = [...candidates, ...wikimediaResults];

    // Eğer yeterli çıkmadıysa sadece kategori + dönemle daha geniş ara
    if (candidates.length < 4) {
      const fallbackQuery = `${post.category} ${post.decade}`;
      const moreWiki = await searchArchivalImages(fallbackQuery, 4 - candidates.length);
      candidates = [...candidates, ...moreWiki];
    }
  }

  // 4. Eğer hala 4 görsel tamamlanmadıysa, eksik kalanları Yapay Zeka Editoryal Fotoğraf ile tamamla
  const neededAi = 4 - candidates.length;
  if (neededAi > 0) {
    if (onProgress) onProgress('Eksik kareler için yapay zeka editoryal fotoğrafları hazırlanıyor...');
    for (let i = 0; i < neededAi; i++) {
      const seed = Math.floor(Math.random() * 999999);
      const aiUrl = getAiGeneratedImageUrl(`${post.title} ${post.category} ${post.decade}`, seed);
      candidates.push({
        url: aiUrl,
        title: `AI Editoryal Kare ${i + 1}`,
        source: 'AI Flux'
      });
    }
  }

  // Görselleri yerel DataURL'e dönüştür (IndexedDB için hazır hale getir)
  if (onProgress) onProgress('Görseller indiriliyor ve optimize ediliyor...');

  const finalGalleryItems = [];
  for (let i = 0; i < candidates.length && i < 4; i++) {
    const item = candidates[i];
    try {
      const dataUrl = await convertUrlToDataUrl(item.url);
      finalGalleryItems.push({
        id: 'auto_img_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substr(2, 4),
        dataUrl,
        name: item.title || `Slayt ${i + 1} Görseli`,
        type: 'image',
        mimeType: 'image/jpeg',
        source: item.source
      });
    } catch (err) {
      console.warn(`Görsel ${i + 1} dönüştürülemedi:`, err);
    }
  }

  if (finalGalleryItems.length === 0) {
    throw new Error('Uygun görsel bulunamadı veya indirilemedi. Lütfen URL yapıştırıcıyı kullanın.');
  }

  return finalGalleryItems;
}
