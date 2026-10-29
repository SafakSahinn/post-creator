import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Download, ChevronLeft, ChevronRight, Check, Image as ImageIcon, 
  Upload, Trash2, Undo2, Redo2, Sliders, Eye, Sparkles, Layers,
  Sun, ZoomIn, Contrast, MoveVertical, RotateCcw, ShieldOff, ShieldAlert,
  Bookmark, BookmarkCheck
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { getPunchyExcerpt } from '../services/gemini';

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

const INITIAL_SLIDE_SETTINGS = {
  0: { imageId: null, filter: 'none', vignette: 75, zoom: 105, brightness: 100, showText: true, textOffsetY: 0 },
  1: { imageId: null, filter: 'none', vignette: 75, zoom: 105, brightness: 100, showText: true, textOffsetY: 0 },
  2: { imageId: null, filter: 'none', vignette: 75, zoom: 105, brightness: 100, showText: true, textOffsetY: 0 },
  3: { imageId: null, filter: 'none', vignette: 75, zoom: 105, brightness: 100, showText: true, textOffsetY: 0 },
};

export function CarouselStudio({ post, gallery, onUpdateGallery, slideSettings, onUpdateSlideSettings, onSaveToArchive, isSaved }) {
  const [activeSlide, setActiveSlide] = useState(0); // 0, 1, 2, 3
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [undoToast, setUndoToast] = useState(null);

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

  // Handle Multi-file Upload
  const handleAddFiles = (files) => {
    if (!files || files.length === 0) return;
    const newItems = [];
    let processed = 0;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newItems.push({
          id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          dataUrl: e.target.result,
          name: file.name
        });
        processed++;
        if (processed === files.length) {
          const updatedGallery = [...gallery, ...newItems];
          onUpdateGallery(updatedGallery);

          // Auto-assign to current slide if it has no image
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

  // Clipboard Paste Support
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          handleAddFiles([blob]);
          break;
        }
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
      link.download = `LORE_${post?.category || 'Post'}_${post?.decade || ''}_Slayt_${activeSlide + 1}.png`;
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
          link.download = `LORE_${post?.category || 'Post'}_${post?.decade || ''}_Slayt_${i + 1}.png`;
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

  if (!post) {
    return (
      <div className="bg-[#121318] border border-white/5 rounded-2xl p-12 text-center text-neutral-400 text-xs font-mono">
        Lütfen önce sol panelden içerik üretin.
      </div>
    );
  }

  // Slide quotes (all 3 slides: 2, 3 and 4)
  const slide1Quote = post.slideQuotes?.[0] || getPunchyExcerpt(post.lore?.[0], 2);
  const slide2Quote = post.slideQuotes?.[1] || getPunchyExcerpt(post.lore?.[1] || post.lore?.[0], 2);
  const slide3Quote = post.slideQuotes?.[2] || getPunchyExcerpt(post.lore?.[2] || post.lore?.[0], 2);

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
        <div className="flex items-center space-x-2">
          <button
            type="button"
            disabled={historyIndex <= 0}
            onClick={handleUndo}
            title="Geri Al (Ctrl + Z)"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white disabled:opacity-30 border border-white/10 transition-colors"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={historyIndex >= history.length - 1}
            onClick={handleRedo}
            title="İleri Al (Ctrl + Y)"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white disabled:opacity-30 border border-white/10 transition-colors"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          {onSaveToArchive && (
            <button
              type="button"
              onClick={() => onSaveToArchive(post)}
              className={`px-3 py-2 rounded-lg border text-xs font-mono transition-all flex items-center space-x-1.5 ${
                isSaved
                  ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                  : 'border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white'
              }`}
              title="Görsellerle birlikte yerel arşive ve Google Drive için kaydet"
            >
              {isSaved ? <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Bookmark className="w-3.5 h-3.5 text-[#e6c280]" />}
              <span>{isSaved ? 'Arşivde' : 'Arşive Kaydet'}</span>
            </button>
          )}

          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownloadActiveSlide}
            className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white text-xs font-mono transition-all flex items-center space-x-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Aktarılıyor...' : `Slayt ${activeSlide + 1}'i İndir`}</span>
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownloadAllSlides}
            className="px-4 py-2 rounded-lg bg-[#e6c280] hover:bg-[#d4b06e] text-black font-semibold text-xs font-mono uppercase tracking-wider transition-all flex items-center space-x-2 shadow-[0_0_15px_rgba(230,194,128,0.2)]"
          >
            {downloadSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>İndirildi!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Tüm Slaytları İndir (PNG)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Slayt Seçici Sekmeler */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex space-x-2">
          {[
            { idx: 0, label: '01 / Kapak' },
            { idx: 1, label: '02 / Lore I' },
            { idx: 2, label: '03 / Lore II' },
            { idx: 3, label: '04 / Sonuç' },
          ].map(({ idx, label }) => {
            const hasImg = !!getImageForSlide(idx);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSlide(idx)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center space-x-1.5 ${
                  activeSlide === idx
                    ? 'bg-[#e6c280] text-black font-bold shadow-[0_0_12px_rgba(230,194,128,0.2)]'
                    : 'bg-white/5 text-neutral-400 hover:text-white border border-white/5'
                }`}
              >
                <span>{label}</span>
                {hasImg && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      activeSlide === idx ? 'bg-black' : 'bg-emerald-400'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => setActiveSlide((prev) => Math.max(0, prev - 1))}
            disabled={activeSlide === 0}
            className="p-1.5 rounded bg-white/5 text-neutral-300 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-neutral-400 px-2">{activeSlide + 1} / 4</span>
          <button
            type="button"
            onClick={() => setActiveSlide((prev) => Math.min(3, prev + 1))}
            disabled={activeSlide === 3}
            className="p-1.5 rounded bg-white/5 text-neutral-300 hover:text-white disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        
        {/* LEFT COLUMN: THE REAL WYSIWYG CANVAS */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center bg-black/60 p-4 sm:p-6 rounded-2xl border border-white/5 overflow-hidden">
          
          <div className="relative shadow-2xl overflow-hidden rounded-md border border-white/15 select-none">
            
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
              {/* Background Archival Photo */}
              {getImageForSlide(0) && (
                <div className="absolute inset-0 z-0 overflow-hidden">
                  <img
                    src={getImageForSlide(0).dataUrl}
                    alt=""
                    style={{
                      transform: `scale(${(slideSettings?.[0]?.zoom ?? 105) / 100})`,
                      filter: getComputedFilter(slideSettings?.[0]?.filter, slideSettings?.[0]?.brightness)
                    }}
                    className="w-full h-full object-cover transition-all duration-150"
                  />
                  {(slideSettings?.[0]?.vignette ?? 75) > 0 && (
                    <div
                      style={{
                        background: `linear-gradient(to top, rgba(11,12,16, ${(slideSettings?.[0]?.vignette ?? 75) / 100}) 0%, rgba(11,12,16, ${(slideSettings?.[0]?.vignette ?? 75) / 250}) 45%, transparent 85%)`
                      }}
                      className="absolute inset-0 pointer-events-none transition-opacity"
                    />
                  )}
                </div>
              )}

              {/* Top Header */}
              <div className="flex items-center justify-between border-b border-white/15 pb-3 relative z-10">
                <span className="font-serif tracking-[0.3em] text-xs font-bold uppercase text-[#e6c280]">
                  L O R E
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
                  <div className="text-[9px] font-mono tracking-[0.2em] text-[#e6c280] uppercase">
                    Kültür & Statü Şifreleri
                  </div>
                  <h2 className="font-serif text-2xl font-black leading-tight tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                    {post.title}
                  </h2>
                  <div className="w-10 h-[1.5px] bg-[#e6c280]" />
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
              {getImageForSlide(1) && (
                <div className="absolute inset-0 z-0 overflow-hidden">
                  <img
                    src={getImageForSlide(1).dataUrl}
                    alt=""
                    style={{
                      transform: `scale(${(slideSettings?.[1]?.zoom ?? 105) / 100})`,
                      filter: getComputedFilter(slideSettings?.[1]?.filter, slideSettings?.[1]?.brightness)
                    }}
                    className="w-full h-full object-cover transition-all duration-150"
                  />
                  {(slideSettings?.[1]?.vignette ?? 75) > 0 && (
                    <div
                      style={{
                        background: `linear-gradient(to top, rgba(11,12,16, ${(slideSettings?.[1]?.vignette ?? 75) / 100}) 0%, rgba(11,12,16, ${(slideSettings?.[1]?.vignette ?? 75) / 250}) 45%, transparent 85%)`
                      }}
                      className="absolute inset-0 pointer-events-none transition-opacity"
                    />
                  )}
                </div>
              )}

              {/* Top Header */}
              <div className="flex items-center justify-between border-b border-white/15 pb-3 relative z-10">
                <span className="font-serif tracking-[0.3em] text-xs font-bold uppercase text-[#e6c280]">
                  L O R E
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
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e6c280]" />
                    <span className="text-[9px] font-mono tracking-widest uppercase text-[#e6c280]">
                      01 / İkonikleşme
                    </span>
                  </div>

                  <p className="font-serif italic text-sm sm:text-base text-white leading-relaxed line-clamp-3 min-h-[4.4rem] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                    "{slide1Quote}"
                  </p>

                  <div className="flex items-center space-x-1.5 text-[9px] font-mono text-neutral-300">
                    <span className="text-[#e6c280]">&bull;</span>
                    <span>Popüler kültürün gizli şifreleri</span>
                    <span className="text-[#e6c280]">&rarr;</span>
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
              {getImageForSlide(2) && (
                <div className="absolute inset-0 z-0 overflow-hidden">
                  <img
                    src={getImageForSlide(2).dataUrl}
                    alt=""
                    style={{
                      transform: `scale(${(slideSettings?.[2]?.zoom ?? 105) / 100})`,
                      filter: getComputedFilter(slideSettings?.[2]?.filter, slideSettings?.[2]?.brightness)
                    }}
                    className="w-full h-full object-cover transition-all duration-150"
                  />
                  {(slideSettings?.[2]?.vignette ?? 75) > 0 && (
                    <div
                      style={{
                        background: `linear-gradient(to top, rgba(11,12,16, ${(slideSettings?.[2]?.vignette ?? 75) / 100}) 0%, rgba(11,12,16, ${(slideSettings?.[2]?.vignette ?? 75) / 250}) 45%, transparent 85%)`
                      }}
                      className="absolute inset-0 pointer-events-none transition-opacity"
                    />
                  )}
                </div>
              )}

              {/* Top Header */}
              <div className="flex items-center justify-between border-b border-white/15 pb-3 relative z-10">
                <span className="font-serif tracking-[0.3em] text-xs font-bold uppercase text-[#e6c280]">
                  L O R E
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
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e6c280]" />
                    <span className="text-[9px] font-mono tracking-widest uppercase text-[#e6c280]">
                      02 / Statü Şifresi
                    </span>
                  </div>

                  <p className="font-serif italic text-sm sm:text-base text-white leading-relaxed line-clamp-3 min-h-[4.4rem] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                    "{slide2Quote}"
                  </p>

                  <div className="flex items-center space-x-1.5 text-[9px] font-mono text-neutral-300">
                    <span className="text-[#e6c280]">&bull;</span>
                    <span>Detaylı hikaye açıklamada</span>
                    <span className="text-[#e6c280]">&darr;</span>
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
              {getImageForSlide(3) && (
                <div className="absolute inset-0 z-0 overflow-hidden">
                  <img
                    src={getImageForSlide(3).dataUrl}
                    alt=""
                    style={{
                      transform: `scale(${(slideSettings?.[3]?.zoom ?? 105) / 100})`,
                      filter: getComputedFilter(slideSettings?.[3]?.filter, slideSettings?.[3]?.brightness)
                    }}
                    className="w-full h-full object-cover transition-all duration-150"
                  />
                  {(slideSettings?.[3]?.vignette ?? 75) > 0 && (
                    <div
                      style={{
                        background: `linear-gradient(to top, rgba(11,12,16, ${(slideSettings?.[3]?.vignette ?? 75) / 100}) 0%, rgba(11,12,16, ${(slideSettings?.[3]?.vignette ?? 75) / 250}) 45%, transparent 85%)`
                      }}
                      className="absolute inset-0 pointer-events-none transition-opacity"
                    />
                  )}
                </div>
              )}

              {/* Top Header */}
              <div className="flex items-center justify-between border-b border-white/15 pb-3 relative z-10">
                <span className="font-serif tracking-[0.3em] text-xs font-bold uppercase text-[#e6c280]">
                  L O R E
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
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e6c280]" />
                    <span className="text-[9px] font-mono tracking-widest uppercase text-[#e6c280]">
                      03 / Kültürel Miras
                    </span>
                  </div>

                  <p className="font-serif italic text-sm sm:text-base text-white leading-relaxed line-clamp-3 min-h-[4.4rem] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                    "{slide3Quote}"
                  </p>

                  <div className="flex items-center space-x-1.5 text-[9px] font-mono text-neutral-300">
                    <span className="text-[#e6c280]">&bull;</span>
                    <span>Bu detayı biliyor muydunuz? Görüşlerinizi yazın</span>
                    <span className="text-[#e6c280]">&darr;</span>
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
                <span>@LOREMAGAZINE</span>
              </div>
            </div>

          </div>

          <div className="text-[10px] font-mono text-neutral-500 mt-3 flex items-center space-x-2">
            <span>Slayt {activeSlide + 1} / 4</span>
            <span>·</span>
            <span>Instagram 4:5 Portre (1080x1350)</span>
          </div>

        </div>

        {/* RIGHT COLUMN: MULTI-IMAGE TRAY & SLIDE CONTROLS (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* 1. Görsel Havuzu / Tray */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 flex items-center space-x-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#e6c280]" />
                <span>Görsel Havuzu ({gallery.length})</span>
              </label>
              <span className="text-[10px] font-mono text-neutral-500">
                Slayt {activeSlide + 1} için tıkla
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
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

              {gallery.map((img) => {
                const isAssigned = currentSettings.imageId === img.id;
                return (
                  <div
                    key={img.id}
                    onClick={() => handleAssignImage(img.id)}
                    className={`relative h-20 rounded-xl border overflow-hidden cursor-pointer group transition-all ${
                      isAssigned
                        ? 'border-[#e6c280] ring-2 ring-[#e6c280] shadow-[0_0_12px_rgba(230,194,128,0.3)]'
                        : 'border-white/10 opacity-70 hover:opacity-100 hover:border-white/30'
                    }`}
                  >
                    <img src={img.dataUrl} alt="" className="w-full h-full object-cover" />
                    
                    <button
                      type="button"
                      onClick={(e) => handleDeleteImage(img.id, e)}
                      title="Görseli Havuzdan Sil"
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
                className="h-20 rounded-xl border border-dashed border-white/20 hover:border-[#e6c280]/60 hover:bg-white/[0.03] text-neutral-400 hover:text-[#e6c280] flex flex-col items-center justify-center text-[10px] font-mono transition-all space-y-1"
              >
                <Upload className="w-4 h-4" />
                <span>+ Görsel</span>
              </button>
            </div>

            <p className="text-[10px] text-neutral-500 font-mono">
              İpucu: Görselleri doğrudan <kbd className="bg-white/10 px-1 py-0.5 rounded text-[9px]">Ctrl+V</kbd> ile de yapıştırabilirsiniz.
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
                {currentSettings.showText ? 'Metin Açık' : 'Yalnızca Fotoğraf'}
              </button>
            </div>

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
                    max="150"
                    value={currentSettings.zoom}
                    onChange={(e) => handleUpdateSlideProperty('zoom', Number(e.target.value))}
                    className="w-full accent-[#e6c280] cursor-pointer"
                  />
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

    </div>
  );
}
