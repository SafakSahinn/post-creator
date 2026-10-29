import React from 'react';
import { X, Sparkles, Key, CheckCircle, ExternalLink, HelpCircle } from 'lucide-react';

export function GuideModal({ isOpen, onClose, onOpenSettings }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#121319] border border-white/10 rounded-xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-[#e6c280]/10 border border-[#e6c280]/30 text-[#e6c280]">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold text-white tracking-wide">
              LORE Kullanım Rehberi
            </h3>
            <p className="text-xs text-neutral-400 font-mono">
              Elit Dijital Kültür İçerik Motoru
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4 text-xs font-sans text-neutral-300">
          
          <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/5 space-y-1.5">
            <div className="flex items-center space-x-2 text-[#e6c280] font-semibold font-mono">
              <span className="w-5 h-5 rounded-full bg-[#e6c280]/20 flex items-center justify-center text-[10px]">1</span>
              <span>Ücretsiz API Anahtarını Tanımlayın</span>
            </div>
            <p className="text-neutral-400 pl-7 leading-relaxed">
              Google AI Studio (<a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[#e6c280] underline">aistudio.google.com</a>) üzerinden mevcut Google hesabınızla tek tıkla ücretsiz API anahtarı alın ve sağ üstteki <strong>"API Anahtarı Girin"</strong> butonuna yapıştırın.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/5 space-y-1.5">
            <div className="flex items-center space-x-2 text-[#e6c280] font-semibold font-mono">
              <span className="w-5 h-5 rounded-full bg-[#e6c280]/20 flex items-center justify-center text-[10px]">2</span>
              <span>Kategori & Dönem Seçin</span>
            </div>
            <p className="text-neutral-400 pl-7 leading-relaxed">
              <strong>Dolap</strong> (Moda), <strong>Ekran</strong> (Sinema/Oyun), <strong>Masa</strong> (Gastronomi) veya <strong>Kutu</strong> (Kült Obje) arasından birini ve dönemi belirleyin.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/5 space-y-1.5">
            <div className="flex items-center space-x-2 text-[#e6c280] font-semibold font-mono">
              <span className="w-5 h-5 rounded-full bg-[#e6c280]/20 flex items-center justify-center text-[10px]">3</span>
              <span>Özel Konu veya Küratör Seçimi</span>
            </div>
            <p className="text-neutral-400 pl-7 leading-relaxed">
              Aklınızda bir konu varsa yazın (ör: <em>"Pulp Fiction patates kızartması"</em>). Boş bırakırsanız veya <em>"Rastgele Kült Konu"</em> butonuna basarsanız en vurucu gizli lore otomatik belirlenir.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/5 space-y-1.5">
            <div className="flex items-center space-x-2 text-[#e6c280] font-semibold font-mono">
              <span className="w-5 h-5 rounded-full bg-[#e6c280]/20 flex items-center justify-center text-[10px]">4</span>
              <span>Instagram & Carousel İndirme</span>
            </div>
            <p className="text-neutral-400 pl-7 leading-relaxed">
              Metni tek tıkla Instagram açıklaması olarak kopyalayabilir, küratörün İngilizce görsel notunu Pinterest'te aratabilir ve slaytları doğrudan <strong>PNG olarak indirebilirsiniz</strong>.
            </p>
          </div>

        </div>

        {/* Action */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#e6c280] text-black font-semibold text-xs font-mono uppercase tracking-wider"
          >
            Anladım
          </button>
        </div>

      </div>
    </div>
  );
}
