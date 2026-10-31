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
 * Gönderinin temiz, üzerine yazı basılmamış orijinal fotoğraflarını ayıklar.
 */
function extractCleanPhotos(post) {
  if (!post) return [];
  const gallery = post.savedGallery || [];
  const settings = post.savedSlideSettings || {};
  const thumbs = post.thumbnails || [];

  const slideCount = Math.max(
    post.slideQuotes?.length ? post.slideQuotes.length + 1 : 4,
    Object.keys(settings).length,
    thumbs.filter(Boolean).length,
    gallery.length
  );

  const photos = [];
  for (let i = 0; i < slideCount; i++) {
    const imgId = settings[i]?.imageId;
    const galleryMatch = gallery.find((g) => g.id === imgId);
    const url = galleryMatch?.dataUrl || thumbs[i] || gallery[i]?.dataUrl || null;
    
    if (url) {
      photos.push({
        index: i,
        url,
        title: i === 0 ? (post.title || 'Kapak Görseli') : `Slayt #${i + 1}`,
        quote: settings[i]?.customQuote || post.slideQuotes?.[i - 1] || '',
        idea: post.visualIdeas?.[i] || post.visualIdeas?.[i - 1] || '90\'lar editoryal fotoğraf arşivi.',
        filter: settings[i]?.filter || 'normal'
      });
    }
  }

  // Yedek: thumbs veya gallery'den doğrudan doldur
  if (photos.length === 0) {
    thumbs.forEach((t, idx) => {
      if (t) {
        photos.push({
          index: idx,
          url: t,
          title: idx === 0 ? post.title : `Slayt #${idx + 1}`,
          quote: post.slideQuotes?.[idx - 1] || '',
          idea: post.visualIdeas?.[idx] || 'Arşiv görseli.',
          filter: 'normal'
        });
      }
    });
  }

  return photos;
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

  // Sayfa değiştiğinde fotoğraf seçimini sıfırla
  useEffect(() => {
    setSelectedPhotoIndex(0);
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

  // Proje adı ve logo
  const brandName = (activeProject?.name || currentPost?.projectName || 'LORE MAGAZINE').toUpperCase();
  const brandCode = (activeProject?.shortCode || currentPost?.projectShortCode || 'LORE').toUpperCase();
  const issueDate = 'EKİM 1994 // SAYI #04';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md overflow-hidden animate-fadeIn">
      
      {/* 90's Editorial Top Control Bar */}
      <div className="h-16 px-4 sm:px-6 bg-[#101115] border-b border-white/10 flex items-center justify-between shrink-0 select-none z-20">
        
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

          <div className="px-3 py-1 rounded bg-black/50 border border-white/10 text-neutral-300 text-[11px] min-w-[130px] text-center">
            {currentPage === 0 ? (
              <span className="text-[#e6c280] font-bold">KAPAK</span>
            ) : currentPage === 1 ? (
              <span className="text-[#e6c280] font-bold">İÇİNDEKİLER</span>
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
      <div className={`flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 flex items-center justify-center transition-colors duration-300 ${
        isPaper ? 'bg-[#212124]' : 'bg-[#08080a]'
      }`}>
        
        {/* The 90's Physical Magazine Spread Container */}
        <div className={`relative w-full max-w-6xl shadow-2xl rounded-sm transition-all duration-300 overflow-hidden ${
          isPaper
            ? 'bg-[#f6f3eb] text-[#1c1c1f] shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-[#d8d4c7]'
            : 'bg-[#121318] text-[#e8e4dc] shadow-[0_20px_60px_rgba(0,0,0,0.85)] border border-white/10'
        }`}>

          {/* ======================================================== */}
          {/* PAGE 0: 1990'S RETRO COVER PAGE                         */}
          {/* ======================================================== */}
          {currentPage === 0 && (
            <div className="relative min-h-[750px] p-6 sm:p-10 flex flex-col justify-between border-4 border-black/80 m-2 sm:m-4 bg-gradient-to-b from-transparent to-black/5">
              
              {/* Top Banner & Barcode Strip */}
              <div className="border-b-2 border-black/80 pb-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-widest">
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-red-600 bg-red-600/10 px-2 py-0.5 border border-red-600/30">
                    ÖZEL RETROSPEKTİF BASKI
                  </span>
                  <span className={isPaper ? 'text-neutral-700' : 'text-neutral-300'}>
                    VOL. III · SAYI 04 · EKİM 1994
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="hidden sm:inline">İSTANBUL · LONDRA · MİLANO · TOKYO</span>
                  <span className="font-bold">FİYATI: 120.000 TL / $4.50 / £2.80</span>
                </div>
              </div>

              {/* Big Iconic 90's Masthead (Ray Gun / The Face Aesthetic) */}
              <div className="my-6 text-center select-none">
                <h1 className="font-serif text-6xl sm:text-8xl lg:text-9xl font-black tracking-[0.25em] leading-none uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]">
                  {brandName}
                </h1>
                <div className="flex items-center justify-center space-x-4 mt-3">
                  <span className="h-[2px] w-16 bg-black/60" />
                  <p className="font-mono text-xs sm:text-sm tracking-[0.3em] uppercase font-bold text-red-600">
                    KÜLTÜR, SİNEMA, MODA VE ANALOG ESTETİK DERGİSİ
                  </p>
                  <span className="h-[2px] w-16 bg-black/60" />
                </div>
              </div>

              {/* Cover Hero Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-4 items-center">
                
                {/* Left Side: 90's Cover Headlines / Teasers */}
                <div className="lg:col-span-4 space-y-5 font-sans">
                  <div className="border-l-4 border-red-600 pl-3.5 space-y-1">
                    <span className="font-mono text-[10px] text-red-600 font-bold uppercase tracking-wider block">
                      BAŞ MANŞET // SAYFA 04
                    </span>
                    <h2 className="font-serif text-xl sm:text-2xl font-black leading-tight uppercase">
                      {displayPosts[0]?.title || "90'LARIN ANALOG RUHU VE MİNİMALİZM"}
                    </h2>
                    <p className={`text-xs font-serif italic ${isPaper ? 'text-neutral-700' : 'text-neutral-300'}`}>
                      {displayPosts[0]?.conceptTitle || "Sessiz lüks, bit pazarları ve piksel öncesi estetik."}
                    </p>
                  </div>

                  <div className="p-3.5 rounded bg-black/5 border border-black/15 space-y-2 font-mono text-[11px]">
                    <div className="font-bold text-red-600 uppercase flex items-center space-x-1.5">
                      <span>✦ BU SAYININ DOSYALARI</span>
                    </div>
                    <ul className={`space-y-1.5 ${isPaper ? 'text-neutral-800' : 'text-neutral-300'}`}>
                      {displayPosts.slice(1, 4).map((p, i) => (
                        <li key={i} className="truncate">
                          <span className="text-red-600 font-bold mr-1.5">&bull;</span>
                          <strong>{p.category || 'DOSYA'}:</strong> {p.title}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 90's Circular Badge / Sticker */}
                  <div className="w-28 h-28 rounded-full border-2 border-dashed border-red-600 flex flex-col items-center justify-center text-center p-2 transform -rotate-12 bg-red-600/10 shadow-sm mx-auto sm:mx-0">
                    <span className="text-[9px] font-mono font-bold tracking-widest text-red-600">ÖZEL DOSYA</span>
                    <span className="font-serif text-xs font-black uppercase tracking-tight">KÜLT ARŞİV</span>
                    <span className="text-[8px] font-mono text-neutral-600">1990 - 1999</span>
                  </div>
                </div>

                {/* Center / Right: Clean Cover Photo (NO Text Overlay!) */}
                <div className="lg:col-span-8 relative">
                  <div className="relative border-4 border-black/90 p-2 bg-white shadow-xl">
                    {displayPosts[0]?.thumbnails?.[0] || displayPosts[0]?.savedGallery?.[0]?.dataUrl ? (
                      <img
                        src={displayPosts[0].thumbnails?.[0] || displayPosts[0].savedGallery?.[0]?.dataUrl}
                        alt="Dergi Kapağı"
                        className="w-full h-[400px] sm:h-[480px] object-cover filter contrast-[1.05]"
                      />
                    ) : (
                      <div className="w-full h-[400px] sm:h-[480px] bg-neutral-800 flex flex-col items-center justify-center p-6 text-center text-neutral-400">
                        <BookOpen className="w-12 h-12 text-[#e6c280] mb-2" />
                        <span className="font-serif text-lg font-bold text-white">Fotoğraf Arşivi</span>
                        <span className="text-xs font-mono">Kapak fotoğrafı oluşturulan ilk gönderiden otomatik seçilir.</span>
                      </div>
                    )}

                    {/* Photo Plate Caption in 90's style */}
                    <div className="mt-2 pt-2 border-t border-black/20 flex items-center justify-between font-mono text-[10px] text-neutral-600">
                      <span>FOTOĞRAF NO: #001 · 35MM KODAK TRI-X 400</span>
                      <span>EDİTORYAL DERGİ FORMATI</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom Bar: Barcode & Navigation Trigger */}
              <div className="border-t-2 border-black/80 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                
                {/* 90's ISSN Barcode */}
                <div className="flex items-center space-x-3">
                  <div className="flex items-end space-x-[2px] h-9 bg-white px-2 py-1 border border-black/40">
                    <div className="w-[3px] h-7 bg-black" />
                    <div className="w-[1px] h-7 bg-black" />
                    <div className="w-[2px] h-6 bg-black" />
                    <div className="w-[4px] h-7 bg-black" />
                    <div className="w-[1px] h-6 bg-black" />
                    <div className="w-[3px] h-7 bg-black" />
                    <div className="w-[2px] h-7 bg-black" />
                    <div className="w-[1px] h-6 bg-black" />
                    <div className="w-[3px] h-7 bg-black" />
                    <div className="w-[2px] h-7 bg-black" />
                    <div className="w-[4px] h-7 bg-black" />
                  </div>
                  <div className="font-mono text-[9px] text-neutral-600 leading-tight">
                    <div className="font-bold">ISSN 1042-8720</div>
                    <div>EDİTORYAL ARŞİV KODU: 94-OCT-001</div>
                  </div>
                </div>

                {/* Start Reading Button */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  className="px-6 py-2.5 rounded bg-black text-white hover:bg-red-600 font-mono text-xs font-bold tracking-widest uppercase transition-all flex items-center space-x-2 shadow-lg cursor-pointer"
                >
                  <span>Dergiyi Aç & Sayfaları Çevir</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* PAGE 1: 1990'S TABLE OF CONTENTS / FİHRİST              */}
          {/* ======================================================== */}
          {currentPage === 1 && (
            <div className="p-6 sm:p-12 min-h-[750px] flex flex-col justify-between m-2 sm:m-4 border-2 border-black/80">
              
              {/* Header */}
              <div className="border-b-4 border-black pb-4 flex items-end justify-between">
                <div>
                  <span className="font-mono text-xs font-bold tracking-[0.3em] uppercase text-red-600 block">
                    {brandName} // DOSYA DİZİNİ
                  </span>
                  <h2 className="font-serif text-4xl sm:text-5xl font-black tracking-tight uppercase">
                    İÇİNDEKİLER
                  </h2>
                </div>
                <div className="text-right font-mono text-xs text-neutral-500">
                  <div>SAYI: 04 · CİLT I</div>
                  <div>TOPLAM {displayPosts.length} EDİTORYAL DOSYA</div>
                </div>
              </div>

              {/* Contents Table with 90's Dotted Leaders */}
              <div className="my-8 space-y-4 font-mono text-xs flex-1">
                {displayPosts.length === 0 ? (
                  <div className="text-center py-20 text-neutral-500 font-serif">
                    <p className="text-lg">Henüz arşivde gönderi bulunmuyor.</p>
                    <p className="text-xs font-mono mt-1">İçerik stüdyosundan yeni bir gönderi üreterek derginizi oluşturabilirsiniz.</p>
                  </div>
                ) : (
                  displayPosts.map((post, idx) => {
                    const pageNo = (idx + 1) * 2 + 2;
                    const isShared = Boolean(post.instagramPublishedAt || post.publishedToInstagram);
                    return (
                      <div
                        key={post.id || idx}
                        onClick={() => setCurrentPage(idx + 2)}
                        className={`group p-3 rounded border transition-all cursor-pointer flex items-center justify-between ${
                          isPaper
                            ? 'hover:bg-black/5 border-black/10'
                            : 'hover:bg-white/5 border-white/10'
                        }`}
                      >
                        <div className="flex items-center space-x-3 truncate pr-4">
                          <span className="font-bold text-red-600 w-8 shrink-0">
                            #{String(idx + 1).padStart(2, '0')}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-black/10 font-bold text-[10px] uppercase shrink-0">
                            {post.category || 'GENEL'}
                          </span>
                          <span className="font-serif text-sm sm:text-base font-bold truncate group-hover:text-red-600 transition-colors">
                            {post.title}
                          </span>
                          {isShared && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 text-[9px] uppercase font-bold shrink-0 hidden sm:inline">
                              Yayında
                            </span>
                          )}
                        </div>

                        {/* Dotted Leader & Page Number */}
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="hidden md:inline text-neutral-400 select-none">
                            ...................................
                          </span>
                          <span className="font-serif text-sm font-black text-red-600 group-hover:underline">
                            SAYFA {pageNo} &rarr;
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Quote / Colophon */}
              <div className="border-t-2 border-black/80 pt-4 flex items-center justify-between font-mono text-[10px] text-neutral-600">
                <span>BASIM TARİHİ: EKİM 1994 · BASKI MERKEZİ: POST CREATOR ATÖLYESİ</span>
                <span>TÜM HAKLARI SAKLIDIR &bull; DERGİ SAYFA NO: 02 - 03</span>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* PAGES 2..N: 1990'S EDITORIAL TWO-PAGE SPREAD             */}
          {/* ======================================================== */}
          {currentPage >= 2 && currentPost && (
            <div className="p-4 sm:p-8 lg:p-10 min-h-[820px] flex flex-col justify-between">
              
              {/* Running Header / Folio Line */}
              <div className="border-b-2 border-black/80 pb-2.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-neutral-600">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-red-600">SAYFA {currentPage * 2}</span>
                  <span>// {brandName}</span>
                  <span className="hidden sm:inline">&bull; {currentPost.category || 'KÜLTÜR'} ARŞİVİ</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="hidden md:inline">DOSYA NO: #{String(currentPostIndex + 1).padStart(3, '0')}</span>
                  <span>EKİM 1994 // SAYFA {currentPage * 2 + 1}</span>
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
                <div className="lg:col-span-6 space-y-5">
                  
                  {/* Photo Plate Header */}
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase text-neutral-500 border-b border-black/20 pb-1.5">
                    <span className="font-bold text-red-600">EDİTORYAL FOTOĞRAF PLAKASI</span>
                    <span>TEMİZ 35MM ARŞİV GÖRSELİ (YAZISIZ)</span>
                  </div>

                  {/* Main Clean Photography Hero Plate */}
                  {cleanPhotos.length > 0 ? (
                    <div className="relative border-4 border-black/90 p-2 bg-white shadow-xl">
                      <img
                        src={cleanPhotos[selectedPhotoIndex]?.url || cleanPhotos[0]?.url}
                        alt="Temiz Dergi Fotoğrafı"
                        className="w-full h-[380px] sm:h-[420px] object-cover filter contrast-[1.05]"
                      />
                      
                      {/* Photo Caption Plate Underneath */}
                      <div className="mt-3 pt-2.5 border-t border-black/20 space-y-1 font-mono text-neutral-800">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-red-600">
                            ŞEKİL 1.{selectedPhotoIndex + 1} — {cleanPhotos[selectedPhotoIndex]?.title || 'EDİTORYAL KADRAJ'}
                          </span>
                          <span className="text-[10px] text-neutral-500">
                            KADRAJ #{selectedPhotoIndex + 1} / {cleanPhotos.length}
                          </span>
                        </div>
                        {cleanPhotos[selectedPhotoIndex]?.quote && (
                          <p className="font-serif italic text-xs leading-snug text-neutral-700">
                            "{cleanPhotos[selectedPhotoIndex]?.quote}"
                          </p>
                        )}
                        {cleanPhotos[selectedPhotoIndex]?.idea && (
                          <p className="text-[10px] text-neutral-500 leading-tight">
                            <strong>Küratör Notu:</strong> {cleanPhotos[selectedPhotoIndex]?.idea}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-[380px] rounded border-2 border-dashed border-neutral-400 flex flex-col items-center justify-center p-6 text-center text-neutral-500 font-mono text-xs">
                      <BookOpen className="w-10 h-10 mb-2 opacity-50" />
                      <span>Bu gönderiye ait yüklü görsel bulunamadı.</span>
                    </div>
                  )}

                  {/* Thumbnail Plate Scrubber (Diğer Slayt Fotoğraflarını Seç) */}
                  {cleanPhotos.length > 1 && (
                    <div className="space-y-2">
                      <div className="font-mono text-[10px] uppercase text-neutral-500 flex items-center justify-between">
                        <span>DİĞER SLAYT KADRAJLARINI İNCELE:</span>
                        <span>{cleanPhotos.length} GÖRSEL MEVCUT</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {cleanPhotos.map((photo, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => setSelectedPhotoIndex(pIdx)}
                            className={`relative border-2 p-1 bg-white transition-all cursor-pointer ${
                              selectedPhotoIndex === pIdx
                                ? 'border-red-600 shadow-md scale-[1.03]'
                                : 'border-black/30 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={photo.url}
                              alt=""
                              className="w-full h-16 sm:h-20 object-cover"
                            />
                            <span className="absolute bottom-1 right-1 bg-black/80 text-white font-mono text-[9px] px-1 font-bold">
                              #{pIdx + 1}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions: Open in Studio */}
                  {onLoadPostToStudio && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onLoadPostToStudio(currentPost);
                        }}
                        className="px-3.5 py-2 rounded bg-black/10 hover:bg-black/20 text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 cursor-pointer"
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
                <span>{brandCode} EDİTORYAL KÜTÜPHANESİ &bull; POST CREATOR 1994</span>
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
      <div className="h-16 px-4 sm:px-6 bg-[#101115] border-t border-white/10 flex items-center justify-between shrink-0 font-mono text-xs z-20">
        
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
  );
}
