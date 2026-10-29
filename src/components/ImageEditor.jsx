import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Sliders, Image as ImageIcon, Eye, Check, RefreshCw, ZoomIn, Sun, Contrast, Trash2, Copy } from 'lucide-react';
import { toPng } from 'html-to-image';

const FILTERS = [
  { id: 'none', name: 'Orijinal', filterStyle: 'none' },
  { id: 'film35mm', name: '35mm Film', filterStyle: 'contrast(115%) saturate(85%) sepia(10%)' },
  { id: 'bwNoir', name: 'Mono Noir (Siyah-Beyaz)', filterStyle: 'grayscale(100%) contrast(140%) brightness(95%)' },
  { id: 'muted', name: 'Muted Luxury (90lar)', filterStyle: 'saturate(75%) contrast(105%) brightness(102%)' },
  { id: 'warm', name: 'Vintage Sıcak', filterStyle: 'sepia(30%) saturate(110%) contrast(110%)' },
];

export function ImageEditor({ post, userImage, onSaveUserImage }) {
  const [imageSrc, setImageSrc] = useState(userImage?.dataUrl || null);
  const [activeFilter, setActiveFilter] = useState(userImage?.filter || 'none');
  const [aspectRatio, setAspectRatio] = useState(userImage?.ratio || '4:5'); // '4:5' (1080x1350) or '1:1' (1080x1080)
  const [vignetteOpacity, setVignetteOpacity] = useState(userImage?.vignette ?? 60);
  const [brightness, setBrightness] = useState(userImage?.brightness ?? 100);
  const [contrast, setContrast] = useState(userImage?.contrast ?? 100);
  const [zoom, setZoom] = useState(userImage?.zoom ?? 100);
  const [showTypography, setShowTypography] = useState(userImage?.showTypography ?? true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const previewRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sync state if userImage changes from outside
  useEffect(() => {
    if (userImage?.dataUrl) {
      setImageSrc(userImage.dataUrl);
    }
  }, [userImage]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target.result;
        setImageSrc(url);
        onSaveUserImage({
          dataUrl: url,
          filter: activeFilter,
          ratio: aspectRatio,
          vignette: vignetteOpacity,
          brightness,
          contrast,
          zoom,
          showTypography
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target.result;
        setImageSrc(url);
        onSaveUserImage({
          dataUrl: url,
          filter: activeFilter,
          ratio: aspectRatio,
          vignette: vignetteOpacity,
          brightness,
          contrast,
          zoom,
          showTypography
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = (event) => {
            const url = event.target.result;
            setImageSrc(url);
            onSaveUserImage({
              dataUrl: url,
              filter: activeFilter,
              ratio: aspectRatio,
              vignette: vignetteOpacity,
              brightness,
              contrast,
              zoom,
              showTypography
            });
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    }
  };

  const handleDownload = async () => {
    if (!previewRef.current) return;
    try {
      setIsExporting(true);
      const dataUrl = await toPng(previewRef.current, { quality: 0.98, pixelRatio: 2.5 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `LORE_${post?.category || 'Post'}_${aspectRatio === '4:5' ? 'Portrait_4x5' : 'Square_1x1'}.png`;
      a.click();
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2000);
    } catch (err) {
      console.error('Fotoğraf dışa aktarılamadı:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const selectedFilterStyle = FILTERS.find((f) => f.id === activeFilter)?.filterStyle || 'none';

  return (
    <div
      onPaste={handlePaste}
      className="bg-[#121318] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fadeIn"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#e6c280] flex items-center space-x-1.5">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Editoryal Görsel Stüdyosu</span>
          </div>
          <p className="text-xs text-neutral-400 font-sans mt-0.5">
            İndirdiğiniz gerçek arşiv fotoğrafını yükleyin, Instagram boyutuna göre filtreleyin ve mizanpajlayın.
          </p>
        </div>

        {imageSrc && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                setImageSrc(null);
                onSaveUserImage(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/40 text-red-300 text-xs font-mono flex items-center space-x-1 border border-red-500/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Görseli Kaldır</span>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownload}
              className="px-4 py-2 rounded-lg bg-[#e6c280] hover:bg-[#d4b06e] text-black font-semibold text-xs font-mono uppercase tracking-wider transition-all flex items-center space-x-2 shadow-[0_0_15px_rgba(230,194,128,0.2)]"
            >
              {exportSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>İndirildi!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Instagram Görselini İndir (HD)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Editor Body */}
      {!imageSrc ? (
        /* Upload Area */
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-white/15 hover:border-[#e6c280]/60 rounded-2xl p-12 text-center cursor-pointer transition-all bg-white/[0.01] hover:bg-white/[0.03] space-y-4 group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 group-hover:border-[#e6c280]/40 flex items-center justify-center mx-auto text-neutral-400 group-hover:text-[#e6c280] transition-colors shadow-lg">
            <Upload className="w-7 h-7" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-base text-white tracking-wide">
              Pinterest veya Google'dan İndirdiğiniz Fotoğrafı Buraya Bırakın
            </h4>
            <p className="text-xs text-neutral-400 font-sans mt-1">
              Dosya seçmek için tıklayın veya panodan doğrudan yapıştırın (<kbd className="bg-white/10 px-1 py-0.5 rounded text-[10px] font-mono">Ctrl+V</kbd>)
            </p>
          </div>
          <div className="inline-flex items-center space-x-2 text-[11px] font-mono text-[#e6c280] bg-[#e6c280]/10 border border-[#e6c280]/20 px-3 py-1 rounded-full">
            <span>Önerilen: 4:5 Dikey veya 1:1 Kare Çözünürlük</span>
          </div>
        </div>
      ) : (
        /* Active Workspace: Left Preview Canvas, Right Controls */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Canvas Display (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-black/60 p-4 sm:p-6 rounded-2xl border border-white/5 overflow-hidden">
            
            {/* The Actual Downloadable Artboard */}
            <div
              ref={previewRef}
              style={{
                width: aspectRatio === '4:5' ? '380px' : '380px',
                height: aspectRatio === '4:5' ? '475px' : '380px',
              }}
              className="relative overflow-hidden bg-black shadow-2xl select-none flex flex-col justify-between border border-white/10"
            >
              {/* The Photo */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                <img
                  src={imageSrc}
                  alt="Archival"
                  style={{
                    filter: `${selectedFilterStyle} brightness(${brightness}%) contrast(${contrast}%)`,
                    transform: `scale(${zoom / 100})`,
                  }}
                  className="w-full h-full object-cover transition-transform duration-100"
                />
                
                {/* Vignette / Dark gradient overlay */}
                {vignetteOpacity > 0 && (
                  <div
                    style={{
                      background: `linear-gradient(to top, rgba(11,12,16, ${vignetteOpacity / 100}) 0%, rgba(11,12,16, ${vignetteOpacity / 250}) 50%, rgba(11,12,16, ${vignetteOpacity / 200}) 100%)`
                    }}
                    className="absolute inset-0 pointer-events-none"
                  />
                )}
              </div>

              {/* Typography Overlay */}
              {showTypography && post && (
                <>
                  {/* Top Bar */}
                  <div className="relative z-10 p-6 pb-2 flex items-center justify-between border-b border-white/10 text-white">
                    <span className="font-serif tracking-[0.3em] text-xs font-bold uppercase text-[#e6c280]">
                      L O R E
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-300 bg-black/40 px-2 py-0.5 rounded border border-white/10">
                      {post.category} · {post.decade}
                    </span>
                  </div>

                  {/* Bottom Headline & Hook */}
                  <div className="relative z-10 p-6 pt-2 space-y-2 mt-auto">
                    <div className="text-[9px] font-mono tracking-[0.2em] text-[#e6c280] uppercase">
                      Statü & Popüler Kültür Lore
                    </div>
                    <h3 className="font-serif font-black text-xl sm:text-2xl text-white leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                      {post.title}
                    </h3>
                    <div className="w-10 h-[1.5px] bg-[#e6c280]" />
                    <p className="font-serif italic text-xs text-neutral-200 leading-snug line-clamp-3 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                      "{post.hook}"
                    </p>
                    <div className="pt-2 flex items-center justify-between text-[9px] font-mono text-neutral-400 border-t border-white/10">
                      <span>EDİTORYAL ARŞİV</span>
                      <span>KAYDIR &rarr;</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="text-[11px] font-mono text-neutral-500 mt-3">
              Önizleme: {aspectRatio === '4:5' ? 'Instagram Dikey (1080x1350)' : 'Instagram Kare (1080x1080)'}
            </div>
          </div>

          {/* Right Controls Panel (5 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Format Selection */}
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 block mb-2">
                Instagram Formatı
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAspectRatio('4:5')}
                  className={`py-2 px-3 rounded-lg border text-xs font-mono transition-all ${
                    aspectRatio === '4:5'
                      ? 'border-[#e6c280] bg-[#e6c280]/15 text-white font-bold'
                      : 'border-white/10 bg-white/5 text-neutral-400 hover:text-white'
                  }`}
                >
                  4:5 Dikey (Önerilen)
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('1:1')}
                  className={`py-2 px-3 rounded-lg border text-xs font-mono transition-all ${
                    aspectRatio === '1:1'
                      ? 'border-[#e6c280] bg-[#e6c280]/15 text-white font-bold'
                      : 'border-white/10 bg-white/5 text-neutral-400 hover:text-white'
                  }`}
                >
                  1:1 Kare Post
                </button>
              </div>
            </div>

            {/* Dergi Tipografisi Aç/Kapa */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-white">Dergi Başlık & Kanca Bindirmesi</div>
                <div className="text-[10px] text-neutral-400">Başlık ve logoyu fotoğraf üzerine ekler</div>
              </div>
              <button
                type="button"
                onClick={() => setShowTypography(!showTypography)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  showTypography ? 'bg-[#e6c280]' : 'bg-neutral-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-black transition-transform absolute top-1 ${
                    showTypography ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Filter Presets */}
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 block mb-2">
                Editoryal Renk & Film Filtresi
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActiveFilter(f.id)}
                    className={`py-2 px-3 rounded-lg border text-left text-xs font-mono transition-all flex items-center justify-between ${
                      activeFilter === f.id
                        ? 'border-[#e6c280] bg-[#e6c280]/10 text-white font-semibold'
                        : 'border-white/5 bg-white/[0.02] text-neutral-400 hover:border-white/15 hover:text-white'
                    }`}
                  >
                    <span>{f.name}</span>
                    {activeFilter === f.id && <Check className="w-3.5 h-3.5 text-[#e6c280]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders: Vignette, Zoom, Brightness */}
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-[11px] font-mono text-neutral-400 mb-1">
                  <span>Metin Okunabilirlik Karartması (Vignette)</span>
                  <span>%{vignetteOpacity}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="95"
                  value={vignetteOpacity}
                  onChange={(e) => setVignetteOpacity(Number(e.target.value))}
                  className="w-full accent-[#e6c280] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono text-neutral-400 mb-1">
                  <span>Yakınlaştırma (Zoom)</span>
                  <span>%{zoom}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="160"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-[#e6c280] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono text-neutral-400 mb-1">
                  <span>Parlaklık</span>
                  <span>%{brightness}</span>
                </div>
                <input
                  type="range"
                  min="70"
                  max="130"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-[#e6c280] cursor-pointer"
                />
              </div>
            </div>

            {/* Yeni Fotoğraf Yükle Butonu */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 rounded-lg border border-white/10 hover:border-white/20 text-xs font-mono text-neutral-300 hover:text-white flex items-center justify-center space-x-2 transition-colors bg-white/5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Farklı Fotoğraf Yükle</span>
              </button>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
