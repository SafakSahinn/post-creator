import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Check,
  AlertCircle,
  ExternalLink,
  Loader2,
  Key,
  ShieldCheck,
  HelpCircle,
  Users,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon
} from 'lucide-react';
import { InstagramIcon } from './Icons';
import {
  getStoredMetaAccessToken,
  setStoredMetaAccessToken,
  getStoredInstagramAccountId,
  setStoredInstagramAccountId,
  getStoredMetaProfile,
  setStoredMetaProfile,
  fetchInstagramProfile,
  getStoredImgurClientId,
  setStoredImgurClientId
} from '../services/instagramMeta';

export function MetaConnectModal({ isOpen, onClose }) {
  const [tokenInput, setTokenInput] = useState(() => getStoredMetaAccessToken());
  const [accountIdInput, setAccountIdInput] = useState(() => getStoredInstagramAccountId());
  const [imgurInput, setImgurInput] = useState(() => getStoredImgurClientId());
  const [profile, setProfile] = useState(() => getStoredMetaProfile());
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTokenInput(getStoredMetaAccessToken());
      setAccountIdInput(getStoredInstagramAccountId());
      setImgurInput(getStoredImgurClientId());
      setProfile(getStoredMetaProfile());
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async () => {
    if (!tokenInput.trim() || !accountIdInput.trim()) {
      setErrorMsg('Lütfen hem Meta Access Token hem de Instagram Hesap ID giriniz.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      setStoredMetaAccessToken(tokenInput);
      setStoredInstagramAccountId(accountIdInput);
      setStoredImgurClientId(imgurInput);

      const verifiedProfile = await fetchInstagramProfile(tokenInput, accountIdInput);
      setProfile(verifiedProfile);
      setSuccessMsg(`Bağlantı başarılı! @${verifiedProfile.username} hesabı bağlandı.`);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Meta API bağlantısı kurulamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('Instagram / Meta bağlantısını kaldırmak istediğinize emin misiniz?')) {
      setStoredMetaAccessToken('');
      setStoredInstagramAccountId('');
      setStoredMetaProfile(null);
      setTokenInput('');
      setAccountIdInput('');
      setProfile(null);
      setSuccessMsg('Hesap bağlantısı kaldırıldı.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 pt-4 sm:pt-8 overflow-y-auto">
      <div className="bg-[#121318] border border-white/10 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fadeIn text-neutral-200 my-2 sm:my-0">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-[#121318] z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
              <InstagramIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-white tracking-wide">
                Meta / Instagram Otomatik Paylaşım
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                Resmi Content Publishing API & Zamanlama (Scheduling)
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
          
          {/* Active Connected Profile Card */}
          {profile ? (
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-black to-neutral-900 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center space-x-3.5">
                {profile.picture ? (
                  <img
                    src={profile.picture}
                    alt=""
                    className="w-12 h-12 rounded-full border-2 border-emerald-400 shadow-md object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-500 to-amber-500 flex items-center justify-center text-white font-bold text-lg">
                    {profile.username?.[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-white text-sm">@{profile.username}</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xs text-neutral-400 font-mono">
                    {profile.name || 'Instagram İçerik Üretici'}
                    {profile.followers !== undefined && ` · ${profile.followers.toLocaleString('tr-TR')} takipçi`}
                  </div>
                  <span className="inline-block mt-1 text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
                    Otomatik Paylaşım & Zamanlama Aktif
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDisconnect}
                className="text-xs font-mono text-neutral-400 hover:text-red-400 px-3 py-1.5 rounded border border-white/10 hover:border-red-500/30 transition-all"
              >
                Bağlantıyı Kes
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-[#e6c280]/10 border border-[#e6c280]/30 text-xs font-sans text-neutral-300 flex items-start space-x-2.5">
              <InstagramIcon className="w-4 h-4 text-[#e6c280] shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                Instagram <strong>İşletme (Business)</strong> veya <strong>İçerik Üretici (Creator)</strong> hesabınızı bağlayarak hazırladığınız 4 slaytlık carousel gönderilerini doğrudan bu ekrandan yayınlayabilir veya istediğiniz tarihe zamanlayabilirsiniz.
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 mb-1.5 flex items-center justify-between">
                <span>Instagram Business / Creator Hesap ID (IG User ID)</span>
                <span className="text-[10px] text-neutral-500 font-normal">Sayısal ID</span>
              </label>
              <input
                type="text"
                value={accountIdInput}
                onChange={(e) => setAccountIdInput(e.target.value.trim())}
                placeholder="17841400000000000"
                className="w-full bg-[#0a0a0d] border border-white/10 rounded-lg px-3.5 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#e6c280] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 mb-1.5 flex items-center justify-between">
                <span>Meta / Facebook Graph API Access Token</span>
                <span className="text-[10px] text-emerald-400 font-normal">60 Günlük veya Kalıcı Token</span>
              </label>
              <textarea
                rows={3}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value.trim())}
                placeholder="EAA..."
                className="w-full bg-[#0a0a0d] border border-white/10 rounded-lg p-3 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#e6c280] font-mono"
              />
            </div>

            {/* Imgur Client ID (Public Hosting Köprüsü) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono text-neutral-400 flex items-center space-x-1">
                  <ImageIcon className="w-3 h-3 text-[#e6c280]" />
                  <span>Imgur Client-ID (Görsel URL Köprüsü - Ücretsiz):</span>
                </label>
                <span className="text-[9px] font-mono text-neutral-500">Varsayılan Hazır</span>
              </div>
              <input
                type="text"
                value={imgurInput}
                onChange={(e) => setImgurInput(e.target.value.trim())}
                placeholder="c73499dc88701e8"
                className="w-full bg-[#0a0a0d] border border-white/10 rounded px-3 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#e6c280] font-mono"
              />
              <p className="text-[9px] text-neutral-500 font-sans mt-0.5">
                Meta, slayt görsellerini cihazdan değil açık bir web URL'inden indirdiği için görseller bu köprü ile Meta'ya aktarılır.
              </p>
            </div>
          </div>

          {/* Guide Accordion */}
          <div className="border border-white/10 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="w-full p-3 bg-white/[0.02] hover:bg-white/[0.05] flex items-center justify-between text-xs font-mono text-[#e6c280] transition-colors"
            >
              <span className="flex items-center space-x-2">
                <HelpCircle className="w-4 h-4" />
                <span>Meta Access Token ve Hesap ID Nasıl Alınır? (3 Adım)</span>
              </span>
              {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showGuide && (
              <div className="p-4 bg-black/40 text-xs font-sans text-neutral-300 space-y-3 leading-relaxed border-t border-white/5">
                <div className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-[#e6c280]/20 text-[#e6c280] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-white">Meta Developer Hesabı:</strong>{' '}
                    <a
                      href="https://developers.facebook.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#e6c280] hover:underline inline-flex items-center space-x-0.5"
                    >
                      <span>developers.facebook.com</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>{' '}
                    adresine gidip ücretsiz bir geliştirici hesabı açın ve yeni bir uygulama oluşturun (Tür: Diğer &rarr; İşletme).
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-[#e6c280]/20 text-[#e6c280] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-white">Graph API Explorer:</strong> Üst menüden <em>Araçlar &rarr; Graph API Explorer</em>'ı açın. İzinler (Permissions) kısmından şu 4 izni ekleyin:
                    <div className="flex flex-wrap gap-1 mt-1 font-mono text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-white/10 text-emerald-300">instagram_basic</span>
                      <span className="px-1.5 py-0.5 rounded bg-white/10 text-emerald-300">instagram_content_publish</span>
                      <span className="px-1.5 py-0.5 rounded bg-white/10 text-emerald-300">pages_show_list</span>
                      <span className="px-1.5 py-0.5 rounded bg-white/10 text-emerald-300">pages_read_engagement</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-[#e6c280]/20 text-[#e6c280] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong className="text-white">ID ve Token Alma:</strong> <strong>"Generate Access Token"</strong> butonuna basın. Ardından arama kutusuna <code className="text-[#e6c280] font-mono">me/accounts?fields=instagram_business_account</code> yazıp çalıştırdığınızda Instagram Hesap ID'nizi ve Token'ınızı göreceksiniz.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-200 text-xs flex items-start space-x-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs flex items-start space-x-2 animate-fadeIn">
              <Check className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded text-xs font-mono text-neutral-400 hover:text-white transition-colors"
            >
              Kapat
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleTestAndSave}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#e6c280] to-[#f59e0b] hover:from-[#d4b06e] hover:to-[#d97706] text-black font-semibold text-xs font-mono uppercase tracking-wider transition-all flex items-center space-x-2 shadow-[0_0_15px_rgba(230,194,128,0.2)] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Doğrulanıyor...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Doğrula ve Bağla</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>,
    document.body
  );
}
