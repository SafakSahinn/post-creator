import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
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
  Info,
  Move,
  Check,
  ChevronUp,
  ChevronDown,
  Minus,
  Plus
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toJpeg, getFontEmbedCSS } from 'html-to-image';
import { InstagramIcon } from './Icons';
import { generateDeepMagazineEssay, generateShortMagazineTitles } from '../services/gemini';
import { saveArchiveToDb } from '../services/archiveDb';
import { MagazineIssueList, MagazineIssueEditor } from './MagazineIssues';
import { getIssuesForProject, getNextIssueNumber, saveIssue, deleteIssue } from '../services/magazineIssues';

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

// Dergi kadraj ayarı: { v: 2, x, y, zoom }
// x / y: görselin kadraj merkezinden kayması, kadraj genişliği / yüksekliğinin oranı olarak (0.1 = %10).
// Oran tabanlı olduğu için ekranda ve PDF'te (farklı piksel boyutlarında) birebir aynı kadrajı verir.
// zoom: 100 = kadrajı boşluksuz dolduran (cover) boyut.
const DEFAULT_PHOTO_SETTING = { v: 2, x: 0, y: 0, zoom: 100 };
const ZOOM_MIN = 10;
const ZOOM_MAX = 500;
// Dergi sayfası boyutu (ekran ve PDF ortak): 580 x 820 px = A4 oranı (210 x 297 mm)
const PAGE_W = 580;
const PAGE_H = 820;
const DEFAULT_PROJECT_ID = 'lore-magazine';
// PDF çözünürlüğü: A4 genişliği 210 mm = 8.27 inç; piksel oranı = DPI * 8.27 / PAGE_W
// (300 DPI -> 2480 px genişlik). Seçim tarayıcıda hatırlanır.
const A4_WIDTH_INCH = 210 / 25.4;
const A4_HEIGHT_INCH = 297 / 25.4;
const PDF_DPI_OPTIONS = [
  { dpi: 96, label: 'Ekran', hint: 'Paylaşım, ön izleme' },
  { dpi: 150, label: 'Taslak', hint: 'Hızlı deneme baskısı' },
  { dpi: 200, label: 'Orta', hint: 'Ev yazıcısı' },
  { dpi: 300, label: 'Baskı', hint: 'Matbaa standardı', recommended: true },
  { dpi: 400, label: 'Yüksek', hint: 'İnce fotoğraf detayı' },
  { dpi: 600, label: 'Maksimum', hint: 'En keskin metin' }
];
const DEFAULT_PDF_DPI = 300;
const PDF_DPI_STORAGE_KEY = 'magazine.pdfDpi';
const pdfPixelRatioFor = (dpi) => (dpi * A4_WIDTH_INCH) / PAGE_W;
function readStoredPdfDpi() {
  try {
    const v = Number(localStorage.getItem(PDF_DPI_STORAGE_KEY));
    return PDF_DPI_OPTIONS.some((o) => o.dpi === v) ? v : DEFAULT_PDF_DPI;
  } catch {
    return DEFAULT_PDF_DPI;
  }
}

// PDF düğmesine bitişik, modern açılır DPI seçici
function PdfDpiPicker({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const optionRefs = useRef([]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    // Yakalama aşamasında: Esc dergiyi değil yalnızca menüyü kapatsın
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown, true);
    // Açılınca seçili seçeneğe odaklan
    const idx = PDF_DPI_OPTIONS.findIndex((o) => o.dpi === value);
    requestAnimationFrame(() => optionRefs.current[Math.max(0, idx)]?.focus());
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open, value]);

  const moveFocus = (from, delta) => {
    const n = PDF_DPI_OPTIONS.length;
    optionRefs.current[(from + delta + n) % n]?.focus();
  };

  return (
    <div ref={rootRef} className="relative flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="PDF çözünürlüğü (DPI)"
        className={`flex items-center gap-0.5 pl-1.5 sm:pl-2 pr-1 rounded-r-lg border border-l-0 border-red-500/50 text-white text-[11px] font-mono font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          open ? 'bg-red-800' : 'bg-red-700 hover:bg-red-800'
        }`}
      >
        <span className="whitespace-nowrap">{value}<span className="hidden lg:inline xl:hidden 2xl:inline"> DPI</span></span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="PDF çözünürlüğü"
          className="absolute right-0 top-full mt-2 z-50 w-[304px] max-w-[calc(100vw-24px)] rounded-xl bg-[#16171d]/95 backdrop-blur-xl border border-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.65)] p-1.5 animate-fadeIn"
        >
          <div className="px-2.5 pt-1.5 pb-2 flex items-baseline justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-neutral-400">PDF Çözünürlüğü</span>
            <span className="text-[10px] font-mono text-neutral-500">A4 piksel</span>
          </div>
          {PDF_DPI_OPTIONS.map((o, idx) => {
            const selected = o.dpi === value;
            const w = Math.round(o.dpi * A4_WIDTH_INCH);
            const h = Math.round(o.dpi * A4_HEIGHT_INCH);
            return (
              <button
                key={o.dpi}
                ref={(el) => { optionRefs.current[idx] = el; }}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => { onChange(o.dpi); setOpen(false); }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(idx, 1); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); moveFocus(idx, -1); }
                }}
                className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 ${
                  selected ? 'bg-red-600/15' : 'hover:bg-white/[0.06] focus:bg-white/[0.06]'
                }`}
              >
                <span className={`w-12 shrink-0 font-mono text-sm font-bold tabular-nums ${selected ? 'text-red-400' : 'text-white'}`}>
                  {o.dpi}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className={`text-xs font-semibold ${selected ? 'text-red-300' : 'text-neutral-100'}`}>{o.label}</span>
                    {o.recommended && (
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-px rounded bg-emerald-500/15 text-emerald-400">Önerilen</span>
                    )}
                  </span>
                  <span className="block text-[10px] text-neutral-500 truncate">{o.hint}</span>
                </span>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-neutral-500">{w}×{h}</span>
                <Check className={`w-3.5 h-3.5 shrink-0 text-red-400 ${selected ? 'opacity-100' : 'opacity-0'}`} />
              </button>
            );
          })}
          <p className="mx-2.5 mt-1.5 mb-1 pt-2 border-t border-white/10 text-[10px] leading-snug text-neutral-500">
            300 DPI üzeri dosyayı büyütür ve süreyi uzatır; farkı en çok küçük metinde görülür.
          </p>
        </div>
      )}
    </div>
  );
}

// PDF yakalamasında gömülecek web font CSS'i.
// html-to-image varsayılan olarak her sayfada Google Fonts'un TÜM ailelerini ve alt kümelerini
// (Kiril, Yunan, Vietnam...) yeniden toplayıp ~30 MB CSS olarak gömüyor. Burada bir kez toplanıp
// yalnızca dergide kullanılan aileler ve metinde geçen karakterleri kapsayan alt kümeler bırakılıyor.
let rawFontCssPromise = null;
async function buildPdfFontEmbedCSS(rootEl) {
  if (!rawFontCssPromise) {
    rawFontCssPromise = getFontEmbedCSS(rootEl).catch((err) => {
      rawFontCssPromise = null;
      throw err;
    });
  }
  const rawCss = await rawFontCssPromise;

  const usedFamilies = new Set();
  rootEl.querySelectorAll('*').forEach((el) => {
    getComputedStyle(el).fontFamily.split(',').forEach((f) => {
      usedFamilies.add(f.trim().replace(/["']/g, '').toLowerCase());
    });
  });
  const usedCodePoints = new Set();
  for (const ch of rootEl.textContent || '') usedCodePoints.add(ch.codePointAt(0));

  const coversUsedText = (unicodeRange) => {
    if (!unicodeRange) return true;
    const ranges = unicodeRange.split(',').map((part) => {
      const [a, b] = part.trim().replace(/^U\+/i, '').split('-');
      const start = parseInt(a.replace(/\?/g, '0'), 16);
      const end = parseInt((b || a).replace(/\?/g, 'F'), 16);
      return [start, end];
    });
    for (const cp of usedCodePoints) {
      if (ranges.some(([s, e]) => cp >= s && cp <= e)) return true;
    }
    return false;
  };

  const seen = new Set();
  const kept = [];
  for (const block of rawCss.match(/@font-face\s*{[^}]*}/g) || []) {
    if (seen.has(block)) continue; // aynı stil sayfası defalarca eklenmiş olabiliyor
    seen.add(block);
    const family = ((block.match(/font-family:\s*["']?([^"';]+)/) || [])[1] || '').trim().toLowerCase();
    const range = (block.match(/unicode-range:\s*([^;]+)/) || [])[1];
    if (usedFamilies.has(family) && coversUsedText(range)) kept.push(block);
  }
  return kept.join('\n');
}

function normalizePhotoSetting(s) {
  if (!s) return DEFAULT_PHOTO_SETTING;
  if (s.v === 2) return { v: 2, x: s.x || 0, y: s.y || 0, zoom: s.zoom || 100 };
  // Eski kayıtlar piksel cinsinden (~416x460 kadraj) tutuluyordu
  return { v: 2, x: (s.offsetX || 0) / 416, y: (s.offsetY || 0) / 460, zoom: s.zoom || 100 };
}

const clampNum = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Görseli kadrajı boşluksuz dolduracak şekilde (cover) ortalar.
 * Görsel kırpılmaz: kadraj dışında kalan kısımlar DOM'da durur, yalnızca maskelenir.
 * Düzenleme modunda dışarıda kalan kısımlar yarı saydam olarak gösterilir ve sürüklenebilir.
 */
function MagazinePhotoFrame({ url, alt, setting, editing, isPdf, onChange, onCommit, onZoomStep }) {
  const frameRef = useRef(null);
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 });
  const [imgRatio, setImgRatio] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragState = useRef(null);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => setFrameSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Önbellekteki görseller için onLoad kaçabilir; ölçüyü url değişince yeniden al
  useEffect(() => {
    setImgRatio(0);
    if (!url) return;
    const probe = new Image();
    probe.onload = () => {
      if (probe.naturalWidth && probe.naturalHeight) setImgRatio(probe.naturalWidth / probe.naturalHeight);
    };
    probe.src = url;
  }, [url]);

  // Fare tekerleği ile yakınlaştırma (yalnızca düzenleme modunda)
  useEffect(() => {
    const el = frameRef.current;
    if (!el || !editing || !onZoomStep) return;
    const onWheel = (e) => {
      e.preventDefault();
      onZoomStep(e.deltaY < 0 ? 5 : -5);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [editing, onZoomStep]);

  const z = (setting.zoom || 100) / 100;
  const ready = imgRatio > 0 && frameSize.w > 0 && frameSize.h > 0;
  const frameRatio = ready ? frameSize.w / frameSize.h : 1;
  // Kadraj boyutuna oranla görsel boyutu (cover × zoom)
  const imgW = ready ? (imgRatio > frameRatio ? imgRatio / frameRatio : 1) * z : 1;
  const imgH = ready ? (imgRatio > frameRatio ? 1 : frameRatio / imgRatio) * z : 1;
  // Görsel kadrajdan büyükse kenar boşluk açılmayacak kadar, küçükse kadraj içinde kalacak kadar kaydırılabilir
  const limX = Math.abs(imgW - 1) / 2;
  const limY = Math.abs(imgH - 1) / 2;
  const x = clampNum(setting.x || 0, -limX, limX);
  const y = clampNum(setting.y || 0, -limY, limY);

  const imgStyle = ready
    ? {
        position: 'absolute',
        width: `${imgW * 100}%`,
        height: `${imgH * 100}%`,
        left: `${50 + x * 100}%`,
        top: `${50 + y * 100}%`,
        transform: 'translate(-50%, -50%)',
        maxWidth: 'none',
        maxHeight: 'none'
      }
    : { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' };

  const handlePointerDown = (e) => {
    if (!editing || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragState.current = { sx: e.clientX, sy: e.clientY, x0: x, y0: y, last: { ...setting, x, y } };
    setDragging(true);
  };

  const handlePointerMove = (e) => {
    const d = dragState.current;
    if (!d || !frameSize.w || !frameSize.h) return;
    const nx = clampNum(d.x0 + (e.clientX - d.sx) / frameSize.w, -limX, limX);
    const ny = clampNum(d.y0 + (e.clientY - d.sy) / frameSize.h, -limY, limY);
    d.last = { v: 2, x: nx, y: ny, zoom: setting.zoom || 100 };
    onChange?.(d.last);
  };

  const handlePointerUp = () => {
    const d = dragState.current;
    if (!d) return;
    dragState.current = null;
    setDragging(false);
    onCommit?.(d.last);
  };

  return (
    <div className={`relative w-full aspect-[4/5] max-h-[460px] shrink-0 ${editing ? 'z-30' : ''}`}>
      {/* Düzenleme modunda kadraj dışında kalan (gizli) kısımların yarı saydam önizlemesi */}
      {editing && ready && (
        <img
          src={url}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={imgStyle}
          className="pointer-events-none select-none opacity-35 z-0"
        />
      )}

      <div
        ref={frameRef}
        onPointerDown={editing ? handlePointerDown : undefined}
        onPointerMove={editing ? handlePointerMove : undefined}
        onPointerUp={editing ? handlePointerUp : undefined}
        onPointerCancel={editing ? handlePointerUp : undefined}
        style={editing ? { touchAction: 'none' } : undefined}
        className={`absolute inset-0 z-10 overflow-hidden bg-neutral-950 border border-black/10 select-none ${
          editing
            ? dragging
              ? 'cursor-grabbing ring-2 ring-red-600 shadow-2xl'
              : 'cursor-grab ring-2 ring-red-500/80 hover:ring-red-600 shadow-xl'
            : ''
        }`}
        title={editing ? 'Fotoğrafı basılı tutup sürükleyin, tekerlekle yakınlaştırın' : undefined}
      >
        {/* Görsel kadrajdan küçültülürse (zoom < 100) arkada kalan alanı dolduran atmosferik katman */}
        {(setting.zoom || 100) < 100 && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img
              src={url}
              alt=""
              className="w-full h-full object-cover blur-2xl opacity-35 scale-125 filter contrast-125 brightness-75 pointer-events-none select-none"
            />
            <div className="absolute inset-0 bg-black/20" />
          </div>
        )}

        <img
          src={url}
          alt={alt}
          draggable={false}
          style={imgStyle}
          className="filter contrast-[1.05] pointer-events-none select-none"
        />

        {editing && !isPdf && (
          <div className="absolute top-2.5 right-2.5 z-20 bg-red-600/90 backdrop-blur-md text-white font-mono text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center space-x-1 shadow border border-white/20 pointer-events-none">
            <Move className="w-3 h-3" />
            <span>Kadrajı Sürükleyin</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Satıra sığan başlık (İçindekiler + arka kapak "Bu Sayıda")
// Ölçüm yalnızca PDF baskı katmanında yapılır: o katman ekran dışında hep PAGE_W (580 px)
// genişliğinde düzenlenir, yani ölçüm PDF ile birebir aynıdır ve mobilde daralan ekran
// gereksiz kısaltmaya yol açmaz. Seçilen metin ekrandaki sayfaya da aynen yansır.
// ---------------------------------------------------------------------------
let fitMeasureCanvas = null;
function measureTextPx(el, text) {
  if (!fitMeasureCanvas) fitMeasureCanvas = document.createElement('canvas');
  const ctx = fitMeasureCanvas.getContext('2d');
  const cs = getComputedStyle(el);
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
  const lang = el.closest('[lang]')?.getAttribute('lang') || undefined;
  const shown = cs.textTransform === 'uppercase' ? text.toLocaleUpperCase(lang) : text;
  return ctx.measureText(shown).width;
}

// Gönderinin aday başlıkları: tam başlık, kalıcı kısa başlık ve alan genişliğine göre üretilmiş kısa başlıklar
function getTitleCandidates(post) {
  const list = [post?.title, post?.shortTitle, ...Object.values(post?.fitTitles || {})];
  return Array.from(new Set(list.map((t) => String(t || '').trim()).filter(Boolean)));
}

/**
 * PDF katmanında başlığı ölçer:
 *  1) Önce tercih edilen metni basar; taşmıyorsa onu seçer.
 *  2) Taşıyorsa (overflow alanı tam genişliği verir) adaylar içinden sığan en uzununu seçer.
 *  3) Hiçbiri sığmıyorsa alanın karakter bütçesiyle AI kısa başlık ister; o gelene kadar
 *     en kısa aday "…" ile kesilerek gösterilir (anahtar yoksa / istek başarısızsa da öyle kalır).
 * Satır genişliği ya da font değişince ölçüm tekrarlanır. Bu katman görünmediğinden
 * ölçüm sırasındaki geçici metin kullanıcıya hiç görünmez.
 */
function FitTitleProbe({ fitKey, post, preferred, className, reservePx = 0, fontsVersion, onChoose, onNeedShorter }) {
  const ref = useRef(null);
  const candidates = getTitleCandidates(post);
  const candidatesSig = candidates.join('\u0001');
  const [rowWidth, setRowWidth] = useState(0);
  const [state, setState] = useState({ phase: 'measure', text: preferred });

  // Satır (sabit genişlikli kap) yeniden boyutlanınca baştan ölç
  useLayoutEffect(() => {
    const row = ref.current?.closest('[data-fit-row]');
    if (!row || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setRowWidth(Math.round(entry.contentRect.width)));
    ro.observe(row);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    setState({ phase: 'measure', text: preferred });
  }, [preferred, candidatesSig, rowWidth, fontsVersion]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (state.phase !== 'measure' || !el) return;
    if (!el.clientWidth) return; // henüz düzenlenmedi
    // Ölçüm sırasında span'e reservePx kadar sağ dolgu verilir (ekranda bu alanın yanında olup
    // PDF'te olmayan "→" oku gibi ögelerin payı). Metin alanı = clientWidth - dolgu; span ister
    // satır sınırına dayanmış ister içeriğine büzülmüş olsun bu eşitlik doğrudur.
    const textArea = el.clientWidth - reservePx;
    let chosen = preferred;
    if (measureTextPx(el, preferred) > textArea + 1) {
      const limit = textArea - 2;
      const widths = candidates.map((t) => ({ t, w: measureTextPx(el, t) }));
      const fitting = widths.filter((c) => c.w <= limit).sort((a, b) => b.w - a.w);
      if (fitting.length) {
        chosen = fitting[0].t;
      } else {
        // Ortalama karakter genişliğinden bu alana sığacak karakter sayısı
        const fullW = measureTextPx(el, preferred);
        const charW = fullW / Math.max(1, preferred.length);
        // 4'ün katına yuvarla: font yüklenmesi vb. küçük genişlik oynamaları aynı bütçeye düşsün,
        // aynı gönderi için 47/46 gibi neredeyse aynı iki istek gitmesin
        const maxChars = Math.max(8, Math.floor((limit / charW - 1) / 4) * 4);
        onNeedShorter(post, maxChars);
        chosen = widths.sort((a, b) => a.w - b.w)[0]?.t || preferred;
      }
    }
    setState({ phase: 'show', text: chosen });
    onChoose(fitKey, chosen);
  }, [state.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span
      ref={ref}
      className={className}
      style={state.phase === 'measure' && reservePx ? { paddingRight: reservePx } : undefined}
    >
      {state.text}
    </span>
  );
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
  // Dergi sayıları: activeIssueId = okunan sayı (null = sayı listesi), editorIssue = düzenlenen taslak
  const [issueRefreshKey, setIssueRefreshKey] = useState(0);
  const [activeIssueId, setActiveIssueId] = useState(null);
  const [editorIssue, setEditorIssue] = useState(null);
  const [isExpandingAi, setIsExpandingAi] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });
  const [pdfDpi, setPdfDpi] = useState(readStoredPdfDpi);
  const handleChangePdfDpi = (dpi) => {
    setPdfDpi(dpi);
    try { localStorage.setItem(PDF_DPI_STORAGE_KEY, String(dpi)); } catch { /* özel pencere vb. */ }
  };
  const scrollViewportRef = useRef(null);

  // Dergi üzerinde görselleri sürükleyerek düzenleme durumları (Stüdyodan bağımsız)
  const [editingPhotoKey, setEditingPhotoKey] = useState(null);
  const [photoAdjustments, setPhotoAdjustments] = useState({});
  const [isEditingZoomInput, setIsEditingZoomInput] = useState(false);
  const [customZoomInput, setCustomZoomInput] = useState('100');
  const zoomBeforeInputRef = useRef(100);
  const zoomInputClosedRef = useRef(true);

  // Sayfa değiştiğinde düzenleme modundan çık
  useEffect(() => {
    setEditingPhotoKey(null);
    setIsEditingZoomInput(false);
  }, [currentPage]);

  // Görselin mevcut dergi kadraj ayarını al
  const photoKeyOf = (targetPost, pIdx) => `${targetPost?.id || targetPost?.title}_${pIdx}`;
  const getPhotoSetting = (targetPost, pIdx) => {
    const key = photoKeyOf(targetPost, pIdx);
    if (photoAdjustments[key]) return photoAdjustments[key];
    return normalizePhotoSetting(targetPost?.magazinePhotoSettings?.[pIdx]);
  };

  // Kadraj ayarını veritabanına ve post nesnesine kaydet (Stüdyoyu etkilemez, dergiye özeldir)
  const saveMagazineSettings = async (targetPost, pIdx, newSetting) => {
    if (!targetPost) return;
    const currentSettings = targetPost.magazinePhotoSettings || {};
    const updatedPost = {
      ...targetPost,
      magazinePhotoSettings: {
        ...currentSettings,
        [pIdx]: newSetting
      },
      updatedAt: new Date().toISOString()
    };
    try {
      await saveArchiveToDb(updatedPost);
      if (onUpdateArchiveItem) {
        onUpdateArchiveItem(updatedPost);
      }
    } catch (err) {
      console.error('Dergi kadraj ayarı kaydedilemedi:', err);
    }
  };

  const setLiveSetting = (post, photoIndex, next) => {
    const key = photoKeyOf(post, photoIndex);
    setPhotoAdjustments((prev) => ({ ...prev, [key]: next }));
  };

  const handleUpdateZoom = async (post, photoIndex, newZoom) => {
    const current = getPhotoSetting(post, photoIndex);
    const updated = { ...current, zoom: clampNum(Math.round(newZoom), ZOOM_MIN, ZOOM_MAX) };
    setLiveSetting(post, photoIndex, updated);
    await saveMagazineSettings(post, photoIndex, updated);
  };

  const parseZoomInput = (raw, fallback) => {
    const val = parseInt(String(raw).replace(/[^0-9]/g, ''), 10);
    return isNaN(val) || val <= 0 ? fallback : clampNum(val, ZOOM_MIN, ZOOM_MAX);
  };

  // Elle giriş kutusundaki ok düğmeleri / klavye okları: değeri adım adım değiştirir ve canlı önizler
  const stepZoomInput = (post, photoIndex, delta) => {
    const current = getPhotoSetting(post, photoIndex);
    const base = parseZoomInput(customZoomInput, current.zoom || 100);
    const next = clampNum(base + delta, ZOOM_MIN, ZOOM_MAX);
    setCustomZoomInput(String(next));
    setLiveSetting(post, photoIndex, { ...current, zoom: next });
  };

  const handleCommitZoomInput = async (post, photoIndex) => {
    // Enter/Esc sonrası kutu kapanırken gelen blur ikinci kez işlem yapmasın
    if (zoomInputClosedRef.current) return;
    zoomInputClosedRef.current = true;
    const val = parseZoomInput(customZoomInput, zoomBeforeInputRef.current);
    setIsEditingZoomInput(false);
    await handleUpdateZoom(post, photoIndex, val);
  };

  const handleCancelZoomInput = (post, photoIndex) => {
    if (zoomInputClosedRef.current) return;
    zoomInputClosedRef.current = true;
    const current = getPhotoSetting(post, photoIndex);
    setLiveSetting(post, photoIndex, { ...current, zoom: zoomBeforeInputRef.current });
    setIsEditingZoomInput(false);
  };

  const handleResetSetting = async (post, photoIndex) => {
    setLiveSetting(post, photoIndex, DEFAULT_PHOTO_SETTING);
    await saveMagazineSettings(post, photoIndex, DEFAULT_PHOTO_SETTING);
  };

  // Filtrelenmiş gönderiler
  // Dergi projeye özeldir: yalnızca aktif projenin gönderileri.
  // projectId'siz eski kayıtlar varsayılan projeye (Lore Magazine) aittir.
  const activeProjectId = activeProject?.id || DEFAULT_PROJECT_ID;
  const projectArchives = useMemo(
    () => archives.filter((p) => (p?.projectId || DEFAULT_PROJECT_ID) === activeProjectId),
    [archives, activeProjectId]
  );

  // Projenin kayıtlı sayıları (dergi her açıldığında ve sayı kaydedilince/silinince tazelenir)
  const issues = useMemo(
    () => getIssuesForProject(activeProjectId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeProjectId, issueRefreshKey, isOpen]
  );
  const activeIssue = issues.find((i) => i.id === activeIssueId) || null;
  const isReading = Boolean(activeIssue) && !editorIssue;

  // Dergi yalnızca kayıtlı bir sayının gönderilerinden, sayıdaki sırayla oluşur.
  // Arşivden silinmiş gönderiler atlanır.
  const displayPosts = useMemo(() => {
    if (!activeIssue) return [];
    const byId = new Map(archives.map((p) => [p.id, p]));
    return activeIssue.postIds.map((id) => byId.get(id)).filter(Boolean);
  }, [activeIssue, archives]);

  // Proje değişince sayı listesine dön ve düzenleme durumlarını temizle
  useEffect(() => {
    setActiveIssueId(null);
    setEditorIssue(null);
    setCurrentPage(0);
    setEditingPhotoKey(null);
    setPhotoAdjustments({});
  }, [activeProjectId]);

  // Okunan sayı değişince başa dön
  useEffect(() => {
    setCurrentPage(0);
  }, [activeIssueId]);

  const handleCreateIssue = () => {
    setEditorIssue({ id: null, projectId: activeProjectId, number: getNextIssueNumber(activeProjectId), title: '', postIds: [] });
  };
  const handleEditIssue = (id) => {
    const issue = issues.find((i) => i.id === id);
    if (issue) setEditorIssue(issue);
  };
  const handleSaveIssue = (draft) => {
    const saved = saveIssue(draft);
    setEditorIssue(null);
    setIssueRefreshKey((k) => k + 1);
    setActiveIssueId(saved.id);
    setCurrentPage(0);
  };
  const handleDeleteIssue = (issue) => {
    const label = issue.title ? `"${issue.title}" (Sayı #${issue.number})` : `Sayı #${issue.number}`;
    if (!window.confirm(`${label} silinsin mi? Gönderiler arşivde kalır, yalnızca bu sayı silinir.`)) return;
    deleteIssue(issue.id);
    if (activeIssueId === issue.id) setActiveIssueId(null);
    setIssueRefreshKey((k) => k + 1);
  };

  // Arka kapaktaki "Bu Sayıda" listesi için kısa başlıklar: eksik olanları AI tek istekte üretir
  // ve arşive kaydeder (bir kez). Anahtar yoksa ya da istek başarısızsa uzun başlık kısaltılmadan kalır.
  const shortTitleAttemptedRef = useRef(new Set());
  const latestArchivesRef = useRef(archives);
  latestArchivesRef.current = archives;
  useEffect(() => {
    if (!isOpen) return;
    const missing = displayPosts.filter(
      (p) => p?.id && p.title && !p.shortTitle && !shortTitleAttemptedRef.current.has(p.id)
    );
    if (missing.length === 0) return;
    const batch = missing.slice(0, 40); // kalanlar arşiv güncellenince sonraki turda istenir
    batch.forEach((p) => shortTitleAttemptedRef.current.add(p.id));
    (async () => {
      try {
        const map = await generateShortMagazineTitles({ items: batch });
        for (const { id } of batch) {
          const short = map[String(id)];
          // İstek sürerken gönderi değişmiş olabilir: en güncel kaydın üzerine ekle
          const post = latestArchivesRef.current.find((p) => p.id === id);
          if (!short || !post || post.shortTitle) continue;
          const updated = { ...post, shortTitle: short, updatedAt: new Date().toISOString() };
          if (onUpdateArchiveItem) await onUpdateArchiveItem(updated);
          else await saveArchiveToDb(updated);
        }
      } catch (err) {
        console.warn('Kısa başlıklar üretilemedi, uzun başlık kullanılacak:', err?.message || err);
      }
    })();
  }, [isOpen, displayPosts, onUpdateArchiveItem]);

  // Satıra sığan başlıklar: PDF katmanındaki FitTitleProbe'ların seçtiği metin ("alan:gönderiId" -> metin).
  // Ekrandaki sayfa aynı metni gösterir.
  const [fitChoices, setFitChoices] = useState({});
  const handleFitChoose = useCallback((key, text) => {
    setFitChoices((prev) => (prev[key] === text ? prev : { ...prev, [key]: text }));
  }, []);

  // Web fontları yüklenince genişlikler değişir → yeniden ölç
  const [fontsVersion, setFontsVersion] = useState(0);
  useEffect(() => {
    if (!isOpen || !document.fonts) return;
    let alive = true;
    const bump = () => alive && setFontsVersion((v) => v + 1);
    document.fonts.ready.then(bump);
    document.fonts.addEventListener?.('loadingdone', bump);
    return () => {
      alive = false;
      document.fonts.removeEventListener?.('loadingdone', bump);
    };
  }, [isOpen]);

  // Hiçbir aday sığmayınca alanın karakter bütçesiyle kısa başlık iste. İstekler kısa bir süre
  // biriktirilip tek istekte gönderilir; her (gönderi, bütçe) çifti yalnızca bir kez denenir
  // (sonuç yine sığmasa da) → sonsuz istek döngüsü olmaz. Sonuç gönderinin fitTitles alanına
  // { [bütçe]: metin } olarak kaydedilir ve ölçüm otomatik tekrarlanır.
  const fitQueueRef = useRef(new Map());
  const fitAttemptedRef = useRef(new Set());
  const fitTimerRef = useRef(null);
  const flushFitQueue = useCallback(async () => {
    const items = Array.from(fitQueueRef.current.values());
    fitQueueRef.current.clear();
    for (let i = 0; i < items.length; i += 40) {
      const chunk = items.slice(i, i + 40);
      try {
        const map = await generateShortMagazineTitles({
          items: chunk.map((it) => ({ ...it, id: `${it.postId}|${it.maxChars}` }))
        });
        const byPost = new Map();
        for (const it of chunk) {
          const short = map[`${it.postId}|${it.maxChars}`];
          if (!short) continue;
          if (!byPost.has(it.postId)) byPost.set(it.postId, {});
          byPost.get(it.postId)[it.maxChars] = short;
        }
        for (const [postId, additions] of byPost) {
          const post = latestArchivesRef.current.find((p) => p.id === postId);
          if (!post) continue;
          const updated = {
            ...post,
            fitTitles: { ...(post.fitTitles || {}), ...additions },
            updatedAt: new Date().toISOString()
          };
          if (onUpdateArchiveItem) await onUpdateArchiveItem(updated);
          else await saveArchiveToDb(updated);
        }
      } catch (err) {
        console.warn('Sığan kısa başlık üretilemedi, başlık kesilerek gösterilecek:', err?.message || err);
      }
    }
  }, [onUpdateArchiveItem]);
  const handleNeedShorter = useCallback((post, maxChars) => {
    if (!post?.id || !post.title) return;
    const key = `${post.id}|${maxChars}`;
    if (fitAttemptedRef.current.has(key)) return;
    fitAttemptedRef.current.add(key);
    fitQueueRef.current.set(key, { postId: post.id, title: post.title, conceptTitle: post.conceptTitle, maxChars });
    clearTimeout(fitTimerRef.current);
    fitTimerRef.current = setTimeout(flushFitQueue, 300);
  }, [flushFitQueue]);
  useEffect(() => () => clearTimeout(fitTimerRef.current), []);

  // Başlık alanı: PDF katmanında ölçen bileşen, ekranda ölçümün seçtiği metin
  const renderFitTitle = (slot, post, preferred, className, isPdf, reservePx = 0) => {
    const key = `${slot}:${post.id}`;
    if (isPdf) {
      return (
        <FitTitleProbe
          fitKey={key}
          post={post}
          preferred={preferred}
          className={className}
          fontsVersion={fontsVersion}
          reservePx={reservePx}
          onChoose={handleFitChoose}
          onNeedShorter={handleNeedShorter}
        />
      );
    }
    return <span className={className}>{fitChoices[key] ?? preferred}</span>;
  };

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

    // Son: Arka Kapak (içindekilerde listelenmez, sayfa numarası basılmaz)
    pages.push({ type: 'backcover' });

    return pages;
  }, [displayPosts]);

  const totalPages = Math.max(3, magazinePages.length);
  const activePageData = magazinePages[currentPage] || magazinePages[0];
  const currentPost = activePageData?.post || null;
  const coverCollageImages = useMemo(() => extractCoverCollageImages(displayPosts, 5), [displayPosts]);
  // Arka kapak görseli: önce ön kapakta kullanılmayan 5. kolaj karesi, yoksa son gönderinin son fotoğrafı
  const backCoverImage = useMemo(() => {
    if (coverCollageImages[4]?.url) return coverCollageImages[4].url;
    for (let i = displayPosts.length - 1; i >= 0; i--) {
      const photos = extractCleanPhotos(displayPosts[i]);
      if (photos.length > 0) return photos[photos.length - 1].url;
    }
    return coverCollageImages[0]?.url || null;
  }, [coverCollageImages, displayPosts]);

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
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
      if (e.key === 'Escape') {
        // Düzenleyici açıksa önce onu kapat (değişiklikler kaydedilmez)
        if (editorIssue) setEditorIssue(null);
        else onClose();
        return;
      }
      if (!isReading) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentPage((prev) => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, totalPages, onClose, isReading, editorIssue]);

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
  // Sayının tarihi: oluşturulduğu ay (eski sayılar her açılışta bugünün tarihini almasın)
  const currentDate = activeIssue?.createdAt ? new Date(activeIssue.createdAt) : new Date();
  const issueNo = String(activeIssue?.number || 1).padStart(2, '0');
  const currentMonthYear = currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }).toLocaleUpperCase('tr-TR');
  const fullDateFormatted = currentDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).toLocaleUpperCase('tr-TR');
  const currentYear = currentDate.getFullYear();

  // Proje adı ve logo
  const brandName = (activeProject?.name || currentPost?.projectName || 'LORE MAGAZINE').toLocaleUpperCase('tr-TR');
  const brandCode = (activeProject?.shortCode || currentPost?.projectShortCode || 'LORE').toLocaleUpperCase('tr-TR');
  const brandTagline = (activeProject?.tagline || 'Kültür, Sinema, Moda ve Analog Estetik Dergisi').toLocaleUpperCase('tr-TR');
  const issueDate = `${currentMonthYear} // SAYI #${issueNo}`;

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
        <div className={`relative flex-1 border-4 border-black/90 m-1.5 sm:m-3 overflow-hidden flex flex-col justify-between shadow-2xl bg-black select-none`}>
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
                </div>
                <div
                  onClick={!isPdf ? () => setCurrentPage(getArticlePageIdx(coverCollageImages[1].postIndex)) : undefined}
                  className={`col-span-5 row-span-1 relative overflow-hidden group ${!isPdf ? 'cursor-pointer' : ''} border border-black/80`}
                >
                  <img src={coverCollageImages[1].url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div
                  onClick={!isPdf ? () => setCurrentPage(getArticlePageIdx(coverCollageImages[2].postIndex)) : undefined}
                  className={`col-span-5 row-span-1 relative overflow-hidden group ${!isPdf ? 'cursor-pointer' : ''} border border-black/80`}
                >
                  <img src={coverCollageImages[2].url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
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
                  </div>
                ))}
              </div>
            ) : coverCollageImages.length === 1 ? (
              <div
                onClick={!isPdf ? () => setCurrentPage(getArticlePageIdx(coverCollageImages[0].postIndex)) : undefined}
                className={`relative w-full h-full group ${!isPdf ? 'cursor-pointer' : ''}`}
              >
                <img src={coverCollageImages[0].url} alt="" className="w-full h-full object-cover object-center filter contrast-[1.08]" />
              </div>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-neutral-900 via-black to-neutral-950 flex flex-col items-center justify-center p-6 text-neutral-400">
                <BookOpen className="w-16 h-16 text-[#e6c280] mb-3 opacity-60" />
                <span className="font-serif text-2xl font-bold text-white tracking-widest uppercase text-center">{brandName}</span>
                <span className="text-xs font-mono text-neutral-400 mt-1">Editoryal Arşiv</span>
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
                  CİLT I · SAYI {issueNo}
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
                  {brandTagline}
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
        <div className={`relative flex-1 p-5 sm:p-7 lg:p-8 flex flex-col justify-between m-1.5 sm:m-3 border-4 border-black/80`}>
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
                null
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
        <div className={`relative flex-1 p-5 sm:p-7 lg:p-8 flex flex-col justify-between m-1.5 sm:m-3 border-4 border-black/80`}>
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
                    data-fit-row
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
                      {renderFitTitle(
                        'toc',
                        post,
                        post.title || '',
                        'font-serif font-bold text-xs truncate group-hover:text-red-600 transition-colors',
                        isPdf,
                        14 // ekrandaki "S. 01 →" oku PDF'te yok
                      )}
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
                        S. {String(pageNo).padStart(2, '0')}{!isPdf && <> &rarr;</>}
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
        <div className={`relative flex-1 p-5 sm:p-7 lg:p-8 flex flex-col justify-between m-1.5 sm:m-3 border-4 border-black/80`}>
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
              ) : null}
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

            {/* 90's Special Dossier Box (PDF'te yalnızca AI derinlik içeriği varsa) */}
            {(!isPdf || post.magazineDeepDossier) && (
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
            )}
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
                      {magazinePages[pageIdx + 1]?.type === 'backcover' ? 'Arka Kapak' : 'Sonraki Dosya'} &rarr;
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
      const photoKey = photoKeyOf(post, photoIndex);
      const isEditingThisPhoto = !isPdf && editingPhotoKey === photoKey;
      const setting = getPhotoSetting(post, photoIndex);
      const zoom = setting.zoom || 100;

      return (
        <div className={`relative flex-1 p-4 sm:p-6 flex flex-col justify-between m-1.5 sm:m-3 border-4 border-black/80 box-border`}>
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
          <div className="my-auto flex-1 flex flex-col justify-center items-center space-y-2">
            <div className="relative border-4 border-black/90 p-2 sm:p-2.5 bg-white shadow-xl flex flex-col shrink-0 max-w-[420px] sm:max-w-[440px] mx-auto w-full">
              {/* 4:5 Hero Plate: boşluksuz (cover) ortalanmış, kırpılmadan sürüklenebilir görsel */}
              <MagazinePhotoFrame
                url={photo?.url}
                alt={photo?.title || 'Dergi Fotoğrafı'}
                setting={setting}
                editing={isEditingThisPhoto}
                isPdf={isPdf}
                onChange={(next) => setLiveSetting(post, photoIndex, next)}
                onCommit={(next) => saveMagazineSettings(post, photoIndex, next)}
                onZoomStep={(delta) => {
                  if (isEditingZoomInput) stepZoomInput(post, photoIndex, delta);
                  else handleUpdateZoom(post, photoIndex, zoom + delta);
                }}
              />

              {/* Açıklama Kutusu */}
              <div className="mt-2 pt-2 border-t border-black/20 flex flex-col justify-between font-mono text-neutral-800 shrink-0">
                <p className="font-serif italic text-xs leading-snug text-neutral-700 line-clamp-2 mb-1">
                  “{photo?.quote || post?.hook || post?.conceptTitle || post?.title || "90'lar editoryal arşiv fotoğrafı."}”
                </p>
                <p className="text-[10px] text-neutral-500 leading-tight truncate">
                  <strong>Küratör Notu:</strong> {photo?.idea || post?.conceptTitle || '35mm editoryal arşiv negatif baskısı.'}
                </p>
              </div>
            </div>

            {/* Düzenle / Kadraj Kontrol Paneli (PDFte görünmez ama yer tutar, böylece yerleşim ekranla aynı kalır) */}
            {(
              isEditingThisPhoto ? (
                <div className="relative z-40 mt-1 p-2 rounded-lg bg-black/90 border border-red-500/50 backdrop-blur-md flex flex-wrap items-center justify-between gap-2 text-white font-mono text-xs w-full max-w-[420px] sm:max-w-[440px] mx-auto shadow-2xl animate-fadeIn">
                  {/* Bilgi & Pozisyon */}
                  <div className="flex items-center space-x-1.5 text-[11px] text-neutral-300">
                    <Move className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                    <span className="font-bold text-red-400">Sürükleyin:</span>
                    <span className="text-[10px] text-neutral-400 bg-white/10 px-1.5 py-0.5 rounded font-mono">
                      X:{Math.round((setting.x || 0) * 100)} Y:{Math.round((setting.y || 0) * 100)}
                    </span>
                  </div>

                  {/* Yakınlaştırma (- / + ve Tıklanabilir Oran Girişi) */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateZoom(post, photoIndex, zoom - 10)}
                      disabled={zoom <= ZOOM_MIN}
                      className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-30 flex items-center justify-center cursor-pointer text-white transition-all"
                      title="Uzaklaştır (-%10)"
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    {isEditingZoomInput ? (
                      <div className="flex items-stretch h-6 bg-black border border-red-500 rounded-md overflow-hidden shadow-[0_0_0_3px_rgba(239,68,68,0.15)]">
                        <span className="pl-1.5 flex items-center text-[10px] text-red-400 font-bold select-none">%</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoFocus
                          value={customZoomInput}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setCustomZoomInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCommitZoomInput(post, photoIndex);
                            } else if (e.key === 'Escape') {
                              e.stopPropagation();
                              handleCancelZoomInput(post, photoIndex);
                            } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                              e.preventDefault();
                              const step = e.shiftKey ? 10 : 1;
                              stepZoomInput(post, photoIndex, e.key === 'ArrowUp' ? step : -step);
                            }
                          }}
                          onBlur={() => handleCommitZoomInput(post, photoIndex)}
                          className="w-9 bg-transparent text-white font-mono text-xs text-center focus:outline-none"
                          placeholder="100"
                          aria-label="Yakınlaştırma oranı"
                        />
                        <div className="flex flex-col w-5 border-l border-white/15">
                          <button
                            type="button"
                            tabIndex={-1}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => stepZoomInput(post, photoIndex, 5)}
                            className="flex-1 flex items-center justify-center text-neutral-300 hover:text-white hover:bg-red-600 active:bg-red-700 transition-colors cursor-pointer"
                            title="+%5 (klavye: ↑, Shift ile ±10)"
                          >
                            <ChevronUp className="w-3 h-3" strokeWidth={3} />
                          </button>
                          <button
                            type="button"
                            tabIndex={-1}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => stepZoomInput(post, photoIndex, -5)}
                            className="flex-1 flex items-center justify-center text-neutral-300 hover:text-white hover:bg-red-600 active:bg-red-700 border-t border-white/15 transition-colors cursor-pointer"
                            title="-%5 (klavye: ↓, Shift ile ±10)"
                          >
                            <ChevronDown className="w-3 h-3" strokeWidth={3} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          zoomBeforeInputRef.current = zoom;
                          zoomInputClosedRef.current = false;
                          setCustomZoomInput(String(zoom));
                          setIsEditingZoomInput(true);
                        }}
                        className="h-6 px-2 rounded-md bg-white/15 hover:bg-white/25 border border-white/20 hover:border-red-400 text-[11px] text-white min-w-[50px] text-center font-mono font-bold cursor-pointer transition-all shadow-sm"
                        title="Tıklayın ve istediğiniz yakınlaştırma oranını (%10 - %500) elle yazın"
                      >
                        %{zoom}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleUpdateZoom(post, photoIndex, zoom + 10)}
                      disabled={zoom >= ZOOM_MAX}
                      className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-30 flex items-center justify-center cursor-pointer text-white transition-all"
                      title="Yakınlaştır (+%10)"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Sıfırla & Tamam */}
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleResetSetting(post, photoIndex)}
                      className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-neutral-300 transition-colors cursor-pointer"
                      title="Kadrajı ve ölçeği sıfırla"
                    >
                      Sıfırla
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPhotoKey(null)}
                      className="px-2.5 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase transition-colors flex items-center space-x-1 cursor-pointer shadow-sm"
                      title="Düzenlemeyi tamamla"
                    >
                      <Check className="w-3 h-3" />
                      <span>Tamam</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`flex justify-end max-w-[420px] sm:max-w-[440px] mx-auto w-full shrink-0 pt-0.5 ${isPdf ? "invisible" : ""}`} aria-hidden={isPdf || undefined}>
                  <button
                    type="button"
                    onClick={() => setEditingPhotoKey(photoKey)}
                    className="px-2.5 py-1 rounded bg-black/10 hover:bg-black/20 text-neutral-700 dark:text-neutral-300 text-[10px] font-mono font-bold uppercase transition-all flex items-center space-x-1.5 cursor-pointer border border-black/15 dark:border-white/15"
                    title="Bu görseli dergi üzerinde sürükleyerek kadrajını ayarla"
                  >
                    <Move className="w-3 h-3 text-red-600" />
                    <span>Düzenle</span>
                  </button>
                </div>
              )
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
                      {magazinePages[pageIdx + 1]?.type === 'backcover' ? 'Arka Kapak' : 'Sonraki Dosya'} &rarr;
                    </button>
                  ) : null}
                  <span>SAYFA {String(pageIdx + 1).padStart(2, '0')}</span>
                </div>
              </>
            ) : (
              <>
                <span>KADRAJ #{photoIndex + 1}/{totalPhotos}</span>
                <span>SAYFA {String(pageIdx + 1).padStart(2, '0')}</span>
              </>
            )}
          </div>
        </div>
      );
    }

    // ----------------------------------------------------
    // SON SAYFA: ARKA KAPAK (ön kapakla aynı karanlık kabuk)
    // ----------------------------------------------------
    if (pageData.type === 'backcover') {
      return (
        <div className="relative flex-1 border-4 border-black/90 m-1.5 sm:m-3 overflow-hidden flex flex-col shadow-2xl bg-black select-none">
          {/* Arka plan fotoğrafı */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            {backCoverImage ? (
              <img
                src={backCoverImage}
                alt=""
                className="w-full h-full object-cover object-center filter grayscale contrast-[1.1]"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-neutral-900 via-black to-neutral-950" />
            )}
          </div>

          {/* Karartma */}
          <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-b from-black/85 via-black/50 to-black/95 shadow-[inset_0_0_140px_rgba(0,0,0,0.85)]" />

          {/* Tipografi */}
          <div className="absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-6 lg:px-8 lg:pt-6 lg:pb-2.5">
            {/* Üst şerit */}
            <div className="border-b border-white/20 pb-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-neutral-300">
              <span>CİLT I · SAYI {issueNo}</span>
              <span className="font-bold text-[#e6c280] tracking-wider">{currentMonthYear}</span>
            </div>

            {/* Bu sayıda (gönderisi olmayan projede gizli) */}
            {displayPosts.length > 0 && (
            <div className="mt-6 sm:mt-10">
              <span className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase text-red-400 block mb-2">
                BU SAYIDA
              </span>
              <div className="space-y-1.5 max-w-[85%]">
                {displayPosts.slice(0, 8).map((post, idx) => (
                  <div key={post.id || idx} data-fit-row className="flex items-baseline space-x-2.5 border-b border-white/10 pb-1.5">
                    <span className="font-mono text-[10px] font-bold text-red-400 shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    {renderFitTitle(
                      'back',
                      post,
                      post.shortTitle || post.title || '',
                      'font-serif text-sm font-bold uppercase leading-snug text-white truncate',
                      isPdf
                    )}
                  </div>
                ))}
                {displayPosts.length > 8 && (
                  <div className="font-mono text-[10px] text-neutral-400 pt-0.5">
                    ve {displayPosts.length - 8} dosya daha
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Kapanış */}
            <div className="mt-auto mb-4 text-center">
              <p className="font-serif italic text-lg sm:text-xl text-neutral-200 leading-snug drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                “Bir sonraki sayıda görüşmek üzere.”
              </p>
              <div className="flex items-center justify-center space-x-3 mt-4">
                <span className="h-[2px] w-10 sm:w-14 bg-red-500/80" />
                <h2 className="font-serif text-2xl sm:text-3xl font-black tracking-[0.2em] uppercase text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)]">
                  {brandName}
                </h2>
                <span className="h-[2px] w-10 sm:w-14 bg-red-500/80" />
              </div>
              <p className="font-mono text-[9px] sm:text-[10px] tracking-[0.25em] uppercase font-bold text-red-400 mt-2">
                {brandTagline}
              </p>
            </div>

            {/* Alt künye */}
            <div className="border-t border-white/15 pt-2 pb-0.5 flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-neutral-400">
              <span>{displayPosts.length} DOSYA &bull; {totalPages} SAYFA</span>
              <span className="text-neutral-300 font-semibold tracking-wider">
                {currentMonthYear} BASKISI &bull; CİLT 01
              </span>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // Sitede görünen sayfaları birebir PDF'e aktaran motor.
  // Her sayfa ekrandaki ile aynı kabukta (580px genişlik, A4 oranında en az 820px yükseklik) render edilir
  // ve gerçek yüksekliğiyle yakalanır. Normal sayfalar tam A4 olur; metni taşan sayfa kırpılmaz, uzun sayfa olur.
  const handleDownloadPdf = async () => {
    const printDoc = document.getElementById('magazine-print-document');
    const pages = printDoc ? printDoc.querySelectorAll('.magazine-page-print-item') : [];
    if (!pages || pages.length === 0) {
      window.print();
      return;
    }

    setIsGeneratingPdf(true);
    setPdfProgress({ current: 0, total: pages.length });
    const t0 = performance.now();

    try {
      // Fontların ve tüm görsellerin yüklenmesini bekle (aksi halde boş kadraj yakalanabilir)
      if (document.fonts?.ready) await document.fonts.ready;
      await Promise.all(
        Array.from(printDoc.querySelectorAll('img')).map((img) =>
          img.complete ? Promise.resolve() : new Promise((r) => { img.onload = r; img.onerror = r; })
        )
      );
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      // Fontlar bir kez, süzülmüş halde hazırlanır ve her sayfaya aynı CSS verilir
      let fontEmbedCSS;
      try {
        fontEmbedCSS = await buildPdfFontEmbedCSS(printDoc);
      } catch (fontErr) {
        console.warn('Font CSS hazırlanamadı, varsayılan gömmeye düşülüyor:', fontErr);
      }

      const bgColor = isPaper ? '#f6f3eb' : '#121318';
      const MM_W = 210;
      let pdf = null;

      for (let i = 0; i < pages.length; i++) {
        setPdfProgress({ current: i + 1, total: pages.length });
        // Arayüze nefes aldır: ilerleme çubuğu güncellensin, sekme donmasın
        await new Promise((r) => setTimeout(r, 0));
        const pageEl = pages[i];
        const w = pageEl.offsetWidth || PAGE_W;
        const h = Math.max(pageEl.offsetHeight || PAGE_H, PAGE_H);

        const imgData = await toJpeg(pageEl, {
          quality: 0.95,
          pixelRatio: pdfPixelRatioFor(pdfDpi),
          backgroundColor: bgColor,
          width: w,
          height: h,
          ...(fontEmbedCSS ? { fontEmbedCSS } : {})
        });

        const mmH = Math.round(((MM_W * h) / w) * 100) / 100;
        const format = h <= PAGE_H + 2 ? 'a4' : [MM_W, mmH];
        if (!pdf) {
          pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format, compress: true });
        } else {
          pdf.addPage(format, 'portrait');
        }
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, 'JPEG', 0, 0, pageW, pageH, undefined, 'FAST');
      }

      const safeBrand = (brandName || 'DERGI').replace(/[^a-zA-Z0-9_\u00C0-\u017F-]/g, '_');
      console.info(`[PDF] ${pages.length} sayfa, ${Math.round(performance.now() - t0)} ms`);
      pdf.save(`${safeBrand}_Dergisi_Sayi_${issueNo}.pdf`);
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
        <div className="h-14 px-3 sm:px-6 bg-[#101115] border-b border-white/10 flex items-center justify-between gap-2 shrink-0 select-none z-20">
          
          {/* Brand & Issue Info */}
          <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">
            <div className="hidden sm:flex w-9 h-9 shrink-0 rounded-lg bg-[#e6c280]/20 border border-[#e6c280]/40 items-center justify-center text-[#e6c280]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="hidden xl:block whitespace-nowrap">
              <div className="flex items-center space-x-2">
                <span className="font-serif tracking-[0.2em] text-sm sm:text-base font-black text-white">
                  {brandName}
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30 uppercase font-bold tracking-widest">
                  90's Magazine
                </span>
              </div>
              <p className="text-[10px] font-mono text-neutral-400">
                {isReading
                  ? `${issueDate}${activeIssue.title ? ` · ${activeIssue.title.toLocaleUpperCase('tr-TR')}` : ''} · EDİTORYAL BASKI & FOTOĞRAF ARŞİVİ`
                  : `${issues.length} SAYI · EDİTORYAL BASKI & FOTOĞRAF ARŞİVİ`}
              </p>
            </div>
          </div>

          {/* Center Page Navigator (yalnızca bir sayı okunurken) */}
          {!isReading ? (
            <div className="font-mono text-[11px] text-neutral-400 truncate">
              {editorIssue ? 'SAYI DÜZENLEYİCİ' : 'DERGİ SAYILARI'}
            </div>
          ) : (
          <div className="flex items-center space-x-1.5 sm:space-x-2 font-mono text-xs shrink-0">
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              className="p-1.5 rounded-lg border border-white/10 text-neutral-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Önceki Sayfa (Sol Ok)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-3 py-1 rounded bg-black/50 border border-white/10 text-neutral-300 text-[11px] min-w-[110px] sm:min-w-[170px] text-center whitespace-nowrap">
              {currentPage === 0 ? (
                <span className="text-[#e6c280] font-bold">ÖN KAPAK<span className="hidden sm:inline"> (SAYFA 01)</span></span>
              ) : currentPage === 1 ? (
                <span className="text-[#e6c280] font-bold">EDİTÖRÜN NOTU<span className="hidden sm:inline"> (SAYFA 02)</span></span>
              ) : currentPage === 2 ? (
                <span className="text-[#e6c280] font-bold">İÇİNDEKİLER<span className="hidden sm:inline"> (SAYFA 03)</span></span>
              ) : activePageData?.type === 'backcover' ? (
                <span className="text-[#e6c280] font-bold">ARKA KAPAK<span className="hidden sm:inline"> (SAYFA {String(currentPage + 1).padStart(2, '0')})</span></span>
              ) : (
                <span>
                  SAYFA <strong className="text-white">{String(currentPage + 1).padStart(2, '0')}</strong> / {String(totalPages).padStart(2, '0')}
                  <span className="hidden sm:inline text-neutral-400 text-[10px] ml-1.5 font-sans">
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
          )}

        {/* Right Actions: Sayılar, Düzenle, Theme, Print, Close */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">

          {isReading && (
            <>
              {/* Sayı listesine dön */}
              <button
                type="button"
                onClick={() => setActiveIssueId(null)}
                className="flex shrink-0 items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 text-xs font-mono text-neutral-300 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
                title="Dergi sayıları listesine dön"
              >
                <Layers className="w-3.5 h-3.5 text-[#e6c280]" />
                <span className="hidden lg:inline whitespace-nowrap">Sayılar</span>
              </button>
              {/* Bu sayının gönderilerini düzenle */}
              <button
                type="button"
                onClick={() => handleEditIssue(activeIssue.id)}
                className="hidden sm:flex shrink-0 items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 text-xs font-mono text-neutral-300 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
                title="Bu sayıya gönderi ekle, çıkar veya sırala"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden xl:inline whitespace-nowrap">Sayıyı Düzenle</span>
              </button>
            </>
          )}

          {isReading && (<>
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

          {/* Direct High-Quality A4 PDF Download + DPI seçici */}
          <div className="flex items-stretch shrink-0 rounded-lg shadow-sm">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center space-x-1.5 px-1.5 sm:px-3 py-1.5 rounded-l-lg bg-red-600 hover:bg-red-700 text-white border border-red-500/50 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
            title={`Dergiyi ${pdfDpi} DPI standart A4 PDF olarak doğrudan indir`}
          >
            {isGeneratingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span className="hidden md:inline whitespace-nowrap">{isGeneratingPdf ? 'İndiriliyor...' : 'PDF İndir'}</span>
          </button>
          <PdfDpiPicker value={pdfDpi} onChange={handleChangePdfDpi} disabled={isGeneratingPdf} />
          </div>

          {/* Browser Print / Physical Paper */}
          <button
            type="button"
            onClick={() => window.print()}
            className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-xs font-mono text-neutral-300 transition-all cursor-pointer"
            title="Tarayıcı Yazdırma Penceresini Aç"
          >
            <Printer className="w-3.5 h-3.5 text-[#e6c280]" />
            <span className="hidden xl:inline">Yazdır</span>
          </button>
          </>)}

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

        {editorIssue ? (
          <MagazineIssueEditor
            key={editorIssue.id || 'new'}
            initialIssue={editorIssue}
            projectPosts={projectArchives}
            issues={issues}
            onSave={handleSaveIssue}
            onCancel={() => setEditorIssue(null)}
          />
        ) : !activeIssue ? (
          <MagazineIssueList
            issues={issues}
            archives={archives}
            projectName={brandName}
            onOpen={setActiveIssueId}
            onEdit={handleEditIssue}
            onDelete={handleDeleteIssue}
            onCreate={handleCreateIssue}
          />
        ) : (
        /* The 90's Physical Magazine Spread Container (Her Sayfa Kapak Gibi Standart Tek A4 Boyutunda) */
        <div className={`relative w-full shadow-2xl rounded-sm transition-all duration-300 overflow-clip min-h-[760px] sm:min-h-[820px] flex flex-col max-w-[540px] sm:max-w-[580px] my-1 sm:my-3 mx-auto ${
          isPaper
            ? 'bg-[#f6f3eb] text-[#1c1c1f] shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-[#d8d4c7]'
            : 'bg-[#121318] text-[#e8e4dc] shadow-[0_20px_60px_rgba(0,0,0,0.85)] border border-white/10'
        }`}>

          {renderSinglePage(currentPage, false)}

        </div>
        )}

      </div>

      {/* 90's Bottom Navigation Bar */}
      {isReading && (
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
      )}

    </div>

    {/* ======================================================== */}
    {/* 90'S PUBLICATION PRINT ENGINE: MULTI-PAGE A4 DOCUMENT     */}
    {/* Sitedeki görünümle 1:1 birebir aynı boyutta ve stilde     */}
    {/* ======================================================== */}
    <div id="magazine-print-document" className="magazine-print-only">
      {isReading && magazinePages.map((_, pIdx) => (
        <div
          key={pIdx}
          className={`magazine-page-print-item relative overflow-hidden flex flex-col ${
            isPaper
              ? 'bg-[#f6f3eb] text-[#1c1c1f] border border-[#d8d4c7]'
              : 'bg-[#121318] text-[#e8e4dc] border border-white/10'
          }`}
          style={{
            width: `${PAGE_W}px`,
            minHeight: `${PAGE_H}px`,
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
              Tüm sayfalar tam A4 boyutunda ({pdfDpi} DPI) işleniyor...
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
