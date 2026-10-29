/**
 * Google Drive REST API Entegrasyonu (drive.file scope)
 * Post Creator - Arşiv ve Slayt Görselleri Bulut Depolama
 * 
 * Yerleşim:
 * Drive'ım / Post Creator / posts / <post_id>.json
 * Drive'ım / Post Creator / images / <image_id>.png
 */

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

const TOKEN_KEY = 'lore_gdrive_token';
const CLIENT_ID_KEY = 'lore_gdrive_client_id';
const USER_KEY = 'lore_gdrive_user';

export function getStoredDriveToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setStoredDriveToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token.trim());
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

export function getStoredGoogleUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredGoogleUser(user) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export async function fetchAndStoreUserProfile(token) {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const user = await res.json();
    setStoredGoogleUser(user);
    return user;
  } catch (err) {
    console.warn('Google kullanıcı profili alınamadı:', err);
    return null;
  }
}

export function logoutGoogleDrive() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('lore_drive_auth_change'));
  }
}

export function getStoredClientId() {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID || localStorage.getItem(CLIENT_ID_KEY) || '';
}

export function setStoredClientId(clientId) {
  if (clientId) {
    localStorage.setItem(CLIENT_ID_KEY, clientId.trim());
  } else {
    localStorage.removeItem(CLIENT_ID_KEY);
  }
}

async function request(url, init = {}, token) {
  const activeToken = token || getStoredDriveToken();
  if (!activeToken) {
    throw new Error('Google Drive erişim belirteci (token) bulunamadı. Lütfen "Google ile Oturum Aç" butonuna tıklayın.');
  }

  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${activeToken}`,
    },
  });

  if (res.status === 401) {
    setStoredDriveToken('');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lore_drive_auth_change'));
    }
    throw new Error('Google Drive oturum süresi dolmuş (401). Lütfen tekrar "Google ile Oturum Aç" butonuna tıklayarak yenileyin.');
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const msg = errorBody?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(`Google Drive Hatası: ${msg}`);
  }

  return res;
}

function multipartBody(meta, content, contentType) {
  const boundary = `pc_${Math.random().toString(36).slice(2)}`;
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n`,
    `--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`,
    content,
    `\r\n--${boundary}--`,
  ]);
  return {
    body,
    headers: {
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
  };
}

const encodeQ = (s) => encodeURIComponent(s);

async function findFolder(name, parent = 'root', token) {
  let q = `mimeType='${FOLDER_MIME}' and trashed=false and name='${name}'`;
  if (parent && parent !== 'root') {
    q += ` and '${parent}' in parents`;
  } else if (parent === 'root') {
    q += ` and 'root' in parents`;
  }
  const res = await request(`${API}/files?q=${encodeQ(q)}&fields=files(id,name)&spaces=drive`, {}, token);
  const data = await res.json();
  return data.files?.[0]?.id || null;
}

async function createFolder(name, parent = 'root', token) {
  const body = {
    name,
    mimeType: FOLDER_MIME,
    appProperties: { app: 'post-creator' },
  };
  // In Google Drive v3, passing parents: ['root'] returns 404 "File not found: root".
  // To create in the root folder, parents MUST be omitted.
  if (parent && parent !== 'root') {
    body.parents = [parent];
  }

  const res = await request(`${API}/files?fields=id,name`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, token);
  const data = await res.json();
  return data.id;
}

/**
 * Drive'da "Post Creator", "posts" ve "images" klasörlerini bulur veya oluşturur
 */
export async function ensureLoreFolders(token) {
  const root = (await findFolder('Post Creator', 'root', token)) || (await createFolder('Post Creator', 'root', token));
  const posts = (await findFolder('posts', root, token)) || (await createFolder('posts', root, token));
  const images = (await findFolder('images', root, token)) || (await createFolder('images', root, token));
  return { root, posts, images };
}

/**
 * DataURL veya Blob formatındaki görseli Drive'a yükler
 */
export async function uploadImageToDrive(filename, dataUrl, folderId, token) {
  let blob;
  let mimeType = 'image/png';

  if (dataUrl.startsWith('data:')) {
    const parts = dataUrl.split(';base64,');
    mimeType = parts[0].split(':')[1] || 'image/png';
    const binary = atob(parts[1]);
    const array = [];
    for (let i = 0; i < binary.length; i++) {
      array.push(binary.charCodeAt(i));
    }
    blob = new Blob([new Uint8Array(array)], { type: mimeType });
  } else {
    const fetched = await fetch(dataUrl);
    blob = await fetched.blob();
    mimeType = blob.type || 'image/png';
  }

  const isVideo = mimeType.startsWith('video/');
  const meta = {
    name: filename,
    parents: [folderId],
    appProperties: { app: 'post-creator', type: isVideo ? 'carousel-video' : 'carousel-slide' }
  };

  const { body, headers } = multipartBody(meta, blob, mimeType);
  const res = await request(`${UPLOAD}/files?uploadType=multipart&fields=id,name,webViewLink,thumbnailLink`, {
    method: 'POST',
    headers,
    body
  }, token);

  return res.json();
}

/**
 * Gönderiyi ve slayt görsellerini Google Drive'a tam yedekler
 */
export async function backupPostToDrive(post, gallery = [], slideSettings = {}, token) {
  const folders = await ensureLoreFolders(token);
  
  // 1. Slaytlardaki görselleri ve videoları yükle
  const uploadedImages = [];
  for (let slideIdx = 0; slideIdx < 4; slideIdx++) {
    const imgId = slideSettings?.[slideIdx]?.imageId;
    const galleryItem = gallery?.find((g) => g.id === imgId);
    let dataUrl = galleryItem?.dataUrl;

    // Fallback: Post içerisindeki thumbnail veya doğrudan gallery sırası
    if (!dataUrl && post?.thumbnails?.[slideIdx]) {
      dataUrl = post.thumbnails[slideIdx];
    }
    if (!dataUrl && gallery?.[slideIdx]?.dataUrl) {
      dataUrl = gallery[slideIdx].dataUrl;
    }

    if (dataUrl) {
      const isVid = dataUrl.startsWith('data:video') || galleryItem?.type === 'video';
      const ext = isVid ? (dataUrl.includes('webm') ? 'webm' : 'mp4') : 'png';
      const cleanTitle = (post.title || 'Slide').replace(/[^a-zA-Z0-9\u00C0-\u017F]/g, '_').slice(0, 30);
      const filename = `Slide_${slideIdx + 1}_${cleanTitle}.${ext}`;
      try {
        const uploaded = await uploadImageToDrive(filename, dataUrl, folders.images, token);
        uploadedImages.push({
          slideIndex: slideIdx,
          driveId: uploaded.id,
          name: uploaded.name,
          webViewLink: uploaded.webViewLink,
          isVideo: isVid
        });
      } catch (err) {
        console.warn(`Slayt ${slideIdx + 1} Drive'a yüklenemedi:`, err);
      }
    }
  }

  // 2. Post JSON metadatası oluştur
  const postBackupData = {
    ...post,
    savedToDriveAt: new Date().toISOString(),
    slideSettings,
    driveImages: uploadedImages
  };

  const cleanPostTitle = (post.title || post.id || 'post').replace(/[^a-zA-Z0-9\u00C0-\u017F]/g, '_').slice(0, 40);
  const postFilename = `${cleanPostTitle}_${Date.now()}.json`;
  const meta = {
    name: postFilename,
    parents: [folders.posts],
    mimeType: 'application/json',
    appProperties: { app: 'post-creator', type: 'post' }
  };

  const { body, headers } = multipartBody(meta, JSON.stringify(postBackupData, null, 2), 'application/json');
  const res = await request(`${UPLOAD}/files?uploadType=multipart&fields=id,name,webViewLink`, {
    method: 'POST',
    headers,
    body
  }, token);

  const savedMeta = await res.json();
  return {
    fileId: savedMeta.id,
    webViewLink: savedMeta.webViewLink,
    postData: postBackupData,
    folders,
    uploadedImagesCount: uploadedImages.length
  };
}

/**
 * Google Drive depolama kotasını sorgular
 */
export async function getDriveStorageQuota(token) {
  const res = await request(`${API}/about?fields=storageQuota,user`, {}, token);
  const data = await res.json();
  const q = data.storageQuota || {};
  const limit = q.limit ? Number(q.limit) : null;
  const usage = Number(q.usage || 0);

  const formatGb = (bytes) => (bytes / (1024 * 1024 * 1024)).toFixed(2);

  return {
    user: data.user,
    limitBytes: limit,
    usageBytes: usage,
    limitGb: limit ? formatGb(limit) : 'Sınırsız',
    usageGb: formatGb(usage),
    percentUsed: limit ? Number(((usage / limit) * 100).toFixed(1)) : 0
  };
}

/**
 * Google Identity Services (GIS) ile tek tıkla OAuth Token isteme
 */
export function requestGoogleDriveAuth(clientId) {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      // Load script dynamically
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initClient();
      };
      script.onerror = () => reject(new Error('Google Identity Services yüklenemedi.'));
      document.body.appendChild(script);
    } else {
      initClient();
    }

    function initClient() {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: `openid email profile ${DRIVE_SCOPE}`,
          callback: async (resp) => {
            if (resp.error) {
              reject(new Error(resp.error_description || resp.error));
            } else if (resp.access_token) {
              setStoredDriveToken(resp.access_token);
              const user = await fetchAndStoreUserProfile(resp.access_token);
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('lore_drive_auth_change', { detail: { token: resp.access_token, user } }));
              }
              resolve({ token: resp.access_token, user });
            }
          },
        });
        client.requestAccessToken({ prompt: 'consent' });
      } catch (err) {
        reject(err);
      }
    }
  });
}
