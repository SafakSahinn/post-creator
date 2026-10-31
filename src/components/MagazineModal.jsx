import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Printer,
  Download,
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
import { jsPDF } from 'jspdf';
import { toJpeg } from 'html-to-image';
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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });
  const scrollViewportRef = useRef(null);

  // Filtrelenmiş gönderiler
  const displayPosts = useMemo(() => {
    let list = [...archives];
    if (onlyPublished) {
      list = list.filter((p) => p.instagramPublishedAt || p.publishedToInstagram);
    }
    return list;
  }, [archives, onlyPublished]);

  // Her sayfanın tipini ve içeriğini tutan dinamik sayfa listesi:
  // Her gönderi için 1 Metin & Derinlik Sayfası + Gönderideki HER temiz fotoğraf için 1 Tam Sayfa Editoryal Plaka
  const magazinePages = useMemo(() => {
    const pages = [];
    
    // 0: Kapak
    pages.push({ type: 'cover' });
    
    // 1: Editörün Notu & Künye
    pages.push({ type: 'manifesto' });
    
    // 2: İçindekiler Fihristi
    pages.push({ type: 'toc' });
    
    // Gönderiler: Her gönderi için 1 Metin Sayfası + Gönderideki HER temiz görsel için 1 Tam Sayfa Fotoğraf Plakası
    displayPosts.forEach((post, postIdx) => {
      const photos = extractCleanPhotos(post);
      
      // Metin & Analiz Sayfası
      pages.push({
        type: 'article',
        post,
        postIndex: postIdx,
        totalPhotos: photos.length
      });
      
      // Her bir temiz fotoğraf için tam sayfa plaka
      if (photos.length > 0) {
        photos.forEach((photo, photoIdx) => {
          pages.push({
            type: 'photo',
            post,
            postIndex: postIdx,
            photo,
            photoIndex: photoIdx,
            totalPhotos: photos.length
          });
        });
      }
    });
    
    return pages;
  }, [displayPosts]);

  const totalPages = Math.max(3, magazinePages.length);
  const activePageData = magazinePages[currentPage] || magazinePages[0];
  const currentPost = activePageData?.post || null;
  const coverCollageImages = useMemo(() => extractCoverCollageImages(displayPosts, 5), [displayPosts]);

  // Sayfa değiştiğinde tepeye kaydır (Scroll to Top)
  useEffect(() => {
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
  const handleGenerateDeepAnalysis = async (targetPost) => {
    const postToUse = targetPost || currentPost;
    if (!postToUse) return;
    setIsExpandingAi(true);
    setAiError(null);
    try {
      const result = await generateDeepMagazineEssay({
        post: postToUse,
        project: activeProject
      });

      const updated = {
        ...postToUse,
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

  // Her sayfayı hem ekranda hem de PDF'te 1:1 birebir aynı boyutta ve piksel doğruluğunda render eden tek kaynak motor
  const renderSinglePage = (pageIdx, isPdf = false) => {
    // Gönderi indeksine karşılık gelen makale sayfasının indeksini bulma yardımcısı
    const getArticlePageIdx = (pIdx) => {
      const found = magazinePages.findIndex((p) => p.type === 'article' && p.postIndex === pIdx);
      return found !== -1 ? found : 3;
    };

    // ----------------------------------------------------
    // SAYFA 0: 90'LAR FULL-BLEED RETRO ÖN KAPAK
    // ----------------------------------------------------
    if (pageIdx === 0) {
      return (
        <div className={`relative flex-1 ${isPdf ? 'w-full h-full' : 'min-h-[760px] sm:min-h-[820px] lg:min-h-[860px]'} border-4 border-black/90 m-1.5 sm:m-3 overflow-hidden flex flex-col justify-between shadow-2xl bg-black select-none`}>
          {/* Full-bleed background collage */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            {coverCollageImages.length >= 4 ? (
              <div className="grid grid-cols-12 grid-rows-2 gap-1.5 h-full w-full p-1 bg-black">
                {/* 1. Sol 7 Kolon */}
                <div
                  onClick={!isPdf ? () => setCurrentPage(getArticlePageIdx(coverCollageImages[0].postIndex)) : undefined}
                  title={`${coverCollageImages[0].title} (${coverCollageImages[0].category}) — Sayfaya Git`}
                  className={`col-span-7 row-span-2 relative overflow-hidden group ${!isPdf ? 'cursor-pointer' : ''} border border-black/80 bg-neutral-900`}
                >
                  <img
                    src={coverCollageImages[0].url}
                    alt={coverCollageImages[0].title}
                    className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105 filter contrast-[1.08]"
                  />
                  <div className="absolute top-3 left-3 bg-red-600/90 text-white font-mono text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider shadow border border-white/20">
                    BAŞ MANŞET // {coverCollageImages[0].category}
                  </div>
                  <div className="absolute bottom-3 left-3 bg-black/80 text-[#e6c280] font-mono text-[9px] px-2 py-0.5 tracking-wider border border-white/10 font-bold">
                    [01A KODAK 5052]
                  </div>
                </div>

                {/* 2. Sağ Üst 5 Kolon */}
                <div
                  onClick={!isPdf ? () => setCurrentPage(getArticlePageIdx(coverCollageImages[1].postIndex)) : undefined}
                  title={`${coverCollageImages[1].title} (${coverCollageImages[1].category}) — Sayfaya Git`}
                  className={`col-span-5 row-span-1 relative overflow-hidden group ${!isPdf ? 'cursor-pointer' : ''} border border-black/80 bg-neutral-900`}
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

                {/* 3 & 4. Sağ Alt İki Kadraj */}
                <div className="col-span-5 row-span-1 grid grid-cols-2 gap-1.5 h-full">
                  <div
                    onClick={!isPdf ? () => setCurrentPage(getArticlePageIdx(coverCollageImages[2].postIndex)) : undefined}
                    title={`${coverCollageImages[2].title} (${coverCollageImages[2].category}) — Sayfaya Git`}
                    className={`relative overflow-hidden group ${!isPdf ? 'cursor-pointer' : ''} border border-black/80 bg-neutral-900 h-full`}
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
                    onClick={!isPdf ? () => setCurrentPage(coverCollageImages[3]?.postIndex !== undefined ? getArticlePageIdx(coverCollageImages[3].postIndex) : 2) : undefined}
                    title={coverCollageImages[3] ? `${coverCollageImages[3].title} (${coverCollageImages[3].category}) — Sayfaya Git` : 'Detay'}
                    className={`relative overflow-hidden group ${!isPdf ? 'cursor-pointer' : ''} border border-black/80 bg-neutral-900 h-full`}
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
              <div className="grid grid-cols-12 grid-rows-2 gap-1.5 h-full w-full p-1 bg-black">
                <div
                  onClick={!isPdf ? () => setCurrentPage(getArticlePageIdx(coverCollageImages[0].postIndex)) : undefined}
                  className={`col-span-7 row-span-2 relative overflow-hidden group ${!isPdf ? 'cursor-pointer' : ''} border border-black/80`}
                >
                  <img src={coverCollageImages[0].url} alt="" className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform" />
                  <span className="absolute top-3 left-3 bg-red-600 text-white font-mono text-[9px] px-2 py-0.5 font-bold uppercase">[01A // {coverCollageImages[0].category}]</span>
                </div>
                <div
                  onClick={!isPdf ? () => setCurrentPage(getArticlePageIdx(coverCollageImages[1].postIndex)) : undefined}
                  className={`col-span-5 row-span-1 relative overflow-hidden group ${!isPdf ? 'cursor-pointer' : ''} border border-black/80`}
                >
                  <img src={coverCollageImages[1].url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <span className="absolute top-2 left-2 bg-black/80 text-white font-mono text-[8px] px-1.5 uppercase">[02A // {coverCollageImages[1].category}]</span>
                </div>
                <div
                  onClick={!isPdf ? () => setCurrentPage(getArticlePageIdx(coverCollageImages[2].postIndex)) : undefined}
                  className={`col-span-5 row-span-1 relative overflow-hidden group ${!isPdf ? 'cursor-pointer' : ''} border border-black/80`}
                >
                  <img src={coverCollageImages[2].url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <span className="absolute top-2 left-2 bg-black/80 text-white font-mono text-[8px] px-1.5 uppercase">[03A // {coverCollageImages[2].category}]</span>
                </div>
              </div>
            ) : coverCollageImages.length === 2 ? (
              <div className="grid grid-cols-2 gap-1.5 h-full w-full p-1 bg-black">
                {coverCollageImages.map((img, i) => (
                  <div
                    key={i}
                    onClick={!isPdf ? () => setCurrentPage(getArticlePageIdx(img.postIndex)) : undefined}
                    className={`relative overflow-hidden group ${!isPdf ? 'cursor-pointer' : ''} border border-black/80`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform" />
                    <span className="absolute top-3 left-3 bg-red-600 text-white font-mono text-[9px] px-2 py-0.5 font-bold uppercase">[0{i + 1}A // {img.category}]</span>
                  </div>
                ))}
              </div>
            ) : coverCollageImages.length === 1 ? (
              <div
                onClick={!isPdf ? () => setCurrentPage(getArticlePageIdx(coverCollageImages[0].postIndex)) : undefined}
                className={`relative w-full h-full group ${!isPdf ? 'cursor-pointer' : ''}`}
              >
                <img src={coverCollageImages[0].url} alt="" className="w-full h-full object-cover object-center filter contrast-[1.08]" />
                <span className="absolute top-3 left-3 bg-red-600 text-white font-mono text-[9px] px-2 py-0.5 font-bold uppercase">[01A // {coverCollageImages[0].category}]</span>
              </div>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-neutral-900 via-black to-neutral-950 flex flex-col items-center justify-center p-6 text-neutral-400">
                <BookOpen className="w-16 h-16 text-[#e6c280] mb-3 opacity-60" />
                <span className="font-serif text-2xl font-bold text-white tracking-widest uppercase">Post Creator</span>
                <span className="text-xs font-mono text-neutral-400 mt-1">90'lar Editoryal Kültür Arşivi</span>
              </div>
            )}
          </div>

          {/* 2. Vignette */}
          <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-b from-black/85 via-black/45 to-black/90 shadow-[inset_0_0_120px_rgba(0,0,0,0.85)]" />

          {/* 3. Foreground Typography */}
          <div className="absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-6 lg:px-8 lg:pt-6 lg:pb-2.5 pointer-events-none">
            {/* Top Banner Strip */}
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

            {/* Masthead */}
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

            {/* Lower Headline */}
            <div className="mt-auto mb-1 flex flex-col space-y-1.5 pointer-events-auto relative">
              {displayPosts[0] && (
                <div
                  onClick={!isPdf ? () => setCurrentPage(getArticlePageIdx(0)) : undefined}
                  className={`bg-black/75 hover:bg-black/90 backdrop-blur-md border-l-4 border-red-600 p-2.5 sm:p-3 rounded-r-lg border-y border-r border-white/20 shadow-2xl ${!isPdf ? 'cursor-pointer group' : ''} transition-all`}
                  title={`Baş Manşet Dosyasına Git (Sayfa ${String(getArticlePageIdx(0) + 1).padStart(2, '0')})`}
                >
                  <div className="flex items-center justify-between text-[9px] font-mono mb-0.5">
                    <span className="text-red-400 font-bold uppercase tracking-wider">
                      BAŞ MANŞET // SAYFA {String(getArticlePageIdx(0) + 1).padStart(2, '0')}
                    </span>
                    {!isPdf && (
                      <span className="text-neutral-400 group-hover:text-white transition-colors">
                        OKU &rarr;
                      </span>
                    )}
                  </div>
                  <h2 className="font-serif text-base sm:text-lg font-black leading-tight uppercase text-white group-hover:text-red-300 transition-colors drop-shadow">
                    {displayPosts[0]?.title || "90'LARIN ANALOG RUHU VE MİNİMALİZM"}
                  </h2>
                  {displayPosts[0]?.conceptTitle && (
                    <p className="text-[11px] font-serif italic text-neutral-300 leading-snug line-clamp-1 mt-0.5">
                      {displayPosts[0]?.conceptTitle}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Folio */}
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
      );
    }

    // ----------------------------------------------------
    // SAYFA 1: EDİTÖRÜN NOTU & YAYIN KÜNYESİ (MANİFESTO)
    // ----------------------------------------------------
    if (pageIdx === 1) {
      return (
        <div className={`relative flex-1 ${isPdf ? 'w-full h-full' : 'min-h-[760px] sm:min-h-[820px] lg:min-h-[860px]'} p-5 sm:p-7 lg:p-8 flex flex-col justify-between m-1.5 sm:m-3 border-4 border-black/80`}>
          {/* Running Header */}
          <div className="border-b-2 border-black/80 pb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-neutral-600">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-red-600">SAYFA 02</span>
              <span>// {brandName} • MANİFESTO</span>
            </div>
            <span className="text-neutral-500">{currentMonthYear}</span>
          </div>

          {/* Main Content */}
          <div className="space-y-4 my-auto">
            <span className="font-mono text-[11px] font-bold tracking-[0.25em] uppercase text-red-600 block">
              EDİTÖRÜN NOTU // 90'LAR VİZYONU
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-black uppercase tracking-tight leading-tight">
              ANALOG RUHUN DİJİTALDEKİ İZLERİ
            </h2>
            <div className="space-y-3 font-serif text-xs sm:text-[13px] leading-relaxed text-justify">
              <p>
                <span className="float-left text-5xl font-serif font-black leading-none mr-2.5 text-red-600">B</span>
                u dergi, Instagram'ın hızla tükenen ve kaybolup giden dijital akışını durdurup analog 90'lar yayıncılığının ağırlığına kavuşturmak amacıyla hazırlandı. 35mm film greni, yüksek kontrast, sessiz lüks ve sadeleştirilmiş tipografi ile her gönderi ölümsüz bir arşive dönüşüyor.
              </p>
              <p>
                Burada yalnızca fotoğrafları değil, onların ardındaki kültürel arka planı, sinema referanslarını ve stil sosyolojisini bulacaksınız.
              </p>
            </div>

            {/* 90's Pull Quote */}
            <div className="my-3 py-2.5 px-4 border-y-2 border-black/80 text-center font-serif italic text-sm font-bold leading-snug text-red-600">
              “Instagram akışı geçici, 90'lar analog arşivi kalıcıdır.”
            </div>

            {/* 90's Colophon Box */}
            <div className="p-3.5 border-2 border-dashed border-black/40 font-mono text-[10px] space-y-1.5 bg-black/[0.02]">
              <span className="font-bold text-red-600 uppercase block">YAYIN KÜNYESİ (COLOPHON)</span>
              <div className="space-y-1 text-neutral-700">
                <div><strong>Yayıncı:</strong> Post Creator Editoryal Atölyesi</div>
                <div><strong>Baskı Tarihi:</strong> {fullDateFormatted}</div>
                <div><strong>Format:</strong> 90'lar Kuşe Kağıt (Standart A4)</div>
                <div><strong>Küratör:</strong> {brandName}</div>
                <div><strong>Tipografi:</strong> Playfair Display / Courier Prime</div>
              </div>
            </div>
          </div>

          {/* Bottom Running Footer */}
          <div className="border-t-2 border-black/80 pt-2 flex items-center justify-between font-mono text-[10px] text-neutral-600">
            <span>BASIM TARİHİ: {fullDateFormatted}</span>
            <div className="flex items-center space-x-2">
              {!isPdf ? (
                <button
                  type="button"
                  onClick={() => setCurrentPage(2)}
                  className="hover:text-red-600 underline cursor-pointer"
                >
                  İçindekiler Fihristi &rarr;
                </button>
              ) : (
                <span>İçindekiler Fihristi &rarr;</span>
              )}
              <span>&bull; SAYFA 02</span>
            </div>
          </div>
        </div>
      );
    }

    // ----------------------------------------------------
    // SAYFA 2: İÇİNDEKİLER FİHRİSTİ (TABLE OF CONTENTS)
    // ----------------------------------------------------
    if (pageIdx === 2) {
      return (
        <div className={`relative flex-1 ${isPdf ? 'w-full h-full' : 'min-h-[760px] sm:min-h-[820px] lg:min-h-[860px]'} p-5 sm:p-7 lg:p-8 flex flex-col justify-between m-1.5 sm:m-3 border-4 border-black/80`}>
          {/* Running Header */}
          <div className="border-b-2 border-black/80 pb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-neutral-600">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-red-600">SAYFA 03</span>
              <span>// {brandName} • DOSYA DİZİNİ</span>
            </div>
            <span className="text-neutral-500">TOPLAM {displayPosts.length} DOSYA</span>
          </div>

          {/* Main Content */}
          <div className="space-y-3 my-2 flex-1 flex flex-col">
            <div>
              <span className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-red-600 block">
                EDİTORYAL FİHRİST
              </span>
              <h3 className="font-serif text-3xl font-black tracking-tight uppercase">
                İÇİNDEKİLER
              </h3>
            </div>

            {/* Dotted Leader Table */}
            <div className={`space-y-2 font-mono text-xs ${isPdf ? 'overflow-hidden' : 'overflow-y-auto'} flex-1 pr-1`}>
              {displayPosts.map((post, idx) => {
                const articleIdx = getArticlePageIdx(idx);
                const pageNo = articleIdx + 1;
                const cleanPhotos = extractCleanPhotos(post);
                const isShared = Boolean(post.instagramPublishedAt || post.publishedToInstagram);
                return (
                  <div
                    key={post.id || idx}
                    onClick={!isPdf ? () => setCurrentPage(articleIdx) : undefined}
                    className={`group p-2 rounded border transition-all ${!isPdf ? 'cursor-pointer' : ''} flex items-center justify-between ${
                      isPaper ? 'hover:bg-black/5 border-black/10' : 'hover:bg-white/5 border-white/10'
                    }`}
                    title={`Sayfa ${String(pageNo).padStart(2, '0')} — ${post.title} makalesine git`}
                  >
                    <div className="flex items-center space-x-2 truncate pr-2">
                      <span className="font-mono font-bold text-red-600 shrink-0 text-xs">
                        #{String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-black/10 shrink-0 font-bold uppercase">
                        {post.category || 'GENEL'}
                      </span>
                      <span className="font-serif font-bold text-xs truncate group-hover:text-red-600 transition-colors">
                        {post.title}
                      </span>
                      {cleanPhotos.length > 0 && (
                        <span className="text-[9px] font-mono text-neutral-500 shrink-0 hidden sm:inline">
                          ({cleanPhotos.length} Kadraj)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {isShared && (
                        <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hidden sm:inline">
                          YAYINDA
                        </span>
                      )}
                      <span className="font-serif font-black text-red-600 text-xs">
                        S. {String(pageNo).padStart(2, '0')} &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Running Footer */}
          <div className="border-t-2 border-black/80 pt-2 flex items-center justify-between font-mono text-[10px] text-neutral-600">
            <span>POST CREATOR EDİTORYAL DİZİNİ</span>
            <span>SAYFA 03 / {totalPages}</span>
          </div>
        </div>
      );
    }

    // ----------------------------------------------------
    // SAYFALAR 3..N: DİNAMİK EDİTORYAL SAYFALAR (METİN VEYA FOTOĞRAF)
    // ----------------------------------------------------
    const pageData = magazinePages[pageIdx];
    if (!pageData) return null;

    if (pageData.type === 'article') {
      const { post, postIndex, totalPhotos } = pageData;
      return (
        <div className={`relative flex-1 ${isPdf ? 'w-full h-full' : 'min-h-[760px] sm:min-h-[820px] lg:min-h-[860px]'} p-5 sm:p-7 lg:p-8 flex flex-col justify-between m-1.5 sm:m-3 border-4 border-black/80`}>
          {/* Running Header */}
          <div className="border-b-2 border-black/80 pb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-neutral-600">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-red-600">SAYFA {String(pageIdx + 1).padStart(2, '0')}</span>
              <span>// {brandName}</span>
              <span className="hidden sm:inline">&bull; {post.category || 'KÜLTÜR'} ARŞİVİ</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>DOSYA NO: #{String(postIndex + 1).padStart(3, '0')}</span>
            </div>
          </div>

          {/* Editorial Essay Body */}
          <div className="space-y-4 my-2 flex-1">
            {/* Category & Period Badge */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2 font-mono text-[11px] uppercase">
                <span className="px-2 py-0.5 rounded bg-red-600 text-white font-bold tracking-wider">
                  {post.category || 'KÜLTÜR'}
                </span>
                <span className="font-bold tracking-wider text-neutral-500">
                  {post.period || "90'LAR"} RUHU
                </span>
              </div>

              {(post.instagramPublishedAt || post.publishedToInstagram) ? (
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

            {/* Headline */}
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-black leading-tight uppercase tracking-tight">
                {post.title}
              </h2>
              {post.conceptTitle && (
                <p className="mt-1 font-serif text-sm sm:text-base italic text-neutral-600 leading-snug">
                  {post.conceptTitle}
                </p>
              )}
            </div>

            {/* Text with Drop Cap */}
            <div className="space-y-4 text-xs sm:text-[13px] leading-relaxed font-serif text-justify">
              {Array.isArray(post.lore) && post.lore.length > 0 ? (
                <div>
                  <span className="float-left text-5xl sm:text-6xl font-serif font-black leading-none mr-2.5 text-red-600">
                    {post.lore[0]?.charAt(0) || 'B'}
                  </span>
                  <p>{post.lore[0]?.slice(1)}</p>
                </div>
              ) : (
                <p>{typeof post.lore === 'string' ? post.lore : 'Editoryal içerik bulunmuyor.'}</p>
              )}

              {(post.slideQuotes?.[0] || post.hook) && (
                <div className="my-4 py-3 px-4 border-y-2 border-black/80 text-center font-serif italic text-sm sm:text-base font-bold leading-snug text-red-600">
                  “{post.slideQuotes?.[0] || post.hook}”
                </div>
              )}

              {Array.isArray(post.lore) && post.lore.slice(1, 3).map((para, pIdx) => (
                <p key={pIdx} className="indent-4">
                  {para}
                </p>
              ))}
            </div>

            {/* 90's Special Dossier Box */}
            <div className={`p-4 rounded border-2 border-dashed space-y-3 font-mono text-[11px] ${
              isPaper ? 'bg-black/[0.03] border-black/40' : 'bg-white/[0.02] border-white/20'
            }`}>
              <div className="flex items-center justify-between border-b border-black/20 pb-2">
                <div className="flex items-center space-x-1.5 font-bold uppercase text-red-600">
                  <Info className="w-4 h-4" />
                  <span>90'LAR ARŞİV DOSYASI & EKSTRA DERİNLİK</span>
                </div>
                
                {!isPdf && (
                  <button
                    type="button"
                    onClick={() => handleGenerateDeepAnalysis(post)}
                    disabled={isExpandingAi}
                    className="px-2 py-1 rounded bg-red-600 text-white hover:bg-black text-[10px] font-bold uppercase transition-all flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                    title="Gemini AI ile bu konunun kültürel dipnotlarını üret"
                  >
                    {isExpandingAi ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Arşiv Taranıyor...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-yellow-300" />
                        <span>{post.magazineDeepDossier ? 'Derinliği Yenile' : 'AI ile Derinleştir'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {post.magazineDeepDossier ? (
                <div className="space-y-3 font-sans">
                  {post.magazineDeepDossier.subtitle && (
                    <div className="font-serif italic font-bold text-xs text-red-600">
                      {post.magazineDeepDossier.subtitle}
                    </div>
                  )}
                  {post.magazineDeepDossier.deepEssay?.map((p, idx) => (
                    <p key={idx} className="text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
                      {p}
                    </p>
                  ))}
                  {post.magazineDeepDossier.culturalTrivia?.length > 0 && (
                    <div className="pt-2 border-t border-black/10 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                      {post.magazineDeepDossier.culturalTrivia.map((t, idx) => (
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
                  {!isPdf && (
                    <p className="text-[10px] italic">
                      Yukarıdaki <strong>"AI ile Derinleştir"</strong> butonuna basarak bu konuya özel 90'lar tarihsel trivia'sını ve dipnotları tek tıkla ekleyebilirsiniz.
                    </p>
                  )}
                </div>
              )}

              {aiError && !isPdf && (
                <div className="text-[10px] text-red-600 font-mono">
                  {aiError}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="border-t-2 border-black/80 pt-2 flex items-center justify-between font-mono text-[10px] text-neutral-600">
            {!isPdf ? (
              <>
                <button
                  type="button"
                  onClick={() => setCurrentPage(2)}
                  className="hover:text-red-600 underline cursor-pointer"
                >
                  &uarr; İçindekiler
                </button>
                <div className="flex items-center space-x-3">
                  {totalPhotos > 0 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentPage(pageIdx + 1)}
                      className="hover:text-red-600 font-bold underline cursor-pointer text-red-600"
                    >
                      Fotoğraf Plakası #1 &rarr;
                    </button>
                  ) : pageIdx < totalPages - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentPage(pageIdx + 1)}
                      className="hover:text-red-600 font-bold underline cursor-pointer text-red-600"
                    >
                      Sonraki Dosya &rarr;
                    </button>
                  ) : null}
                  <span>SAYFA {String(pageIdx + 1).padStart(2, '0')}</span>
                </div>
              </>
            ) : (
              <>
                <span>{brandCode} EDİTORYAL KÜTÜPHANESİ</span>
                <span>SAYFA {String(pageIdx + 1).padStart(2, '0')}</span>
              </>
            )}
          </div>
        </div>
      );
    }

    if (pageData.type === 'photo') {
      const { post, postIndex, photo, photoIndex, totalPhotos } = pageData;
      return (
        <div className={`relative flex-1 ${isPdf ? 'w-full h-full' : 'min-h-[760px] sm:min-h-[820px] lg:min-h-[860px]'} p-4 sm:p-6 flex flex-col justify-between m-1.5 sm:m-3 border-4 border-black/80 box-border`}>
          {/* Running Header */}
          <div className="border-b-2 border-black/80 pb-2 mb-2 sm:mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-neutral-600 shrink-0">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-red-600">SAYFA {String(pageIdx + 1).padStart(2, '0')}</span>
              <span>// EDİTORYAL FOTOĞRAF PLAKASI</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>DOSYA #{String(postIndex + 1).padStart(2, '0')}</span>
              <span>&bull;</span>
              <span className="font-bold text-neutral-800 dark:text-neutral-200">
                KADRAJ {photoIndex + 1}/{totalPhotos}
              </span>
            </div>
          </div>

          {/* Main Photo Content: Restored Impactful Full-Page Photo Plate */}
          <div className="my-auto flex-1 flex flex-col justify-center items-center space-y-3">
            <div className="relative border-4 border-black/90 p-2 sm:p-2.5 bg-white shadow-xl flex flex-col shrink-0 max-w-[420px] sm:max-w-[440px] mx-auto w-full">
              {/* 4:5 Hero Plate */}
              <div className="w-full aspect-[4/5] max-h-[460px] bg-neutral-950 overflow-hidden relative shrink-0 flex items-center justify-center border border-black/10">
                {/* Otomatik Boşluk Kapatıcı & Atmosferik Dolgu Katmanı */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <img
                    src={photo?.url}
                    alt=""
                    className="w-full h-full object-cover blur-2xl opacity-35 scale-125 filter contrast-125 brightness-75"
                  />
                  <div className="absolute inset-0 bg-black/20" />
                </div>

                {/* Ana Görsel */}
                <img
                  src={photo?.url}
                  alt={photo?.title || 'Dergi Fotoğrafı'}
                  className="relative z-10 w-full h-full object-cover object-[center_top] filter contrast-[1.05]"
                />
              </div>

              {/* Açıklama Kutusu */}
              <div className="mt-2 pt-2 border-t border-black/20 flex flex-col justify-between font-mono text-neutral-800 shrink-0">
                <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold">
                  <span className="text-red-600 truncate mr-2">
                    {photoIndex === 0 ? 'KAPAK KADRAJI' : `KADRAJ #${photoIndex + 1}`} — {photo?.title || post?.title || 'EDİTORYAL KADRAJ'}
                  </span>
                  <span className="text-[10px] text-neutral-500 shrink-0">
                    KADRAJ #{photoIndex + 1} / {totalPhotos}
                  </span>
                </div>
                <p className="font-serif italic text-xs leading-snug text-neutral-700 line-clamp-2 my-1">
                  “{photo?.quote || post?.hook || post?.conceptTitle || post?.title || "90'lar editoryal arşiv fotoğrafı."}”
                </p>
                <p className="text-[10px] text-neutral-500 leading-tight truncate">
                  <strong>Küratör Notu:</strong> {photo?.idea || post?.conceptTitle || '35mm editoryal arşiv negatif baskısı.'}
                </p>
              </div>
            </div>

            {/* Stüdyoda Düzenle Butonu (Yalnızca Ekranda) */}
            {!isPdf && onLoadPostToStudio && (
              <div className="flex justify-end max-w-[420px] sm:max-w-[440px] mx-auto w-full shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLoadPostToStudio(post);
                  }}
                  className="px-2.5 py-1 rounded bg-black/10 hover:bg-black/20 text-[10px] font-mono font-bold uppercase transition-all flex items-center space-x-1 cursor-pointer"
                  title="Bu gönderiyi düzenlemek için Carousel Stüdyosu'na aktar"
                >
                  <Sliders className="w-3 h-3 text-red-600" />
                  <span>Stüdyoda Düzenle</span>
                </button>
              </div>
            )}
          </div>

          {/* Bottom Footer */}
          <div className="border-t-2 border-black/80 pt-2 flex items-center justify-between font-mono text-[10px] text-neutral-600 shrink-0">
            {!isPdf ? (
              <>
                <button
                  type="button"
                  onClick={() => setCurrentPage(pageIdx - 1)}
                  className="hover:text-red-600 font-bold underline cursor-pointer text-red-600"
                >
                  {photoIndex === 0 ? '← Metne Dön' : `← Önceki Kadraj (#${photoIndex})`}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(2)}
                  className="hover:text-red-600 underline cursor-pointer text-neutral-500"
                >
                  İçindekiler
                </button>
                <div className="flex items-center space-x-2">
                  {photoIndex < totalPhotos - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentPage(pageIdx + 1)}
                      className="hover:text-red-600 font-bold underline cursor-pointer text-red-600"
                    >
                      Sonraki Kadraj (#{photoIndex + 2}) &rarr;
                    </button>
                  ) : pageIdx < totalPages - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentPage(pageIdx + 1)}
                      className="hover:text-red-600 font-bold underline cursor-pointer text-red-600"
                    >
                      Sonraki Dosya &rarr;
                    </button>
                  ) : null}
                  <span>SAYFA {String(pageIdx + 1).padStart(2, '0')}</span>
                </div>
              </>
            ) : (
              <>
                <span>TEMİZ 35MM ARŞİV NEGATİFİ &bull; KADRAJ #{photoIndex + 1}/{totalPhotos}</span>
                <span>SAYFA {String(pageIdx + 1).padStart(2, '0')}</span>
              </>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // Tam A4 Boyutunda Yüksek Çözünürlüklü Doğrudan PDF İndirme Motoru
  // Sitede ne görünüyorsa birebir aynı renk, tipografi ve 580x820 A4 oranında PDF'e aktarır
  const handleDownloadPdf = async () => {
    const printDoc = document.getElementById('magazine-print-document');
    if (!printDoc) {
      window.print();
      return;
    }

    const pages = printDoc.querySelectorAll('.magazine-page-print-item');
    if (!pages || pages.length === 0) {
      window.print();
      return;
    }

    setIsGeneratingPdf(true);
    setPdfProgress({ current: 0, total: pages.length });

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const bgColor = isPaper ? '#f6f3eb' : '#121318';

      for (let i = 0; i < pages.length; i++) {
        setPdfProgress({ current: i + 1, total: pages.length });
        const pageEl = pages[i];

        // Font ve görsellerin oturması için kısa render gecikmesi
        await new Promise((resolve) => setTimeout(resolve, 120));

        const imgData = await toJpeg(pageEl, {
          quality: 0.98,
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: bgColor,
          width: 580,
          height: 820
        });

        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        // Tam A4 boyutuna (210mm x 297mm) sıfır boşlukla (full-bleed) yerleştir
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      }

      const safeBrand = (brandName || 'DERGI').replace(/[^a-zA-Z0-9_\u00C0-\u017F-]/g, '_');
      pdf.save(`${safeBrand}_Dergisi_Sayi_01.pdf`);
    } catch (err) {
      console.error('PDF oluşturma hatası:', err);
      // Beklenmeyen bir capture hatasında tarayıcı yazdırmasına düş
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md overflow-hidden animate-fadeIn magazine-modal-portal">
      
      {/* 90's Publication Print & PDF Stylesheet (A4 Multi-Page Standard) */}
      <style>{`
        @media screen {
          .magazine-print-only {
            position: fixed !important;
            left: -99999px !important;
            top: 0 !important;
            width: 580px !important;
            opacity: 1 !important;
            pointer-events: none !important;
            z-index: -999 !important;
          }
        }
        @media print {
          @page {
            size: 210mm 297mm;
            margin: 0mm !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #111111 !important;
            overflow: visible !important;
            width: 210mm !important;
          }
          #root,
          #root > div,
          .magazine-modal-portal {
            position: static !important;
            display: block !important;
            width: 210mm !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            inset: auto !important;
            transform: none !important;
            backdrop-filter: none !important;
          }
          .magazine-screen-only {
            display: none !important;
          }
          .magazine-print-only,
          #magazine-print-document {
            display: block !important;
            position: static !important;
            left: auto !important;
            top: auto !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            z-index: auto !important;
            opacity: 1 !important;
          }
          .magazine-page-print-item {
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
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
                <span className="text-[#e6c280] font-bold">EDİTÖRÜN NOTU (SAYFA 02)</span>
              ) : currentPage === 2 ? (
                <span className="text-[#e6c280] font-bold">İÇİNDEKİLER (SAYFA 03)</span>
              ) : (
                <span>
                  SAYFA <strong className="text-white">{String(currentPage + 1).padStart(2, '0')}</strong> / {String(totalPages).padStart(2, '0')}
                  <span className="text-neutral-400 text-[10px] ml-1.5 font-sans">
                    ({activePageData?.type === 'photo' ? `Fotoğraf #${(activePageData?.photoIndex || 0) + 1}` : 'Metin'})
                  </span>
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

          {/* Direct High-Quality A4 PDF Download */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white border border-red-500/50 text-xs font-mono font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
            title="Dergiyi Yüksek Kaliteli Standart A4 PDF Olarak Doğrudan İndir"
          >
            {isGeneratingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isGeneratingPdf ? 'İndiriliyor...' : 'PDF İndir'}</span>
          </button>

          {/* Browser Print / Physical Paper */}
          <button
            type="button"
            onClick={() => window.print()}
            className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-xs font-mono text-neutral-300 transition-all cursor-pointer"
            title="Tarayıcı Yazdırma Penceresini Aç"
          >
            <Printer className="w-3.5 h-3.5 text-[#e6c280]" />
            <span>Yazdır</span>
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
        
        {/* The 90's Physical Magazine Spread Container (Her Sayfa Kapak Gibi Standart Tek A4 Boyutunda) */}
        <div className={`relative w-full shadow-2xl rounded-sm transition-all duration-300 overflow-hidden min-h-[760px] sm:min-h-[820px] lg:min-h-[860px] flex flex-col max-w-[540px] sm:max-w-[580px] my-1 sm:my-3 mx-auto ${
          isPaper
            ? 'bg-[#f6f3eb] text-[#1c1c1f] shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-[#d8d4c7]'
            : 'bg-[#121318] text-[#e8e4dc] shadow-[0_20px_60px_rgba(0,0,0,0.85)] border border-white/10'
        }`}>

          {renderSinglePage(currentPage, false)}

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
    {/* Sitedeki görünümle 1:1 birebir aynı boyutta ve stilde     */}
    {/* ======================================================== */}
    <div id="magazine-print-document" className="magazine-print-only">
      {magazinePages.map((_, pIdx) => (
        <div
          key={pIdx}
          className={`magazine-page-print-item relative overflow-hidden flex flex-col ${
            isPaper
              ? 'bg-[#f6f3eb] text-[#1c1c1f]'
              : 'bg-[#121318] text-[#e8e4dc]'
          }`}
          style={{
            width: '580px',
            height: '820px',
            minHeight: '820px',
            maxHeight: '820px',
            boxSizing: 'border-box'
          }}
        >
          {renderSinglePage(pIdx, true)}
        </div>
      ))}
    </div>

    {/* Yüksek Çözünürlüklü A4 PDF İndirme İlerleme Katmanı */}
    {isGeneratingPdf && (
      <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white font-mono select-none animate-fadeIn">
        <div className="bg-[#14151b] border border-white/20 p-6 rounded-2xl shadow-2xl flex flex-col items-center space-y-4 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 shadow-inner">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold tracking-tight">PDF Dergi Hazırlanıyor</h3>
            <p className="text-xs text-neutral-400 mt-1 font-sans">
              Tüm sayfalar tam A4 boyutunda (300 DPI) işleniyor...
            </p>
          </div>
          <div className="w-full bg-neutral-800 rounded-full h-2.5 overflow-hidden border border-white/10">
            <div
              className="bg-red-600 h-full transition-all duration-300"
              style={{ width: `${pdfProgress.total ? (pdfProgress.current / pdfProgress.total) * 100 : 15}%` }}
            />
          </div>
          <div className="flex items-center justify-between w-full text-[11px] text-neutral-400 pt-1">
            <span>İşlenen Sayfa:</span>
            <strong className="text-[#e6c280]">
              {pdfProgress.current} / {pdfProgress.total || totalPages}
            </strong>
          </div>
        </div>
      </div>
    )}

    </div>
  );
}
