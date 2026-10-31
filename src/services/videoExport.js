import { toPng } from 'html-to-image';

/**
 * Tarayıcıda Desteklenen En İyi Video MIME Türünü Bulur
 */
export function getSupportedVideoMimeType() {
  const candidates = [
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];

  if (typeof MediaRecorder === 'undefined') {
    return null;
  }

  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return 'video/webm';
}

/**
 * Slaytı 1080x1350 (Instagram Portre 4:5) MP4 / WebM Video Olarak Render Eder
 * 
 * @param {Object} options
 * @param {HTMLElement} options.slideElement - Render edilecek slayt DOM elemanı
 * @param {number} options.durationSeconds - Video süresi (saniye)
 * @param {Function} options.onProgress - İlerleme durumu (yüzde, mesaj)
 * @param {string} options.filename - İndirilecek dosya adı
 */
export async function exportSlideAsVideo({
  slideElement,
  durationSeconds = 6,
  onProgress,
  filename = 'post_video.mp4'
}) {
  if (!slideElement) throw new Error('Slayt elemanı bulunamadı.');

  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Tarayıcınız MediaRecorder video kaydını desteklemiyor.');
  }

  const mimeType = getSupportedVideoMimeType();
  const isMp4 = mimeType.includes('mp4');
  const safeFilename = filename.replace(/\.(mp4|webm)$/i, '') + (isMp4 ? '.mp4' : '.webm');

  if (onProgress) onProgress(10, 'Katmanlar hazırlanıyor...');

  // 1. Slayt içerisindeki video elemanını bul (varsa)
  const videoEl = slideElement.querySelector('video');

  // 2. Metin, logo ve çerçeve katmanını (overlay) şeffaf arka planla yakala
  let overlayImg = null;
  try {
    // Video varsa geçici olarak gizleyip sadece overlay'i yakala
    const originalVideoVisibility = videoEl ? videoEl.style.visibility : '';
    if (videoEl) videoEl.style.visibility = 'hidden';

    const overlayDataUrl = await toPng(slideElement, {
      quality: 1.0,
      pixelRatio: 3.0,
      filter: (node) => node.tagName !== 'VIDEO'
    });

    if (videoEl) videoEl.style.visibility = originalVideoVisibility;

    overlayImg = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = overlayDataUrl;
    });
  } catch (err) {
    console.warn('Overlay katmanı toPng ile alınamadı, doğrudan canvas render edilecek:', err);
  }

  // 3. 1080x1350 Yüksek Çözünürlüklü Canvas Oluştur
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d', { alpha: false });

  // 4. Video veya Statik Görsel Oynatımı Hazırlığı
  let videoDuration = durationSeconds;
  if (videoEl && videoEl.duration && !isNaN(videoEl.duration) && videoEl.duration > 0) {
    videoDuration = Math.min(Math.max(videoEl.duration, 3), 12);
  }

  const totalFrames = Math.round(videoDuration * 30); // 30 FPS
  let currentFrame = 0;

  if (videoEl) {
    try {
      videoEl.currentTime = 0;
      await videoEl.play().catch(() => {});
    } catch {
      // Autoplay kısıtlaması olabilir
    }
  }

  // 5. MediaStream ve MediaRecorder Başlat
  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 10000000 // 10 Mbps Ultra HD stüdyo kalitesi
  });

  const recordedChunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  const recordingPromise = new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: mimeType });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = safeFilename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 4000);
      resolve(true);
    };
    recorder.onerror = (e) => reject(e.error || new Error('Video kaydında hata oluştu.'));
  });

  recorder.start();

  // 6. Kare Kare Render Döngüsü (30 FPS)
  const fpsInterval = 1000 / 30;
  let lastTime = performance.now();

  return new Promise((resolve, reject) => {
    function renderLoop(time) {
      if (currentFrame >= totalFrames) {
        if (onProgress) onProgress(95, 'Video dosyası paketleniyor...');
        recorder.stop();
        recordingPromise.then(resolve).catch(reject);
        return;
      }

      const delta = time - lastTime;
      if (delta >= fpsInterval) {
        lastTime = time - (delta % fpsInterval);

        // A. Arka planı temizle
        ctx.fillStyle = '#0b0c10';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // B. Video veya Ken Burns efektli arka plan çizimi
        if (videoEl && !videoEl.paused && !videoEl.ended) {
          try {
            // Video en-boy oranını 4:5 portreye sığdır (cover)
            const vWidth = videoEl.videoWidth || 1080;
            const vHeight = videoEl.videoHeight || 1350;
            const vAspect = vWidth / vHeight;
            const targetAspect = 1080 / 1350;

            let sWidth = vWidth;
            let sHeight = vHeight;
            let sx = 0;
            let sy = 0;

            if (vAspect > targetAspect) {
              sWidth = vHeight * targetAspect;
              sx = (vWidth - sWidth) / 2;
            } else {
              sHeight = vWidth / targetAspect;
              sy = (vHeight - sHeight) / 2;
            }

            ctx.drawImage(videoEl, sx, sy, sWidth, sHeight, 0, 0, 1080, 1350);
          } catch {
            // Güvenlik veya video çizim hatası olursa pas geç
          }
        }

        // C. Overlay (Yazılar, başlıklar, etiketler ve filigran) çizimi
        if (overlayImg) {
          ctx.drawImage(overlayImg, 0, 0, 1080, 1350);
        }

        currentFrame++;
        const percent = Math.min(90, Math.round(15 + (currentFrame / totalFrames) * 75));
        if (onProgress && currentFrame % 10 === 0) {
          onProgress(percent, `Video render ediliyor (%${percent})...`);
        }
      }

      requestAnimationFrame(renderLoop);
    }

    requestAnimationFrame(renderLoop);
  });
}
