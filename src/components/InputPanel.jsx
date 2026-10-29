import React, { useState } from 'react';
import {
  Sparkles,
  Shirt,
  Film,
  Utensils,
  Box,
  Dice5,
  Flame,
  RefreshCw,
  Code,
  Cpu,
  HardDrive,
  Zap,
  Camera,
  Clapperboard,
  UserCheck,
  Palette,
  Home,
  Feather,
  Compass,
  Layers,
  ChevronRight
} from 'lucide-react';
import { BUILTIN_PROJECTS } from '../services/projects';

const ICON_MAP = {
  Shirt,
  Film,
  Utensils,
  Box,
  Code,
  Cpu,
  HardDrive,
  Zap,
  Camera,
  Clapperboard,
  UserCheck,
  Palette,
  Home,
  Feather,
  Compass,
  Sparkles,
  Layers
};

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
  onOpenSettings,
  project = BUILTIN_PROJECTS[0],
  onOpenProjects
}) {
  const [showInspirations, setShowInspirations] = useState(false);

  const categories = project?.categories || BUILTIN_PROJECTS[0].categories;
  const filterOptions = project?.filterOptions || BUILTIN_PROJECTS[0].filterOptions;
  const filterTypeLabel = project?.filterTypeLabel || '02 / DÖNEM RUHUNU BELİRLE';
  const filterCategoryTitle = project?.filterCategoryTitle || 'Kronoloji';
  const buttonText = project?.buttonText || 'İçeriği Üret';

  // Get current curated inspirations based on selected category & filter
  const activeInspirations = project?.curatedTopics?.[selectedCategory]?.[selectedDecade] || [];

  const handleRandomPick = () => {
    if (activeInspirations.length > 0) {
      const random = activeInspirations[Math.floor(Math.random() * activeInspirations.length)];
      onChangeCustomTopic(random);
    } else {
      onChangeCustomTopic(`${selectedCategory} alanında ${selectedDecade} için en çarpıcı kült detayı analiz et`);
    }
  };

  return (
    <div className="bg-[#121318] border border-white/10 rounded-2xl p-6 sm:p-7 shadow-xl space-y-7">
      
      {/* 00. AKTİF PROJE BİLGİ BANDI */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center space-x-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold"
            style={{
              backgroundColor: `${project?.accentColor || '#e6c280'}20`,
              color: project?.accentColor || '#e6c280',
              border: `1px solid ${project?.accentColor || '#e6c280'}40`
            }}
          >
            {project?.shortCode?.slice(0, 2) || 'PC'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-serif font-bold text-sm text-white tracking-wide">
                {project?.name || 'Lore Magazine'}
              </span>
              <span
                className="text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase"
                style={{
                  borderColor: `${project?.accentColor || '#e6c280'}40`,
                  backgroundColor: `${project?.accentColor || '#e6c280'}15`,
                  color: project?.accentColor || '#e6c280'
                }}
              >
                {project?.badge || 'Proje'}
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 font-sans truncate max-w-[260px] sm:max-w-xs">
              {project?.tagline || 'Kapsamlı İçerik & Mizanpaj Stüdyosu'}
            </p>
          </div>
        </div>

        {onOpenProjects && (
          <button
            type="button"
            onClick={onOpenProjects}
            className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-[11px] font-mono flex items-center space-x-1 transition-all"
            title="Farklı bir projeye geçin veya yeni proje ekleyin"
          >
            <Layers className="w-3 h-3 text-[#e6c280]" />
            <span className="hidden sm:inline">Projeyi Değiştir</span>
            <ChevronRight className="w-3 h-3 opacity-60" />
          </button>
        )}
      </div>

      {/* 1. KATEGORİ SEÇİMİ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-mono uppercase tracking-[0.2em] text-[#e6c280] font-semibold flex items-center space-x-2">
            <span>01 / Kategori</span>
          </label>
          <span className="text-[11px] text-neutral-500 font-mono truncate max-w-[200px]">
            {categories.map((c) => c.name || c.id).join(' · ')}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {categories.map((cat) => {
            const catId = cat.id || cat.name;
            const Icon = (cat.iconName && ICON_MAP[cat.iconName]) ? ICON_MAP[cat.iconName] : Box;
            const isSelected = selectedCategory === catId;

            return (
              <button
                key={catId}
                type="button"
                onClick={() => onSelectCategory(catId)}
                className={`relative p-3.5 rounded-xl border text-left transition-all duration-200 group ${
                  isSelected
                    ? 'border-[#e6c280] bg-[#e6c280]/10 shadow-[0_0_20px_rgba(230,194,128,0.15)] ring-1 ring-[#e6c280]/40'
                    : 'border-white/5 bg-[#171821]/60 hover:border-white/20 hover:bg-[#1a1b24]'
                }`}
              >
                {/* Hover Bilgi Kutusu (Tooltip) */}
                {cat.tooltip && (
                  <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2.5 w-64 sm:w-72 p-3 bg-[#0d0e14] border border-[#e6c280]/40 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-left">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1.5">
                      <span className="font-serif font-bold text-xs text-[#e6c280] tracking-wide">
                        {cat.tooltip.title || cat.name}
                      </span>
                      {cat.badge && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#e6c280]/15 text-[#e6c280]">
                          {cat.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-300 leading-relaxed font-sans mb-1.5">
                      {cat.tooltip.description}
                    </p>
                    {cat.tooltip.examples && (
                      <div className="text-[10px] font-mono text-neutral-400 bg-white/5 p-2 rounded border border-white/5">
                        <span className="text-[#e6c280] font-semibold">Örnekler: </span>
                        <span>{cat.tooltip.examples}</span>
                      </div>
                    )}
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-[#e6c280]/40" />
                  </div>
                )}

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
                  {cat.badge && (
                    <span
                      className={`text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'text-[#e6c280] bg-[#e6c280]/15'
                          : 'text-neutral-500 bg-white/5'
                      }`}
                    >
                      {cat.badge}
                    </span>
                  )}
                </div>
                <div className="font-serif font-bold text-sm text-white tracking-wide truncate">
                  {cat.name || catId}
                </div>
                <div className="text-[11px] text-neutral-400 truncate mt-0.5 font-sans">
                  {cat.sublabel || cat.shortSubtitle || ''}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. DÖNEM VEYA ODAK SEÇİMİ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-mono uppercase tracking-[0.2em] text-[#e6c280] font-semibold flex items-center space-x-2">
            <span>{filterTypeLabel}</span>
          </label>
          <span className="text-[11px] text-neutral-500 font-mono">{filterCategoryTitle}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {filterOptions.map((opt) => {
            const optId = opt.id || opt.label;
            const isSelected = selectedDecade === optId;

            return (
              <button
                key={optId}
                type="button"
                onClick={() => onSelectDecade(optId)}
                className={`relative py-3 px-3 rounded-xl border text-center transition-all group ${
                  isSelected
                    ? 'border-[#e6c280] bg-[#e6c280]/10 text-white shadow-[0_0_15px_rgba(230,194,128,0.12)] ring-1 ring-[#e6c280]/30'
                    : 'border-white/5 bg-[#171821]/60 text-neutral-400 hover:border-white/15 hover:text-white'
                }`}
              >
                {/* Hover Bilgi Kutusu (Tooltip) */}
                {opt.tooltip && (
                  <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2.5 w-64 sm:w-72 p-3 bg-[#0d0e14] border border-[#e6c280]/40 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-left">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1.5">
                      <span className="font-serif font-bold text-xs text-[#e6c280] tracking-wide">
                        {opt.tooltip.title || opt.label}
                      </span>
                    </div>
                    {opt.tooltip.spirit && (
                      <p className="text-[11px] text-neutral-300 leading-relaxed font-sans mb-1.5">
                        {opt.tooltip.spirit}
                      </p>
                    )}
                    {opt.tooltip.highlights && (
                      <div className="text-[10px] font-mono text-neutral-400 bg-white/5 p-2 rounded border border-white/5">
                        <span className="text-[#e6c280] font-semibold">Öne Çıkanlar: </span>
                        <span>{opt.tooltip.highlights}</span>
                      </div>
                    )}
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-[#e6c280]/40" />
                  </div>
                )}

                <div className="font-serif font-bold text-sm tracking-wide truncate">
                  {opt.label || optId}
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5 truncate font-mono">
                  {opt.sublabel || opt.shortSubtitle || ''}
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
              className="text-[11px] font-mono text-[#e6c280] hover:text-[#f3d9a6] flex items-center space-x-1 py-0.5 px-2 rounded border border-[#e6c280]/20 bg-[#e6c280]/5 hover:bg-[#e6c280]/10 transition-all cursor-pointer"
              title="Küratörün seçtiği konulardan birini ata"
            >
              <Dice5 className="w-3.5 h-3.5" />
              <span>Rastgele Konu</span>
            </button>

            {activeInspirations.length > 0 && (
              <button
                type="button"
                onClick={() => setShowInspirations(!showInspirations)}
                className="text-[11px] font-mono text-neutral-400 hover:text-neutral-200 py-0.5 px-2 rounded border border-white/10 hover:bg-white/5 transition-all cursor-pointer"
              >
                {showInspirations ? 'Listeyi Gizle' : 'Örnek Konular'}
              </button>
            )}
          </div>
        </div>

        {/* Curated list dropdown/drawer */}
        {showInspirations && activeInspirations.length > 0 && (
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
            placeholder="Boş bırakırsanız küratör projeye uygun en çarpıcı konuyu kendisi seçer..."
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
            className="text-[10px] text-neutral-400 hover:text-white underline transition-colors cursor-pointer"
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
              <span>{buttonText}</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}
