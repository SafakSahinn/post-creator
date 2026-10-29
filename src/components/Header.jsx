import React, { useState, useEffect } from 'react';
import { Key, Bookmark, Sparkles, HelpCircle, Activity, LogOut, Cloud } from 'lucide-react';
import { getQuotaStats } from '../services/apiQuota';

export function Header({ hasApiKey, onOpenSettings, archiveCount, onOpenArchive, onOpenGuide, user, onLogout, model }) {
  const [quota, setQuota] = useState(() => getQuotaStats());

  useEffect(() => {
    const handleUpdate = () => setQuota(getQuotaStats());
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
        
        {/* Brand / Logo */}
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-sm bg-gradient-to-br from-[#e6c280] to-[#b38e4a] flex items-center justify-center text-black font-serif font-black text-sm tracking-tighter shadow-[0_0_20px_rgba(230,194,128,0.25)]">
            PC
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-serif tracking-[0.2em] text-lg font-bold text-white uppercase">
                POST CREATOR
              </span>
              <span className="text-[10px] tracking-widest uppercase font-mono px-2 py-0.5 rounded border border-[#e6c280]/40 text-[#e6c280] bg-[#e6c280]/5">
                v1.0 Studio
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-mono tracking-wider">
              INSTAGRAM CAROUSEL & İÇERİK STÜDYOSU
            </p>
          </div>
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
