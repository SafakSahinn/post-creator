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
  Cloud,
  BookOpen,
  Video,
  ShieldCheck,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { InstagramIcon } from './Icons';

export function GuideModal({ isOpen, onClose, onOpenSettings, onOpenProjects, onOpenMeta }) {
  const [activeTab, setActiveTab] = useState('newProject'); // 'newProject' | 'instagram' | 'general'

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
                Çoklu Proje Yönetimi, Meta API & Editoryal İçerik Stüdyosu
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
        <div className="flex border-b border-white/10 bg-black/40 px-6 pt-2 overflow-x-auto space-x-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('newProject')}
            className={`pb-3 px-3.5 font-mono text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'newProject'
                ? 'border-[#e6c280] text-[#e6c280]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Yeni Proje</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('instagram')}
            className={`pb-3 px-3.5 font-mono text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'instagram'
                ? 'border-[#e6c280] text-[#e6c280]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <InstagramIcon className="w-3.5 h-3.5" />
            <span>Instagram & Sınırsız Token</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`pb-3 px-3.5 font-mono text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'general'
                ? 'border-[#e6c280] text-[#e6c280]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Stüdyo & Çıktılar</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'newProject' && (
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
          )}

          {activeTab === 'instagram' && (
            <div className="space-y-4">
              
              {/* Highlight Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-pink-500/15 via-[#e6c280]/10 to-transparent border border-pink-500/30 flex items-start space-x-3.5">
                <InstagramIcon className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <h4 className="font-serif font-bold text-white text-sm">
                    Meta Graph API Otomatik Paylaşım & Planlama
                  </h4>
                  <p className="text-neutral-300 font-sans leading-relaxed">
                    Post Creator, ürettiğiniz 2 ila 10 slaytlık carousel gönderilerini doğrudan resmi Instagram Graph API üzerinden profilinizde yayınlar veya ileri bir tarihe planlar. Üçüncü taraf aracı servislere ihtiyaç duymaz.
                  </p>
                </div>
              </div>

              {/* Step 1: Sınırsız Token */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2.5">
                <div className="flex items-center space-x-2 text-[#e6c280] font-mono text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-white">1. Sınırsız / Asla Bitmeyen Token (Önerilen)</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px]">Kalıcı</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                  Standart Graph API Explorer tokenları 1 saatte biter. Kalıcı token için Meta Business Suite'in <strong>Sistem Kullanıcıları</strong> özelliğini kullanın:
                </p>
                <ol className="text-xs text-neutral-300 space-y-1.5 pl-5 list-decimal font-sans">
                  <li><strong>Meta Business Suite</strong> &rarr; <em>Ayarlar</em> &rarr; <em>Kullanıcılar</em> &rarr; <strong>Sistem Kullanıcıları</strong> sayfasına gidin.</li>
                  <li>Yeni bir sistem kullanıcısı ekleyin ve rolünü <strong>Yönetici (Admin)</strong> yapın.</li>
                  <li><strong>Varlıklar Ata (Assign Assets)</strong> butonuna tıklayın:
                    <div className="p-2.5 mt-1 rounded-lg bg-black/50 border border-amber-500/30 text-amber-200 text-[11px] font-mono space-y-1">
                      <div className="font-bold flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Kritik Gereksinim: İki Varlığı da Atayın!</span>
                      </div>
                      <div>• <strong>Uygulamalar (Apps):</strong> <code>PostCreator</code> &rarr; Tam Kontrol / Yönet</div>
                      <div>• <strong>Instagram Hesapları:</strong> Sayfanız (örn: <code>timsahgibi</code>) &rarr; İçerik Yönetimi</div>
                    </div>
                  </li>
                  <li><strong>Yeni Jeton Oluştur (Generate Token)</strong> butonuna tıklayın:
                    <div className="mt-1 font-mono text-[11px] text-neutral-300">
                      Süre: <strong>Asla (Never)</strong> | İzinler: <code>instagram_basic</code>, <code>instagram_content_publish</code>, <code>pages_show_list</code>
                    </div>
                  </li>
                  <li>Üretilen <code>EAA...</code> ile başlayan jetonu kopyalayıp Meta Paylaşım ekranına yapıştırın.</li>
                </ol>
              </div>

              {/* Step 2: 60 Günlük Token */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center space-x-2 text-[#e6c280] font-mono text-xs font-semibold">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span className="text-white">2. Hızlı 60 Günlük Token (Token Debugger)</span>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px]">60 Gün</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                  Hızlıca test etmek isterseniz, Graph API Explorer'dan aldığınız 1 saatlik jetonu Meta'nın <a href="https://developers.facebook.com/tools/debug/accesstoken" target="_blank" rel="noopener noreferrer" className="text-[#e6c280] underline inline-flex items-center space-x-1"><span>Access Token Debugger</span><ExternalLink className="w-3 h-3" /></a> aracına yapıştırıp en alttaki <strong>"Extend Access Token"</strong> butonuna basarak 60 güne uzatabilirsiniz.
                </p>
              </div>

              {/* Step 3: Doğrudan & İleri Tarihli Planlama */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center space-x-2 text-[#e6c280] font-mono text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-[#e6c280]" />
                  <span className="text-white">3. Şimdi Paylaş & İleri Tarihe Planla</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                  Carousel stüdyosunun sağ üstündeki <strong>"Instagram'da Paylaş / Planla"</strong> butonuna basın:
                </p>
                <ul className="text-xs text-neutral-300 space-y-1 pl-5 list-disc font-sans">
                  <li><strong>Hemen Paylaş:</strong> Slaytlar 1080x1350 JPEG olarak işlenir ve saniyeler içinde yayına girer.</li>
                  <li><strong>İleri Tarihe Planla:</strong> Tarih ve saat seçin (Meta kuralı: en az 15 dakika, en fazla 75 gün sonrası). Meta sunucuları belirlenen saatte gönderinizi otomatik yayınlar.</li>
                </ul>
              </div>

            </div>
          )}

          {activeTab === 'general' && (
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

              {/* General Step 2: Carousel Studio & Lightbox */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center space-x-2.5 text-[#e6c280] font-mono text-xs font-semibold">
                  <Sliders className="w-4 h-4 text-[#e6c280]" />
                  <span>2. Carousel Stüdyosu, Tipografi & Lightbox</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                  Her slayta farklı fotoğraf atayabilir, 5 özel editoryal fonttan birini seçebilir, parlaklık/vignette ve dikey metin ince ayarı yapabilirsiniz. Slaytların üzerine tıklayarak <strong>1080x1350 Lightbox (Büyük Boy Önizleme)</strong> moduna geçebilir, klavye ok tuşlarıyla slaytlar arasında gezinebilirsiniz. Yanlış bir işlemde <kbd className="text-[#e6c280] font-bold">Ctrl + Z</kbd> ile geri alabilirsiniz.
                </p>
              </div>

              {/* General Step 3: MP4 Reel Video */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center space-x-2.5 text-[#e6c280] font-mono text-xs font-semibold">
                  <Video className="w-4 h-4 text-[#e6c280]" />
                  <span>3. 10 Mbps Kristal Netliğinde MP4 Video İhracı</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                  Carousel slaytlarınızı tek tıkla Instagram Reels veya TikTok için <strong>1080x1350 portre MP4 videosuna</strong> dönüştürün. Slaytlar arası yumuşak sinematik geçişler ve 10 Mbps yüksek bitrate ile bulanıklıktan uzak stüdyo kalitesinde çıktı alırsınız.
                </p>
              </div>

              {/* General Step 4: Google Drive & IndexedDB */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center space-x-2.5 text-[#e6c280] font-mono text-xs font-semibold">
                  <Cloud className="w-4 h-4 text-[#e6c280]" />
                  <span>4. Google Drive & Yerel Arşiv (IndexedDB)</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                  Ürettiğiniz tüm gönderiler fotoğraflarıyla birlikte tarayıcınızın güvenli yerel hafızasında saklanır. İsterseniz Google ile oturum açarak tek tıkla tüm arşivinizi kendi Google Drive'ınızdaki <code>Post Creator</code> klasörüne tam çözünürlüklü olarak yedekleyebilirsiniz.
                </p>
              </div>

            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {onOpenProjects && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenProjects();
                }}
                className="px-3.5 py-2 rounded-lg bg-[#e6c280]/15 text-[#e6c280] border border-[#e6c280]/30 hover:bg-[#e6c280]/25 text-xs font-mono font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Proje Merkezi</span>
              </button>
            )}

            {onOpenMeta && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMeta();
                }}
                className="px-3.5 py-2 rounded-lg bg-pink-500/15 text-pink-300 border border-pink-500/30 hover:bg-pink-500/25 text-xs font-mono font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <InstagramIcon className="w-3.5 h-3.5" />
                <span>Meta Bağlantısı</span>
              </button>
            )}
          </div>

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
