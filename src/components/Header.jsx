import React, { useState, useEffect } from 'react';
import { Key, Bookmark, Sparkles, HelpCircle, Activity, LogOut, Cloud, Layers, PlusCircle } from 'lucide-react';
import { InstagramIcon } from './Icons';
import { getQuotaStats } from '../services/apiQuota';
import { getStoredMetaProfile } from '../services/instagramMeta';

function PostCreatorLogo() {
  return (
    <div className="relative w-11 h-11 shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
      {/* Glow Halo */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#e6c280]/30 to-[#f59e0b]/20 blur-md opacity-75 group-hover:opacity-100 transition-opacity" />
      
      {/* Luxury Layered Isometric Carousel Slides Logo */}
      <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-11 h-11 relative z-10 drop-shadow-[0_2px_10px_rgba(230,194,128,0.35)]">
        {/* Back Card (Rotated Slide) */}
        <rect x="13.5" y="5.5" width="25" height="30" rx="5" fill="#181a22" stroke="rgba(255,255,255,0.18)" strokeWidth="1.4" transform="rotate(7 26 20.5)" />
        {/* Front Primary Card */}
        <rect x="5.5" y="8" width="25" height="30" rx="5" fill="url(#pcCardGrad)" stroke="url(#pcGoldBorder)" strokeWidth="1.5" />
        {/* Header Gold Line */}
        <line x1="9" y1="13.5" x2="27" y2="13.5" stroke="#e6c280" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.85" />
        {/* Center Star / Aperture Spark */}
        <path d="M18 18.5L19.2 22.2L23 23.5L19.2 24.8L18 28.5L16.8 24.8L13 23.5L16.8 22.2L18 18.5Z" fill="url(#pcGoldStar)" />
        {/* Carousel 4 Indicator Dots */}
        <circle cx="11.5" cy="33" r="1.2" fill="#e6c280" />
        <circle cx="15.5" cy="33" r="1.2" fill="#e6c280" fillOpacity="0.4" />
        <circle cx="19.5" cy="33" r="1.2" fill="#e6c280" fillOpacity="0.4" />
        <circle cx="23.5" cy="33" r="1.2" fill="#e6c280" fillOpacity="0.4" />
        
        {/* Gradients */}
        <defs>
          <linearGradient id="pcCardGrad" x1="5.5" y1="8" x2="30.5" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1e2029" />
            <stop offset="1" stopColor="#0b0c10" />
          </linearGradient>
          <linearGradient id="pcGoldBorder" x1="5.5" y1="8" x2="30.5" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f5eedb" />
            <stop offset="0.5" stopColor="#e6c280" />
            <stop offset="1" stopColor="#a37a34" />
          </linearGradient>
          <linearGradient id="pcGoldStar" x1="13" y1="18.5" x2="23" y2="28.5" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" />
            <stop offset="0.5" stopColor="#e6c280" />
            <stop offset="1" stopColor="#d4a34e" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function Header({
  hasApiKey,
  onOpenSettings,
  archiveCount,
  onOpenArchive,
  onOpenGuide,
  user,
  onLogout,
  model,
  activeProject,
  onOpenProjects,
  onResetWorkspace,
  onOpenMetaModal
}) {
  const [quota, setQuota] = useState(() => getQuotaStats());
  const [metaProfile, setMetaProfile] = useState(() => getStoredMetaProfile());

  useEffect(() => {
    const handleUpdate = () => {
      setQuota(getQuotaStats());
      setMetaProfile(getStoredMetaProfile());
    };
    window.addEventListener('lore_quota_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('lore_quota_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);
  return (
    <header className="border-b border-white/10 bg-[#0c0d11]/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand / Logo (Tıklandığında Boş Çalışma Alanı / Stüdyo Sıfırlama) */}
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={onResetWorkspace}
            className="flex items-center space-x-3.5 text-left group cursor-pointer focus:outline-none transition-all select-none"
            title="Yeni Boş Çalışma Alanı Aç (Stüdyoyu Sıfırla)"
          >
            <PostCreatorLogo />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif tracking-[0.2em] text-lg font-black text-white uppercase group-hover:text-[#e6c280] transition-colors">
                  POST CREATOR
                </span>
                <span className="text-[9px] tracking-widest uppercase font-mono px-2 py-0.5 rounded border border-[#e6c280]/40 text-[#e6c280] bg-[#e6c280]/10 shadow-[0_0_8px_rgba(230,194,128,0.15)]">
                  Studio
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-mono tracking-wider group-hover:text-neutral-300 transition-colors flex items-center space-x-1.5">
                <span>INSTAGRAM CAROUSEL STÜDYOSU</span>
                <span className="text-[#e6c280] font-semibold opacity-0 group-hover:opacity-100 transition-opacity text-[10px] hidden sm:inline">
                  &bull; Yeni Boş Sayfa
                </span>
              </p>
            </div>
          </button>

          {/* Active Project Pill / Switcher */}
          {activeProject && (
            <button
              type="button"
              onClick={onOpenProjects}
              className="hidden md:flex items-center space-x-2.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-[#e6c280]/40 transition-all text-left group ml-2 cursor-pointer"
              title="Aktif projeyi değiştirin veya yeni proje oluşturun"
            >
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-mono font-bold"
                style={{
                  backgroundColor: `${activeProject.accentColor || '#e6c280'}20`,
                  color: activeProject.accentColor || '#e6c280',
                  border: `1px solid ${activeProject.accentColor || '#e6c280'}40`
                }}
              >
                {activeProject.shortCode?.slice(0, 2) || 'PC'}
              </div>
              <div className="leading-tight">
                <div className="text-[9px] font-mono uppercase text-neutral-400 group-hover:text-neutral-300">
                  Proje
                </div>
                <div className="text-xs font-serif font-bold text-white group-hover:text-[#e6c280] transition-colors truncate max-w-[140px]">
                  {activeProject.name || 'Lore Magazine'}
                </div>
              </div>
              <Layers className="w-3.5 h-3.5 text-neutral-500 group-hover:text-[#e6c280] transition-colors ml-0.5" />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          {/* Guide / How to use */}
          <button
            onClick={onOpenGuide}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-2 rounded border border-white/10 text-neutral-300 hover:text-white hover:border-white/20 transition-all text-xs font-mono"
            title="Kullanım Rehberi"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#e6c280]" />
            <span>Rehber</span>
          </button>

          {/* Archive / History */}
          <button
            onClick={onOpenArchive}
            className="flex items-center space-x-2 px-3.5 py-2 rounded border border-white/10 text-neutral-300 hover:text-white hover:border-white/20 transition-all text-xs font-mono bg-neutral-900/60"
          >
            <Bookmark className="w-3.5 h-3.5 text-[#e6c280]" />
            <span>Arşiv</span>
            {archiveCount > 0 && (
              <span className="bg-[#e6c280] text-black text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {archiveCount}
              </span>
            )}
          </button>

          {/* Meta / Instagram Connect */}
          <button
            onClick={onOpenMetaModal}
            title={metaProfile ? `@${metaProfile.username} (Instagram Bağlı) - Ayarlar için tıklayın` : 'Meta / Instagram Otomatik Paylaşım & Zamanlama Bağla'}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded border text-xs font-mono transition-all cursor-pointer ${
              metaProfile
                ? 'border-pink-500/40 bg-pink-950/25 text-pink-300 hover:border-pink-400 hover:bg-pink-950/40'
                : 'border-white/10 text-neutral-300 hover:text-white hover:border-white/20'
            }`}
          >
            <InstagramIcon className={`w-3.5 h-3.5 ${metaProfile ? 'text-pink-400' : 'text-neutral-400'}`} />
            <span className="hidden md:inline">
              {metaProfile ? `@${metaProfile.username}` : 'Instagram'}
            </span>
            {metaProfile && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />}
          </button>

          {/* API Key Status & Quota Display */}
          <button
            onClick={onOpenSettings}
            title={hasApiKey ? `Model: ${model || 'gemini-2.5-flash'} | Bugün Kalan: ${quota.remaining} / ${quota.dailyLimit} istek` : 'API Anahtarı Tanımlayın'}
            className={`flex items-center space-x-2 px-3 py-2 rounded border text-xs font-mono transition-all ${
              hasApiKey
                ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300 hover:border-emerald-500/50 hover:bg-emerald-950/30"
                : "border-amber-500/50 bg-amber-950/30 text-amber-200 animate-pulse hover:border-amber-400"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <div className="flex items-center space-x-1.5">
              <span>{hasApiKey ? "API Aktif" : "API Anahtarı Girin"}</span>
              {hasApiKey && (
                <>
                  <span className="text-[10px] text-[#e6c280] bg-[#e6c280]/10 px-1.5 py-0.2 rounded border border-[#e6c280]/30 font-semibold hidden md:inline">
                    {model || 'gemini-2.5-flash'}
                  </span>
                  <span className="text-[10px] text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                    {quota.remaining.toLocaleString('tr-TR')} Hak
                  </span>
                </>
              )}
            </div>
            <span
              className={`w-2 h-2 rounded-full ${
                hasApiKey ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-amber-400"
              }`}
            />
          </button>

          {/* User Account / Logout */}
          <div className="flex items-center space-x-2 pl-2 border-l border-white/10">
            {user ? (
              <div className="flex items-center space-x-2">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt=""
                    className="w-7 h-7 rounded-full border border-[#e6c280]/40 object-cover"
                    title={user.email}
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#e6c280]/20 text-[#e6c280] font-mono font-bold text-xs flex items-center justify-center border border-[#e6c280]/30">
                    {user.name?.charAt(0) || 'G'}
                  </div>
                )}
                <button
                  type="button"
                  onClick={onLogout}
                  title="Oturumu Kapat"
                  className="p-1.5 rounded hover:bg-white/10 text-neutral-400 hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onLogout}
                title="Giriş Ekranına Dön"
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded text-[11px] font-mono text-neutral-400 hover:text-white bg-white/5 border border-white/5 hover:border-white/15 transition-all"
              >
                <LogOut className="w-3 h-3" />
                <span>Giriş Yap</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}
