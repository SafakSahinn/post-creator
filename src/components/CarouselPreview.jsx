import React, { useRef, useState } from 'react';
import { Download, ChevronLeft, ChevronRight, Check, Image as ImageIcon, Sparkles } from 'lucide-react';
import { toPng } from 'html-to-image';

export function CarouselPreview({ post, userImage }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const slideRef0 = useRef(null);
  const slideRef1 = useRef(null);
  const slideRef2 = useRef(null);
  const slideRef3 = useRef(null);

  const slideRefs = [slideRef0, slideRef1, slideRef2, slideRef3];

  if (!post) return null;

  const handleDownloadActiveSlide = async () => {
    const currentRef = slideRefs[activeSlide]?.current;
    if (!currentRef) return;

    try {
      setIsExporting(true);
      const dataUrl = await toPng(currentRef, { quality: 0.95, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `LORE_${post.category}_${post.decade}_Slayt_${activeSlide + 1}.png`;
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

  const handleDownloadAllSlides = async () => {
    try {
      setIsExporting(true);
      for (let i = 0; i < slideRefs.length; i++) {
        const ref = slideRefs[i]?.current;
        if (ref) {
          const dataUrl = await toPng(ref, { quality: 0.95, pixelRatio: 2 });
          const link = document.createElement('a');
          link.download = `LORE_${post.category}_${post.decade}_Slayt_${i + 1}.png`;
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

  return (
    <div className="bg-[#121318] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
      
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#e6c280] flex items-center space-x-1.5">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Instagram Carousel Taslakları (4:5 Editoryal Format)</span>
          </div>
          <p className="text-xs text-neutral-400 font-sans mt-0.5">
            Metni doğrudan yüksek çözünürlüklü Instagram slaytı olarak indirin.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownloadActiveSlide}
            className="px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-neutral-300 hover:text-white text-xs font-mono flex items-center space-x-1.5 transition-all"
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
                <span>Tümü İndirildi!</span>
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

      {/* Slide Navigation Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {[0, 1, 2, 3].map((idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveSlide(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                activeSlide === idx
                  ? 'bg-[#e6c280] text-black font-bold'
                  : 'bg-white/5 text-neutral-400 hover:text-white border border-white/5'
              }`}
            >
              {idx === 0 ? '01 / Kapak' : idx === 1 ? '02 / Lore I' : idx === 2 ? '03 / Lore II' : '04 / Sonuç'}
            </button>
          ))}
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
          <span className="text-xs font-mono text-neutral-400 px-2">
            {activeSlide + 1} / 4
          </span>
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

      {/* CAROUSEL SLIDES CANVAS CONTAINER */}
      <div className="flex justify-center py-4 bg-black/40 rounded-xl border border-white/5 p-4 overflow-hidden">
        
        {/* SLIDE 0: COVER */}
        <div
          ref={slideRef0}
          style={{ width: '400px', height: '500px', display: activeSlide === 0 ? 'flex' : 'none' }}
          className="bg-[#0b0c10] text-white p-8 flex-col justify-between border border-white/10 shadow-2xl relative select-none font-sans overflow-hidden"
        >
          {/* Background Real Archival Image if uploaded */}
          {userImage?.dataUrl && (
            <div className="absolute inset-0 z-0 overflow-hidden">
              <img
                src={userImage.dataUrl}
                alt=""
                style={{
                  transform: `scale(${userImage.zoom ? userImage.zoom / 100 : 1.05})`,
                  filter: userImage.filter === 'bwNoir' ? 'grayscale(100%) contrast(140%)' : 'contrast(115%)'
                }}
                className="w-full h-full object-cover"
              />
              <div
                style={{
                  background: `linear-gradient(to top, rgba(11,12,16, ${userImage.vignette ? userImage.vignette / 100 : 0.8}) 0%, rgba(11,12,16, 0.45) 50%, rgba(11,12,16, 0.7) 100%)`
                }}
                className="absolute inset-0 pointer-events-none"
              />
            </div>
          )}

          {/* Top header */}
          <div className="flex items-center justify-between border-b border-white/15 pb-4 relative z-10">
            <span className="font-serif tracking-[0.3em] text-sm font-bold uppercase text-[#e6c280]">
              L O R E
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
              {post.category} · {post.decade}
            </span>
          </div>

          {/* Middle: Title & Hook */}
          <div className="space-y-4 my-auto relative z-10">
            <div className="text-[10px] font-mono tracking-[0.2em] text-[#e6c280] uppercase">
              Kültür & Statü Şifreleri
            </div>
            <h2 className="font-serif text-2xl font-black leading-tight tracking-tight text-white drop-shadow-md">
              {post.title}
            </h2>
            <div className="w-12 h-[2px] bg-[#e6c280]" />
            <p className="font-serif italic text-sm text-neutral-200 leading-relaxed pt-1 drop-shadow-sm">
              "{post.hook}"
            </p>
          </div>

          {/* Bottom */}
          <div className="flex items-center justify-between pt-4 border-t border-white/15 text-[10px] font-mono text-neutral-400 relative z-10">
            <span>EDİTORYAL ARŞİV</span>
            <span>KAYDIR &rarr;</span>
          </div>
        </div>

        {/* SLIDE 1: LORE PART 1 */}
        <div
          ref={slideRef1}
          style={{ width: '400px', height: '500px', display: activeSlide === 1 ? 'flex' : 'none' }}
          className="bg-[#0b0c10] text-white p-8 flex-col justify-between border border-white/10 shadow-2xl relative select-none font-sans"
        >
          <div className="flex items-center justify-between border-b border-white/15 pb-4">
            <span className="font-serif tracking-[0.3em] text-xs font-bold uppercase text-[#e6c280]">
              L O R E
            </span>
            <span className="font-mono text-[10px] text-neutral-400">02 / 04</span>
          </div>

          <div className="space-y-4 my-auto">
            <span className="text-[10px] font-mono tracking-widest uppercase text-[#e6c280]">
              [01 / İkonikleşme]
            </span>
            <p className="text-xs text-neutral-200 leading-relaxed font-sans">
              {post.lore[0] || ''}
            </p>

            {post.lore[1] && (
              <>
                <div className="w-8 h-[1px] bg-white/20 my-2" />
                <span className="text-[10px] font-mono tracking-widest uppercase text-[#e6c280]">
                  [02 / Statü Psikolojisi]
                </span>
                <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                  {post.lore[1]}
                </p>
              </>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/15 text-[10px] font-mono text-neutral-400">
            <span>{post.title}</span>
            <span>KAYDIR &rarr;</span>
          </div>
        </div>

        {/* SLIDE 2: LORE PART 2 */}
        <div
          ref={slideRef2}
          style={{ width: '400px', height: '500px', display: activeSlide === 2 ? 'flex' : 'none' }}
          className="bg-[#0b0c10] text-white p-8 flex-col justify-between border border-white/10 shadow-2xl relative select-none font-sans"
        >
          <div className="flex items-center justify-between border-b border-white/15 pb-4">
            <span className="font-serif tracking-[0.3em] text-xs font-bold uppercase text-[#e6c280]">
              L O R E
            </span>
            <span className="font-mono text-[10px] text-neutral-400">03 / 04</span>
          </div>

          <div className="space-y-4 my-auto">
            <span className="text-[10px] font-mono tracking-widest uppercase text-[#e6c280]">
              [03 / Tüketim & Kültürel Miras]
            </span>
            <p className="text-xs text-neutral-200 leading-relaxed font-sans">
              {post.lore[2] || post.lore[1] || ''}
            </p>

            <div className="p-3 bg-white/5 border border-white/10 rounded-lg mt-4">
              <span className="text-[9px] font-mono tracking-wider text-[#e6c280] uppercase block mb-1">
                Küratör Teşhisi
              </span>
              <p className="text-[11px] font-serif italic text-neutral-300">
                Popüler kültürün eforsuz gözüken her detayı, aslında kusursuzca tasarlanmış bir aidiyet arzusudur.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/15 text-[10px] font-mono text-neutral-400">
            <span>DÖNEM: {post.decade}</span>
            <span>KAYDIR &rarr;</span>
          </div>
        </div>

        {/* SLIDE 3: CURATOR NOTE & CLOSING */}
        <div
          ref={slideRef3}
          style={{ width: '400px', height: '500px', display: activeSlide === 3 ? 'flex' : 'none' }}
          className="bg-[#0b0c10] text-white p-8 flex-col justify-between border border-white/10 shadow-2xl relative select-none font-sans"
        >
          <div className="flex items-center justify-between border-b border-white/15 pb-4">
            <span className="font-serif tracking-[0.3em] text-xs font-bold uppercase text-[#e6c280]">
              L O R E
            </span>
            <span className="font-mono text-[10px] text-neutral-400">04 / 04</span>
          </div>

          <div className="space-y-4 my-auto">
            <span className="text-[10px] font-mono tracking-widest uppercase text-[#e6c280]">
              Görsel Arşiv Notu
            </span>
            <div className="p-3 bg-black/60 border border-[#e6c280]/30 rounded-lg">
              <p className="font-mono text-[11px] text-[#e6c280]">
                "{post.visualNote}"
              </p>
            </div>

            <div className="space-y-1 pt-2">
              <p className="text-xs text-neutral-300 font-sans">
                Bu detayı daha önce duymuş muydunuz?
              </p>
              <p className="text-[11px] text-neutral-400 font-sans">
                Gizli statü şifreleri ve popüler kültürün lore'u için profili takip edin ve gönderiyi kaydedin.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-2">
              {post.hashtags?.slice(0, 3).map((tag, i) => (
                <span key={i} className="text-[9px] font-mono text-neutral-400 bg-white/5 px-2 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/15 text-[10px] font-mono text-[#e6c280]">
            <span>KAYDET · PAYLAŞ</span>
            <span>@LOREMAGAZINE</span>
          </div>
        </div>

      </div>

    </div>
  );
}
