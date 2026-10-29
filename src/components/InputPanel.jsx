import React, { useState } from 'react';
import { Sparkles, Shirt, Film, Utensils, Box, Dice5, Flame, RefreshCw } from 'lucide-react';
import { CURATED_INSPIRATIONS } from '../services/curatedTopics';

const CATEGORIES = [
  {
    id: 'Dolap',
    name: 'Dolap',
    shortSubtitle: 'Moda & Stil',
    icon: Shirt,
    badge: 'Vogue & Arşiv',
    tooltip: {
      title: 'DOLAP · Moda & Gardırop',
      description: 'Podyum anları, sokak modası devrimleri, ikonik kıyafetler ve gardırobun ardındaki sessiz zenginlik kodları.',
      examples: 'Hermès Birkin bekleme sırası, Kurt Cobain hırkası, 90\'lar Prada naylon sırt çantası.'
    }
  },
  {
    id: 'Ekran',
    name: 'Ekran',
    shortSubtitle: 'Sinema & Oyun',
    icon: Film,
    badge: 'Kült Sahneler',
    tooltip: {
      title: 'EKRAN · Sinema, Dizi & Oyun',
      description: 'Kült film sahneleri, unutulmaz TV anları, efsanevi video oyunları ve görsel kültürün dönüm noktaları.',
      examples: 'Matrix deri trençkotu, American Psycho kartvizit sahnesi, GTA Vice City neon estetiği.'
    }
  },
  {
    id: 'Masa',
    name: 'Masa',
    shortSubtitle: 'Gastronomi & Mekan',
    icon: Utensils,
    badge: 'Statü Sofraları',
    tooltip: {
      title: 'MASA · Gastronomi & Mekan',
      description: 'Elit restoran ritüelleri, içki kültürü, trend tabaklar ve sofraların ardındaki sınıfsal statü göstergeleri.',
      examples: 'Negroni Sbagliato histerisi, 80\'ler borsa kahvaltısı, Nobu miso black cod fenomeni.'
    }
  },
  {
    id: 'Kutu',
    name: 'Kutu',
    shortSubtitle: 'Obje & Teknoloji',
    icon: Box,
    badge: 'Tasarım Fetişi',
    tooltip: {
      title: 'KUTU · Oyuncak & Retro Obje',
      description: 'Nostaljik objeler, koleksiyon oyuncakları, analog cihazlar ve çocukluk anılarının fetiş nesneleri.',
      examples: '1999 Furby çılgınlığı, Tamagotchi ölümü, Sony Walkman devrimi, Game Boy çağı.'
    }
  },
];

const DECADES = [
  {
    id: "80'ler",
    label: "80'ler",
    shortSubtitle: 'Analog Parlaklık',
    tooltip: {
      title: '1980\'LER · Aşırılık & Parlaklık',
      spirit: 'Geniş vatkalar, neon ışıklar, Wall Street borsa bolluğu, synthwave müzik ve gösterişli lüks.',
      highlights: 'Power suit modası, Miami Vice estetiği, MTV patlaması, ilk analog cep telefonları.'
    }
  },
  {
    id: "90'lar",
    label: "90'lar",
    shortSubtitle: 'Minimalist Grunge',
    tooltip: {
      title: '1990\'LAR · Ham Grunge & Cool Tavır',
      spirit: 'Gösteriş karşıtı ham gerçeklik, süpermodeller çağı, salaş hırkalar, CD çalarlar ve ironik duruş.',
      highlights: 'Kate Moss Calvin Klein dönemi, Nirvana, Friends jenerasyonu, Sony Discman.'
    }
  },
  {
    id: "2000'ler",
    label: "2000'ler",
    shortSubtitle: 'Y2K & Pop Çağı',
    tooltip: {
      title: '2000\'LER · Y2K & Tabloit Histerisi',
      spirit: 'Dijital coşku, krom parlaklıklar, düşük bel kotlar, kapaklı telefonlar ve paparazzilerin altın çağı.',
      highlights: 'Motorola RAZR, Von Dutch şapkalar, iPod mini, Paris Hilton ve Juicy Couture.'
    }
  },
  {
    id: "2010'lar",
    label: "2010'lar",
    shortSubtitle: 'Sessiz Lüks & Hype',
    tooltip: {
      title: '2010\'LAR · Algoritma & Sessiz Lüks',
      spirit: 'Instagram estetiği, sneaker kuyrukları, gösterişsiz lüks (quiet luxury) ve mikro trendler.',
      highlights: 'Yeezy çılgınlığı, Supreme logoları, flat white kahve kültürü, VSCO filtreleri.'
    }
  },
];

export function InputPanel({
  selectedCategory,
  onSelectCategory,
  selectedDecade,
  onSelectDecade,
  customTopic,
  onChangeCustomTopic,
  onGenerate,
  isLoading,
  progressText,
  model,
  onOpenSettings
}) {
  const [showInspirations, setShowInspirations] = useState(false);

  // Get current curated inspirations based on selected category & decade
  const activeInspirations = CURATED_INSPIRATIONS[selectedCategory]?.[selectedDecade] || [];

  const handleRandomPick = () => {
    if (activeInspirations.length > 0) {
      const random = activeInspirations[Math.floor(Math.random() * activeInspirations.length)];
      onChangeCustomTopic(random);
    }
  };

  return (
    <div className="bg-[#121318] border border-white/10 rounded-2xl p-6 sm:p-7 shadow-xl space-y-7">
      
      {/* 1. KATEGORİ SEÇİMİ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-mono uppercase tracking-[0.2em] text-[#e6c280] font-semibold flex items-center space-x-2">
            <span>01 / Kategori</span>
          </label>
          <span className="text-[11px] text-neutral-500 font-mono">Dolap · Ekran · Masa · Kutu</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`relative p-3.5 rounded-xl border text-left transition-all duration-200 group ${
                  isSelected
                    ? 'border-[#e6c280] bg-[#e6c280]/10 shadow-[0_0_20px_rgba(230,194,128,0.15)] ring-1 ring-[#e6c280]/40'
                    : 'border-white/5 bg-[#171821]/60 hover:border-white/20 hover:bg-[#1a1b24]'
                }`}
              >
                {/* Hover Bilgi Kutusu (Tooltip) */}
                <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2.5 w-64 sm:w-72 p-3 bg-[#0d0e14] border border-[#e6c280]/40 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-left">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1.5">
                    <span className="font-serif font-bold text-xs text-[#e6c280] tracking-wide">
                      {cat.tooltip.title}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#e6c280]/15 text-[#e6c280]">
                      {cat.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-relaxed font-sans mb-1.5">
                    {cat.tooltip.description}
                  </p>
                  <div className="text-[10px] font-mono text-neutral-400 bg-white/5 p-2 rounded border border-white/5">
                    <span className="text-[#e6c280] font-semibold">Örnekler: </span>
                    <span>{cat.tooltip.examples}</span>
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-[#e6c280]/40" />
                </div>

                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`p-2 rounded-lg ${
                      isSelected
                        ? 'bg-[#e6c280] text-black'
                        : 'bg-white/5 text-neutral-400 group-hover:text-white group-hover:bg-white/10'
                    } transition-colors`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'text-[#e6c280] bg-[#e6c280]/15'
                        : 'text-neutral-500 bg-white/5'
                    }`}
                  >
                    {cat.id}
                  </span>
                </div>
                <div className="font-serif font-bold text-sm text-white tracking-wide">
                  {cat.name}
                </div>
                <div className="text-[11px] text-neutral-400 truncate mt-0.5 font-sans">
                  {cat.shortSubtitle}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. DÖNEM SEÇİMİ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-mono uppercase tracking-[0.2em] text-[#e6c280] font-semibold flex items-center space-x-2">
            <span>02 / Dönem Ruhunu Belirle</span>
          </label>
          <span className="text-[11px] text-neutral-500 font-mono">Kronoloji</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DECADES.map((dec) => {
            const isSelected = selectedDecade === dec.id;
            return (
              <button
                key={dec.id}
                type="button"
                onClick={() => onSelectDecade(dec.id)}
                className={`relative py-3 px-3 rounded-xl border text-center transition-all group ${
                  isSelected
                    ? 'border-[#e6c280] bg-[#e6c280]/10 text-white shadow-[0_0_15px_rgba(230,194,128,0.12)] ring-1 ring-[#e6c280]/30'
                    : 'border-white/5 bg-[#171821]/60 text-neutral-400 hover:border-white/15 hover:text-white'
                }`}
              >
                {/* Hover Bilgi Kutusu (Tooltip) */}
                <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2.5 w-64 sm:w-72 p-3 bg-[#0d0e14] border border-[#e6c280]/40 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-left">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1.5">
                    <span className="font-serif font-bold text-xs text-[#e6c280] tracking-wide">
                      {dec.tooltip.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-relaxed font-sans mb-1.5">
                    {dec.tooltip.spirit}
                  </p>
                  <div className="text-[10px] font-mono text-neutral-400 bg-white/5 p-2 rounded border border-white/5">
                    <span className="text-[#e6c280] font-semibold">Kült İkonlar: </span>
                    <span>{dec.tooltip.highlights}</span>
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-[#e6c280]/40" />
                </div>

                <div className="font-serif font-bold text-sm tracking-wide">
                  {dec.label}
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5 truncate font-mono">
                  {dec.shortSubtitle}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. ÖZEL KONU (OPSİYONEL) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-mono uppercase tracking-[0.2em] text-[#e6c280] font-semibold">
            03 / Özel Konu <span className="text-neutral-500 text-[10px] font-normal">(Opsiyonel)</span>
          </label>
          
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleRandomPick}
              className="text-[11px] font-mono text-[#e6c280] hover:text-[#f3d9a6] flex items-center space-x-1 py-0.5 px-2 rounded border border-[#e6c280]/20 bg-[#e6c280]/5 hover:bg-[#e6c280]/10 transition-all"
              title="Küratörün seçtiği kült konulardan birini ata"
            >
              <Dice5 className="w-3.5 h-3.5" />
              <span>Rastgele Kült Konu</span>
            </button>

            <button
              type="button"
              onClick={() => setShowInspirations(!showInspirations)}
              className="text-[11px] font-mono text-neutral-400 hover:text-neutral-200 py-0.5 px-2 rounded border border-white/10 hover:bg-white/5 transition-all"
            >
              {showInspirations ? 'Listeyi Gizle' : 'Küratör Önerileri'}
            </button>
          </div>
        </div>

        {/* Curated list dropdown/drawer */}
        {showInspirations && (
          <div className="mb-3 p-3 rounded-xl bg-black/60 border border-white/10 space-y-1.5 animate-fadeIn">
            <div className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider mb-1 flex items-center space-x-1.5">
              <Flame className="w-3 h-3 text-[#e6c280]" />
              <span>{selectedCategory} · {selectedDecade} Arşivinden Çarpıcı Fikirler:</span>
            </div>
            {activeInspirations.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onChangeCustomTopic(item);
                  setShowInspirations(false);
                }}
                className="w-full text-left text-xs text-neutral-300 hover:text-white hover:bg-white/5 p-2 rounded-lg transition-colors flex items-center justify-between group"
              >
                <span className="truncate pr-2">"{item}"</span>
                <span className="text-[10px] font-mono text-[#e6c280] opacity-0 group-hover:opacity-100 transition-opacity">
                  Seç &rarr;
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="relative">
          <input
            type="text"
            value={customTopic}
            onChange={(e) => onChangeCustomTopic(e.target.value)}
            placeholder="Boş bırakırsanız küratör en çarpıcı gizli lore'u kendisi seçer..."
            className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#e6c280] font-sans transition-all shadow-inner"
          />
          {customTopic && (
            <button
              type="button"
              onClick={() => onChangeCustomTopic('')}
              className="absolute right-3.5 top-3.5 text-xs text-neutral-500 hover:text-neutral-300 font-mono"
            >
              Temizle
            </button>
          )}
        </div>
      </div>

      {/* Aktif Model & Üretim Bilgisi */}
      <div className="flex items-center justify-between px-1 text-[11px] font-mono">
        <div className="flex items-center space-x-1.5 text-neutral-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          <span>Kullanılan Model:</span>
          <span className="text-[#e6c280] font-semibold">{model || 'gemini-2.5-flash'}</span>
        </div>
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="text-[10px] text-neutral-400 hover:text-white underline transition-colors"
          >
            Modeli Değiştir
          </button>
        )}
      </div>

      {/* ÜRET BUTONU */}
      <div className="pt-1">
        <button
          type="button"
          disabled={isLoading}
          onClick={onGenerate}
          className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#e6c280] via-[#eed49f] to-[#d4b06e] hover:brightness-105 active:scale-[0.99] text-black font-serif font-black tracking-[0.15em] text-sm uppercase transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_25px_rgba(230,194,128,0.25)] flex items-center justify-center space-x-3 cursor-pointer"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
              <span>{progressText || `${model || 'Gemini'} ile Kürate Ediliyor...`}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-black" />
              <span>Lore İçeriğini Üret</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}
