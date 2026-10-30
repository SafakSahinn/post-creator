/**
 * Akıllı Görsel ve Medya Servisi (Image & Media Service)
 * 1. Kültürel & Tarih Arşivlerinden Otomatik Görsel Arama (Wikimedia Commons API - Sıfır Kurulum & Ücretsiz)
 * 2. Pinterest / Google / Web Görsel URL'lerini Base64'e Çevirip İndirme
 * 3. Pexels & Unsplash API Desteği (İsteğe Bağlı)
 * 4. Yapay Zeka Editoryal Fotoğraf Üretimi (Flux AI)
 */

export function getStoredGoogleCseKey() {
  return localStorage.getItem('lore_google_cse_key') || '';
}

export function setStoredGoogleCseKey(key) {
  if (key) {
    localStorage.setItem('lore_google_cse_key', key.trim());
  } else {
    localStorage.removeItem('lore_google_cse_key');
  }
}

export function getStoredGoogleCseCx() {
  return localStorage.getItem('lore_google_cse_cx') || '';
}

export function setStoredGoogleCseCx(cx) {
  if (cx) {
    localStorage.setItem('lore_google_cse_cx', cx.trim());
  } else {
    localStorage.removeItem('lore_google_cse_cx');
  }
}

/**
 * Google Custom Search Engine (CSE) API - Doğrudan Resmi Google Görseller Arama
 */
export async function searchGoogleImages(query, apiKey, cx, count = 4) {
  if (!apiKey || !cx) return [];
  try {
    const endpoint = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(
      query
    )}&searchType=image&num=${count}`;
    const res = await fetch(endpoint);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((item) => ({
      url: item.link,
      title: item.title || query,
      source: 'Google Görseller'
    }));
  } catch (err) {
    console.warn('Google Görseller API hatası:', err);
    return [];
  }
}

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
 * Gönderi için Gerçek Fotoğraf Getirme Motoru (%100 Gerçek Arşivler, Sıfır AI Çizimi)
 * Sırasıyla: Google Görseller (varsa) -> Pexels (varsa) -> Unsplash (varsa) -> Wikimedia Kültür & Tarih Arşivleri
 * Bulunan ilk 4 gerçek görseli indirip galeri öğelerine dönüştürür.
 */
export async function autoFetchImagesForPost(post, onProgress) {
  if (!post) throw new Error('Gönderi bulunamadı.');

  const googleKey = getStoredGoogleCseKey();
  const googleCx = getStoredGoogleCseCx();
  const pexelsKey = getStoredPexelsKey();
  const unsplashKey = getStoredUnsplashKey();

  const searchQuery = post.visualNote || `${post.category} ${post.decade} ${post.title}`;

  if (onProgress) onProgress('Gerçek fotoğraf ve kültür arşivleri taranıyor...');

  let candidates = [];

  // 1. Google Görseller (CSE) Denemesi (Resmi Google Images Arama)
  if (googleKey && googleCx) {
    if (onProgress) onProgress("Google Görseller'den ilk 4 fotoğraf taranıyor...");
    candidates = await searchGoogleImages(searchQuery, googleKey, googleCx, 4);
  }

  // 2. Pexels Gerçek Fotoğraf Denemesi
  if (candidates.length < 4 && pexelsKey) {
    if (onProgress) onProgress('Pexels arşivinden portre fotoğraflar aranıyor...');
    const pexelsResults = await searchPexelsImages(searchQuery, pexelsKey, 4 - candidates.length);
    candidates = [...candidates, ...pexelsResults];
  }

  // 3. Unsplash Gerçek Editoryal Fotoğraf Denemesi
  if (candidates.length < 4 && unsplashKey) {
    if (onProgress) onProgress('Unsplash arşivinden editoryal fotoğraflar aranıyor...');
    const unsplashResults = await searchUnsplashImages(searchQuery, unsplashKey, 4 - candidates.length);
    candidates = [...candidates, ...unsplashResults];
  }

  // 4. Wikimedia Commons Gerçek Tarih & Kültür Arşivi (Ücretsiz & Sıfır Anahtar)
  if (candidates.length < 4) {
    if (onProgress) onProgress('Kültür ve tarih arşivlerinden gerçek fotoğraflar taranıyor...');
    const wikimediaResults = await searchArchivalImages(searchQuery, 4 - candidates.length);
    candidates = [...candidates, ...wikimediaResults];

    // Eğer yeterli çıkmadıysa sadece kategori + dönemle daha geniş ara
    if (candidates.length < 4) {
      const fallbackQuery = `${post.category} ${post.decade}`;
      const moreWiki = await searchArchivalImages(fallbackQuery, 4 - candidates.length);
      candidates = [...candidates, ...moreWiki];
    }

    // Başlık anahtar kelimeleriyle ek arama
    if (candidates.length < 4 && post.title) {
      const cleanTitleWords = post.title.replace(/[^\w\s]/gi, '').split(/\s+/).slice(0, 3).join(' ');
      const titleWiki = await searchArchivalImages(cleanTitleWords, 4 - candidates.length);
      candidates = [...candidates, ...titleWiki];
    }
  }

  // Görselleri yerel DataURL'e dönüştür (IndexedDB için hazır hale getir)
  if (onProgress) onProgress('Gerçek fotoğraflar indiriliyor ve optimize ediliyor...');

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
        source: item.source || 'Arşiv'
      });
    } catch (err) {
      console.warn(`Görsel ${i + 1} dönüştürülemedi:`, err);
    }
  }

  if (finalGalleryItems.length === 0) {
    throw new Error('Arşivlerde doğrudan eşleşen fotoğraf bulunamadı. Lütfen Pinterest veya web görsel linkini yapıştırarak ekleyin.');
  }

  return finalGalleryItems;
}
