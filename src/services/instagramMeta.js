/**
 * Meta / Instagram Graph API - İçerik Yayınlama & Zamanlama Servisi
 * Resmi Instagram Content Publishing API Entegrasyonu (Carousel & Scheduled Posts)
 */

const DEFAULT_IMGUR_CLIENT_ID = 'c73499dc88701e8'; // Ücretsiz genel Client-ID
const META_API_VERSION = 'v19.0';

export function getStoredMetaAccessToken() {
  return localStorage.getItem('lore_meta_access_token') || '';
}

export function setStoredMetaAccessToken(token) {
  if (token) {
    localStorage.setItem('lore_meta_access_token', token.trim());
  } else {
    localStorage.removeItem('lore_meta_access_token');
  }
}

export function getStoredInstagramAccountId() {
  return localStorage.getItem('lore_meta_ig_account_id') || '';
}

export function setStoredInstagramAccountId(id) {
  if (id) {
    localStorage.setItem('lore_meta_ig_account_id', id.trim());
  } else {
    localStorage.removeItem('lore_meta_ig_account_id');
  }
}

export function getStoredImgurClientId() {
  return localStorage.getItem('lore_imgur_client_id') || DEFAULT_IMGUR_CLIENT_ID;
}

export function setStoredImgurClientId(id) {
  if (id) {
    localStorage.setItem('lore_imgur_client_id', id.trim());
  } else {
    localStorage.removeItem('lore_imgur_client_id');
  }
}

export function getStoredMetaProfile() {
  try {
    const raw = localStorage.getItem('lore_meta_profile');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredMetaProfile(profile) {
  if (profile) {
    localStorage.setItem('lore_meta_profile', JSON.stringify(profile));
  } else {
    localStorage.removeItem('lore_meta_profile');
  }
}

/**
 * Instagram Hesabının Profilini ve Yayınlama İzinlerini Doğrular
 */
export async function fetchInstagramProfile(accessToken = getStoredMetaAccessToken(), igAccountId = getStoredInstagramAccountId()) {
  if (!accessToken || !igAccountId) {
    throw new Error('Lütfen Meta Access Token ve Instagram Hesap ID giriniz.');
  }

  const cleanToken = accessToken.trim();
  const cleanId = igAccountId.trim();

  const url = `https://graph.facebook.com/${META_API_VERSION}/${cleanId}?fields=id,username,name,profile_picture_url,followers_count&access_token=${cleanToken}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok || data.error) {
    const msg = data.error?.message || `Meta API Hatası (${res.status})`;
    throw new Error(msg);
  }

  const profile = {
    id: data.id,
    username: data.username,
    name: data.name,
    picture: data.profile_picture_url,
    followers: data.followers_count,
    connectedAt: new Date().toISOString()
  };

  setStoredMetaProfile(profile);
  return profile;
}

/**
 * Slayt Görselini (DataURL / Base64) Meta'nın indirebilmesi için geçici genel URL'e dönüştürür.
 * 1. Tercih: Imgur API
 * 2. Yedek: Ücretsiz genel dosya sunucusu
 */
export async function uploadSlideToPublicUrl(dataUrl, customImgurKey = null) {
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const clientId = customImgurKey || getStoredImgurClientId();

  // 1. Imgur API Yükleme Denemesi
  try {
    const formData = new FormData();
    formData.append('image', base64Data);
    formData.append('type', 'base64');

    const res = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: {
        Authorization: `Client-ID ${clientId}`
      },
      body: formData
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data?.link) {
        return json.data.link.replace(/^http:/, 'https:');
      }
    }
  } catch (err) {
    console.warn('Imgur yüklemesi başarısız oldu, alternatif deneniyor:', err);
  }

  // 2. Yedek: tmpfiles.org ücretsiz genel sunucu
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const fd = new FormData();
    fd.append('file', blob, `slide_${Date.now()}.png`);

    const res = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: fd
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data?.url) {
        // tmpfiles.org/1234/file.png -> tmpfiles.org/dl/1234/file.png (Doğrudan görsel indirme URL'i)
        return json.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
      }
    }
  } catch (err) {
    console.warn('Tmpfiles yüklemesi başarısız:', err);
  }

  throw new Error('Slayt görseli Meta sunucularının erişebileceği genel bir bağlantıya dönüştürülemedi.');
}

/**
 * 4 Slaytlık Carousel Gönderisini Instagram'da Anında Yayınlar veya İleri Bir Tarihe Planlar
 * 
 * @param {Object} params
 * @param {string[]} params.slideDataUrls - 4 slaytın PNG Base64 DataURL dizisi
 * @param {string} params.caption - Instagram gönderi açıklaması (Caption)
 * @param {Date|string|null} params.scheduledTime - null ise anında yayınlar; tarih verilirse Meta'da planlar
 * @param {Function} params.onProgress - Adım bildirim geri çağrısı
 */
export async function publishOrScheduleInstagramCarousel({
  slideDataUrls,
  caption,
  scheduledTime = null,
  onProgress
}) {
  const accessToken = getStoredMetaAccessToken();
  const igAccountId = getStoredInstagramAccountId();

  if (!accessToken || !igAccountId) {
    throw new Error('Lütfen önce Instagram / Meta hesabınızı bağlayın.');
  }

  if (!slideDataUrls || slideDataUrls.length < 2) {
    throw new Error('Instagram Carousel için en az 2 slayt görseli gereklidir.');
  }

  // Planlama zamanı kontrolü (Meta: en az 10 dakika, en fazla 75 gün sonra olmalıdır)
  let scheduledUnix = null;
  if (scheduledTime) {
    const dateObj = new Date(scheduledTime);
    scheduledUnix = Math.floor(dateObj.getTime() / 1000);
    const nowUnix = Math.floor(Date.now() / 1000);
    const diffMinutes = (scheduledUnix - nowUnix) / 60;

    if (diffMinutes < 10) {
      throw new Error('Meta kuralları gereği planlanan tarih en az 10 dakika sonrası olmalıdır.');
    }
    if (diffMinutes > 75 * 24 * 60) {
      throw new Error('Meta kuralları gereği planlanan tarih en fazla 75 gün sonrası olabilir.');
    }
  }

  // ADIM 1: Slayt görsellerini Meta'nın erişebileceği genel URL'lere yükle
  const publicImageUrls = [];
  for (let i = 0; i < slideDataUrls.length; i++) {
    if (onProgress) {
      onProgress(`Görseller hazırlanıyor (${i + 1}/${slideDataUrls.length})...`);
    }
    const publicUrl = await uploadSlideToPublicUrl(slideDataUrls[i]);
    publicImageUrls.push(publicUrl);
  }

  // ADIM 2: Her slayt için Meta Carousel Item Konteyneri oluştur
  const itemContainerIds = [];
  for (let i = 0; i < publicImageUrls.length; i++) {
    if (onProgress) {
      onProgress(`Meta sunucularına iletiliyor (${i + 1}/${publicImageUrls.length})...`);
    }

    const itemUrl = `https://graph.facebook.com/${META_API_VERSION}/${igAccountId}/media`;
    const params = new URLSearchParams({
      image_url: publicImageUrls[i],
      is_carousel_item: 'true',
      access_token: accessToken
    });

    const res = await fetch(`${itemUrl}?${params.toString()}`, { method: 'POST' });
    const data = await res.json();

    if (!res.ok || data.error || !data.id) {
      throw new Error(`Slayt ${i + 1} Meta'ya yüklenemedi: ${data.error?.message || 'Bilinmeyen hata'}`);
    }

    itemContainerIds.push(data.id);
  }

  // ADIM 3: Ana Carousel Paketini (Parent Container) Oluştur
  if (onProgress) {
    onProgress('Carousel paketi ve açıklama metni oluşturuluyor...');
  }

  const carouselUrl = `https://graph.facebook.com/${META_API_VERSION}/${igAccountId}/media`;
  const carouselParams = new URLSearchParams({
    media_type: 'CAROUSEL',
    children: itemContainerIds.join(','),
    caption: caption || '',
    access_token: accessToken
  });

  if (scheduledUnix) {
    carouselParams.append('scheduled_publish_time', scheduledUnix.toString());
  }

  const carouselRes = await fetch(`${carouselUrl}?${carouselParams.toString()}`, { method: 'POST' });
  const carouselData = await carouselRes.json();

  if (!carouselRes.ok || carouselData.error || !carouselData.id) {
    throw new Error(`Carousel paketi oluşturulamadı: ${carouselData.error?.message || 'Bilinmeyen hata'}`);
  }

  const creationId = carouselData.id;

  // ADIM 4: Eğer zamanlanmışsa (Schedule), Meta zaten konteyneri saklar; anında yayınlamak gerekmez!
  if (scheduledUnix) {
    if (onProgress) onProgress('Gönderi Meta takvimine başarıyla planlandı!');
    return {
      success: true,
      scheduled: true,
      creationId,
      scheduledTime: new Date(scheduledTime).toLocaleString('tr-TR')
    };
  }

  // ADIM 5: Anında Yayınla (Publish Immediate)
  if (onProgress) {
    onProgress('Instagram akışında yayınlanıyor...');
  }

  const publishUrl = `https://graph.facebook.com/${META_API_VERSION}/${igAccountId}/media_publish`;
  const publishParams = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken
  });

  const publishRes = await fetch(`${publishUrl}?${publishParams.toString()}`, { method: 'POST' });
  const publishData = await publishRes.json();

  if (!publishRes.ok || publishData.error || !publishData.id) {
    throw new Error(`Gönderi yayınlanamadı: ${publishData.error?.message || 'Bilinmeyen hata'}`);
  }

  if (onProgress) {
    onProgress('Instagram profilinizde başarıyla yayınlandı!');
  }

  return {
    success: true,
    scheduled: false,
    publishedPostId: publishData.id,
    publishedAt: new Date().toISOString()
  };
}
