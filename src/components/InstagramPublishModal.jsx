import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Calendar,
  Clock,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Layers,
  Edit3
} from 'lucide-react';
import { InstagramIcon } from './Icons';
import {
  getStoredMetaProfile,
  publishOrScheduleInstagramCarousel,
  getStoredMetaAccessToken,
  getStoredInstagramAccountId
} from '../services/instagramMeta';
import { formatInstagramCaption } from '../services/gemini';

export function InstagramPublishModal({
  isOpen,
  onClose,
  post,
  slideDataUrls = [],
  caption,
  onOpenMetaConnect
}) {
  const [profile, setProfile] = useState(() => getStoredMetaProfile());
  const [publishMode, setPublishMode] = useState('immediate'); // 'immediate' | 'schedule'
  const [scheduledDateTime, setScheduledDateTime] = useState(() => {
    // Varsayılan: Yarın akşam 19:30
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 30, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  });
  const [customCaption, setCustomCaption] = useState(() => {
    return formatInstagramCaption(caption || post || '');
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [resultData, setResultData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setProfile(getStoredMetaProfile());
      setCustomCaption(formatInstagramCaption(caption || post || ''));
      setErrorMsg(null);
      setResultData(null);
      setIsSubmitting(false);
      setProgressMsg('');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, caption, post]);

  if (!isOpen) return null;

  const isConnected = !!getStoredMetaAccessToken() && !!getStoredInstagramAccountId();

  // Hızlı Planlama Zaman Kısayolları
  const setQuickTime = (hoursFromNow, targetHour = null, targetMinute = 0) => {
    const d = new Date();
    if (targetHour !== null) {
      d.setDate(d.getDate() + (hoursFromNow > 12 ? 1 : 0));
      d.setHours(targetHour, targetMinute, 0, 0);
    } else {
      d.setHours(d.getHours() + hoursFromNow);
    }
    setScheduledDateTime(d.toISOString().slice(0, 16));
  };

  const handleStartPublish = async () => {
    if (!isConnected) {
      if (onOpenMetaConnect) onOpenMetaConnect();
      return;
    }

    if (!slideDataUrls || slideDataUrls.length < 2) {
      setErrorMsg('Yayınlamak için en az 2 adet slayt görseli gereklidir.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setResultData(null);

    try {
      const scheduledTarget = publishMode === 'schedule' ? new Date(scheduledDateTime) : null;

      const result = await publishOrScheduleInstagramCarousel({
        slideDataUrls,
        caption: customCaption,
        scheduledTime: scheduledTarget,
        onProgress: (msg) => setProgressMsg(msg)
      });

      setResultData(result);
    } catch (err) {
      console.error('Yayınlama hatası:', err);
      setErrorMsg(err.message || 'Instagram gönderisi yayınlanamadı.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 pt-4 sm:pt-8 overflow-y-auto">
      <div className="bg-[#121318] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl animate-fadeIn text-neutral-200 my-2 sm:my-0">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-[#121318] z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
              <InstagramIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-white tracking-wide">
                Instagram'da Yayınla veya Planla
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                Resmi Meta Graph API · 4 Slaytlık Carousel Yayını
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">

          {/* Account Status Card */}
          {isConnected && profile ? (
            <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {profile.picture ? (
                  <img src={profile.picture} alt="" className="w-9 h-9 rounded-full border border-emerald-400 object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm">
                    {profile.username?.[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-white">@{profile.username}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">Meta Bağlantısı Hazır</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenMetaConnect}
                className="text-[11px] font-mono text-[#e6c280] hover:underline"
              >
                Hesap Değiştir
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-gradient-to-r from-pink-950/30 via-black to-neutral-900 border border-pink-500/30 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <InstagramIcon className="w-6 h-6 text-pink-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white">Meta / Instagram Hesabı Bağlı Değil</div>
                  <div className="text-[10px] text-neutral-400">Otomatik paylaşım yapabilmek için önce hesabınızı bağlayın.</div>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenMetaConnect}
                className="px-3.5 py-1.5 rounded-lg bg-white text-black font-semibold text-xs font-mono transition-all hover:bg-neutral-200"
              >
                Hesabı Bağla
              </button>
            </div>
          )}

          {/* Success Screen */}
          {resultData ? (
            <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-400/40 shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-white">
                  {resultData.scheduled ? 'Gönderi Başarıyla Planlandı!' : 'Instagram Profilinizde Yayınlandı!'}
                </h3>
                <p className="text-xs text-neutral-300 font-sans mt-1 max-w-md mx-auto leading-relaxed">
                  {resultData.scheduled
                    ? `Gönderiniz Meta sunucularına aktarıldı. Belirlediğiniz ${resultData.scheduledTime} zamanında Instagram hesabınızda otomatik olarak paylaşılacaktır.`
                    : `4 slaytlık carousel ve açıklama metniniz @${profile?.username || 'hesabınızda'} başarıyla akışa verildi.`}
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-lg bg-[#e6c280] hover:bg-[#d4b06e] text-black font-semibold text-xs font-mono uppercase tracking-wider transition-all shadow-md"
                >
                  Tamamla ve Kapat
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Mode Selector: Anında Paylaş / Zamanla */}
              <div className="space-y-3">
                <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 block">
                  Yayınlama Tercihi
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPublishMode('immediate')}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-center space-x-3 cursor-pointer ${
                      publishMode === 'immediate'
                        ? 'border-[#e6c280] bg-[#e6c280]/15 text-white shadow-lg ring-1 ring-[#e6c280]/40'
                        : 'border-white/10 bg-white/[0.02] text-neutral-400 hover:border-white/20'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-[#e6c280] flex items-center justify-center shrink-0">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Hemen Şimdi Yayınla</div>
                      <div className="text-[10px] text-neutral-400">Gönderi anında profilinizde paylaşılır</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPublishMode('schedule')}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-center space-x-3 cursor-pointer ${
                      publishMode === 'schedule'
                        ? 'border-[#e6c280] bg-[#e6c280]/15 text-white shadow-lg ring-1 ring-[#e6c280]/40'
                        : 'border-white/10 bg-white/[0.02] text-neutral-400 hover:border-white/20'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">İleri Bir Tarihe Planla</div>
                      <div className="text-[10px] text-neutral-400">Meta otomatik olarak zamanında paylaşır</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Schedule Date & Time Picker */}
              {publishMode === 'schedule' && (
                <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-mono text-neutral-300">
                    <span className="flex items-center space-x-1.5 text-[#e6c280]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Yayınlanma Tarihi ve Saati:</span>
                    </span>
                    <span className="text-[10px] text-neutral-500">En az 10 dakika sonrası</span>
                  </div>

                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    min={new Date(Date.now() + 15 * 60 * 1000).toISOString().slice(0, 16)}
                    max={new Date(Date.now() + 74 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="w-full bg-[#0a0a0d] border border-white/15 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#e6c280] font-mono cursor-pointer"
                  />

                  {/* Quick Shortcut Buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] font-mono text-neutral-500 self-center mr-1">Hızlı Seç:</span>
                    <button
                      type="button"
                      onClick={() => setQuickTime(0, 20, 0)}
                      className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-neutral-300"
                    >
                      Bu Akşam (20:00)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickTime(24, 12, 30)}
                      className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-neutral-300"
                    >
                      Yarın Öğlen (12:30)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickTime(24, 19, 30)}
                      className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-[#e6c280] border-[#e6c280]/30"
                    >
                      Yarın Akşam (19:30)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickTime(48, 20, 0)}
                      className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-neutral-300"
                    >
                      2 Gün Sonra (20:00)
                    </button>
                  </div>
                </div>
              )}

              {/* Slayt Önizlemeleri */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-neutral-300">
                  <span className="flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#e6c280]" />
                    <span>Carousel Slaytları ({slideDataUrls.length} Slayt)</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">1080x1350 Portre</span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {slideDataUrls.map((url, idx) => (
                    <div key={idx} className="relative aspect-[4/5] rounded-lg border border-white/10 overflow-hidden bg-black/60 shadow-md">
                      <img src={url} alt={`Slayt ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute top-1 left-1 bg-black/80 text-[9px] font-mono px-1 rounded text-white font-bold">
                        {idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Caption (Açıklama) Düzenleme */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-neutral-300">
                  <span className="flex items-center space-x-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-[#e6c280]" />
                    <span>Instagram Açıklama Metni (Caption)</span>
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">
                    {customCaption.length} karakter
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={customCaption}
                  onChange={(e) => setCustomCaption(e.target.value)}
                  placeholder="Instagram gönderi açıklaması..."
                  className="w-full bg-[#0a0a0d] border border-white/10 rounded-lg p-3 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#e6c280] font-sans leading-relaxed"
                />
              </div>

              {/* Feedback & Loading State */}
              {isSubmitting && (
                <div className="p-3.5 rounded-xl bg-black/60 border border-[#e6c280]/30 space-y-2 animate-fadeIn">
                  <div className="flex items-center space-x-2 text-xs font-mono text-[#e6c280]">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>{progressMsg || 'Meta API ile iletişim kuruluyor...'}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#e6c280] to-pink-500 animate-pulse w-3/4 rounded-full" />
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-200 text-xs flex items-start space-x-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded text-xs font-mono text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  Vazgeç
                </button>

                <button
                  type="button"
                  disabled={isSubmitting || !isConnected}
                  onClick={handleStartPublish}
                  className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#e6c280] via-[#f59e0b] to-[#ec4899] hover:opacity-90 text-black font-semibold text-xs font-mono uppercase tracking-wider transition-all flex items-center space-x-2 shadow-[0_0_20px_rgba(230,194,128,0.25)] disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>İşleniyor...</span>
                    </>
                  ) : publishMode === 'schedule' ? (
                    <>
                      <Calendar className="w-3.5 h-3.5" />
                      <span>📅 Belirlenen Tarihe Planla</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>🚀 Instagram'da Şimdi Yayınla</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

        </div>

      </div>
    </div>,
    document.body
  );
}
