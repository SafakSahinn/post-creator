import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Printer,
  Sparkles,
  ExternalLink,
  Layers,
  Calendar,
  Tag,
  Sliders,
  Sun,
  Moon,
  Search,
  CheckCircle2,
  Bookmark,
  Share2,
  ZoomIn,
  Loader2,
  RefreshCw,
  Info
} from 'lucide-react';
import { InstagramIcon } from './Icons';
import { generateDeepMagazineEssay } from '../services/gemini';
import { saveArchiveToDb } from '../services/archiveDb';

/**
 * Gönderinin arşivdeki slaytlarında fiilen KULLANILMIŞ temiz fotoğraflarını ayıklar.
 * Galerideki kullanılmamış atıl fotoğrafları çekmez.
 * 1. kapak ve son slayttaki mükerrer tekrarları ayıklar.
 */
function extractCleanPhotos(post) {
  if (!post) return [];
  const gallery = post.savedGallery || [];
  const settings = post.savedSlideSettings || {};
  const thumbs = post.thumbnails || [];

  // Gönderinin fiili slayt sayısı (stüdyoda kaydedilen veya tanımlı slaytlar)
  const slideCount = Math.min(
    10,
    Math.max(
      post.slideCount || 0,
      thumbs.filter(Boolean).length,
      Object.keys(settings).length,
      post.slideQuotes?.length ? post.slideQuotes.length + 1 : 4
    )
  );

  const photos = [];
  const seenUrls = new Set();

  for (let i = 0; i < slideCount; i++) {
    // Yalnızca bu slayta fiilen atanmış görseli al (settings veya thumbs)
    const imgId = settings[i]?.imageId;
    const galleryMatch = imgId ? gallery.find((g) => g.id === imgId) : null;
    const url = galleryMatch?.dataUrl || thumbs[i] || null;
    
    // Eğer görsel varsa ve daha önce eklenmemişse (mükerrerliği önle)
    if (url && !seenUrls.has(url)) {
      seenUrls.add(url);
      
      const isCover = photos.length === 0 || i === 0;
      const quote = isCover
        ? (settings[0]?.customQuote || post.hook || post.conceptTitle || post.title || '')
        : (settings[i]?.customQuote || post.slideQuotes?.[i - 1] || post.slideQuotes?.[i] || '');

      photos.push({
        index: photos.length,
        url,
        title: isCover ? (post.title || 'Kapak Görseli') : `Slayt #${i + 1} Kadrajı`,
        quote,
        idea: post.visualIdeas?.[i] || post.visualIdeas?.[i - 1] || (isCover ? 'Kapak editoryal fotoğrafı.' : '90\'lar arşiv detayı.'),
        filter: settings[i]?.filter || 'normal'
      });
    }
  }

  // Yedek: Eğer photos hala boşsa (eski arşiv kayıtları için thumbs üzerinden)
  if (photos.length === 0) {
    thumbs.forEach((t, idx) => {
      if (t && !seenUrls.has(t)) {
        seenUrls.add(t);
        const isCover = photos.length === 0 || idx === 0;
        photos.push({
          index: photos.length,
          url: t,
          title: isCover ? (post.title || 'Kapak Görseli') : `Slayt #${idx + 1}`,
          quote: isCover ? (post.hook || post.conceptTitle || post.title || '') : (post.slideQuotes?.[idx - 1] || ''),
          idea: post.visualIdeas?.[idx] || 'Arşiv görseli.',
          filter: 'normal'
        });
      }
    });
  }

  return photos;
}

/**
 * Kapak sayfası için bu haftanın / son gönderilerin fotoğraflarından zengin editoryal bir kolaj listesi derler.
 * Farklı gönderilerin temiz kadrajlarını bir araya getirerek 90'lar dergi kolajı oluşturur.
 */
function extractCoverCollageImages(posts, maxCount = 5) {
  if (!posts || posts.length === 0) return [];
  const results = [];
  const seenUrls = new Set();

  // 1. Aşama: Her gönderinin 1. ana kapağını al
  posts.forEach((p, postIdx) => {
    if (results.length >= maxCount) return;
    const clean = extractCleanPhotos(p);
    if (clean.length > 0 && clean[0]?.url && !seenUrls.has(clean[0].url)) {
      seenUrls.add(clean[0].url);
      results.push({
        url: clean[0].url,
        title: p.title || 'Arşiv',
        category: p.category || 'Kültür',
        period: p.period || "90'lar",
        postIndex: postIdx
      });
    }
  });

  // 2. Aşama: Eğer 5'ten azsa, gönderilerin 2., 3., 4. slayt fotoğraflarından kolajı zenginleştir
  if (results.length < maxCount) {
    for (const p of posts) {
      const clean = extractCleanPhotos(p);
      const postIdx = posts.indexOf(p);
      for (let i = 1; i < clean.length; i++) {
        if (results.length >= maxCount) break;
        if (clean[i]?.url && !seenUrls.has(clean[i].url)) {
          seenUrls.add(clean[i].url);
          results.push({
            url: clean[i].url,
            title: clean[i].quote || p.title || 'Detay Kadraj',
            category: p.category || 'Kadraj',
            period: p.period || "90'lar",
            postIndex: postIdx
          });
        }
      }
      if (results.length >= maxCount) break;
    }
  }

  return results;
}

export function MagazineModal({
  isOpen,
  onClose,
  archives = [],
  activeProject,
  onLoadPostToStudio,
  onUpdateArchiveItem
}) {
  // Sayfa indeksi:
  // 0: Kapak (Cover)
  // 1: İçindekiler (Table of Contents)
  // 2..N: Makale çift sayfaları (Her makale 1 yayılım = 2 sayfa)
  const [currentPage, setCurrentPage] = useState(0);
  const [themeMode, setThemeMode] = useState('paper'); // 'paper' (90'lar Kuşe/Gazete) | 'noir' (90'lar Gece)
  const [onlyPublished, setOnlyPublished] = useState(false);
  const [isExpandingAi, setIsExpandingAi] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const scrollViewportRef = useRef(null);

  // Filtrelenmiş gönderiler
  const displayPosts = useMemo(() => {
    let list = [...archives];
    if (onlyPublished) {
      list = list.filter((p) => p.instagramPublishedAt || p.publishedToInstagram);
    }
    return list;
  }, [archives, onlyPublished]);

  // Toplam sayfa sayısı: 1 (Kapak) + 1 (İçindekiler) + displayPosts.length (Makaleler)
  const totalPages = Math.max(2, 2 + displayPosts.length);

  // Mevcut makale (Sayfa 2 ve yukarısı için)
  const currentPostIndex = currentPage - 2;
  const currentPost = currentPostIndex >= 0 ? displayPosts[currentPostIndex] : null;
  const cleanPhotos = useMemo(() => extractCleanPhotos(currentPost), [currentPost]);
  const coverCollageImages = useMemo(() => extractCoverCollageImages(displayPosts, 5), [displayPosts]);

  // Sayfa değiştiğinde fotoğraf seçimini sıfırla ve tepeye kaydır (Scroll to Top)
  useEffect(() => {
    setSelectedPhotoIndex(0);
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [currentPage]);

  // Klavye kısayolları (← / → ile sayfa çevirme, Esc ile kapatma)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentPage((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, totalPages, onClose]);

  if (!isOpen) return null;

  // AI ile 90'lar Derinlik Analizi Üret
  const handleGenerateDeepAnalysis = async () => {
    if (!currentPost) return;
    setIsExpandingAi(true);
    setAiError(null);
    try {
      const result = await generateDeepMagazineEssay({
        post: currentPost,
        project: activeProject
      });

      const updated = {
        ...currentPost,
        magazineDeepDossier: result,
        updatedAt: new Date().toISOString()
      };

      await saveArchiveToDb(updated);
      if (onUpdateArchiveItem) {
        onUpdateArchiveItem(updated);
      }
    } catch (err) {
      console.error(err);
      setAiError(err.message || 'Derinlik analizi üretilemedi.');
    } finally {
      setIsExpandingAi(false);
    }
  };

  const isPaper = themeMode === 'paper';

  // Günümüz tarihi (90'lar Editoryal Tipografi Formatı)
  const currentDate = new Date();
  const currentMonthYear = currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }).toUpperCase();
  const fullDateFormatted = currentDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
  const currentYear = currentDate.getFullYear();

  // Proje adı ve logo
  const brandName = (activeProject?.name || currentPost?.projectName || 'LORE MAGAZINE').toUpperCase();
  const brandCode = (activeProject?.shortCode || currentPost?.projectShortCode || 'LORE').toUpperCase();
  const issueDate = `${currentMonthYear} // SAYI #01`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md overflow-hidden animate-fadeIn magazine-modal-portal">
      
      {/* 90's Publication Print & PDF Stylesheet (A4 Multi-Page Standard) */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #111111 !important;
            overflow: visible !important;
          }
          .magazine-screen-only {
            display: none !important;
          }
          .magazine-print-only {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 210mm !important;
            background: white !important;
            z-index: 999999 !important;
          }
          .magazine-page-a4 {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            position: relative !important;
            background: white !important;
            color: #111111 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        @media screen {
          .magazine-print-only {
            display: none !important;
          }
        }
      `}</style>

      {/* Screen Interface Wrapper */}
      <div className="magazine-screen-only flex flex-col h-full w-full overflow-hidden">
        
        {/* 90's Editorial Top Control Bar */}
        <div className="h-14 px-3 sm:px-6 bg-[#101115] border-b border-white/10 flex items-center justify-between shrink-0 select-none z-20">
          
          {/* Brand & Issue Info */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-9 h-9 rounded-lg bg-[#e6c280]/20 border border-[#e6c280]/40 flex items-center justify-center text-[#e6c280]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif tracking-[0.2em] text-sm sm:text-base font-black text-white">
                  {brandName}
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30 uppercase font-bold tracking-widest">
                  90's Magazine
                </span>
              </div>
              <p className="text-[10px] font-mono text-neutral-400">
                {issueDate} · EDİTORYAL BASKI & FOTOĞRAF ARŞİVİ
              </p>
            </div>
          </div>

          {/* Center Page Navigator */}
          <div className="flex items-center space-x-2 font-mono text-xs">
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              className="p-1.5 rounded-lg border border-white/10 text-neutral-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Önceki Sayfa (Sol Ok)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-3 py-1 rounded bg-black/50 border border-white/10 text-neutral-300 text-[11px] min-w-[170px] text-center">
              {currentPage === 0 ? (
                <span className="text-[#e6c280] font-bold">ÖN KAPAK (SAYFA 01)</span>
              ) : currentPage === 1 ? (
                <span className="text-[#e6c280] font-bold">KÜNYE & İÇİNDEKİLER (02 - 03)</span>
              ) : (
                <span>
                  SAYFA <strong className="text-white">{currentPage * 2} - {currentPage * 2 + 1}</strong> / {totalPages * 2}
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            className="p-1.5 rounded-lg border border-white/10 text-neutral-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
            title="Sonraki Sayfa (Sağ Ok)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right Actions: Theme, Filter, Print, Close */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Published Only Filter */}
          <button
            type="button"
            onClick={() => {
              setOnlyPublished(!onlyPublished);
              setCurrentPage(0);
            }}
            className={`hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
              onlyPublished
                ? 'border-pink-500/50 bg-pink-950/30 text-pink-300'
                : 'border-white/10 text-neutral-400 hover:text-white'
            }`}
            title="Sadece Instagram'da yayınlanmış gönderileri göster"
          >
            <InstagramIcon className="w-3.5 h-3.5" />
            <span>{onlyPublished ? 'Sadece Yayındakiler' : 'Tüm Gönderiler'}</span>
          </button>

          {/* Theme Toggle: 90's Paper vs 90's Noir */}
          <button
            type="button"
            onClick={() => setThemeMode(isPaper ? 'noir' : 'paper')}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-xs font-mono text-neutral-300 transition-all cursor-pointer"
            title={isPaper ? 'Karanlık Gece Baskısına Geç' : '90\'lar Kuşe/Gazete Kağıdı Baskısına Geç'}
          >
            {isPaper ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            <span className="hidden lg:inline">{isPaper ? '90\'lar Kağıt' : '90\'lar Gece'}</span>
          </button>

          {/* Print / Save as PDF */}
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#e6c280]/15 hover:bg-[#e6c280]/25 text-[#e6c280] border border-[#e6c280]/30 text-xs font-mono font-semibold transition-all cursor-pointer"
            title="Dergiyi Yazdır veya PDF Olarak Kaydet"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF / Yazdır</span>
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Dergiyi Kapat (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

        </div>
      </div>

      {/* Main Magazine Viewport */}
      <div
        ref={scrollViewportRef}
        className={`flex-1 overflow-y-auto p-2 sm:p-5 lg:p-8 flex items-start justify-center transition-colors duration-300 ${
          isPaper ? 'bg-[#212124]' : 'bg-[#08080a]'
        }`}
      >
        
        {/* The 90's Physical Magazine Spread Container (Kapakta Tek A4, İç Sayfalarda Çift Sayfa Yayılımı) */}
        <div className={`relative w-full shadow-2xl rounded-sm transition-all duration-300 overflow-hidden min-h-[760px] sm:min-h-[820px] lg:min-h-[860px] flex flex-col ${
          currentPage === 0
            ? 'max-w-[540px] sm:max-w-[580px] my-1 sm:my-3'
            : 'max-w-6xl my-1 sm:my-3'
        } ${
          isPaper
            ? 'bg-[#f6f3eb] text-[#1c1c1f] shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-[#d8d4c7]'
            : 'bg-[#121318] text-[#e8e4dc] shadow-[0_20px_60px_rgba(0,0,0,0.85)] border border-white/10'
        }`}>

          {/* ======================================================== */}
          {/* PAGE 0: 1990'S FULL-BLEED RETRO COVER PAGE (KOMPLE KAPLAYAN KOLAJ) */}
          {/* ======================================================== */}
          {currentPage === 0 && (
            <div className="relative flex-1 min-h-[760px] sm:min-h-[820px] lg:min-h-[860px] border-4 border-black/90 m-1.5 sm:m-3 overflow-hidden flex flex-col justify-between shadow-2xl bg-black select-none">
              
              {/* ======================================================== */}
              {/* 1. FULL-BLEED BACKGROUND COLLAGE (KAPAĞI KOMPLE KAPLAYAN KOLAJ) */}
              {/* ======================================================== */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                {coverCollageImages.length >= 4 ? (
                  /* 4+ Görsel: 90'lar Asimetrik Full-Bleed Editoryal Mozaik */
                  <div className="grid grid-cols-12 grid-rows-2 gap-1.5 h-full w-full p-1 bg-black">
                    
                    {/* 1. Büyük Ana Kadraj (Sol 7 Kolon, Tam Yükseklik) */}
                    <div
                      onClick={() => setCurrentPage(coverCollageImages[0].postIndex + 2)}
                      title={`${coverCollageImages[0].title} (${coverCollageImages[0].category}) — Sayfaya Git`}
                      className="col-span-7 row-span-2 relative overflow-hidden group cursor-pointer border border-black/80 bg-neutral-900"
                    >
                      <img
                        src={coverCollageImages[0].url}
                        alt={coverCollageImages[0].title}
                        className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105 filter contrast-[1.08]"
                      />
                      <div className="absolute top-3 left-3 bg-red-600/90 text-white font-mono text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider shadow border border-white/20">
                        BAŞ MANŞET // {coverCollageImages[0].category}
                      </div>
                      <div className="absolute bottom-3 left-3 bg-black/80 text-[#e6c280] font-mono text-[9px] px-2 py-0.5 tracking-wider border border-white/10 font-bold">
                        [01A KODAK 5052]
                      </div>
                    </div>

                    {/* 2. Sağ Üst Kadraj (Sağ 5 Kolon, Üst Yarı) */}
                    <div
                      onClick={() => setCurrentPage(coverCollageImages[1].postIndex + 2)}
                      title={`${coverCollageImages[1].title} (${coverCollageImages[1].category}) — Sayfaya Git`}
                      className="col-span-5 row-span-1 relative overflow-hidden group cursor-pointer border border-black/80 bg-neutral-900"
                    >
                      <img
                        src={coverCollageImages[1].url}
                        alt={coverCollageImages[1].title}
                        className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105 filter contrast-[1.08]"
                      />
                      <span className="absolute top-2 left-2 bg-black/80 text-white font-mono text-[8px] px-1.5 py-0.5 font-bold uppercase tracking-wider border border-white/10">
                        {coverCollageImages[1].category}
                      </span>
                      <span className="absolute bottom-2 right-2 bg-black/80 text-[#e6c280] font-mono text-[8px] px-1.5 py-0.5 border border-white/10">
                        [02A]
                      </span>
                    </div>

                    {/* 3 & 4. Sağ Alt İki Kadraj (Sağ 5 Kolon, Alt Yarı Yan Yana) */}
                    <div className="col-span-5 row-span-1 grid grid-cols-2 gap-1.5 h-full">
                      
                      <div
                        onClick={() => setCurrentPage(coverCollageImages[2].postIndex + 2)}
                        title={`${coverCollageImages[2].title} (${coverCollageImages[2].category}) — Sayfaya Git`}
                        className="relative overflow-hidden group cursor-pointer border border-black/80 bg-neutral-900 h-full"
                      >
                        <img
                          src={coverCollageImages[2].url}
                          alt={coverCollageImages[2].title}
                          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105 filter contrast-[1.08]"
                        />
                        <span className="absolute top-1.5 left-1.5 bg-black/80 text-white font-mono text-[8px] px-1 font-bold uppercase truncate max-w-[70px] border border-white/10">
                          {coverCollageImages[2].category}
                        </span>
                        <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-[#e6c280] font-mono text-[8px] px-1">
                          [03A]
                        </span>
                      </div>

                      <div
                        onClick={() => setCurrentPage(coverCollageImages[3]?.postIndex ? coverCollageImages[3].postIndex + 2 : 1)}
                        title={coverCollageImages[3] ? `${coverCollageImages[3].title} (${coverCollageImages[3].category}) — Sayfaya Git` : 'Detay'}
                        className="relative overflow-hidden group cursor-pointer border border-black/80 bg-neutral-900 h-full"
                      >
                        <img
                          src={coverCollageImages[3]?.url || coverCollageImages[0].url}
                          alt={coverCollageImages[3]?.title || 'Detay'}
                          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105 filter contrast-[1.08]"
                        />
                        <span className="absolute top-1.5 left-1.5 bg-black/80 text-white font-mono text-[8px] px-1 font-bold uppercase truncate max-w-[70px] border border-white/10">
                          {coverCollageImages[3]?.category || 'ARŞİV'}
                        </span>
                        <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-[#e6c280] font-mono text-[8px] px-1">
                          [04A]
                        </span>
                      </div>

                    </div>

                  </div>
                ) : coverCollageImages.length === 3 ? (
                  /* 3 Görsel: Sol Büyük, Sağ 2 Parça */
                  <div className="grid grid-cols-12 grid-rows-2 gap-1.5 h-full w-full p-1 bg-black">
                    <div
                      onClick={() => setCurrentPage(coverCollageImages[0].postIndex + 2)}
                      className="col-span-7 row-span-2 relative overflow-hidden group cursor-pointer border border-black/80"
                    >
                      <img src={coverCollageImages[0].url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <span className="absolute top-3 left-3 bg-red-600 text-white font-mono text-[9px] px-2 py-0.5 font-bold uppercase">[01A // {coverCollageImages[0].category}]</span>
                    </div>
                    <div
                      onClick={() => setCurrentPage(coverCollageImages[1].postIndex + 2)}
                      className="col-span-5 row-span-1 relative overflow-hidden group cursor-pointer border border-black/80"
                    >
                      <img src={coverCollageImages[1].url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <span className="absolute top-2 left-2 bg-black/80 text-white font-mono text-[8px] px-1.5 uppercase">[02A // {coverCollageImages[1].category}]</span>
                    </div>
                    <div
                      onClick={() => setCurrentPage(coverCollageImages[2].postIndex + 2)}
                      className="col-span-5 row-span-1 relative overflow-hidden group cursor-pointer border border-black/80"
                    >
                      <img src={coverCollageImages[2].url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <span className="absolute top-2 left-2 bg-black/80 text-white font-mono text-[8px] px-1.5 uppercase">[03A // {coverCollageImages[2].category}]</span>
                    </div>
                  </div>
                ) : coverCollageImages.length === 2 ? (
                  /* 2 Görsel: Yan Yana İki Tam Boy Panel */
                  <div className="grid grid-cols-2 gap-1.5 h-full w-full p-1 bg-black">
                    {coverCollageImages.map((img, i) => (
                      <div
                        key={i}
                        onClick={() => setCurrentPage(img.postIndex + 2)}
                        className="relative overflow-hidden group cursor-pointer border border-black/80"
                      >
                        <img src={img.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <span className="absolute top-3 left-3 bg-red-600 text-white font-mono text-[9px] px-2 py-0.5 font-bold uppercase">[0{i + 1}A // {img.category}]</span>
                      </div>
                    ))}
                  </div>
                ) : coverCollageImages.length === 1 ? (
                  /* 1 Görsel: Tek Tam Boy Panel */
                  <div
                    onClick={() => setCurrentPage(coverCollageImages[0].postIndex + 2)}
                    className="relative w-full h-full group cursor-pointer"
                  >
                    <img src={coverCollageImages[0].url} alt="" className="w-full h-full object-cover filter contrast-[1.08]" />
                    <span className="absolute top-3 left-3 bg-red-600 text-white font-mono text-[9px] px-2 py-0.5 font-bold uppercase">[01A // {coverCollageImages[0].category}]</span>
                  </div>
                ) : (
                  /* Boş / Yedek */
                  <div className="w-full h-full bg-gradient-to-br from-neutral-900 via-black to-neutral-950 flex flex-col items-center justify-center p-6 text-neutral-400">
                    <BookOpen className="w-16 h-16 text-[#e6c280] mb-3 opacity-60" />
                    <span className="font-serif text-2xl font-bold text-white tracking-widest uppercase">Post Creator</span>
                    <span className="text-xs font-mono text-neutral-400 mt-1">90'lar Editoryal Kültür Arşivi</span>
                  </div>
                )}
              </div>

              {/* ======================================================== */}
              {/* 2. ATMOSPHERIC 90'S DARKROOM VIGNETTE & CONTRAST OVERLAY */}
              {/* ======================================================== */}
              <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-b from-black/85 via-black/45 to-black/90 shadow-[inset_0_0_120px_rgba(0,0,0,0.85)]" />

              {/* ======================================================== */}
              {/* 3. FOREGROUND 90'S EDITORIAL TYPOGRAPHY & COVER ELEMENTS  */}
              {/* ======================================================== */}
              <div className="absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-6 lg:px-8 lg:pt-6 lg:pb-2.5 pointer-events-none">
                
                {/* Top Banner Strip (Günümüz Tarihi & Sadeleştirilmiş Şerit) */}
                <div className="border-b border-white/20 pb-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-neutral-200 pointer-events-auto">
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-red-400 bg-red-950/70 px-2.5 py-0.5 border border-red-500/50 shadow">
                      ÖZEL RETROSPEKTİF BASKI
                    </span>
                    <span className="text-neutral-300 drop-shadow">
                      CİLT I · SAYI 01
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#e6c280] drop-shadow font-mono tracking-wider">
                      {fullDateFormatted}
                    </span>
                  </div>
                </div>

                {/* Big Iconic 90's Masthead (Ray Gun / The Face Aesthetic) */}
                <div className="my-2 sm:my-3 text-center select-none pointer-events-auto">
                  <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-black tracking-[0.2em] leading-none uppercase drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)] text-white">
                    {brandName}
                  </h1>
                  <div className="flex items-center justify-center space-x-3 mt-2">
                    <span className="h-[2px] w-10 sm:w-14 bg-red-500/80" />
                    <p className="font-mono text-[9px] sm:text-xs tracking-[0.25em] uppercase font-bold text-red-400 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                      KÜLTÜR, SİNEMA, MODA VE ANALOG ESTETİK DERGİSİ
                    </p>
                    <span className="h-[2px] w-10 sm:w-14 bg-red-500/80" />
                  </div>
                </div>

                {/* Lower Section: Floating Headlines & Dossier (Tek A4 Kapağa Göre Dikey Hizalanmış) */}
                <div className="mt-auto mb-1 flex flex-col space-y-2 pointer-events-auto relative">
                  
                  {/* 90's Circular Badge / Sticker (Sağ Köşeye Asılı Mühür) */}
                  <div className="absolute -top-7 right-2 z-10 w-14 h-14 rounded-full border-2 border-dashed border-red-500 bg-red-600/40 backdrop-blur-md flex flex-col items-center justify-center text-center p-1 transform rotate-12 shadow-2xl border-white/30 text-white select-none pointer-events-none">
                    <span className="text-[6px] font-mono font-bold tracking-widest text-red-300 uppercase leading-none">ÖZEL DOSYA</span>
                    <span className="font-serif text-[9px] font-black uppercase tracking-tight leading-none mt-0.5">KÜLT ARŞİV</span>
                    <span className="text-[6px] font-mono text-neutral-300 leading-none mt-0.5">{currentYear}</span>
                  </div>

                  {/* Headline Floating Card */}
                  <div className="bg-black/85 backdrop-blur-md border-l-4 border-red-600 p-3 sm:p-3.5 rounded-r-xl border-y border-r border-white/20 shadow-2xl space-y-1">
                    <span className="font-mono text-[9px] text-red-400 font-bold uppercase tracking-wider block">
                      BAŞ MANŞET // SAYFA 04
                    </span>
                    <h2 className="font-serif text-lg sm:text-2xl font-black leading-tight uppercase text-white drop-shadow">
                      {displayPosts[0]?.title || "90'LARIN ANALOG RUHU VE MİNİMALİZM"}
                    </h2>
                    <p className="text-xs font-serif italic text-neutral-300 leading-snug line-clamp-2">
                      {displayPosts[0]?.conceptTitle || "Sessiz lüks, bit pazarları ve piksel öncesi estetik."}
                    </p>
                  </div>

                  {/* Dossier Teaser Bar */}
                  <div className="bg-black/85 backdrop-blur-md border border-white/20 p-2.5 rounded-xl font-mono text-[10px] shadow-2xl space-y-1">
                    <div className="font-bold text-red-400 uppercase flex items-center justify-between border-b border-white/10 pb-1">
                      <span>✦ BU SAYININ DOSYALARI</span>
                      <span className="text-[9px] text-[#e6c280]">{coverCollageImages.length} KADRAJ</span>
                    </div>
                    <ul className="space-y-0.5 text-neutral-200">
                      {displayPosts.slice(0, 3).map((p, i) => (
                        <li
                          key={i}
                          onClick={() => setCurrentPage(i + 2)}
                          className="truncate cursor-pointer hover:text-red-400 transition-colors flex items-center space-x-1"
                          title={`${p.title} - Sayfaya Git`}
                        >
                          <span className="text-red-500 font-bold">&bull;</span>
                          <strong className="text-white">{p.category || 'DOSYA'}:</strong>
                          <span className="truncate">{p.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>

                {/* Minimalist Bottom Folio Line (En Altta İnce Folyo Şeridi) */}
                <div className="border-t border-white/15 pt-2 pb-0.5 flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-neutral-400 pointer-events-auto">
                  <div className="flex items-center space-x-2">
                    <span className="text-red-400 font-bold uppercase">✦ {brandName}</span>
                    <span className="text-neutral-500">&bull;</span>
                    <span>EDİTORYAL ARŞİV DERGİSİ</span>
                  </div>
                  <div className="text-neutral-300 font-semibold tracking-wider">
                    {currentMonthYear} BASKISI &bull; CİLT 01
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* PAGE 1: 1990'S TWO-PAGE SPREAD: KÜNYE (SAYFA 02) & İÇİNDEKİLER (SAYFA 03) */}
          {/* ======================================================== */}
          {currentPage === 1 && (
            <div className="relative flex-1 min-h-[760px] sm:min-h-[820px] lg:min-h-[860px] p-4 sm:p-8 lg:p-10 flex flex-col justify-between m-1.5 sm:m-3 border-4 border-black/80">
              
              {/* Running Header */}
              <div className="border-b-2 border-black/80 pb-2.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-neutral-600">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-red-600">SAYFA 02</span>
                  <span>// {brandName} • MANİFESTO & KÜNYE</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>FİHRİST & DOSYA DİZİNİ // SAYFA 03</span>
                </div>
              </div>

              {/* Two-Column Grid: Left (Sayfa 02: Manifesto & Künye) / Right (Sayfa 03: İçindekiler) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-6 flex-1 items-start">
                
                {/* SOL SAYFA (SAYFA 02): EDİTÖRÜN NOTU & YAYIN KÜNYESİ */}
                <div className="lg:col-span-5 space-y-5 lg:pr-6 lg:border-r-2 lg:border-black/20">
                  <span className="font-mono text-xs font-bold tracking-[0.3em] uppercase text-red-600 block">
                    EDİTÖRÜN NOTU // MANİFESTO
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-black uppercase tracking-tight leading-tight">
                    ANALOG RUHUN DİJİTALDEKİ İZLERİ
                  </h2>
                  <div className="space-y-3 font-serif text-xs sm:text-[13px] leading-relaxed text-justify">
                    <p>
                      <span className="float-left text-5xl font-serif font-black leading-none mr-2 text-red-600">B</span>
                      u dergi, Instagram'ın hızla tükenen akışını durdurup analog 90'lar yayıncılığının ağırlığına kavuşturmak amacıyla hazırlandı. 35mm film greni, yüksek kontrast ve sadeleştirilmiş tipografi ile her gönderi ölümsüz bir arşive dönüşüyor.
                    </p>
                    <p>
                      Burada yalnızca fotoğrafları değil, onların ardındaki kültürel arka planı, sinema referanslarını ve stil sosyolojisini bulacaksınız.
                    </p>
                  </div>

                  {/* 90's Colophon Box */}
                  <div className="p-3.5 border-2 border-dashed border-black/40 font-mono text-[10px] space-y-1.5 bg-black/[0.02]">
                    <span className="font-bold text-red-600 uppercase block">YAYIN KÜNYESİ</span>
                    <div className="space-y-1 text-neutral-700">
                      <div><strong>Yayıncı:</strong> Post Creator Editoryal Atölyesi</div>
                      <div><strong>Tarih:</strong> {fullDateFormatted}</div>
                      <div><strong>Format:</strong> 90'lar Kuşe Kağıt (A4 Standardı)</div>
                      <div><strong>Küratör:</strong> {brandName}</div>
                    </div>
                  </div>
                </div>

                {/* SAĞ SAYFA (SAYFA 03): İÇİNDEKİLER FİHRİSTİ */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-end justify-between border-b-2 border-black pb-2">
                    <div>
                      <span className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-red-600 block">
                        DOSYA DİZİNİ
                      </span>
                      <h3 className="font-serif text-3xl font-black tracking-tight uppercase">
                        İÇİNDEKİLER
                      </h3>
                    </div>
                    <div className="text-right font-mono text-[10px] text-neutral-500">
                      TOPLAM {displayPosts.length} EDİTORYAL DOSYA
                    </div>
                  </div>

                  {/* Dotted Leader Table */}
                  <div className="space-y-2.5 font-mono text-xs">
                    {displayPosts.map((post, idx) => {
                      const pageNo = (idx + 1) * 2 + 2;
                      const isShared = Boolean(post.instagramPublishedAt || post.publishedToInstagram);
                      return (
                        <div
                          key={post.id || idx}
                          onClick={() => setCurrentPage(idx + 2)}
                          className={`group p-2.5 rounded border transition-all cursor-pointer flex items-center justify-between ${
                            isPaper ? 'hover:bg-black/5 border-black/10' : 'hover:bg-white/5 border-white/10'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 truncate pr-3">
                            <span className="font-bold text-red-600 w-7 shrink-0">
                              #{String(idx + 1).padStart(2, '0')}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-black/10 font-bold text-[9px] uppercase shrink-0">
                              {post.category || 'GENEL'}
                            </span>
                            <span className="font-serif text-xs sm:text-sm font-bold truncate group-hover:text-red-600 transition-colors">
                              {post.title}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            <span className="hidden sm:inline text-neutral-400 select-none">
                              ...........
                            </span>
                            <span className="font-serif text-xs sm:text-sm font-black text-red-600 group-hover:underline">
                              SAYFA {pageNo} &rarr;
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Bottom Running Footer */}
              <div className="border-t-2 border-black/80 pt-3 flex items-center justify-between font-mono text-[10px] text-neutral-600">
                <span>BASIM TARİHİ: {fullDateFormatted} · BASKI MERKEZİ: POST CREATOR ATÖLYESİ</span>
                <span>TÜM HAKLARI SAKLIDIR &bull; DERGİ SAYFA NO: 02 - 03</span>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* PAGES 2..N: 1990'S EDITORIAL TWO-PAGE SPREAD             */}
          {/* ======================================================== */}
          {currentPage >= 2 && currentPost && (
            <div className="relative flex-1 min-h-[760px] sm:min-h-[820px] lg:min-h-[860px] p-4 sm:p-8 lg:p-10 flex flex-col justify-between m-1.5 sm:m-3 border-4 border-black/80">
              
              {/* Running Header / Folio Line */}
              <div className="border-b-2 border-black/80 pb-2.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-neutral-600">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-red-600">SAYFA {currentPage * 2}</span>
                  <span>// {brandName}</span>
                  <span className="hidden sm:inline">&bull; {currentPost.category || 'KÜLTÜR'} ARŞİVİ</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="hidden md:inline">DOSYA NO: #{String(currentPostIndex + 1).padStart(3, '0')}</span>
                  <span>{currentMonthYear} // SAYFA {currentPage * 2 + 1}</span>
                </div>
              </div>

              {/* Two-Page Spread Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-6 flex-1 items-start">
                
                {/* ========================================== */}
                {/* LEFT PAGE: EDITORIAL ESSAY & DEEP ANALYSIS */}
                {/* ========================================== */}
                <div className="lg:col-span-6 space-y-5 lg:pr-6 lg:border-r-2 lg:border-black/20">
                  
                  {/* Category, Period & Instagram Rubber Stamp */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2 font-mono text-[11px] uppercase">
                      <span className="px-2 py-0.5 rounded bg-red-600 text-white font-bold tracking-wider">
                        {currentPost.category || 'KÜLTÜR'}
                      </span>
                      <span className="font-bold tracking-wider text-neutral-500">
                        {currentPost.period || "90'LAR"} RUHU
                      </span>
                    </div>

                    {/* 90's Rubber Stamp for Instagram Publication */}
                    {(currentPost.instagramPublishedAt || currentPost.publishedToInstagram) ? (
                      <div className="transform -rotate-3 border-2 border-emerald-600 text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider flex items-center space-x-1 shadow-sm">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>INSTAGRAM RESMİ YAYIN ARŞİVİ</span>
                      </div>
                    ) : (
                      <div className="border border-neutral-400 text-neutral-500 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider">
                        EDİTORYAL DERGİ BASKISI
                      </div>
                    )}
                  </div>

                  {/* Main Headline & Subtitle */}
                  <div>
                    <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-black leading-tight uppercase tracking-tight">
                      {currentPost.title}
                    </h2>
                    {currentPost.conceptTitle && (
                      <p className="mt-1 font-serif text-sm sm:text-base italic text-neutral-600 leading-snug">
                        {currentPost.conceptTitle}
                      </p>
                    )}
                  </div>

                  {/* 90's 2-Column Editorial Article Text with Drop-Cap */}
                  <div className="space-y-4 text-xs sm:text-[13px] leading-relaxed font-serif text-justify">
                    {/* Paragraph 1 with Drop Cap */}
                    {Array.isArray(currentPost.lore) && currentPost.lore.length > 0 ? (
                      <div>
                        <span className="float-left text-5xl sm:text-6xl font-serif font-black leading-none mr-2.5 text-red-600">
                          {currentPost.lore[0]?.charAt(0) || 'B'}
                        </span>
                        <p>{currentPost.lore[0]?.slice(1)}</p>
                      </div>
                    ) : (
                      <p>{typeof currentPost.lore === 'string' ? currentPost.lore : 'Editoryal içerik bulunmuyor.'}</p>
                    )}

                    {/* Centered 90's Pull Quote */}
                    {(currentPost.slideQuotes?.[0] || currentPost.hook) && (
                      <div className="my-4 py-3 px-4 border-y-2 border-black/80 text-center font-serif italic text-sm sm:text-base font-bold leading-snug text-red-600">
                        “{currentPost.slideQuotes?.[0] || currentPost.hook}”
                      </div>
                    )}

                    {/* Subsequent Paragraphs */}
                    {Array.isArray(currentPost.lore) && currentPost.lore.slice(1).map((para, pIdx) => (
                      <p key={pIdx} className="indent-4">
                        {para}
                      </p>
                    ))}
                  </div>

                  {/* ======================================================== */}
                  {/* 90'S SPECIAL DOSSIER: UNSEEN CULTURAL DEPTH (SIDEBAR)    */}
                  {/* (Instagram'a sığmayan detaylar burada yer alır!)         */}
                  {/* ======================================================== */}
                  <div className={`p-4 rounded border-2 border-dashed space-y-3 font-mono text-[11px] ${
                    isPaper ? 'bg-black/[0.03] border-black/40' : 'bg-white/[0.02] border-white/20'
                  }`}>
                    <div className="flex items-center justify-between border-b border-black/20 pb-2">
                      <div className="flex items-center space-x-1.5 font-bold uppercase text-red-600">
                        <Info className="w-4 h-4" />
                        <span>90'LAR ARŞİV DOSYASI & EKSTRA DERİNLİK</span>
                      </div>
                      
                      {/* AI Deepen Button */}
                      <button
                        type="button"
                        onClick={handleGenerateDeepAnalysis}
                        disabled={isExpandingAi}
                        className="px-2 py-1 rounded bg-red-600 text-white hover:bg-black text-[10px] font-bold uppercase transition-all flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                        title="Gemini AI ile bu konunun Instagram'da bahsedilemeyen kültürel dipnotlarını ve perde arkasını üret"
                      >
                        {isExpandingAi ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Arşiv Taranıyor...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 text-yellow-300" />
                            <span>{currentPost.magazineDeepDossier ? 'Derinliği Yenile' : 'AI ile Derinleştir'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* AI Generated Extended Dossier or Fallback Curated Notes */}
                    {currentPost.magazineDeepDossier ? (
                      <div className="space-y-3 font-sans">
                        {currentPost.magazineDeepDossier.subtitle && (
                          <div className="font-serif italic font-bold text-xs text-red-600">
                            {currentPost.magazineDeepDossier.subtitle}
                          </div>
                        )}
                        {currentPost.magazineDeepDossier.deepEssay?.map((p, idx) => (
                          <p key={idx} className="text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
                            {p}
                          </p>
                        ))}
                        {currentPost.magazineDeepDossier.culturalTrivia?.length > 0 && (
                          <div className="pt-2 border-t border-black/10 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                            {currentPost.magazineDeepDossier.culturalTrivia.map((t, idx) => (
                              <div key={idx} className="p-2 rounded bg-black/5 border border-black/10">
                                <span className="font-bold text-red-600 block">{t.label}:</span>
                                <span>{t.detail}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 text-neutral-600 dark:text-neutral-400">
                        <p>
                          <strong>Instagram Kısıtlaması Ötesinde:</strong> Instagram slaytları maksimum 18 kelimelik vurucu kancalara izin verirken, dergi formatımız bu konunun arkasındaki derin tasarım sosyolojisini, kilit yönetmen ve tasarımcılarını eksiksiz belgeler.
                        </p>
                        <p className="text-[10px] italic">
                          Yukarıdaki <strong>"AI ile Derinleştir"</strong> butonuna basarak bu konuya özel 90'lar tarihsel trivia'sını, analog teknik detayları ve dipnotları tek tıkla dosyaya ekleyebilirsiniz.
                        </p>
                      </div>
                    )}

                    {aiError && (
                      <div className="text-[10px] text-red-600 font-mono">
                        {aiError}
                      </div>
                    )}
                  </div>

                </div>

                {/* ======================================================== */}
                {/* RIGHT PAGE: CLEAN PHOTOGRAPHY PLATES & CAPTIONS          */}
                {/* (Üzerinde yazı OLMAYAN temiz fotoğraflar ve dipnotları!)  */}
                {/* ======================================================== */}
                <div className="lg:col-span-6 space-y-4">
                  
                  {/* Photo Plate Header */}
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase text-neutral-500 border-b border-black/20 pb-1.5">
                    <span className="font-bold text-red-600">EDİTORYAL FOTOĞRAF PLAKASI</span>
                  </div>

                  {/* Main Clean Photography Hero Plate (Boşlukları Otomatik Kapatan Full Editoryal Plaka) */}
                  {cleanPhotos.length > 0 ? (
                    <div className="relative border-4 border-black/90 p-2 sm:p-2.5 bg-white shadow-xl flex flex-col shrink-0 max-w-[440px] sm:max-w-[480px] mx-auto w-full">
                      
                      {/* Boşlukları Otomatik Kapatan 4:5 Dikey Görsel Alanı */}
                      <div className="w-full aspect-[4/5] bg-neutral-950 overflow-hidden relative shrink-0 flex items-center justify-center border border-black/10">
                        
                        {/* Otomatik Boşluk Kapatıcı & Atmosferik Dolgu Katmanı */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                          <img
                            src={cleanPhotos[selectedPhotoIndex]?.url || cleanPhotos[0]?.url}
                            alt=""
                            className="w-full h-full object-cover blur-2xl opacity-35 scale-125 filter contrast-125 brightness-75"
                          />
                          <div className="absolute inset-0 bg-black/20" />
                        </div>

                        {/* Ana Görsel (Boşlukları Otomatik Kapatır, Üst Kadrajı Korur) */}
                        <img
                          src={cleanPhotos[selectedPhotoIndex]?.url || cleanPhotos[0]?.url}
                          alt="Temiz Dergi Fotoğrafı"
                          className="relative z-10 w-full h-full object-cover object-[center_top] filter contrast-[1.05]"
                        />
                      </div>
                      
                      {/* Sabit Yükseklikli Açıklama Kutusu (Görsel Değişse de Boyut Zıplamaz) */}
                      <div className="mt-2 pt-2 border-t border-black/20 flex flex-col justify-between h-[78px] font-mono text-neutral-800 shrink-0">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-red-600 truncate mr-2">
                            {selectedPhotoIndex === 0 ? 'KAPAK KADRAJI' : `ŞEKİL 1.${selectedPhotoIndex + 1}`} — {cleanPhotos[selectedPhotoIndex]?.title || 'EDİTORYAL KADRAJ'}
                          </span>
                          <span className="text-[10px] text-neutral-500 shrink-0">
                            KADRAJ #{selectedPhotoIndex + 1} / {cleanPhotos.length}
                          </span>
                        </div>
                        <p className="font-serif italic text-xs leading-tight text-neutral-700 line-clamp-2 my-0.5">
                          “{cleanPhotos[selectedPhotoIndex]?.quote || currentPost?.hook || currentPost?.conceptTitle || currentPost?.title || '90\'lar editoryal arşiv fotoğrafı.'}”
                        </p>
                        <p className="text-[10px] text-neutral-500 leading-tight truncate">
                          <strong>Küratör Notu:</strong> {cleanPhotos[selectedPhotoIndex]?.idea || '35mm editoryal arşiv negatif baskısı.'}
                        </p>
                      </div>

                    </div>
                  ) : (
                    <div className="max-w-[440px] sm:max-w-[480px] mx-auto w-full aspect-[4/5] rounded border-2 border-dashed border-neutral-400 flex flex-col items-center justify-center p-6 text-center text-neutral-500 font-mono text-xs shrink-0">
                      <BookOpen className="w-10 h-10 mb-2 opacity-50" />
                      <span>Bu gönderiye ait yüklü görsel bulunamadı.</span>
                    </div>
                  )}

                  {/* Thumbnail Plate Scrubber (Diğer Slayt Fotoğraflarını Seç) */}
                  {cleanPhotos.length > 1 && (
                    <div className="space-y-1.5 max-w-[440px] sm:max-w-[480px] mx-auto w-full">
                      <div className="font-mono text-[10px] uppercase text-neutral-500 flex items-center justify-between">
                        <span>DİĞER SLAYT KADRAJLARINI İNCELE:</span>
                        <span>{cleanPhotos.length} BENZERSİZ GÖRSEL MEVCUT</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {cleanPhotos.map((photo, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => setSelectedPhotoIndex(pIdx)}
                            className={`relative border-2 p-0.5 bg-white transition-all cursor-pointer ${
                              selectedPhotoIndex === pIdx
                                ? 'border-red-600 shadow-md scale-[1.03]'
                                : 'border-black/30 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <div className="w-full aspect-[4/5] bg-neutral-900 overflow-hidden flex items-center justify-center">
                              <img
                                src={photo.url}
                                alt=""
                                className="w-full h-full object-cover object-top"
                              />
                            </div>
                            <span className="absolute bottom-1 right-1 bg-black/85 text-white font-mono text-[9px] px-1 font-bold">
                              #{pIdx + 1}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions: Open in Studio */}
                  {onLoadPostToStudio && (
                    <div className="pt-1 flex justify-end max-w-[440px] sm:max-w-[480px] mx-auto w-full">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onLoadPostToStudio(currentPost);
                        }}
                        className="px-3.5 py-1.5 rounded bg-black/10 hover:bg-black/20 text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 cursor-pointer"
                        title="Bu gönderiyi düzenlemek için Carousel Stüdyosu'na aktar"
                      >
                        <Sliders className="w-3.5 h-3.5 text-red-600" />
                        <span>Stüdyoda Düzenle</span>
                      </button>
                    </div>
                  )}

                </div>

              </div>

              {/* Bottom Folio Bar */}
              <div className="border-t-2 border-black/80 pt-3 flex items-center justify-between font-mono text-[10px] text-neutral-600">
                <span>{brandCode} EDİTORYAL KÜTÜPHANESİ &bull; POST CREATOR {currentYear}</span>
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    className="hover:text-red-600 underline cursor-pointer"
                  >
                    &uarr; İçindekiler Fihristine Dön
                  </button>
                  <span>SAYFA {currentPage * 2} - {currentPage * 2 + 1}</span>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* 90's Bottom Navigation Bar */}
      <div className="h-14 px-3 sm:px-6 bg-[#101115] border-t border-white/10 flex items-center justify-between shrink-0 font-mono text-xs z-20">
        
        {/* Previous Button */}
        <button
          type="button"
          disabled={currentPage === 0}
          onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
          className="px-4 py-2 rounded-lg border border-white/10 text-neutral-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all flex items-center space-x-2 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Önceki Sayfa</span>
        </button>

        {/* Page Slider / Scrubber */}
        <div className="flex items-center space-x-3 max-w-md w-full px-4">
          <input
            type="range"
            min={0}
            max={totalPages - 1}
            value={currentPage}
            onChange={(e) => setCurrentPage(Number(e.target.value))}
            className="w-full accent-red-600 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
          />
        </div>

        {/* Next Button */}
        <button
          type="button"
          disabled={currentPage >= totalPages - 1}
          onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
          className="px-4 py-2 rounded-lg border border-white/10 text-neutral-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all flex items-center space-x-2 cursor-pointer"
        >
          <span className="hidden sm:inline">Sonraki Sayfa</span>
          <ChevronRight className="w-4 h-4" />
        </button>

      </div>

    </div>

    {/* ======================================================== */}
    {/* 90'S PUBLICATION PRINT ENGINE: MULTI-PAGE A4 DOCUMENT     */}
    {/* Sadece tarayıcıdan "PDF Olarak Kaydet" veya "Yazdır"      */}
    {/* seçildiğinde devreye girer. Her sayfa tam A4 boyutundadır. */}
    {/* ======================================================== */}
    <div id="magazine-print-document" className="magazine-print-only">
      
      {/* ======================================================== */}
      {/* SAYFA 1 (PDF): ÖN KAPAK (STANDART A4 PORTRAIT)           */}
      {/* ======================================================== */}
      <div className="magazine-page-a4 bg-black text-white p-6 relative overflow-hidden flex flex-col justify-between">
        
        {/* Full-bleed collage background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {coverCollageImages.length >= 4 ? (
            <div className="grid grid-cols-12 grid-rows-2 gap-2 h-full w-full p-2 bg-black">
              <div className="col-span-7 row-span-2 relative overflow-hidden border border-black/80 bg-neutral-900">
                <img src={coverCollageImages[0].url} alt="" className="w-full h-full object-cover object-top filter contrast-[1.08]" />
                <span className="absolute top-3 left-3 bg-red-600 text-white font-mono text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider">
                  BAŞ MANŞET // {coverCollageImages[0].category}
                </span>
              </div>
              <div className="col-span-5 row-span-1 relative overflow-hidden border border-black/80 bg-neutral-900">
                <img src={coverCollageImages[1].url} alt="" className="w-full h-full object-cover object-top filter contrast-[1.08]" />
              </div>
              <div className="col-span-5 row-span-1 grid grid-cols-2 gap-2 h-full">
                <div className="relative overflow-hidden border border-black/80 bg-neutral-900">
                  <img src={coverCollageImages[2].url} alt="" className="w-full h-full object-cover object-top filter contrast-[1.08]" />
                </div>
                <div className="relative overflow-hidden border border-black/80 bg-neutral-900">
                  <img src={coverCollageImages[3]?.url || coverCollageImages[0].url} alt="" className="w-full h-full object-cover object-top filter contrast-[1.08]" />
                </div>
              </div>
            </div>
          ) : coverCollageImages.length > 0 ? (
            <div className="w-full h-full">
              <img src={coverCollageImages[0].url} alt="" className="w-full h-full object-cover object-top filter contrast-[1.08]" />
            </div>
          ) : null}
        </div>

        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/85 via-black/45 to-black/90 pointer-events-none" />

        {/* Foreground Typography */}
        <div className="relative z-10 flex flex-col justify-between h-full p-6">
          <div className="border-b border-white/20 pb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-neutral-200">
            <span className="font-bold text-red-400 bg-red-950/70 px-2 py-0.5 border border-red-500/50">ÖZEL RETROSPEKTİF BASKI</span>
            <span className="font-bold text-[#e6c280]">{fullDateFormatted}</span>
          </div>

          <div className="my-auto text-center">
            <h1 className="font-serif text-6xl font-black tracking-[0.25em] leading-none uppercase text-white drop-shadow-xl">
              {brandName}
            </h1>
            <p className="font-mono text-xs tracking-[0.3em] uppercase font-bold text-red-400 mt-2">
              KÜLTÜR, SİNEMA, MODA VE ANALOG ESTETİK DERGİSİ
            </p>
          </div>

          <div className="mt-auto space-y-2.5">
            <div className="bg-black/85 border-l-4 border-red-600 p-3.5 rounded-r-xl border-y border-r border-white/20 space-y-1">
              <span className="font-mono text-[9px] text-red-400 font-bold uppercase block">BAŞ MANŞET // SAYFA 04</span>
              <h2 className="font-serif text-2xl font-black uppercase text-white leading-tight">
                {displayPosts[0]?.title || "90'LARIN ANALOG RUHU VE MİNİMALİZM"}
              </h2>
              <p className="text-xs font-serif italic text-neutral-300">
                {displayPosts[0]?.conceptTitle || "Sessiz lüks, bit pazarları ve piksel öncesi estetik."}
              </p>
            </div>

            <div className="border-t border-white/20 pt-2 flex items-center justify-between text-[9px] font-mono text-neutral-400">
              <span>✦ {brandName} • EDİTORYAL ARŞİV DERGİSİ</span>
              <span className="text-neutral-300">{currentMonthYear} BASKISI &bull; CİLT 01</span>
            </div>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* SAYFA 2 (PDF): MANİFESTO & EDİTORYAL KÜNYE (A4 PORTRAIT) */}
      {/* ======================================================== */}
      <div className="magazine-page-a4 bg-[#f8f6f0] text-[#1c1c1f] p-12 flex flex-col justify-between border-8 border-black">
        <div className="border-b-2 border-black pb-2 flex items-center justify-between font-mono text-[10px] text-neutral-600 uppercase">
          <span>POST CREATOR // EDİTÖRÜN NOTU & MANİFESTO</span>
          <span>SAYFA 02</span>
        </div>

        <div className="my-auto space-y-6">
          <span className="font-mono text-xs font-bold tracking-[0.3em] uppercase text-red-600 block">
            90'LAR EDİTORYAL VİZYONU
          </span>
          <h2 className="font-serif text-3xl font-black uppercase tracking-tight leading-tight">
            ANALOG RUHUN DİJİTALDEKİ İZLERİ
          </h2>
          <div className="space-y-4 font-serif text-sm leading-relaxed text-justify">
            <p>
              <span className="float-left text-5xl font-serif font-black leading-none mr-3 text-red-600">B</span>
              u dergi, Instagram'ın hızla tüketilen ve kaybolup giden dijital akışını durdurup analog 90'lar yayıncılığının ağırlığına kavuşturmak amacıyla hazırlandı. 35mm film greni, yüksek kontrast, sessiz lüks ve sadeleştirilmiş editoryal tipografi ile her içerik kalıcı bir arşive dönüşüyor.
            </p>
            <p>
              Burada yalnızca fotoğrafları değil, onların ardındaki kültürel sosyolojiyi, kilit referansları ve slaytlara sığmayan derin analizleri bulacaksınız.
            </p>
          </div>

          <div className="p-4 border-2 border-dashed border-black/40 font-mono text-xs space-y-2 bg-black/[0.02]">
            <span className="font-bold text-red-600 uppercase block">YAYIN KÜNYESİ</span>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-700">
              <div><strong>Yayıncı:</strong> Post Creator Editoryal Atölyesi</div>
              <div><strong>Baskı Tarihi:</strong> {fullDateFormatted}</div>
              <div><strong>Küratör:</strong> {brandName}</div>
              <div><strong>Format:</strong> 90'lar Editoryal Kuşe A4</div>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-black pt-2 flex items-center justify-between font-mono text-[9px] text-neutral-500">
          <span>{brandCode} EDİTORYAL KÜTÜPHANESİ</span>
          <span>CİLT I &bull; SAYI 01</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SAYFA 3 (PDF): İÇİNDEKİLER FİHRİSTİ (A4 PORTRAIT)        */}
      {/* ======================================================== */}
      <div className="magazine-page-a4 bg-[#f8f6f0] text-[#1c1c1f] p-12 flex flex-col justify-between border-8 border-black">
        <div className="border-b-2 border-black pb-2 flex items-center justify-between font-mono text-[10px] text-neutral-600 uppercase">
          <span>{brandName} // DOSYA DİZİNİ</span>
          <span>SAYFA 03</span>
        </div>

        <div className="my-4">
          <span className="font-mono text-xs font-bold tracking-[0.3em] uppercase text-red-600 block">
            EDİTORYAL FİHRİST
          </span>
          <h2 className="font-serif text-4xl font-black tracking-tight uppercase">
            İÇİNDEKİLER
          </h2>
          <p className="font-mono text-xs text-neutral-500 mt-1">TOPLAM {displayPosts.length} EDİTORYAL DOSYA</p>
        </div>

        <div className="space-y-3 font-mono text-xs flex-1 my-4">
          {displayPosts.map((post, idx) => {
            const pageNo = (idx + 1) * 2 + 2;
            return (
              <div key={idx} className="flex items-center justify-between border-b border-black/10 pb-2.5">
                <div className="flex items-center space-x-2.5 truncate pr-4">
                  <span className="font-bold text-red-600">#{String(idx + 1).padStart(2, '0')}</span>
                  <span className="px-1.5 py-0.5 rounded bg-black/10 text-[9px] font-bold uppercase">{post.category || 'GENEL'}</span>
                  <span className="font-serif font-bold text-sm truncate">{post.title}</span>
                </div>
                <div className="shrink-0 font-serif font-black text-red-600 text-sm">
                  SAYFA {pageNo}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t-2 border-black pt-2 flex items-center justify-between font-mono text-[9px] text-neutral-500">
          <span>TÜM HAKLARI SAKLIDIR</span>
          <span>FİHRİST NO: 01</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SAYFA 4..N (PDF): HER GÖNDERİ İÇİN 2 AYRI A4 SAYFASI      */}
      {/* (SOL SAYFA: METİN & ANALİZ, SAĞ SAYFA: FOTOĞRAF PLAKASI) */}
      {/* ======================================================== */}
      {displayPosts.map((post, postIdx) => {
        const pageLeftNo = (postIdx + 1) * 2 + 2;
        const pageRightNo = pageLeftNo + 1;
        const postPhotos = extractCleanPhotos(post);

        return (
          <React.Fragment key={post.id || postIdx}>
            
            {/* SOL A4 SAYFASI: MAKALE METNİ & DERİNLİK ANALİZİ */}
            <div className="magazine-page-a4 bg-[#f8f6f0] text-[#1c1c1f] p-12 flex flex-col justify-between border-8 border-black">
              <div className="border-b-2 border-black pb-2 flex items-center justify-between font-mono text-[10px] uppercase text-neutral-600">
                <span className="font-bold text-red-600">SAYFA {pageLeftNo}</span>
                <span>// {brandName} • {post.category || 'KÜLTÜR'} ARŞİVİ</span>
                <span>DOSYA NO: #{String(postIdx + 1).padStart(3, '0')}</span>
              </div>

              <div className="my-4 space-y-4 flex-1">
                <div className="flex items-center space-x-2 font-mono text-[10px] uppercase">
                  <span className="px-2 py-0.5 bg-red-600 text-white font-bold">{post.category || 'KÜLTÜR'}</span>
                  <span className="text-neutral-500 font-bold">{post.period || "90'LAR"} RUHU</span>
                </div>

                <h2 className="font-serif text-3xl font-black uppercase leading-tight">
                  {post.title}
                </h2>
                {post.conceptTitle && (
                  <p className="font-serif italic text-sm text-neutral-600">{post.conceptTitle}</p>
                )}

                <div className="space-y-3 font-serif text-xs leading-relaxed text-justify">
                  {Array.isArray(post.lore) && post.lore.length > 0 ? (
                    <div>
                      <span className="float-left text-4xl font-serif font-black leading-none mr-2 text-red-600">
                        {post.lore[0]?.charAt(0) || 'B'}
                      </span>
                      <p>{post.lore[0]?.slice(1)}</p>
                    </div>
                  ) : (
                    <p>{typeof post.lore === 'string' ? post.lore : 'Editoryal içerik bulunmuyor.'}</p>
                  )}

                  {(post.slideQuotes?.[0] || post.hook) && (
                    <div className="my-3 py-2 px-3 border-y-2 border-black text-center font-serif italic text-sm font-bold text-red-600">
                      “{post.slideQuotes?.[0] || post.hook}”
                    </div>
                  )}

                  {Array.isArray(post.lore) && post.lore.slice(1, 3).map((para, pIdx) => (
                    <p key={pIdx} className="indent-4">{para}</p>
                  ))}
                </div>

                {/* 90's Cultural Dossier Box */}
                <div className="p-3 border-2 border-dashed border-black/40 bg-black/[0.02] font-mono text-[10px] space-y-1.5">
                  <span className="font-bold text-red-600 uppercase block">90'LAR ARŞİV DOSYASI & EKSTRA DERİNLİK:</span>
                  <p className="text-neutral-700 leading-snug">
                    {post.magazineDeepDossier?.deepEssay?.[0] || post.conceptExplanation || "Instagram kısıtlamalarının ötesinde 90'ların analog tasarım sosyolojisi ve estetik mirası."}
                  </p>
                </div>
              </div>

              <div className="border-t-2 border-black pt-2 flex items-center justify-between font-mono text-[9px] text-neutral-500">
                <span>{brandCode} EDİTORYAL KÜTÜPHANESİ</span>
                <span>POST CREATOR {currentYear}</span>
              </div>
            </div>

            {/* SAĞ A4 SAYFASI: EDİTORYAL FOTOĞRAF PLAKASI */}
            <div className="magazine-page-a4 bg-[#f8f6f0] text-[#1c1c1f] p-12 flex flex-col justify-between border-8 border-black">
              <div className="border-b-2 border-black pb-2 flex items-center justify-between font-mono text-[10px] uppercase text-neutral-600">
                <span>EDİTORYAL FOTOĞRAF PLAKASI</span>
                <span>{currentMonthYear} // SAYFA {pageRightNo}</span>
              </div>

              <div className="my-auto space-y-4">
                {postPhotos.length > 0 ? (
                  <div className="border-4 border-black p-3 bg-white shadow-md flex flex-col">
                    <div className="w-full aspect-[4/5] max-h-[150mm] bg-neutral-900 overflow-hidden relative flex items-center justify-center border border-black/10">
                      <img
                        src={postPhotos[0]?.url}
                        alt="Temiz Dergi Fotoğrafı"
                        className="w-full h-full object-cover object-[center_top] filter contrast-[1.05]"
                      />
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-black/20 font-mono text-neutral-800 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-red-600 truncate mr-2">
                          KAPAK KADRAJI — {post.title}
                        </span>
                        <span className="text-[10px] text-neutral-500 shrink-0">
                          KADRAJ #01 / {postPhotos.length}
                        </span>
                      </div>
                      <p className="font-serif italic text-xs leading-tight text-neutral-700">
                        “{postPhotos[0]?.quote || post.hook || post.title}”
                      </p>
                      <p className="text-[9px] text-neutral-500 leading-tight">
                        <strong>Küratör Notu:</strong> {postPhotos[0]?.idea || '35mm editoryal arşiv negatif baskısı.'}
                      </p>
                    </div>
                  </div>
                ) : null}

                {postPhotos.length > 1 && (
                  <div className="pt-2 border-t border-black/20">
                    <span className="font-mono text-[9px] uppercase font-bold text-neutral-600 block mb-2">
                      EK DİĞER SLAYT KADRAJLARI (KONTAK BASKI):
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {postPhotos.slice(1, 4).map((ph, pIdx) => (
                        <div key={pIdx} className="border border-black p-1 bg-white">
                          <div className="w-full aspect-[4/5] max-h-[38mm] bg-neutral-900 overflow-hidden">
                            <img src={ph.url} alt="" className="w-full h-full object-cover object-top" />
                          </div>
                          <span className="font-mono text-[8px] text-neutral-600 block truncate mt-0.5 font-bold">
                            #{pIdx + 2} {ph.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t-2 border-black pt-2 flex items-center justify-between font-mono text-[9px] text-neutral-500">
                <span>TEMİZ 35MM ARŞİV NEGATİFİ</span>
                <span>SAYFA {pageRightNo}</span>
              </div>
            </div>

          </React.Fragment>
        );
      })}

    </div>

    </div>
  );
}
