import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Download, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Check, Image as ImageIcon, 
  Upload, Trash2, Undo2, Redo2, Sliders, Eye, Sparkles, Layers,
  Sun, ZoomIn, Contrast, MoveVertical, Move, RotateCcw, ShieldOff, ShieldAlert,
  Bookmark, BookmarkCheck, Video, Play, Edit3, Link as LinkIcon, Globe, Loader2,
  Film, ExternalLink, Plus, Type
} from 'lucide-react';
import { InstagramIcon } from './Icons';
import { toPng } from 'html-to-image';
import { getPunchyExcerpt } from '../services/gemini';
import { convertUrlToDataUrl } from '../services/imageService';
import { exportSlideAsVideo } from '../services/videoExport';
import { InstagramPublishModal } from './InstagramPublishModal';

export const FONT_OPTIONS = [
  { id: 'serif', name: 'Editoryal Serif', label: 'Playfair', fontClass: 'font-serif', preview: 'Aa' },
  { id: 'cinzel', name: 'Lüks Klasik', label: 'Cinzel', fontClass: 'font-cinzel', preview: '🏛️' },
  { id: 'grotesk', name: 'Modern Poster', label: 'Grotesk', fontClass: 'font-grotesk', preview: '⚡' },
  { id: 'sans', name: 'Minimalist Sans', label: 'Inter', fontClass: 'font-sans', preview: '✦' },
  { id: 'mono', name: 'Arşiv Daktilo', label: 'Mono', fontClass: 'font-mono', preview: '⌨️' },
];

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
  const [activeSlide, setActiveSlide] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [undoToast, setUndoToast] = useState(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef(null);
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);

  // Dynamic Slide Count (2 ila 10 slayt arası)
  const [slideCount, setSlideCount] = useState(() => {
    if (slideSettings && typeof slideSettings === 'object') {
      const keys = Object.keys(slideSettings).map(Number).filter((n) => !isNaN(n));
      if (keys.length > 0) return Math.max(4, Math.max(...keys) + 1);
    }
    return 4;
  });

  // Typography & Font Selector
  const [selectedFont, setSelectedFont] = useState(() => {
    return post?.fontFamily || project?.fontFamily || 'serif';
  });
  const currentFontObj = FONT_OPTIONS.find((f) => f.id === selectedFont) || FONT_OPTIONS[0];
  const activeFontClass = currentFontObj.fontClass;

  // Instagram Publishing & Scheduling State
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [renderedSlideUrls, setRenderedSlideUrls] = useState([]);
  const [isPreparingPublish, setIsPreparingPublish] = useState(false);

  // URL & Search State
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showMediaSearch, setShowMediaSearch] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [isDownloadingUrl, setIsDownloadingUrl] = useState(false);
  const [urlError, setUrlError] = useState(null);

  // History Stack for CTRL+Z Undo / Redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const fileInputRef = useRef(null);
  const slideRefsMap = useRef({});

  // Current Slide Settings
  const currentSettings = slideSettings?.[activeSlide] || INITIAL_SLIDE_SETTINGS[0];

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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target)) {
        setShowDownloadMenu(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowDownloadMenu(false);
    };
    if (showDownloadMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDownloadMenu]);
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

  // Export Active Slide (PNG)
  const handleDownloadActiveSlide = async () => {
    const currentRef = slideRefsMap.current[activeSlide];
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

  // Export Active Slide as Video (MP4 / WebM Reel)
  const handleDownloadActiveSlideAsVideo = async () => {
    const currentRef = slideRefsMap.current[activeSlide];
    if (!currentRef) return;
    try {
      setIsExporting(true);
      setIsRenderingVideo(true);
      setUndoToast('Video hazırlanıyor (%10)...');

      const prefix = post?.projectShortCode || 'POST';
      const filename = `${prefix}_${post?.category || 'Post'}_Slayt_${activeSlide + 1}.mp4`;

      await exportSlideAsVideo({
        slideElement: currentRef,
        durationSeconds: 6,
        filename,
        onProgress: (percent, msg) => {
          setUndoToast(msg);
        }
      });

      setUndoToast('Video başarıyla indirildi!');
      setTimeout(() => setUndoToast(null), 3000);
    } catch (err) {
      console.error('Video dışa aktarma hatası:', err);
      setUndoToast('Video oluşturulamadı: ' + (err.message || 'Hata'));
      setTimeout(() => setUndoToast(null), 3000);
    } finally {
      setIsExporting(false);
      setIsRenderingVideo(false);
    }
  };

  // Export All Slides (PNG)
  const handleDownloadAllSlides = async () => {
    try {
      setIsExporting(true);
      for (let i = 0; i < slideCount; i++) {
        const ref = slideRefsMap.current[i];
        if (ref) {
          const prevDisplay = ref.style.display;
          ref.style.display = 'flex';
          const dataUrl = await toPng(ref, { quality: 0.98, pixelRatio: 2.5 });
          if (activeSlide !== i) {
            ref.style.display = prevDisplay;
          }
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
    for (let i = 0; i < slideCount; i++) {
      const ref = slideRefsMap.current[i];
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

  const loreParagraphs = Array.isArray(post.lore) 
    ? post.lore 
    : typeof post.lore === 'string' 
    ? post.lore.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)
    : [];

  const getQuoteForSlide = (slideIdx) => {
    if (slideIdx <= 0) return '';
    if (slideSettings?.[slideIdx]?.customQuote !== null && slideSettings?.[slideIdx]?.customQuote !== undefined) {
      return slideSettings[slideIdx].customQuote;
    }
    const loreIdx = slideIdx - 1;
    if (post.slideQuotes && post.slideQuotes[loreIdx]) {
      return formatQuote(post.slideQuotes[loreIdx]);
    }
    const targetPara = loreParagraphs[loreIdx] || loreParagraphs[loreIdx % Math.max(1, loreParagraphs.length)] || '';
    return getPunchyExcerpt(targetPara, 1);
  };

  const handleSaveOrUpdate = () => {
    const allQuotes = Array.from({ length: Math.max(1, slideCount - 1) }).map((_, i) => getQuoteForSlide(i + 1));
    const updatedPost = {
      ...post,
      projectId: project?.id || post.projectId || 'lore-magazine',
      projectName: project?.name || post.projectName || 'Lore Magazine',
      projectShortCode: project?.shortCode || post.projectShortCode || 'LORE',
      watermark: slideLogo,
      accentColor: slideAccentColor,
      fontFamily: selectedFont,
      slideCount,
      slideQuotes: allQuotes,
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
    const updatedSettings = { ...slideSettings };
    for (let i = 1; i < slideCount; i++) {
      const loreIdx = i - 1;
      const targetPara = loreParagraphs[loreIdx] || loreParagraphs[loreIdx % Math.max(1, loreParagraphs.length)] || '';
      const q = getPunchyExcerpt(targetPara, 1);
      updatedSettings[i] = {
        ...(updatedSettings[i] || INITIAL_SLIDE_SETTINGS[0]),
        customQuote: q
      };
    }
    onUpdateSlideSettings(updatedSettings);
    pushStateToHistory(updatedSettings, gallery);
    setUndoToast('Tüm slayt metinleri hikayeden yenilendi!');
    setTimeout(() => setUndoToast(null), 2500);
  };

  const handleRefreshSingleQuote = (slideIdx) => {
    if (slideIdx <= 0) return;
    const loreIdx = slideIdx - 1;
    const targetPara = loreParagraphs[loreIdx] || loreParagraphs[loreIdx % Math.max(1, loreParagraphs.length)] || '';
    const freshQuote = getPunchyExcerpt(targetPara, 1);
    handleUpdateSlideProperty('customQuote', freshQuote);
    setUndoToast(`Slayt ${slideIdx + 1} metni yenilendi!`);
    setTimeout(() => setUndoToast(null), 2000);
  };

  const handleAddSlide = () => {
    if (slideCount >= 10) {
      setUndoToast('Instagram carouselleri maksimum 10 slayt olabilir.');
      setTimeout(() => setUndoToast(null), 2000);
      return;
    }
    const newIdx = slideCount;
    const updatedSettings = {
      ...slideSettings,
      [newIdx]: {
        imageId: null,
        filter: 'none',
        vignette: 75,
        zoom: 105,
        brightness: 100,
        showText: true,
        textOffsetY: 0,
        offsetX: 0,
        offsetY: 0,
        customQuote: null
      }
    };
    onUpdateSlideSettings(updatedSettings);
    pushStateToHistory(updatedSettings, gallery);
    setSlideCount(slideCount + 1);
    setActiveSlide(newIdx);
    setUndoToast(`Slayt ${newIdx + 1} eklendi! Toplam: ${slideCount + 1} slayt`);
    setTimeout(() => setUndoToast(null), 2000);
  };

  const handleRemoveSlide = (idxToRemove) => {
    if (slideCount <= 2) {
      setUndoToast('Minimum 2 slayt bulunmalıdır.');
      setTimeout(() => setUndoToast(null), 2000);
      return;
    }
    const updatedSettings = {};
    let newIdx = 0;
    for (let i = 0; i < slideCount; i++) {
      if (i !== idxToRemove) {
        updatedSettings[newIdx] = slideSettings?.[i] || INITIAL_SLIDE_SETTINGS[0];
        newIdx++;
      }
    }
    onUpdateSlideSettings(updatedSettings);
    pushStateToHistory(updatedSettings, gallery);
    setSlideCount(slideCount - 1);
    setActiveSlide((prev) => Math.min(prev, slideCount - 2));
    setUndoToast(`Slayt ${idxToRemove + 1} kaldırıldı.`);
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
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#e6c280] flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Birleşik Instagram Carousel & Görsel Stüdyosu</span>
          </div>
          <p className="text-xs text-neutral-400 font-sans mt-0.5">
            İstediğiniz slayta istediğiniz görseli atayın, filtreleyin ve tek tıkla Instagram'a indirin.
          </p>
        </div>

        {/* Undo / Redo & Download buttons */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            disabled={historyIndex <= 0}
            onClick={handleUndo}
            title="Geri Al (Ctrl + Z)"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white disabled:opacity-30 border border-white/10 transition-colors shrink-0"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={historyIndex >= history.length - 1}
            onClick={handleRedo}
            title="İleri Al (Ctrl + Y)"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white disabled:opacity-30 border border-white/10 transition-colors shrink-0"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleRefreshAllQuotesFromLore}
            className="px-3 py-2 rounded-lg border border-[#e6c280]/40 bg-[#e6c280]/10 hover:bg-[#e6c280]/20 text-[#e6c280] text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm shrink-0"
            title="Yapay zeka hikayesinden 3 satırlık tam anlamlı cümleleri çıkar ve tüm slaytlara uygula"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#e6c280]" />
            <span className="whitespace-nowrap">Metinleri Yenile</span>
          </button>

          {onSaveToArchive && (
            <button
              type="button"
              onClick={handleSaveOrUpdate}
              className={`px-3 py-2 rounded-lg border text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 ${
                isSaved
                  ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40 hover:border-emerald-400'
                  : 'border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white'
              }`}
              title={isSaved ? "Metin, görsel veya logo değişikliklerini arşive kaydet / güncelle" : "Görsellerle birlikte yerel arşive kaydet"}
            >
              {isSaved ? <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Bookmark className="w-3.5 h-3.5 text-[#e6c280]" />}
              <span className="whitespace-nowrap">{isSaved ? 'Arşivi Güncelle' : 'Arşive Kaydet'}</span>
            </button>
          )}

          {/* İndir Dropdown Menüsü */}
          <div className="relative shrink-0" ref={downloadMenuRef}>
            <button
              type="button"
              disabled={isExporting}
              onClick={() => setShowDownloadMenu((prev) => !prev)}
              className="px-4 py-2 rounded-lg bg-[#e6c280] hover:bg-[#d4b06e] text-black font-semibold text-xs font-mono uppercase tracking-wider transition-all flex items-center space-x-1.5 shadow-[0_0_15px_rgba(230,194,128,0.2)] cursor-pointer disabled:opacity-40"
              title="Slaytları PNG veya MP4 video olarak indir"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="whitespace-nowrap">İndirildi!</span>
                </>
              ) : isRenderingVideo ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                  <span className="whitespace-nowrap">Video Hazırlanıyor...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span className="whitespace-nowrap">{isExporting ? 'Aktarılıyor...' : 'İndir'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showDownloadMenu ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>

            {/* Dropdown Seçenekleri */}
            {showDownloadMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-[#14151a] border border-white/15 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => {
                    setShowDownloadMenu(false);
                    handleDownloadActiveSlide();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-mono text-neutral-200 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Download className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white" />
                    <span className="whitespace-nowrap">Slayt {activeSlide + 1}'i İndir</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 uppercase font-sans">PNG</span>
                </button>

                <div className="h-px bg-white/10 my-1" />

                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => {
                    setShowDownloadMenu(false);
                    handleDownloadAllSlides();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-mono text-[#e6c280] hover:text-black hover:bg-[#e6c280] transition-colors flex items-center justify-between font-semibold group cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Download className="w-3.5 h-3.5" />
                    <span className="whitespace-nowrap">Tüm Slaytları İndir</span>
                  </div>
                  <span className="text-[10px] uppercase font-sans opacity-80">({slideCount} PNG)</span>
                </button>

                <div className="h-px bg-white/10 my-1" />

                {/* Video Olarak İndir (Reel / MP4) */}
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => {
                    setShowDownloadMenu(false);
                    handleDownloadActiveSlideAsVideo();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-mono text-sky-300 hover:text-white hover:bg-sky-950/40 border border-transparent hover:border-sky-500/30 transition-colors flex items-center justify-between group cursor-pointer"
                  title="Slaytı 1080x1350 video (Reel / MP4) olarak dışa aktar"
                >
                  <div className="flex items-center space-x-2">
                    <Film className="w-3.5 h-3.5 text-sky-400" />
                    <span className="whitespace-nowrap">Slaytı Video İndir</span>
                  </div>
                  <span className="text-[10px] uppercase font-sans text-sky-400 font-bold bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-500/30">MP4 REEL</span>
                </button>
              </div>
            )}
          </div>

          {/* Paylaş */}
          <button
            type="button"
            disabled={isPreparingPublish || isExporting}
            onClick={handleOpenInstagramPublish}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#e6c280] via-[#f59e0b] to-[#ec4899] hover:opacity-95 text-black font-semibold text-xs font-mono uppercase tracking-wider transition-all flex items-center space-x-2 shadow-[0_0_18px_rgba(236,72,153,0.3)] cursor-pointer shrink-0 disabled:opacity-40"
            title="Carousel gönderisini Instagram'da yayınla veya planla"
          >
            {isPreparingPublish ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="whitespace-nowrap">Hazırlanıyor...</span>
              </>
            ) : (
              <>
                <InstagramIcon className="w-3.5 h-3.5 text-black" />
                <span className="whitespace-nowrap">Paylaş</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Slayt Seçici Sekmeler */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {Array.from({ length: slideCount }).map((_, idx) => {
            const media = getImageForSlide(idx);
            const isVid = media && (media.type === 'video' || media.dataUrl?.startsWith('data:video'));
            const isCover = idx === 0;
            const isClosing = idx === slideCount - 1;
            const label = isCover ? '01 / Kapak' : isClosing ? `${(idx + 1).toString().padStart(2, '0')} / Kapanış` : `${(idx + 1).toString().padStart(2, '0')} / Lore ${idx}`;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSlide(idx)}
                className={`h-8 px-3 rounded-lg text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer ${
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

          {slideCount < 10 && (
            <button
              type="button"
              onClick={handleAddSlide}
              className="h-8 px-2.5 rounded-lg text-xs font-mono border border-dashed border-white/20 text-neutral-400 hover:text-[#e6c280] hover:border-[#e6c280]/50 hover:bg-[#e6c280]/10 transition-all flex items-center space-x-1 cursor-pointer"
              title="Yeni slayt ekle (Maksimum 10 slayt)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Slayt Ekle</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {slideCount > 2 && activeSlide > 0 && (
            <button
              type="button"
              onClick={() => handleRemoveSlide(activeSlide)}
              className="h-8 px-2.5 rounded-lg text-[11px] font-mono text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-red-500/20 hover:border-red-500/40 transition-colors flex items-center space-x-1 cursor-pointer"
              title={`Slayt ${activeSlide + 1}'i kaldır`}
            >
              <Trash2 className="w-3 h-3" />
              <span>Slaytı Sil</span>
            </button>
          )}

          <div className="flex items-center space-x-1 bg-white/[0.03] p-0.5 rounded-lg border border-white/5">
            <button
              type="button"
              onClick={() => setActiveSlide((prev) => Math.max(0, prev - 1))}
              disabled={activeSlide === 0}
              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-25 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono text-neutral-400 px-1 font-semibold">{activeSlide + 1} / {slideCount}</span>
            <button
              type="button"
              onClick={() => setActiveSlide((prev) => Math.min(slideCount - 1, prev + 1))}
              disabled={activeSlide === slideCount - 1}
              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-25 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
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
            {Array.from({ length: slideCount }).map((_, idx) => {
              const isCover = idx === 0;
              const isClosing = idx === slideCount - 1;
              const settings = slideSettings?.[idx] || INITIAL_SLIDE_SETTINGS[0];
              const quote = getQuoteForSlide(idx);
              const slideMedia = getImageForSlide(idx);

              return (
                <div
                  key={idx}
                  ref={(el) => (slideRefsMap.current[idx] = el)}
                  style={{
                    width: '380px',
                    height: '475px',
                    display: activeSlide === idx ? 'flex' : 'none'
                  }}
                  className="bg-[#0b0c10] text-white p-7 flex flex-col justify-between relative overflow-hidden font-sans"
                >
                  {/* Background Archival Photo or Video */}
                  <SlideBackground media={slideMedia} settings={settings} />

                  {/* Top Header */}
                  <div className="flex items-center justify-between border-b border-white/15 pb-3 relative z-10">
                    <span
                      className={`${activeFontClass} tracking-[0.25em] text-xs font-bold uppercase drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]`}
                      style={{ color: slideAccentColor }}
                    >
                      {slideLogo}
                    </span>
                    <span className="font-mono text-[10px] tracking-wider text-neutral-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                      {(idx + 1).toString().padStart(2, '0')} / {slideCount.toString().padStart(2, '0')}
                    </span>
                  </div>

                  {/* Main Text Content */}
                  {(settings.showText ?? true) && (
                    <div
                      style={{
                        transform: `translateY(${settings.textOffsetY || 0}px)`
                      }}
                      className="space-y-3 mt-auto pb-3 relative z-10 transition-transform duration-75"
                    >
                      {isCover ? (
                        <>
                          <div
                            className="text-[9px] font-mono tracking-[0.2em] uppercase font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                            style={{ color: slideAccentColor }}
                          >
                            {slideTagline}
                          </div>
                          <h2 className={`${activeFontClass} text-2xl font-black leading-tight tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]`}>
                            {post.title}
                          </h2>
                          <div className="w-10 h-[1.5px]" style={{ backgroundColor: slideAccentColor }} />
                          <p className={`${activeFontClass} italic text-xs text-neutral-200 leading-relaxed drop-shadow-[0_1px_5px_rgba(0,0,0,0.9)]`}>
                            "{post.hook}"
                          </p>
                        </>
                      ) : isClosing ? (
                        <>
                          <div className="flex items-center space-x-2">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: slideAccentColor }} />
                            <span
                              className="text-[9px] font-mono tracking-widest uppercase font-semibold"
                              style={{ color: slideAccentColor }}
                            >
                              0{idx} / Kültürel Miras & Kapanış
                            </span>
                          </div>

                          <p className={`${activeFontClass} italic text-[14px] sm:text-[15px] text-white leading-relaxed min-h-[4.2rem] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]`}>
                            "{quote}"
                          </p>

                          <div className="flex items-center space-x-1.5 text-[9px] font-mono text-neutral-300">
                            <span style={{ color: slideAccentColor }}>&bull;</span>
                            <span>Bu detayı biliyor muydunuz? Görüşlerinizi yazın</span>
                            <span style={{ color: slideAccentColor }}>&darr;</span>
                          </div>

                          {/* Hashtags */}
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {post.hashtags?.slice(0, 3).map((tag, i) => (
                              <span key={i} className="text-[8.5px] font-mono text-neutral-200 bg-white/10 px-2 py-0.5 rounded border border-white/15 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center space-x-2">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: slideAccentColor }} />
                            <span
                              className="text-[9px] font-mono tracking-widest uppercase font-semibold"
                              style={{ color: slideAccentColor }}
                            >
                              0{idx} / {idx === 1 ? 'İkonikleşme & Giriş' : idx === 2 ? 'Statü Şifresi & Perde Arkası' : `Lore Bölüm ${idx}`}
                            </span>
                          </div>

                          <p className={`${activeFontClass} italic text-[14px] sm:text-[15px] text-white leading-relaxed min-h-[4.2rem] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]`}>
                            "{quote}"
                          </p>

                          <div className="flex items-center space-x-1.5 text-[9px] font-mono text-neutral-300">
                            <span style={{ color: slideAccentColor }}>&bull;</span>
                            <span>Detaylı hikaye açıklamada</span>
                            <span style={{ color: slideAccentColor }}>&darr;</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Bottom Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/15 text-[9px] font-mono text-neutral-400 relative z-10">
                    {isCover ? (
                      <>
                        <span>EDİTORYAL ARŞİV</span>
                        <span>KAYDIR &rarr;</span>
                      </>
                    ) : isClosing ? (
                      <>
                        <span className="text-[#e6c280]">KAYDET · PAYLAŞ</span>
                        <span className="text-[#e6c280]">@{post?.projectShortCode ? `${post.projectShortCode.toUpperCase()}` : 'POSTCREATOR'}</span>
                      </>
                    ) : (
                      <>
                        <span className="truncate max-w-[200px]">{post.title}</span>
                        <span>KAYDIR &rarr;</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-[10px] font-mono text-neutral-500 mt-3 flex items-center space-x-2">
            <span>Slayt {activeSlide + 1} / {slideCount}</span>
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
                {/* Video & Görsel Arama Butonu */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMediaSearch(!showMediaSearch);
                    if (showUrlInput) setShowUrlInput(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono flex items-center space-x-1.5 border transition-all cursor-pointer ${
                    showMediaSearch
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-bold shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300 hover:text-white'
                  }`}
                  title="Pexels, Google veya Pinterest üzerinde konuya uygun video ve fotoğraf ara"
                >
                  <Video className="w-3 h-3 text-sky-400" />
                  <span>Video / Görsel Ara</span>
                </button>

                {/* Pinterest / Web URL ile Ekle */}
                <button
                  type="button"
                  onClick={() => {
                    setShowUrlInput(!showUrlInput);
                    if (showMediaSearch) setShowMediaSearch(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono flex items-center space-x-1.5 border transition-all cursor-pointer ${
                    showUrlInput
                      ? 'bg-[#e6c280]/20 border-[#e6c280] text-[#e6c280] font-bold shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300 hover:text-white'
                  }`}
                  title="Görsel veya video linki yapıştırarak doğrudan indir"
                >
                  <LinkIcon className="w-3 h-3 text-[#e6c280]" />
                  <span>URL ile Ekle</span>
                </button>
              </div>
            </div>

            {/* Video & Görsel Arama Çekmecesi */}
            {showMediaSearch && (
              <div className="p-3.5 rounded-xl bg-black/90 border border-sky-500/30 space-y-3 animate-fadeIn shadow-2xl">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="flex items-center space-x-1.5 text-sky-300 font-semibold">
                    <Video className="w-3.5 h-3.5" />
                    <span>Arşiv Video & Görsel Arama</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMediaSearch(false)}
                    className="text-neutral-500 hover:text-white text-xs font-mono p-0.5 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {post?.visualNote && (
                  <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-2 text-xs font-mono text-neutral-300">
                    <span className="truncate pr-2">{post.visualNote}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(post.visualNote);
                          setUndoToast('Arama terimi kopyalandı!');
                          setTimeout(() => setUndoToast(null), 1500);
                        } catch (e) {}
                      }}
                      className="text-[10px] text-[#e6c280] hover:underline shrink-0 cursor-pointer"
                    >
                      Kopyala
                    </button>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider flex items-center space-x-1">
                    <Film className="w-3 h-3 text-sky-400" />
                    <span>Video Arama (Dikey B-Roll & Sinematik Klip):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <a
                      href={`https://www.pexels.com/search/videos/${encodeURIComponent(post?.visualNote || post?.title || '')}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono flex items-center space-x-1 transition-colors"
                      title="Pexels üzerinde ücretsiz dikey HD video ara"
                    >
                      <span>Pexels Video</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href={`https://www.google.com/search?tbm=vid&q=${encodeURIComponent(post?.visualNote || post?.title || '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-[11px] font-mono flex items-center space-x-1 transition-colors"
                      title="Google Videolarda ara"
                    >
                      <span>Google Video</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href={`https://pixabay.com/videos/search/${encodeURIComponent(post?.visualNote || post?.title || '')}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-mono flex items-center space-x-1 transition-colors"
                      title="Pixabay üzerinde ücretsiz stok video ara"
                    >
                      <span>Pixabay Video</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-white/5">
                  <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider flex items-center space-x-1">
                    <ImageIcon className="w-3.5 h-3.5 text-[#e6c280]" />
                    <span>Fotoğraf & Arşiv Arama:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <a
                      href={`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(post?.visualNote || post?.title || '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-[#e60023]/15 hover:bg-[#e60023]/25 border border-[#e60023]/30 text-[#ff4f64] text-[11px] font-mono flex items-center space-x-1 transition-colors"
                    >
                      <span>Pinterest</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(post?.visualNote || post?.title || '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-[11px] font-mono flex items-center space-x-1 transition-colors"
                    >
                      <span>Google Görseller</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <p className="text-[10px] text-neutral-400 font-sans leading-relaxed">
                  💡 İndirdiğiniz video veya görsel dosyasını doğrudan bu alana sürükleyip bırakabilir ya da linkini <strong>"URL ile Ekle"</strong> kutusuna yapıştırabilirsiniz.
                </p>
              </div>
            )}

            {/* URL İndirme Çekmecesi (Pinterest, Web, Video) */}
            {showUrlInput && (
              <div className="p-3 rounded-xl bg-black/80 border border-[#e6c280]/40 space-y-2 animate-fadeIn shadow-2xl">
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-300">
                  <span className="flex items-center space-x-1.5 text-[#e6c280] font-semibold">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Görsel veya Video URL'si İndir</span>
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

          {/* Tipografi & Yazı Tipi Seçici */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-[#e6c280] font-semibold flex items-center space-x-1.5">
                <Type className="w-3.5 h-3.5 text-[#e6c280]" />
                <span>Tipografi & Yazı Tipi</span>
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                {currentFontObj.name}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {FONT_OPTIONS.map((f) => {
                const isSelected = selectedFont === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setSelectedFont(f.id);
                      setUndoToast(`Yazı tipi: ${f.name}`);
                      setTimeout(() => setUndoToast(null), 1500);
                    }}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#e6c280] bg-[#e6c280]/15 text-white shadow-sm'
                        : 'border-white/10 bg-black/40 text-neutral-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs">{f.preview}</span>
                      {isSelected && <Check className="w-3 h-3 text-[#e6c280]" />}
                    </div>
                    <div className={`text-xs mt-1 font-bold ${f.fontClass} truncate`}>
                      {f.label}
                    </div>
                    <div className="text-[9px] font-mono text-neutral-500 truncate">
                      {f.name}
                    </div>
                  </button>
                );
              })}
            </div>
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
                  value={currentSettings.customQuote ?? getQuoteForSlide(activeSlide)}
                  onChange={(e) => handleUpdateSlideProperty('customQuote', e.target.value)}
                  placeholder="2-3 satırlık vurucu bir editoryal tespit girin..."
                  className={`w-full bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#e6c280] ${activeFontClass} italic`}
                />
                <div className="flex justify-between items-center text-[9px] font-mono text-neutral-500">
                  <span>En net okuma için 10-15 kelimelik tek cümle</span>
                  <span>
                    {(currentSettings.customQuote ?? getQuoteForSlide(activeSlide)).split(/\s+/).filter(Boolean).length} kelime
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
