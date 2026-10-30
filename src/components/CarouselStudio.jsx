import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Download, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Check, Image as ImageIcon, 
  Upload, Trash2, Undo2, Redo2, Sliders, Eye, Sparkles, Layers,
  Sun, ZoomIn, Contrast, MoveVertical, Move, RotateCcw, ShieldOff, ShieldAlert,
  Bookmark, BookmarkCheck, Video, Play, Edit3, Link as LinkIcon, Globe, Loader2
} from 'lucide-react';
import { InstagramIcon } from './Icons';
import { toPng } from 'html-to-image';
import { getPunchyExcerpt } from '../services/gemini';
import { convertUrlToDataUrl } from '../services/imageService';
import { InstagramPublishModal } from './InstagramPublishModal';

const FILTERS = [
  { id: 'none', name: 'Orijinal', filterStyle: '' },
  { id: 'film35mm', name: '35mm Film', filterStyle: 'contrast(115%) saturate(85%) sepia(10%)' },
  { id: 'bwNoir', name: 'Mono Noir', filterStyle: 'grayscale(100%) contrast(140%) brightness(95%)' },
  { id: 'muted', name: 'Muted Luxury', filterStyle: 'saturate(75%) contrast(105%) brightness(102%)' },
  { id: 'warm', name: 'Vintage Sıcak', filterStyle: 'sepia(30%) saturate(110%) contrast(110%)' },
];

const getComputedFilter = (filterId, brightness = 100) => {
  const filterItem = FILTERS.find((f) => f.id === filterId);
  const baseFilter = filterItem?.filterStyle || '';
  if (!baseFilter) {
    return brightness !== 100 ? `brightness(${brightness}%)` : 'none';
  }
  return brightness !== 100 ? `${baseFilter} brightness(${brightness}%)` : baseFilter;
};

function SlideBackground({ media, settings }) {
  if (!media) return null;
  const isVideo = media.type === 'video' || media.dataUrl?.startsWith('data:video') || /\.(mp4|webm|mov|ogg)$/i.test(media.name || '');
  const zoom = (settings?.zoom ?? 105) / 100;
  const filter = getComputedFilter(settings?.filter, settings?.brightness);
  const vignette = settings?.vignette ?? 75;
  const offsetX = settings?.offsetX || 0;
  const offsetY = settings?.offsetY || 0;

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
      {isVideo ? (
        <video
          src={media.dataUrl}
          autoPlay
          loop
          muted
          playsInline
          style={{
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
            filter
          }}
          className="w-full h-full object-cover transition-transform duration-75 pointer-events-none"
        />
      ) : (
        <img
          src={media.dataUrl}
          alt=""
          style={{
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
            filter
          }}
          className="w-full h-full object-cover transition-transform duration-75 pointer-events-none select-none"
          draggable={false}
        />
      )}
      {vignette > 0 && (
        <div
          style={{
            background: `linear-gradient(to top, rgba(11,12,16, ${vignette / 100}) 0%, rgba(11,12,16, ${vignette / 250}) 45%, transparent 85%)`
          }}
          className="absolute inset-0 pointer-events-none transition-opacity"
        />
      )}
    </div>
  );
}

const INITIAL_SLIDE_SETTINGS = {
  0: { imageId: null, filter: 'none', vignette: 75, zoom: 105, brightness: 100, showText: true, textOffsetY: 0, offsetX: 0, offsetY: 0, customQuote: null },
  1: { imageId: null, filter: 'none', vignette: 75, zoom: 105, brightness: 100, showText: true, textOffsetY: 0, offsetX: 0, offsetY: 0, customQuote: null },
  2: { imageId: null, filter: 'none', vignette: 75, zoom: 105, brightness: 100, showText: true, textOffsetY: 0, offsetX: 0, offsetY: 0, customQuote: null },
  3: { imageId: null, filter: 'none', vignette: 75, zoom: 105, brightness: 100, showText: true, textOffsetY: 0, offsetX: 0, offsetY: 0, customQuote: null },
};

export function CarouselStudio({
  post,
  project,
  gallery,
  onUpdateGallery,
  slideSettings,
  onUpdateSlideSettings,
  onSaveToArchive,
  isSaved,
  onOpenMetaConnect
}) {
  const [activeSlide, setActiveSlide] = useState(0); // 0, 1, 2, 3
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [undoToast, setUndoToast] = useState(null);

  // Instagram Publishing & Scheduling State
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [renderedSlideUrls, setRenderedSlideUrls] = useState([]);
  const [isPreparingPublish, setIsPreparingPublish] = useState(false);

  // URL Import State
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [isDownloadingUrl, setIsDownloadingUrl] = useState(false);
  const [urlError, setUrlError] = useState(null);

  // History Stack for CTRL+Z Undo / Redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const fileInputRef = useRef(null);

  const slideRef0 = useRef(null);
  const slideRef1 = useRef(null);
  const slideRef2 = useRef(null);
  const slideRef3 = useRef(null);
  const slideRefs = [slideRef0, slideRef1, slideRef2, slideRef3];

  // Current Slide Settings
  const currentSettings = slideSettings?.[activeSlide] || INITIAL_SLIDE_SETTINGS[activeSlide];

  // Push state to history
  const pushStateToHistory = useCallback((newSettings, newGallery) => {
    setHistory((prev) => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      return [...upToCurrent, { slideSettings: newSettings, gallery: newGallery }];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // Undo (Ctrl+Z)
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetState = history[historyIndex - 1];
      if (targetState) {
        onUpdateSlideSettings(targetState.slideSettings);
        onUpdateGallery(targetState.gallery);
        setHistoryIndex(historyIndex - 1);
        setUndoToast('Geri alındı (Undo)');
        setTimeout(() => setUndoToast(null), 1500);
      }
    }
  }, [history, historyIndex, onUpdateSlideSettings, onUpdateGallery]);

  // Redo (Ctrl+Y / Ctrl+Shift+Z)
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetState = history[historyIndex + 1];
      if (targetState) {
        onUpdateSlideSettings(targetState.slideSettings);
        onUpdateGallery(targetState.gallery);
        setHistoryIndex(historyIndex + 1);
        setUndoToast('İleri alındı (Redo)');
        setTimeout(() => setUndoToast(null), 1500);
      }
    }
  }, [history, historyIndex, onUpdateSlideSettings, onUpdateGallery]);

  // Global Keyboard Listener for CTRL+Z and CTRL+Y
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Handle Multi-file Upload (Görsel & Video Destekli)
  const handleAddFiles = (files) => {
    if (!files || files.length === 0) return;
    const newItems = [];
    let processed = 0;

    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|ogg)$/i.test(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        newItems.push({
          id: (isVideo ? 'vid_' : 'img_') + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          dataUrl: e.target.result,
          name: file.name,
          type: isVideo ? 'video' : 'image',
          mimeType: file.type || (isVideo ? 'video/mp4' : 'image/png')
        });
        processed++;
        if (processed === files.length) {
          const updatedGallery = [...gallery, ...newItems];
          onUpdateGallery(updatedGallery);

          // Auto-assign to current slide if it has no image/video
          if (!currentSettings.imageId && newItems[0]) {
            const updatedSettings = {
              ...slideSettings,
              [activeSlide]: {
                ...currentSettings,
                imageId: newItems[0].id
              }
            };
            onUpdateSlideSettings(updatedSettings);
            pushStateToHistory(updatedSettings, updatedGallery);
          } else {
            pushStateToHistory(slideSettings, updatedGallery);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // URL üzerinden Pinterest veya Web Görseli İndirip Galeriye ve Aktif Slayta Ekleme
  const handleImportFromUrl = async (targetUrl = inputUrl) => {
    const clean = (targetUrl || '').trim();
    if (!clean) return;
    setIsDownloadingUrl(true);
    setUrlError(null);
    try {
      const dataUrl = await convertUrlToDataUrl(clean);
      const isVideo = /\.(mp4|webm|mov|ogg)$/i.test(clean);
      const newItem = {
        id: (isVideo ? 'vid_' : 'img_') + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        dataUrl,
        name: 'Web Görseli ' + (gallery.length + 1),
        type: isVideo ? 'video' : 'image',
        mimeType: isVideo ? 'video/mp4' : 'image/jpeg'
      };

      const updatedGallery = [...gallery, newItem];
      onUpdateGallery(updatedGallery);

      // Aktif slayta ata
      const updatedSettings = {
        ...slideSettings,
        [activeSlide]: {
          ...currentSettings,
          imageId: newItem.id
        }
      };
      onUpdateSlideSettings(updatedSettings);
      pushStateToHistory(updatedSettings, updatedGallery);

      setInputUrl('');
      setShowUrlInput(false);
      setUndoToast(`Görsel indirildi ve Slayt ${activeSlide + 1}'e yerleştirildi!`);
      setTimeout(() => setUndoToast(null), 2500);
    } catch (err) {
      console.error('URL görseli indirilemedi:', err);
      setUrlError('Görsel indirilemedi. Lütfen bağlantıyı kontrol edin veya resmi kopyalayıp Ctrl+V yapın.');
    } finally {
      setIsDownloadingUrl(false);
    }
  };

  // Clipboard Paste Support (Görsel, Video & Yapıştırılan Görsel URL'leri)
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (items) {
      const filesToUpload = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1 || items[i].type.indexOf('video') !== -1) {
          const file = items[i].getAsFile();
          if (file) filesToUpload.push(file);
        }
      }
      if (filesToUpload.length > 0) {
        handleAddFiles(filesToUpload);
        return;
      }
    }

    // Metin olarak kopyalanmış bir görsel URL'si ise otomatik indir
    const pastedText = e.clipboardData?.getData('text');
    if (pastedText && (pastedText.startsWith('http://') || pastedText.startsWith('https://'))) {
      if (
        /\.(jpg|jpeg|png|webp|avif|gif)(\?.*)?$/i.test(pastedText.trim()) ||
        pastedText.includes('pinimg.com') ||
        pastedText.includes('googleusercontent.com') ||
        pastedText.includes('wikimedia.org') ||
        pastedText.includes('unsplash.com') ||
        pastedText.includes('pexels.com')
      ) {
        handleImportFromUrl(pastedText.trim());
      }
    }
  };

  // Assign image to active slide
  const handleAssignImage = (imageId) => {
    const updatedSettings = {
      ...slideSettings,
      [activeSlide]: {
        ...currentSettings,
        imageId
      }
    };
    onUpdateSlideSettings(updatedSettings);
    pushStateToHistory(updatedSettings, gallery);
  };

  // Update current slide property
  const handleUpdateSlideProperty = (key, value) => {
    const updatedSettings = {
      ...slideSettings,
      [activeSlide]: {
        ...currentSettings,
        [key]: value
      }
    };
    onUpdateSlideSettings(updatedSettings);
  };

  // Interactive Direct Drag & Pan on the Canvas
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });

  const handleCanvasMouseDown = (e) => {
    if (!currentSettings.imageId) return;
    if (e.button !== 0) return; // sol tik
    setIsDraggingMedia(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: currentSettings.offsetX || 0,
      initialY: currentSettings.offsetY || 0
    };
  };

  useEffect(() => {
    if (!isDraggingMedia) return;

    const handleMouseMove = (e) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const newX = Math.round(Math.max(-250, Math.min(250, dragStartRef.current.initialX + dx)));
      const newY = Math.round(Math.max(-250, Math.min(250, dragStartRef.current.initialY + dy)));

      onUpdateSlideSettings((prev) => ({
        ...prev,
        [activeSlide]: {
          ...(prev[activeSlide] || INITIAL_SLIDE_SETTINGS[activeSlide]),
          offsetX: newX,
          offsetY: newY
        }
      }));
    };

    const handleMouseUp = () => {
      setIsDraggingMedia(false);
      pushStateToHistory(slideSettings, gallery);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingMedia, activeSlide, slideSettings, gallery, onUpdateSlideSettings, pushStateToHistory]);

  const handleNudge = (dx, dy) => {
    const newX = Math.round(Math.max(-250, Math.min(250, (currentSettings.offsetX || 0) + dx)));
    const newY = Math.round(Math.max(-250, Math.min(250, (currentSettings.offsetY || 0) + dy)));
    const updated = {
      ...slideSettings,
      [activeSlide]: {
        ...currentSettings,
        offsetX: newX,
        offsetY: newY
      }
    };
    onUpdateSlideSettings(updated);
    pushStateToHistory(updated, gallery);
  };

  // Delete image from gallery
  const handleDeleteImage = (imgId, e) => {
    e.stopPropagation();
    const updatedGallery = gallery.filter((item) => item.id !== imgId);
    const updatedSettings = { ...slideSettings };
    Object.keys(updatedSettings).forEach((slideIdx) => {
      if (updatedSettings[slideIdx]?.imageId === imgId) {
        updatedSettings[slideIdx].imageId = null;
      }
    });
    onUpdateGallery(updatedGallery);
    onUpdateSlideSettings(updatedSettings);
    pushStateToHistory(updatedSettings, updatedGallery);
  };

  // Export Active Slide
  const handleDownloadActiveSlide = async () => {
    const currentRef = slideRefs[activeSlide]?.current;
    if (!currentRef) return;
    try {
      setIsExporting(true);
      const dataUrl = await toPng(currentRef, { quality: 0.98, pixelRatio: 2.5 });
      const link = document.createElement('a');
      const prefix = post?.projectShortCode || 'POST';
      link.download = `${prefix}_${post?.category || 'Post'}_${post?.decade || ''}_Slayt_${activeSlide + 1}.png`;
      link.href = dataUrl;
      link.click();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);
    } catch (err) {
      console.error('Slayt indirilemedi:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Export All 4 Slides
  const handleDownloadAllSlides = async () => {
    try {
      setIsExporting(true);
      for (let i = 0; i < slideRefs.length; i++) {
        const ref = slideRefs[i]?.current;
        if (ref) {
          const dataUrl = await toPng(ref, { quality: 0.98, pixelRatio: 2.5 });
          const link = document.createElement('a');
          const prefix = post?.projectShortCode || 'POST';
          link.download = `${prefix}_${post?.category || 'Post'}_${post?.decade || ''}_Slayt_${i + 1}.png`;
          link.href = dataUrl;
          link.click();
          await new Promise((r) => setTimeout(r, 400));
        }
      }
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Toplu indirme hatası:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Slaytların temiz PNG DataURL dizisini üretir (Meta / Instagram Paylaşımı İçin)
  const getRenderedSlideDataUrls = async () => {
    const urls = [];
    for (let i = 0; i < slideRefs.length; i++) {
      const ref = slideRefs[i]?.current;
      if (ref) {
        const prevDisplay = ref.style.display;
        ref.style.display = 'flex';
        const dataUrl = await toPng(ref, { quality: 0.95, pixelRatio: 2.5 });
        if (activeSlide !== i) {
          ref.style.display = prevDisplay;
        }
        urls.push(dataUrl);
      }
    }
    return urls;
  };

  const handleOpenInstagramPublish = async () => {
    setIsPreparingPublish(true);
    try {
      const urls = await getRenderedSlideDataUrls();
      setRenderedSlideUrls(urls);
      setIsPublishModalOpen(true);
    } catch (err) {
      console.error('Slaytlar hazırlanamadı:', err);
      alert('Slayt görselleri hazırlanırken bir hata oluştu.');
    } finally {
      setIsPreparingPublish(false);
    }
  };

  if (!post) {
    return (
      <div className="bg-[#121318] border border-white/5 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[480px]">
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-500 mb-4">
          <ImageIcon className="w-7 h-7 text-[#e6c280]/60" />
        </div>
        <h3 className="font-serif text-xl font-bold text-white mb-2 tracking-wide">
          Carousel Stüdyosu Beklemede
        </h3>
        <p className="text-neutral-400 text-xs max-w-md font-sans leading-relaxed">
          Bu proje için henüz bir içerik üretilmedi. Sol paneldeki parametreleri belirleyip içeriği ürettiğinizde 4 slaytlık görsel mizanpaj burada açılacaktır.
        </p>
      </div>
    );
  }

  const slideLogo = (project?.watermark || project?.shortCode || post.watermark || post.projectShortCode || 'L O R E').trim();
  const slideAccentColor = project?.accentColor || post.accentColor || '#e6c280';
  const slideTagline = project?.tagline || post.tagline || 'Kültür & Statü Şifreleri';

  const formatQuote = (q, fallback) => {
    let raw = (q || fallback || '').trim().replace(/^["'“]+|["'”]+$/g, '');
    if (!raw) return '';

    // Asla kelime ortasından veya cümlenin yükleminden kesme! Anlamı tam ilk cümleyi eksiksiz koru
    const sentences = raw.match(/[^.!?]+[.!?]+/g);
    if (sentences && sentences.length > 0) {
      return sentences[0].trim();
    }

    if (!/[.!?]$/.test(raw)) {
      raw = raw.replace(/[,;:\s]+$/, '') + '.';
    }
    return raw;
  };

  const p1 = Array.isArray(post.lore) ? post.lore[0] : (typeof post.lore === 'string' ? post.lore.split(/\n\s*\n/)[0] : '');
  const p2 = Array.isArray(post.lore) ? (post.lore[1] || post.lore[0]) : (typeof post.lore === 'string' ? (post.lore.split(/\n\s*\n/)[1] || post.lore.split(/\n\s*\n/)[0]) : '');
  const p3 = Array.isArray(post.lore) ? (post.lore[2] || post.lore[0]) : (typeof post.lore === 'string' ? (post.lore.split(/\n\s*\n/)[2] || post.lore.split(/\n\s*\n/)[0]) : '');

  // Slide quotes (all 3 slides: 2, 3 and 4) - 2 ila 3 satırı aşmayan net ve vurucu tek cümle
  const slide1Quote = slideSettings?.[1]?.customQuote ?? (post.slideQuotes?.[0] ? formatQuote(post.slideQuotes[0]) : getPunchyExcerpt(p1, 1));
  const slide2Quote = slideSettings?.[2]?.customQuote ?? (post.slideQuotes?.[1] ? formatQuote(post.slideQuotes[1]) : getPunchyExcerpt(p2, 1));
  const slide3Quote = slideSettings?.[3]?.customQuote ?? (post.slideQuotes?.[2] ? formatQuote(post.slideQuotes[2]) : getPunchyExcerpt(p3, 1));

  const handleSaveOrUpdate = () => {
    const updatedPost = {
      ...post,
      projectId: project?.id || post.projectId || 'lore-magazine',
      projectName: project?.name || post.projectName || 'Lore Magazine',
      projectShortCode: project?.shortCode || post.projectShortCode || 'LORE',
      watermark: slideLogo,
      accentColor: slideAccentColor,
      slideQuotes: [slide1Quote, slide2Quote, slide3Quote],
      savedGallery: gallery,
      savedSlideSettings: slideSettings
    };
    if (onSaveToArchive) {
      onSaveToArchive(updatedPost);
    }
    setUndoToast(isSaved ? 'Arşivdeki gönderi ve mizanpaj güncellendi!' : 'Arşive kaydedildi!');
    setTimeout(() => setUndoToast(null), 2000);
  };

  const handleRefreshAllQuotesFromLore = () => {
    const q1 = getPunchyExcerpt(p1, 1);
    const q2 = getPunchyExcerpt(p2, 1);
    const q3 = getPunchyExcerpt(p3, 1);

    const updatedSettings = {
      ...slideSettings,
      1: { ...(slideSettings[1] || {}), customQuote: q1 },
      2: { ...(slideSettings[2] || {}), customQuote: q2 },
      3: { ...(slideSettings[3] || {}), customQuote: q3 }
    };
    onUpdateSlideSettings(updatedSettings);
    pushStateToHistory(updatedSettings, gallery);

    const updatedPost = {
      ...post,
      projectId: project?.id || post.projectId || 'lore-magazine',
      projectName: project?.name || post.projectName || 'Lore Magazine',
      projectShortCode: project?.shortCode || post.projectShortCode || 'LORE',
      watermark: slideLogo,
      accentColor: slideAccentColor,
      slideQuotes: [q1, q2, q3],
      savedGallery: gallery,
      savedSlideSettings: updatedSettings
    };
    if (onSaveToArchive) {
      onSaveToArchive(updatedPost);
    }
    setUndoToast('Slayt metinleri 3 satırlık tam cümlelere yenilendi ve kaydedildi!');
    setTimeout(() => setUndoToast(null), 2500);
  };

  const handleRefreshSingleQuote = (slideIdx) => {
    if (slideIdx <= 0) return;
    const targetPara = slideIdx === 1 ? p1 : slideIdx === 2 ? p2 : p3;
    const freshQuote = getPunchyExcerpt(targetPara, 1);
    handleUpdateSlideProperty('customQuote', freshQuote);
    setUndoToast(`Slayt ${slideIdx + 1} metni yenilendi!`);
    setTimeout(() => setUndoToast(null), 2000);
  };

  const getImageForSlide = (slideIdx) => {
    const imgId = slideSettings?.[slideIdx]?.imageId;
    if (!imgId) return null;
    return gallery.find((item) => item.id === imgId) || null;
  };

  return (
    <div
      onPaste={handlePaste}
      className="bg-[#121318] border border-white/10 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-6 animate-fadeIn relative"
    >
      {/* Undo Toast */}
      {undoToast && (
        <div className="absolute top-4 right-4 z-50 bg-[#e6c280] text-black font-mono font-bold text-xs px-3 py-1.5 rounded-lg shadow-xl animate-fadeIn">
          {undoToast}
        </div>
      )}

      {/* Header & Global Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="min-w-0">
          <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#e6c280] flex items-center space-x-2">
            <span className="p-1 rounded-md bg-[#e6c280]/10 border border-[#e6c280]/20 inline-flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-[#e6c280]" />
            </span>
            <span className="font-semibold">Birleşik Instagram Carousel & Görsel Stüdyosu</span>
          </div>
          <p className="text-xs text-neutral-400 font-sans mt-1">
            İstediğiniz slayta görsel atayın, filtreleyin ve tek tıkla Instagram'a indirin ya da planlayın.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Geri / İleri Segmented Control */}
          <div className="inline-flex items-center rounded-xl bg-white/[0.04] p-1 border border-white/10 h-10 shadow-sm">
            <button
              type="button"
              disabled={historyIndex <= 0}
              onClick={handleUndo}
              title="Geri Al (Ctrl + Z)"
              className="h-full px-2.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-white/10 mx-0.5" />
            <button
              type="button"
              disabled={historyIndex >= history.length - 1}
              onClick={handleRedo}
              title="İleri Al (Ctrl + Y)"
              className="h-full px-2.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Metinleri Yenile */}
          <button
            type="button"
            onClick={handleRefreshAllQuotesFromLore}
            className="h-10 px-3.5 rounded-xl border border-[#e6c280]/30 bg-[#e6c280]/[0.08] hover:bg-[#e6c280]/[0.18] hover:border-[#e6c280]/50 text-[#e6c280] text-xs font-mono tracking-wide transition-all flex items-center space-x-2 shrink-0 cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(230,194,128,0.15)] active:scale-[0.98]"
            title="Yapay zeka hikayesinden 3 satırlık tam anlamlı cümleleri çıkar ve tüm slaytlara uygula"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#e6c280] shrink-0" />
            <span className="whitespace-nowrap font-medium">Metinleri Yenile</span>
          </button>

          {/* Arşive Kaydet / Arşivi Güncelle */}
          {onSaveToArchive && (
            <button
              type="button"
              onClick={handleSaveOrUpdate}
              className={`h-10 px-3.5 rounded-xl border text-xs font-mono tracking-wide transition-all flex items-center space-x-2 shrink-0 cursor-pointer shadow-sm active:scale-[0.98] ${
                isSaved
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                  : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 text-neutral-300 hover:text-white'
              }`}
              title={isSaved ? "Metin, görsel veya logo değişikliklerini arşive kaydet / güncelle" : "Görsellerle birlikte yerel arşive kaydet"}
            >
              {isSaved ? (
                <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Bookmark className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              )}
              <span className="whitespace-nowrap font-medium">{isSaved ? 'Arşivi Güncelle' : 'Arşive Kaydet'}</span>
            </button>
          )}

          {/* Slayt X'i İndir */}
          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownloadActiveSlide}
            className="h-10 px-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-neutral-300 hover:text-white text-xs font-mono tracking-wide transition-all flex items-center space-x-2 shrink-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
            title={`Yalnızca seçili olan Slayt ${activeSlide + 1}'i PNG olarak indir`}
          >
            <Download className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span className="whitespace-nowrap font-medium">
              {isExporting ? 'Aktarılıyor...' : `Slayt ${activeSlide + 1}'i İndir`}
            </span>
          </button>

          {/* Tüm Slaytları İndir (Gold Primary) */}
          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownloadAllSlides}
            className="h-10 px-4 rounded-xl bg-[#e6c280] hover:bg-[#ebd29b] text-neutral-950 font-semibold text-xs font-mono tracking-wider uppercase transition-all flex items-center space-x-2 shrink-0 shadow-[0_2px_14px_rgba(230,194,128,0.25)] hover:shadow-[0_4px_20px_rgba(230,194,128,0.4)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
            title="Tüm 4 slaytı yüksek çözünürlüklü PNG olarak sırayla indir"
          >
            {downloadSuccess ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5] text-neutral-950 shrink-0" />
                <span className="whitespace-nowrap">İNDİRİLDİ!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 stroke-[2.5] text-neutral-950 shrink-0" />
                <span className="whitespace-nowrap">TÜM SLAYTLARI İNDİR</span>
              </>
            )}
          </button>

          {/* Instagram'da Paylaş / Planla (Meta Gradient Primary) */}
          <button
            type="button"
            disabled={isPreparingPublish || isExporting}
            onClick={handleOpenInstagramPublish}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#833ab4] via-[#e1306c] to-[#fd1d1d] hover:brightness-110 text-white font-semibold text-xs font-mono tracking-wider uppercase transition-all flex items-center space-x-2 shrink-0 shadow-[0_2px_16px_rgba(225,48,108,0.35)] hover:shadow-[0_4px_22px_rgba(225,48,108,0.5)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
            title="4 slaytlık carousel gönderisini Instagram'da anında yayınla veya ileri bir tarihe planla"
          >
            {isPreparingPublish ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                <span className="whitespace-nowrap">HAZIRLANIYOR...</span>
              </>
            ) : (
              <>
                <InstagramIcon className="w-4 h-4 text-white shrink-0" />
                <span className="whitespace-nowrap">INSTAGRAM'DA PAYLAŞ</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Slayt Seçici Sekmeler */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center space-x-2">
          {[
            { idx: 0, label: '01 / Kapak' },
            { idx: 1, label: '02 / Lore I' },
            { idx: 2, label: '03 / Lore II' },
            { idx: 3, label: '04 / Sonuç' },
          ].map(({ idx, label }) => {
            const media = getImageForSlide(idx);
            const isVid = media && (media.type === 'video' || media.dataUrl?.startsWith('data:video'));
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSlide(idx)}
                className={`h-8 px-3.5 rounded-lg text-xs font-mono transition-all flex items-center space-x-2 cursor-pointer ${
                  activeSlide === idx
                    ? 'bg-[#e6c280] text-black font-bold shadow-[0_0_12px_rgba(230,194,128,0.2)]'
                    : 'bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08] border border-white/5'
                }`}
              >
                <span>{label}</span>
                {isVid ? (
                  <Video className={`w-3 h-3 ${activeSlide === idx ? 'text-black' : 'text-sky-400'}`} />
                ) : media ? (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      activeSlide === idx ? 'bg-black' : 'bg-emerald-400'
                    }`}
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-1.5 bg-white/[0.03] p-0.5 rounded-lg border border-white/5">
          <button
            type="button"
            onClick={() => setActiveSlide((prev) => Math.max(0, prev - 1))}
            disabled={activeSlide === 0}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-25 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono text-neutral-400 px-1 font-semibold">{activeSlide + 1} / 4</span>
          <button
            type="button"
            onClick={() => setActiveSlide((prev) => Math.min(3, prev + 1))}
            disabled={activeSlide === 3}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-25 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        
        {/* LEFT COLUMN: THE REAL WYSIWYG CANVAS */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center bg-black/60 p-4 sm:p-6 rounded-2xl border border-white/5 overflow-hidden">
          
          <div
            onMouseDown={handleCanvasMouseDown}
            className={`relative shadow-2xl overflow-hidden rounded-md border border-white/15 select-none ${
              currentSettings.imageId ? (isDraggingMedia ? 'cursor-grabbing' : 'cursor-grab') : ''
            }`}
          >
            
            {/* SLIDE 0: COVER */}
            <div
              ref={slideRef0}
              style={{
                width: '380px',
                height: '475px',
                display: activeSlide === 0 ? 'flex' : 'none'
              }}
              className="bg-[#0b0c10] text-white p-7 flex flex-col justify-between relative overflow-hidden font-sans"
            >
              {/* Background Archival Photo or Video */}
              <SlideBackground media={getImageForSlide(0)} settings={slideSettings?.[0]} />

              {/* Top Header */}
              <div className="flex items-center justify-between border-b border-white/15 pb-3 relative z-10">
                <span
                  className="font-serif tracking-[0.25em] text-xs font-bold uppercase drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]"
                  style={{ color: slideAccentColor }}
                >
                  {slideLogo}
                </span>
                <span className="font-mono text-[10px] tracking-wider text-neutral-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                  01 / 04
                </span>
              </div>

              {/* Main Text Content: Sits directly at the bottom with pb-3 */}
              {(slideSettings?.[0]?.showText ?? true) && (
                <div 
                  style={{
                    transform: `translateY(${slideSettings?.[0]?.textOffsetY || 0}px)`
                  }}
                  className="space-y-3 mt-auto pb-3 relative z-10 transition-transform duration-75"
                >
                  <div
                    className="text-[9px] font-mono tracking-[0.2em] uppercase font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                    style={{ color: slideAccentColor }}
                  >
                    {slideTagline}
                  </div>
                  <h2 className="font-serif text-2xl font-black leading-tight tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                    {post.title}
                  </h2>
                  <div className="w-10 h-[1.5px]" style={{ backgroundColor: slideAccentColor }} />
                  <p className="font-serif italic text-xs text-neutral-200 leading-relaxed drop-shadow-[0_1px_5px_rgba(0,0,0,0.9)]">
                    "{post.hook}"
                  </p>
                </div>
              )}

              {/* Bottom Footer: pt-3 to mirror the pb-3 above the line */}
              <div className="flex items-center justify-between pt-3 border-t border-white/15 text-[9px] font-mono text-neutral-400 relative z-10">
                <span>EDİTORYAL ARŞİV</span>
                <span>KAYDIR &rarr;</span>
              </div>
            </div>

            {/* SLIDE 1: LORE PART 1 (2. Sayfa) */}
            <div
              ref={slideRef1}
              style={{
                width: '380px',
                height: '475px',
                display: activeSlide === 1 ? 'flex' : 'none'
              }}
              className="bg-[#0b0c10] text-white p-7 flex flex-col justify-between relative overflow-hidden font-sans"
            >
              {/* Background Archival Photo or Video */}
              <SlideBackground media={getImageForSlide(1)} settings={slideSettings?.[1]} />

              {/* Top Header */}
              <div className="flex items-center justify-between border-b border-white/15 pb-3 relative z-10">
                <span
                  className="font-serif tracking-[0.25em] text-xs font-bold uppercase drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]"
                  style={{ color: slideAccentColor }}
                >
                  {slideLogo}
                </span>
                <span className="font-mono text-[10px] tracking-wider text-neutral-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                  02 / 04
                </span>
              </div>

              {/* Main Text Content: Sits directly at bottom with pb-3 */}
              {(slideSettings?.[1]?.showText ?? true) && (
                <div 
                  style={{
                    transform: `translateY(${slideSettings?.[1]?.textOffsetY || 0}px)`
                  }}
                  className="space-y-3 mt-auto pb-3 relative z-10 transition-transform duration-75"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: slideAccentColor }} />
                    <span
                      className="text-[9px] font-mono tracking-widest uppercase font-semibold"
                      style={{ color: slideAccentColor }}
                    >
                      01 / İkonikleşme & Giriş
                    </span>
                  </div>

                  <p className="font-serif italic text-[14px] sm:text-[15px] text-white leading-relaxed min-h-[4.2rem] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                    "{slide1Quote}"
                  </p>

                  <div className="flex items-center space-x-1.5 text-[9px] font-mono text-neutral-300">
                    <span style={{ color: slideAccentColor }}>&bull;</span>
                    <span>Popüler kültürün gizli şifreleri</span>
                    <span style={{ color: slideAccentColor }}>&rarr;</span>
                  </div>
                </div>
              )}

              {/* Bottom Footer: pt-3 to mirror the pb-3 above the line */}
              <div className="flex items-center justify-between pt-3 border-t border-white/15 text-[9px] font-mono text-neutral-400 relative z-10">
                <span className="truncate max-w-[200px]">{post.title}</span>
                <span>KAYDIR &rarr;</span>
              </div>
            </div>

            {/* SLIDE 2: LORE PART 2 (3. Sayfa) */}
            <div
              ref={slideRef2}
              style={{
                width: '380px',
                height: '475px',
                display: activeSlide === 2 ? 'flex' : 'none'
              }}
              className="bg-[#0b0c10] text-white p-7 flex flex-col justify-between relative overflow-hidden font-sans"
            >
              {/* Background Archival Photo or Video */}
              <SlideBackground media={getImageForSlide(2)} settings={slideSettings?.[2]} />

              {/* Top Header */}
              <div className="flex items-center justify-between border-b border-white/15 pb-3 relative z-10">
                <span
                  className="font-serif tracking-[0.25em] text-xs font-bold uppercase drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]"
                  style={{ color: slideAccentColor }}
                >
                  {slideLogo}
                </span>
                <span className="font-mono text-[10px] tracking-wider text-neutral-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                  03 / 04
                </span>
              </div>

              {/* Main Text Content: Sits directly at bottom with pb-3 */}
              {(slideSettings?.[2]?.showText ?? true) && (
                <div 
                  style={{
                    transform: `translateY(${slideSettings?.[2]?.textOffsetY || 0}px)`
                  }}
                  className="space-y-3 mt-auto pb-3 relative z-10 transition-transform duration-75"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: slideAccentColor }} />
                    <span
                      className="text-[9px] font-mono tracking-widest uppercase font-semibold"
                      style={{ color: slideAccentColor }}
                    >
                      02 / Statü Şifresi & Perde Arkası
                    </span>
                  </div>

                  <p className="font-serif italic text-[14px] sm:text-[15px] text-white leading-relaxed min-h-[4.2rem] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                    "{slide2Quote}"
                  </p>

                  <div className="flex items-center space-x-1.5 text-[9px] font-mono text-neutral-300">
                    <span style={{ color: slideAccentColor }}>&bull;</span>
                    <span>Detaylı hikaye açıklamada</span>
                    <span style={{ color: slideAccentColor }}>&darr;</span>
                  </div>
                </div>
              )}

              {/* Bottom Footer: pt-3 to mirror the pb-3 above the line */}
              <div className="flex items-center justify-between pt-3 border-t border-white/15 text-[9px] font-mono text-neutral-400 relative z-10">
                <span>DÖNEM: {post.decade}</span>
                <span>KAYDIR &rarr;</span>
              </div>
            </div>

            {/* SLIDE 3: OUTRO / CLOSING (4. Sayfa) */}
            <div
              ref={slideRef3}
              style={{
                width: '380px',
                height: '475px',
                display: activeSlide === 3 ? 'flex' : 'none'
              }}
              className="bg-[#0b0c10] text-white p-7 flex flex-col justify-between relative overflow-hidden font-sans"
            >
              {/* Background Archival Photo or Video */}
              <SlideBackground media={getImageForSlide(3)} settings={slideSettings?.[3]} />

              {/* Top Header */}
              <div className="flex items-center justify-between border-b border-white/15 pb-3 relative z-10">
                <span
                  className="font-serif tracking-[0.25em] text-xs font-bold uppercase drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]"
                  style={{ color: slideAccentColor }}
                >
                  {slideLogo}
                </span>
                <span className="font-mono text-[10px] tracking-wider text-neutral-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                  04 / 04
                </span>
              </div>

              {/* Main Content: Sits directly at bottom with pb-3 matching the line distance! */}
              {(slideSettings?.[3]?.showText ?? true) && (
                <div 
                  style={{
                    transform: `translateY(${slideSettings?.[3]?.textOffsetY || 0}px)`
                  }}
                  className="space-y-3 mt-auto pb-3 relative z-10 transition-transform duration-75"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: slideAccentColor }} />
                    <span
                      className="text-[9px] font-mono tracking-widest uppercase font-semibold"
                      style={{ color: slideAccentColor }}
                    >
                      03 / Kültürel Miras & Kapanış
                    </span>
                  </div>

                  <p className="font-serif italic text-[14px] sm:text-[15px] text-white leading-relaxed min-h-[4.2rem] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                    "{slide3Quote}"
                  </p>

                  <div className="flex items-center space-x-1.5 text-[9px] font-mono text-neutral-300">
                    <span style={{ color: slideAccentColor }}>&bull;</span>
                    <span>Bu detayı biliyor muydunuz? Görüşlerinizi yazın</span>
                    <span style={{ color: slideAccentColor }}>&darr;</span>
                  </div>

                  {/* Hashtags: Eski zarif, küçük yapısında sadece bir tık daha belirgin */}
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {post.hashtags?.slice(0, 3).map((tag, i) => (
                      <span key={i} className="text-[8.5px] font-mono text-neutral-200 bg-white/10 px-2 py-0.5 rounded border border-white/15 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Footer: pt-3 to mirror the pb-3 above the line */}
              <div className="flex items-center justify-between pt-3 border-t border-white/15 text-[9px] font-mono text-[#e6c280] relative z-10">
                <span>KAYDET · PAYLAŞ</span>
                <span>@{post?.projectShortCode ? `${post.projectShortCode.toUpperCase()}` : 'POSTCREATOR'}</span>
              </div>
            </div>

          </div>

          <div className="text-[10px] font-mono text-neutral-500 mt-3 flex items-center space-x-2">
            <span>Slayt {activeSlide + 1} / 4</span>
            <span>·</span>
            <span>Instagram 4:5 Portre (1080x1350)</span>
            {currentSettings.imageId && (
              <>
                <span>·</span>
                <span className="text-[#e6c280] flex items-center space-x-1">
                  <Move className="w-2.5 h-2.5" />
                  <span>Sürükleyerek Kaydır</span>
                </span>
              </>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: MULTI-IMAGE TRAY & SLIDE CONTROLS (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* 1. Medya Havuzu / Tray (Foto & Video) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 flex items-center space-x-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#e6c280]" />
                <span>Medya Havuzu ({gallery.length})</span>
              </label>
              
              <div className="flex items-center space-x-1.5">
                {/* Pinterest / Web URL ile Ekle */}
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono flex items-center space-x-1.5 border transition-all cursor-pointer ${
                    showUrlInput
                      ? 'bg-[#e6c280]/20 border-[#e6c280] text-[#e6c280] font-bold shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300 hover:text-white'
                  }`}
                  title="Pinterest veya web görsel linki yapıştırarak doğrudan indir"
                >
                  <LinkIcon className="w-3 h-3 text-[#e6c280]" />
                  <span>URL ile Ekle</span>
                </button>
              </div>
            </div>

            {/* URL İndirme Çekmecesi (Pinterest & Web) */}
            {showUrlInput && (
              <div className="p-3 rounded-xl bg-black/80 border border-[#e6c280]/40 space-y-2 animate-fadeIn shadow-2xl">
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-300">
                  <span className="flex items-center space-x-1.5 text-[#e6c280] font-semibold">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Pinterest veya Web Görseli İndir</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUrlInput(false);
                      setUrlError(null);
                    }}
                    className="text-neutral-500 hover:text-white text-xs font-mono p-0.5"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex space-x-1.5">
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleImportFromUrl()}
                    placeholder="https://i.pinimg.com/... veya https://..."
                    className="flex-1 bg-black/60 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#e6c280] font-mono"
                  />
                  <button
                    type="button"
                    disabled={isDownloadingUrl || !inputUrl.trim()}
                    onClick={() => handleImportFromUrl()}
                    className="px-3 py-1.5 rounded-lg bg-[#e6c280] hover:bg-[#d4b06e] text-black font-semibold text-xs font-mono transition-all disabled:opacity-40 flex items-center space-x-1 shrink-0 cursor-pointer shadow-md"
                  >
                    {isDownloadingUrl ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>İndiriliyor...</span>
                      </>
                    ) : (
                      <span>İndir & Slayta Ekle</span>
                    )}
                  </button>
                </div>

                {urlError && (
                  <div className="text-[10px] text-red-400 font-mono bg-red-950/30 p-1.5 rounded border border-red-500/20">
                    {urlError}
                  </div>
                )}

                <p className="text-[10px] text-neutral-400 font-sans leading-relaxed pt-0.5">
                  💡 <strong>En Pratik Yol:</strong> Pinterest veya Google Görseller'de beğendiğiniz görsele sağ tıklayıp <em>"Resmi Kopyala"</em> dedikten sonra doğrudan bu sayfada <kbd className="bg-white/10 px-1 py-0.5 rounded text-[9px] font-mono text-[#e6c280]">Ctrl + V</kbd> yaparsanız indirme linkine gerek kalmadan anında eklenir!
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => handleAddFiles(e.target.files)}
              className="hidden"
            />

            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleAssignImage(null)}
                className={`h-20 rounded-xl border flex flex-col items-center justify-center text-[10px] font-mono transition-all ${
                  !currentSettings.imageId
                    ? 'border-[#e6c280] bg-[#e6c280]/15 text-[#e6c280] font-bold shadow-[0_0_10px_rgba(230,194,128,0.2)]'
                    : 'border-white/10 bg-white/[0.02] text-neutral-400 hover:text-white hover:border-white/20'
                }`}
              >
                <span>Sade</span>
                <span className="text-[9px] text-neutral-500">(Siyah)</span>
              </button>

              {gallery.map((media) => {
                const isAssigned = currentSettings.imageId === media.id;
                const isVid = media.type === 'video' || media.dataUrl?.startsWith('data:video') || /\.(mp4|webm|mov|ogg)$/i.test(media.name || '');
                return (
                  <div
                    key={media.id}
                    onClick={() => handleAssignImage(media.id)}
                    className={`relative h-20 rounded-xl border overflow-hidden cursor-pointer group transition-all ${
                      isAssigned
                        ? 'border-[#e6c280] ring-2 ring-[#e6c280] shadow-[0_0_12px_rgba(230,194,128,0.3)]'
                        : 'border-white/10 opacity-70 hover:opacity-100 hover:border-white/30'
                    }`}
                  >
                    {isVid ? (
                      <video src={media.dataUrl} className="w-full h-full object-cover" muted playsInline />
                    ) : (
                      <img src={media.dataUrl} alt="" className="w-full h-full object-cover" />
                    )}

                    {/* Video rozeti */}
                    {isVid && (
                      <div className="absolute top-1 left-1 bg-black/80 text-sky-300 rounded px-1 py-0.2 text-[8px] font-mono flex items-center space-x-1 border border-sky-400/30">
                        <Video className="w-2.5 h-2.5" />
                        <span>VİDEO</span>
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={(e) => handleDeleteImage(media.id, e)}
                      title="Medyayı Havuzdan Sil"
                      className="absolute top-1 right-1 p-1 rounded bg-black/80 text-neutral-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>

                    {isAssigned && (
                      <div className="absolute bottom-1 left-1 bg-[#e6c280] text-black font-mono font-bold text-[8px] px-1 rounded">
                        Slayt {activeSlide + 1}
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-20 rounded-xl border border-dashed border-white/20 hover:border-[#e6c280]/60 hover:bg-white/[0.03] text-neutral-400 hover:text-[#e6c280] flex flex-col items-center justify-center text-[10px] font-mono transition-all space-y-0.5 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>+ Medya</span>
                <span className="text-[8px] text-neutral-500">Foto / Video</span>
              </button>
            </div>

            <p className="text-[10px] text-neutral-500 font-mono">
              İpucu: Fotoğraf veya MP4 / WebM video yükleyebilir, doğrudan <kbd className="bg-white/10 px-1 py-0.5 rounded text-[9px]">Ctrl+V</kbd> ile de yapıştırabilirsiniz.
            </p>
          </div>

          {/* 2. Aktif Slayt Ayarları */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-[#e6c280] font-semibold">
                Slayt {activeSlide + 1} Mizanpaj Ayarları
              </span>
              
              <button
                type="button"
                onClick={() => handleUpdateSlideProperty('showText', !currentSettings.showText)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                  currentSettings.showText
                    ? 'border-[#e6c280]/40 text-[#e6c280] bg-[#e6c280]/10'
                    : 'border-white/10 text-neutral-400'
                }`}
              >
                {currentSettings.showText ? 'Metin Açık' : 'Yalnızca Medya'}
              </button>
            </div>

            {/* Video Slayt Bilgisi & İndirme */}
            {(() => {
              const currentMedia = getImageForSlide(activeSlide);
              const isVid = currentMedia && (currentMedia.type === 'video' || currentMedia.dataUrl?.startsWith('data:video'));
              if (!isVid) return null;
              return (
                <div className="p-2.5 rounded-lg bg-sky-950/30 border border-sky-500/30 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center space-x-2 text-sky-300">
                    <Video className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="text-[11px]">Video Slayt (Sonsuz Döngü)</span>
                  </div>
                  <a
                    href={currentMedia.dataUrl}
                    download={currentMedia.name || `Slayt_${activeSlide + 1}_video.mp4`}
                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] flex items-center space-x-1 transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    <span>Videoyu İndir</span>
                  </a>
                </div>
              );
            })()}

            {/* Metin Dikey İnce Ayarı */}
            {currentSettings.showText && (
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-neutral-300 flex items-center space-x-1.5">
                    <MoveVertical className="w-3.5 h-3.5 text-[#e6c280]" />
                    <span>Dikey Metin Konumu</span>
                  </span>
                  <span className="text-[#e6c280] font-bold">
                    {currentSettings.textOffsetY > 0
                      ? `+${currentSettings.textOffsetY}px`
                      : currentSettings.textOffsetY < 0
                      ? `${currentSettings.textOffsetY}px`
                      : '0px (Standart Alt)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="-70"
                  max="50"
                  value={currentSettings.textOffsetY || 0}
                  onChange={(e) => handleUpdateSlideProperty('textOffsetY', Number(e.target.value))}
                  className="w-full accent-[#e6c280] cursor-pointer"
                />
                <div className="flex justify-between items-center text-[9px] font-mono text-neutral-500 pt-0.5">
                  <span>&uarr; Yukarı (-70px)</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateSlideProperty('textOffsetY', 0)}
                    className="text-neutral-400 hover:text-[#e6c280] flex items-center space-x-0.5"
                    title="Standart Alt Konum"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Sıfırla (Standart)</span>
                  </button>
                  <span>&darr; Aşağı (+50px)</span>
                </div>
              </div>
            )}

            {/* Slayt Metni Düzenleme (2-3 Satırlık Vurucu Cümle) */}
            {currentSettings.showText && activeSlide > 0 && (
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-neutral-300 flex items-center space-x-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-[#e6c280]" />
                    <span>Slayt Metni (2-3 Satır)</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleRefreshSingleQuote(activeSlide)}
                      className="text-[9px] text-[#e6c280] hover:underline flex items-center space-x-0.5 cursor-pointer"
                      title="Bu slaytın metnini hikayeden tam cümle olarak yeniden çek"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-[#e6c280]" />
                      <span>Metinden Yenile</span>
                    </button>
                    {currentSettings.customQuote !== null && currentSettings.customQuote !== undefined && (
                      <button
                        type="button"
                        onClick={() => handleUpdateSlideProperty('customQuote', null)}
                        className="text-[9px] text-neutral-400 hover:text-[#e6c280] flex items-center space-x-0.5"
                        title="Yapay zekanın orijinal metnine geri dön"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Sıfırla</span>
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={currentSettings.customQuote ?? (activeSlide === 1 ? slide1Quote : activeSlide === 2 ? slide2Quote : slide3Quote)}
                  onChange={(e) => handleUpdateSlideProperty('customQuote', e.target.value)}
                  placeholder="2-3 satırlık vurucu bir editoryal tespit girin..."
                  className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#e6c280] font-serif italic"
                />
                <div className="flex justify-between items-center text-[9px] font-mono text-neutral-500">
                  <span>En net okuma için 10-13 kelimelik tek cümle</span>
                  <span>
                    {(currentSettings.customQuote ?? (activeSlide === 1 ? slide1Quote : activeSlide === 2 ? slide2Quote : slide3Quote)).split(/\s+/).filter(Boolean).length} kelime
                  </span>
                </div>
              </div>
            )}

            {/* Siyah Karartma Filtresi: Aç / Kapat & Ayar (Tüm sayfalarda kontrol edilebilir) */}
            {currentSettings.imageId && (
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-mono text-neutral-300">Siyah Karartma (Vignette)</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                      (currentSettings.vignette ?? 75) > 0 
                        ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20' 
                        : 'text-neutral-500 border-white/10'
                    }`}>
                      {(currentSettings.vignette ?? 75) > 0 ? `%${currentSettings.vignette} Açık` : 'Kapalı (Net Fotoğraf)'}
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleUpdateSlideProperty('vignette', (currentSettings.vignette ?? 75) > 0 ? 0 : 75)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                      (currentSettings.vignette ?? 75) > 0
                        ? 'border-[#e6c280]/40 text-[#e6c280] bg-[#e6c280]/10 hover:bg-[#e6c280]/20'
                        : 'border-white/10 text-neutral-400 hover:text-white bg-white/5'
                    }`}
                  >
                    {(currentSettings.vignette ?? 75) > 0 ? 'Filtreyi Kaldır' : 'Filtreyi Aç'}
                  </button>
                </div>

                {(currentSettings.vignette ?? 75) > 0 && (
                  <div>
                    <input
                      type="range"
                      min="10"
                      max="95"
                      value={currentSettings.vignette ?? 75}
                      onChange={(e) => handleUpdateSlideProperty('vignette', Number(e.target.value))}
                      className="w-full accent-[#e6c280] cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] font-mono text-neutral-500">
                      <span>Hafif (%10)</span>
                      <span>Koyu (%95)</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Görsel Filtreleri & Zoom */}
            {currentSettings.imageId && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-mono text-neutral-400">
                      Renk & Film Filtresi
                    </label>
                    <span className="text-[10px] font-mono text-[#e6c280]">
                      {FILTERS.find((f) => f.id === (currentSettings.filter || 'none'))?.name}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {FILTERS.map((f) => {
                      const isSelected = (currentSettings.filter || 'none') === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => handleUpdateSlideProperty('filter', f.id)}
                          className={`py-1.5 px-1 rounded text-[9px] font-mono truncate transition-all text-center ${
                            isSelected
                              ? 'bg-[#e6c280] text-black font-bold shadow-md'
                              : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {f.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-mono text-neutral-400 mb-1">
                    <span>Fotoğraf Yakınlaştırma (Zoom)</span>
                    <span>%{currentSettings.zoom}</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="160"
                    value={currentSettings.zoom}
                    onChange={(e) => handleUpdateSlideProperty('zoom', Number(e.target.value))}
                    className="w-full accent-[#e6c280] cursor-pointer"
                  />
                </div>

                {/* Görsel / Video Konumlandırma (Kaydır: Sağa / Sola / Yukarı / Aşağı) */}
                <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-neutral-300 flex items-center space-x-1.5 font-semibold">
                      <Move className="w-3.5 h-3.5 text-[#e6c280]" />
                      <span>Görsel Konumu (Kaydır)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = {
                          ...slideSettings,
                          [activeSlide]: {
                            ...currentSettings,
                            offsetX: 0,
                            offsetY: 0
                          }
                        };
                        onUpdateSlideSettings(updated);
                        pushStateToHistory(updated, gallery);
                      }}
                      className="text-[9px] font-mono text-neutral-400 hover:text-[#e6c280] flex items-center space-x-1 transition-colors cursor-pointer"
                      title="Görseli merkeze al"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Ortala</span>
                    </button>
                  </div>

                  {/* Yön Tuşları (D-Pad) */}
                  <div className="flex items-center justify-center py-1">
                    <div className="grid grid-cols-3 gap-1.5 w-32">
                      <div />
                      <button
                        type="button"
                        onClick={() => handleNudge(0, -15)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white flex items-center justify-center border border-white/10 text-xs active:scale-95 transition-all cursor-pointer"
                        title="Yukarı Kaydır"
                      >
                        <ChevronUp className="w-3.5 h-3.5 text-[#e6c280]" />
                      </button>
                      <div />

                      <button
                        type="button"
                        onClick={() => handleNudge(-15, 0)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white flex items-center justify-center border border-white/10 text-xs active:scale-95 transition-all cursor-pointer"
                        title="Sola Kaydır"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 text-[#e6c280]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = {
                            ...slideSettings,
                            [activeSlide]: {
                              ...currentSettings,
                              offsetX: 0,
                              offsetY: 0
                            }
                          };
                          onUpdateSlideSettings(updated);
                          pushStateToHistory(updated, gallery);
                        }}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-[#e6c280] hover:text-black text-neutral-300 flex items-center justify-center border border-white/10 text-[10px] font-mono active:scale-95 transition-all cursor-pointer"
                        title="Ortala"
                      >
                        ●
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNudge(15, 0)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white flex items-center justify-center border border-white/10 text-xs active:scale-95 transition-all cursor-pointer"
                        title="Sağa Kaydır"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-[#e6c280]" />
                      </button>

                      <div />
                      <button
                        type="button"
                        onClick={() => handleNudge(0, 15)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white flex items-center justify-center border border-white/10 text-xs active:scale-95 transition-all cursor-pointer"
                        title="Aşağı Kaydır"
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-[#e6c280]" />
                      </button>
                      <div />
                    </div>
                  </div>

                  {/* Hassas Sürgüler */}
                  <div className="space-y-2 pt-1 border-t border-white/5">
                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-neutral-400 mb-0.5">
                        <span>Yatay Konum (X)</span>
                        <span className="text-[#e6c280] font-bold">
                          {(currentSettings.offsetX || 0) > 0 ? `+${currentSettings.offsetX}px (Sağ)` : (currentSettings.offsetX || 0) < 0 ? `${currentSettings.offsetX}px (Sol)` : '0px'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-200"
                        max="200"
                        value={currentSettings.offsetX || 0}
                        onChange={(e) => handleUpdateSlideProperty('offsetX', Number(e.target.value))}
                        className="w-full accent-[#e6c280] cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-neutral-400 mb-0.5">
                        <span>Dikey Konum (Y)</span>
                        <span className="text-[#e6c280] font-bold">
                          {(currentSettings.offsetY || 0) > 0 ? `+${currentSettings.offsetY}px (Aşağı)` : (currentSettings.offsetY || 0) < 0 ? `${currentSettings.offsetY}px (Yukarı)` : '0px'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-200"
                        max="200"
                        value={currentSettings.offsetY || 0}
                        onChange={(e) => handleUpdateSlideProperty('offsetY', Number(e.target.value))}
                        className="w-full accent-[#e6c280] cursor-pointer"
                      />
                    </div>
                  </div>

                  <p className="text-[9px] font-mono text-neutral-500 text-center">
                    Görseli soldaki önizleme üzerinden <strong>mouse ile sürükleyerek</strong> de serbestçe kaydırabilirsiniz.
                  </p>
                </div>
              </>
            )}

          </div>

          {/* Hızlı Kısayol Bilgisi */}
          <div className="p-3 rounded-lg bg-black/40 border border-white/5 text-[10px] font-mono text-neutral-400 flex items-center justify-between">
            <span>Geri Alma: <kbd className="text-[#e6c280] font-bold">Ctrl + Z</kbd></span>
            <span>İleri Alma: <kbd className="text-[#e6c280] font-bold">Ctrl + Y</kbd></span>
          </div>

        </div>

      </div>

      {/* Instagram Content Publishing & Scheduling Modal */}
      <InstagramPublishModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        post={post}
        slideDataUrls={renderedSlideUrls}
        caption={post?.formattedCaption || ''}
        onOpenMetaConnect={() => {
          setIsPublishModalOpen(false);
          if (onOpenMetaConnect) onOpenMetaConnect();
        }}
      />

    </div>
  );
}
