import React, { useState } from 'react';
import { Copy, Check, Bookmark, BookmarkCheck, ExternalLink, Image as ImageIcon, Sliders, Upload } from 'lucide-react';

export function OutputView({ post, onSaveToArchive, isSaved, onOpenEditor, hasImages, model }) {
  const [copied, setCopied] = useState(false);
  const [copiedQuery, setCopiedQuery] = useState(false);

  if (!post) {
    return (
      <div className="bg-[#121318] border border-white/5 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[480px]">
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-500 mb-4">
          <ImageIcon className="w-7 h-7 text-[#e6c280]/60" />
        </div>
        <h3 className="font-serif text-xl font-bold text-white mb-2 tracking-wide">
          İçerik Üretim Motoru Beklemede
        </h3>
        <p className="text-neutral-400 text-xs max-w-md font-sans leading-relaxed">
          Sol panelden kategori ve dönemi belirleyin, isterseniz spesifik bir detay girin veya küratörün rastgele kült bir konu seçmesine izin verin.
        </p>
      </div>
    );
  }

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(post.formattedCaption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Kopyalama başarısız:', err);
    }
  };

  const handleCopyQuery = async () => {
    try {
      await navigator.clipboard.writeText(post.visualNote);
      setCopiedQuery(true);
      setTimeout(() => setCopiedQuery(false), 2000);
    } catch (err) {
      console.error('Kopyalama başarısız:', err);
    }
  };

  const pinterestUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(post.visualNote)}`;
  const googleImagesUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(post.visualNote)}`;

  return (
    <div className="bg-[#121318] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-8 animate-fadeIn">
      
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#e6c280]/10 border border-[#e6c280]/30 text-[#e6c280] uppercase tracking-wider">
            {post.category}
          </span>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-white/5 border border-white/10 text-neutral-300">
            {post.decade}
          </span>
          {(post.activeModelUsed || model) && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-center space-x-1.5" title="Bu içeriği üreten yapay zeka modeli">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Model: {post.activeModelUsed || model}</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Save to archive */}
          <button
            type="button"
            onClick={() => onSaveToArchive(post)}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition-all cursor-pointer ${
              isSaved
                ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40'
                : 'bg-white/5 border border-white/10 text-neutral-300 hover:text-white hover:border-white/20'
            }`}
            title={isSaved ? "Arşiv kaydını son haliyle güncelle" : "Arşive kaydet"}
          >
            {isSaved ? <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Bookmark className="w-3.5 h-3.5" />}
            <span>{isSaved ? 'Arşivi Güncelle' : 'Arşive Kaydet'}</span>
          </button>

          {/* Copy Caption */}
          <button
            type="button"
            onClick={handleCopyCaption}
            className="px-4 py-2 rounded-lg bg-[#e6c280] hover:bg-[#d4b06e] text-black font-semibold text-xs font-mono uppercase tracking-wider transition-all flex items-center space-x-2 shadow-[0_0_15px_rgba(230,194,128,0.2)]"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Kopyalandı!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Instagram Metnini Kopyala</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 1. GÖNDERİ BAŞLIĞI */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#e6c280] mb-2">
          [Gönderi Başlığı]
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
          {post.title}
        </h1>
      </div>

      {/* 2. KANCA (HOOK) */}
      <div className="relative pl-5 border-l-2 border-[#e6c280] py-1 bg-white/[0.02] rounded-r-xl pr-4">
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-400 mb-1">
          Kanca (Hook)
        </div>
        <p className="font-serif italic text-lg sm:text-xl text-[#f3f3f5] leading-snug">
          "{post.hook}"
        </p>
      </div>

      {/* 3. LORE (HİKAYE) - 3 PARAGRAF */}
      <div className="space-y-4">
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-400">
          Lore (Hikaye)
        </div>
        <div className="space-y-4 text-sm sm:text-base text-neutral-300 font-sans leading-relaxed">
          {Array.isArray(post.lore) ? (
            post.lore.map((paragraph, idx) => (
              <p key={idx} className="tracking-wide">
                {paragraph}
              </p>
            ))
          ) : (
            <p className="tracking-wide">{post.lore}</p>
          )}
        </div>
      </div>

      {/* 4. KÜRATÖRÜN GÖRSELİ & ARAMA BAĞLANTILARI + STÜDYO KÖPRÜSÜ */}
      <div className="p-6 rounded-2xl bg-black/60 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#e6c280] flex items-center space-x-1.5">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Küratörün Görsel Notu (İngilizce Arama Terimi)</span>
          </div>
          <button
            type="button"
            onClick={handleCopyQuery}
            className="text-[11px] font-mono text-neutral-400 hover:text-white flex items-center space-x-1"
          >
            {copiedQuery ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedQuery ? 'Kopyalandı' : 'Kopyala'}</span>
          </button>
        </div>

        <div className="font-mono text-sm text-neutral-200 bg-white/5 p-3 rounded-lg border border-white/5 selection:bg-[#e6c280] selection:text-black">
          {post.visualNote}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={pinterestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-mono bg-[#e60023]/15 text-[#ff4f64] border border-[#e60023]/30 hover:bg-[#e60023]/25 transition-colors"
            >
              <span>Pinterest'te Arşiv Ara</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <a
              href={googleImagesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-mono bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 transition-colors"
            >
              <span>Google Görsellerde Ara</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Stüdyoya Geçiş Butonu */}
          <button
            type="button"
            onClick={onOpenEditor}
            className="px-4 py-2 rounded-lg bg-[#e6c280] hover:bg-[#d4b06e] text-black font-semibold text-xs font-mono uppercase tracking-wider transition-all flex items-center space-x-2 shadow-[0_0_15px_rgba(230,194,128,0.2)]"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{hasImages ? 'Carousel Slaytlarını Düzenle' : 'Görselleri Yükle & Carousel Düzenle'}</span>
          </button>
        </div>
      </div>

      {/* 5. ETİKETLER */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-400 mb-2">
          #Etiketler
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.isArray(post.hashtags) &&
            post.hashtags.map((tag, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-full text-xs font-mono text-neutral-300 bg-white/5 border border-white/10 hover:border-[#e6c280]/40 transition-colors"
              >
                {tag.startsWith('#') ? tag : `#${tag}`}
              </span>
            ))}
        </div>
      </div>

    </div>
  );
}
