import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Key,
  Layers,
  FolderPlus,
  Sliders,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  Cloud,
  Copy,
  BookOpen
} from 'lucide-react';

export function GuideModal({ isOpen, onClose, onOpenSettings, onOpenProjects }) {
  const [activeTab, setActiveTab] = useState('newProject'); // 'newProject' | 'general'

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#121319] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#e6c280]/20 border border-[#e6c280]/30 flex items-center justify-center text-[#e6c280]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-serif text-lg font-bold text-white tracking-wide">
                  Post Creator Rehberi
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#e6c280]/30 text-[#e6c280] bg-[#e6c280]/10 uppercase">
                  v1.0 Pro
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono">
                Çoklu Proje Yönetimi & Editoryal İçerik Stüdyosu
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-black/40 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('newProject')}
            className={`pb-3 px-4 font-mono text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'newProject'
                ? 'border-[#e6c280] text-[#e6c280]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Yeni Proje Nasıl Oluşturulur?</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`pb-3 px-4 font-mono text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'border-[#e6c280] text-[#e6c280]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Genel Kullanım & Çıktılar</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'newProject' ? (
            <div className="space-y-4">
              
              {/* Highlight Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#e6c280]/15 via-[#e6c280]/5 to-transparent border border-[#e6c280]/30 flex items-start space-x-3.5">
                <Layers className="w-5 h-5 text-[#e6c280] shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <h4 className="font-serif font-bold text-white text-sm">
                    Post Creator Çoklu Proje Mimarisi
                  </h4>
                  <p className="text-neutral-300 font-sans leading-relaxed">
                    Post Creator tek bir konseptle sınırlı değildir. <strong>Lore Magazine</strong>, <strong>Tech & AI Radar</strong>, <strong>Sinema & Sanat</strong> veya <strong>kendi belirleyeceğiniz özel bir niş</strong> için bağımsız projeler açabilir; her birinin kategorilerini, filtrelerini ve yapay zeka ses tonunu ayrı ayrı yönetebilirsiniz.
                  </p>
                </div>
              </div>

              {/* Step 1 */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center space-x-2.5 text-[#e6c280] font-mono text-xs font-semibold">
                  <span className="w-5 h-5 rounded-full bg-[#e6c280] text-black flex items-center justify-center text-[10px] font-bold">1</span>
                  <span>Proje Merkezine Ulaşın</span>
                </div>
                <p className="text-xs text-neutral-300 pl-7 leading-relaxed font-sans">
                  Üst menüdeki <strong>"Proje"</strong> butonuna veya sol kontrol panelinin en üstünde yer alan <strong>"Projeyi Değiştir"</strong> butonuna tıklayarak proje listesini açın. Buradan <strong>"+ Yeni Proje Oluştur"</strong> butonuna basın.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center space-x-2.5 text-[#e6c280] font-mono text-xs font-semibold">
                  <span className="w-5 h-5 rounded-full bg-[#e6c280] text-black flex items-center justify-center text-[10px] font-bold">2</span>
                  <span>Marka Adı, Kısa Kod & Slayt Logosu</span>
                </div>
                <p className="text-xs text-neutral-300 pl-7 leading-relaxed font-sans">
                  Projenizin adını, kısa kodunu ve <strong>Slayt Köşe Logosunu (Filigran)</strong> belirleyin. Slaytların sol üst köşesinde beliren logo metni (örn: <code>L O R E</code>, <code>T E C H</code>, <code>C I N E</code> veya kendi kanal adınız) projenize özel olarak otomatik konumlanır.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center space-x-2.5 text-[#e6c280] font-mono text-xs font-semibold">
                  <span className="w-5 h-5 rounded-full bg-[#e6c280] text-black flex items-center justify-center text-[10px] font-bold">3</span>
                  <span>01 / Dört Kategoriyi Belirleyin</span>
                </div>
                <p className="text-xs text-neutral-300 pl-7 leading-relaxed font-sans">
                  Giriş panelindeki 4 kutunun ne olacağını seçin. Örneğin:
                </p>
                <div className="pl-7 grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                  <div className="p-2 rounded bg-black/40 border border-white/10 text-neutral-300">
                    <span className="text-[#e6c280] block font-semibold">Teknoloji için:</span>
                    <span>Kod & Mimari, Yapay Zeka, Çipler, Girişim</span>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-white/10 text-neutral-300">
                    <span className="text-[#e6c280] block font-semibold">Sinema için:</span>
                    <span>Yönetmen, Sahne, Kült Karakter, Estetik</span>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-400 pl-7 pt-1 font-sans">
                  Her kategorinin başlığını, alt açıklamasını ve üzerine gelindiğinde çıkan detaylı bilgi kutusunu (tooltip) yazabilirsiniz.
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center space-x-2.5 text-[#e6c280] font-mono text-xs font-semibold">
                  <span className="w-5 h-5 rounded-full bg-[#e6c280] text-black flex items-center justify-center text-[10px] font-bold">4</span>
                  <span>02 / İkinci Aşama Filtresini Seçin</span>
                </div>
                <p className="text-xs text-neutral-300 pl-7 leading-relaxed font-sans">
                  İçeriğin ikinci boyutunu belirleyin. Başlığı <em>"02 / DÖNEM RUHUNU BELİRLE"</em> (80'ler, 90'lar...) yapabilir veya <em>"02 / ANALİZ DERİNLİĞİ"</em> (Temel Giriş, Derin Mimari, Vaka Analizi, Gelecek Tezi...) olarak yapılandırabilirsiniz.
                </p>
              </div>

              {/* Step 5 */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center space-x-2.5 text-[#e6c280] font-mono text-xs font-semibold">
                  <span className="w-5 h-5 rounded-full bg-[#e6c280] text-black flex items-center justify-center text-[10px] font-bold">5</span>
                  <span>Yapay Zeka Persona & Ses Tonunu Tanımlayın</span>
                </div>
                <p className="text-xs text-neutral-300 pl-7 leading-relaxed font-sans">
                  Yapay zekanın nasıl bir editoryal kimliğe bürüneceğini yazın (ör: <em>"Silikon Vadisi kıdemli mühendis bakış açısı, sansasyondan uzak analitik dil"</em> veya <em>"Monocle ve Kinfolk zarafetinde sakin Türkçe"</em>). Üret butonu metnini de dilediğiniz gibi belirleyin.
                </p>
              </div>

              {/* Step 6 */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center space-x-2.5 text-[#e6c280] font-mono text-xs font-semibold">
                  <span className="w-5 h-5 rounded-full bg-[#e6c280] text-black flex items-center justify-center text-[10px] font-bold">6</span>
                  <span>Kaydet & Başlat</span>
                </div>
                <p className="text-xs text-neutral-300 pl-7 leading-relaxed font-sans">
                  <strong>"Projeyi Kaydet & Başlat"</strong> butonuna bastığınız anda sol panel ve stüdyo otomatik olarak yeni projenizin renklerine, butonlarına ve kategorilerine bürünür. Üretilen tüm çıktılar arşivde o projenin etiketiyle saklanır.
                </p>
              </div>

            </div>
          ) : (
            <div className="space-y-4">
              
              {/* General Step 1 */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center space-x-2.5 text-[#e6c280] font-mono text-xs font-semibold">
                  <Key className="w-4 h-4 text-[#e6c280]" />
                  <span>1. Ücretsiz Gemini API Anahtarı</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                  Google AI Studio (<a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[#e6c280] underline inline-flex items-center space-x-1"><span>aistudio.google.com</span><ExternalLink className="w-3 h-3" /></a>) üzerinden Google hesabınızla saniyeler içinde ücretsiz API anahtarı alıp sağ üstteki ayarlar kısmına kaydedin. Günde 1.500 istek ücretsizdir.
                </p>
              </div>

              {/* General Step 2 */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center space-x-2.5 text-[#e6c280] font-mono text-xs font-semibold">
                  <Sliders className="w-4 h-4 text-[#e6c280]" />
                  <span>2. Carousel Stüdyosu & Fotoğraf Yerleşimi</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                  İçerik üretildikten sonra <strong>"Carousel Stüdyosu"</strong> sekmesine geçin. Kendi fotoğraflarınızı yükleyebilir veya küratörün İngilizce arama terimini kopyalayarak Pinterest/Unsplash'ten uygun görsel bulabilirsiniz. Her slayta farklı fotoğraf atayabilir, parlaklık/vignette ayarları yapabilir ve <kbd className="text-[#e6c280] font-bold">Ctrl + Z</kbd> ile geri alabilirsiniz.
                </p>
              </div>

              {/* General Step 3 */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center space-x-2.5 text-[#e6c280] font-mono text-xs font-semibold">
                  <Cloud className="w-4 h-4 text-[#e6c280]" />
                  <span>3. Google Drive'a Tam Yedekleme</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                  Arşiv çekmecesinden Google ile oturum açarak tek tıkla tüm gönderilerinizi ve yüklediğiniz tam çözünürlüklü fotoğrafları kendi Google Drive'ınızdaki <code>Post Creator</code> klasörüne yedekleyebilirsiniz. Yedeklenen gönderilerin yanında yeşil onay tiki (✓) belirir.
                </p>
              </div>

              {/* General Step 4 */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center space-x-2.5 text-[#e6c280] font-mono text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-[#e6c280]" />
                  <span>4. Tek Tıkla Instagram'a Aktarma</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                  <strong>"Tüm Slaytları İndir (Zip/PNG)"</strong> butonuyla Instagram 4:5 portre formatındaki hazır görselleri cihazınıza kaydedebilir, <strong>"Metni Kopyala"</strong> butonuyla kanca, açıklama paragrafları ve etiketleri panoya alabilirsiniz.
                </p>
              </div>

            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
          {onOpenProjects ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenProjects();
              }}
              className="px-4 py-2 rounded-lg bg-[#e6c280]/15 text-[#e6c280] border border-[#e6c280]/30 hover:bg-[#e6c280]/25 text-xs font-mono font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Hemen Proje Merkezine Git</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#e6c280] hover:bg-[#d4b06e] text-black font-semibold text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer"
          >
            Anladım
          </button>
        </div>

      </div>
    </div>
  );
}
