import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  HardDrive,
  Sparkles,
  Layers,
  ArrowRight,
  ExternalLink,
  Key,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import {
  getStoredClientId,
  setStoredClientId,
  setStoredDriveToken,
  fetchAndStoreUserProfile,
  requestGoogleDriveAuth
} from '../services/googleDrive';

const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
    />
    <path
      fill="#FF3D00"
      d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
    />
  </svg>
);

export function LoginScreen({ onLoginSuccess, onGuestContinue }) {
  const [clientId, setClientId] = useState(() => getStoredClientId());
  const [showConfig, setShowConfig] = useState(false);
  const [tempClientId, setTempClientId] = useState(() => getStoredClientId());
  const [directToken, setDirectToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Preload Google Identity script
  useEffect(() => {
    if (!window.google?.accounts?.oauth2) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    const activeClientId = clientId || tempClientId.trim();

    if (!activeClientId) {
      setShowConfig(true);
      setErrorMsg('Lütfen Google OAuth Client ID bilginizi girin.');
      return;
    }

    setBusy(true);
    try {
      setStoredClientId(activeClientId);
      setClientId(activeClientId);

      const result = await requestGoogleDriveAuth(activeClientId);
      onLoginSuccess(result.user, result.token);
    } catch (err) {
      setErrorMsg(err.message || 'Google oturum açma işlemi tamamlanamadı.');
    } finally {
      setBusy(false);
    }
  };

  const handleDirectTokenLogin = async () => {
    if (!directToken.trim()) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const token = directToken.trim();
      setStoredDriveToken(token);
      const user = await fetchAndStoreUserProfile(token);
      onLoginSuccess(user || { name: 'Google Kullanıcısı', email: 'Drive Bağlı' }, token);
    } catch (err) {
      setErrorMsg('Token doğrulanamadı: ' + err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080a] flex flex-col items-center justify-center p-4 selection:bg-[#e6c280] selection:text-black relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#e6c280]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md bg-[#0f1015] border border-white/10 rounded-2xl p-7 sm:p-9 shadow-[0_10px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-fadeIn space-y-7">
        
        {/* Brand Icon & Heading */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-lg bg-gradient-to-br from-[#e6c280] via-[#cfa053] to-[#8c672b] flex items-center justify-center text-black font-serif font-black text-2xl tracking-tighter shadow-[0_0_25px_rgba(230,194,128,0.3)]">
            PC
          </div>
          <div>
            <h1 className="font-serif tracking-[0.2em] text-2xl font-bold text-white uppercase">
              POST CREATOR
            </h1>
            <p className="text-[11px] font-mono text-neutral-400 tracking-widest uppercase mt-1">
              Instagram Carousel & İçerik Stüdyosu
            </p>
          </div>
        </div>

        {/* Feature Points (Thalamus Mimarisi) */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3 text-xs text-neutral-300">
          <div className="flex items-start space-x-2.5">
            <span className="text-[#e6c280] font-bold mt-0.5">•</span>
            <p>
              İçerikler ve carousel fotoğrafları <b className="text-white">kendi Google Drive’ınızda</b> (<code className="text-[#e6c280] font-mono text-[11px]">Post Creator</code>) saklanır.
            </p>
          </div>
          <div className="flex items-start space-x-2.5">
            <span className="text-[#e6c280] font-bold mt-0.5">•</span>
            <p>
              Sunucuda <b className="text-white">hiçbir görsel veya veri tutulmaz</b>; tam gizlilik ve kullanıcı mülkiyeti esastır.
            </p>
          </div>
          <div className="flex items-start space-x-2.5">
            <span className="text-[#e6c280] font-bold mt-0.5">•</span>
            <p>
              4:5 Instagram mizanpajı, editoryal arşiv ve tek tıkla yüksek çözünürlüklü dışa aktarım.
            </p>
          </div>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-xs text-red-200 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {/* Primary: Google ile Giriş Yap */}
          <button
            type="button"
            disabled={busy}
            onClick={handleGoogleSignIn}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-sans font-semibold text-sm flex items-center justify-center space-x-3 transition-all duration-200 shadow-[0_4px_20px_rgba(255,255,255,0.1)] disabled:opacity-50 active:scale-[0.99]"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Google'a Bağlanılıyor...</span>
              </>
            ) : (
              <>
                <GoogleLogo />
                <span>Google ile Giriş Yap</span>
              </>
            )}
          </button>

          {/* Secondary: Yerel Modda Devam Et */}
          <button
            type="button"
            onClick={onGuestContinue}
            className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white font-mono text-xs transition-colors border border-white/5 flex items-center justify-center space-x-2"
          >
            <span>Giriş Yapmadan Devam Et (Yerel Mod)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Google OAuth Ayarları (Genişletilebilir) */}
        <div className="pt-2 border-t border-white/5 text-center">
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="text-[11px] font-mono text-[#e6c280] hover:underline"
          >
            {showConfig ? 'Yapılandırmayı Gizle' : 'Google Client ID veya Token Tanımla'}
          </button>

          {showConfig && (
            <div className="mt-3 p-3.5 rounded-xl bg-black/60 border border-white/10 text-left space-y-3 animate-fadeIn">
              <div>
                <label className="text-[10px] font-mono text-neutral-400 block mb-1">
                  Google Cloud OAuth Client ID:
                </label>
                <input
                  type="text"
                  value={tempClientId}
                  onChange={(e) => setTempClientId(e.target.value)}
                  placeholder="...apps.googleusercontent.com"
                  className="w-full bg-[#0a0a0d] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-600 font-mono focus:outline-none focus:border-[#e6c280]"
                />
                <p className="text-[9px] text-neutral-500 mt-1">
                  Google Cloud Console &rarr; API & Services &rarr; Credentials &rarr; OAuth 2.0 Client ID (Web Application: <code className="text-neutral-400">http://localhost:5173</code>)
                </p>
              </div>

              <div className="pt-2 border-t border-white/5">
                <label className="text-[10px] font-mono text-neutral-400 block mb-1">
                  Veya Doğrudan OAuth Access Token (Test İçin):
                </label>
                <div className="flex space-x-1.5">
                  <input
                    type="password"
                    value={directToken}
                    onChange={(e) => setDirectToken(e.target.value)}
                    placeholder="ya29.a0A..."
                    className="flex-1 bg-[#0a0a0d] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-600 font-mono focus:outline-none focus:border-[#e6c280]"
                  />
                  <button
                    type="button"
                    onClick={handleDirectTokenLogin}
                    className="px-3 py-1.5 rounded-lg bg-[#e6c280] text-black font-semibold text-xs font-mono"
                  >
                    Bağlan
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center pt-1">
          <p className="text-[10px] font-mono text-neutral-500">
            Güvenli Google Drive REST API &bull; drive.file kapsamı
          </p>
        </div>

      </div>

    </div>
  );
}
