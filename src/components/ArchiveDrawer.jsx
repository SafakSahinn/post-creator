import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  ArrowUpRight,
  Search,
  Copy,
  Check,
  Bookmark,
  Cloud,
  CloudUpload,
  HardDrive,
  Key,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import {
  getStoredDriveToken,
  setStoredDriveToken,
  getStoredClientId,
  setStoredClientId,
  getStoredGoogleUser,
  setStoredGoogleUser,
  logoutGoogleDrive,
  fetchAndStoreUserProfile,
  backupPostToDrive,
  getDriveStorageQuota,
  requestGoogleDriveAuth
} from '../services/googleDrive';

export function ArchiveDrawer({
  isOpen,
  onClose,
  archives,
  onLoadPost,
  onDeletePost,
  onClearAll,
  onUpdateArchiveItem
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Google Drive State
  const [driveToken, setDriveToken] = useState(() => getStoredDriveToken());
  const [googleUser, setGoogleUser] = useState(() => getStoredGoogleUser());
  const [clientId, setClientId] = useState(() => getStoredClientId());
  const [showDriveConfig, setShowDriveConfig] = useState(false);
  const [tempTokenInput, setTempTokenInput] = useState('');
  const [tempClientIdInput, setTempClientIdInput] = useState('');
  const [driveQuota, setDriveQuota] = useState(null);
  const [syncingId, setSyncingId] = useState(null);
  const [syncAllLoading, setSyncAllLoading] = useState(false);
  const [driveStatusMsg, setDriveStatusMsg] = useState(null);

  useEffect(() => {
    if (driveToken && isOpen) {
      getDriveStorageQuota(driveToken)
        .then((quota) => setDriveQuota(quota))
        .catch(() => setDriveQuota(null));

      if (!googleUser) {
        fetchAndStoreUserProfile(driveToken)
          .then((u) => u && setGoogleUser(u))
          .catch(() => {});
      }
    }
  }, [driveToken, isOpen, googleUser]);

  useEffect(() => {
    const handleAuthChange = () => {
      setDriveToken(getStoredDriveToken());
      setGoogleUser(getStoredGoogleUser());
    };
    window.addEventListener('lore_drive_auth_change', handleAuthChange);
    return () => window.removeEventListener('lore_drive_auth_change', handleAuthChange);
  }, []);

  if (!isOpen) return null;

  const filtered = archives.filter(
    (item) =>
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.decade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.hook?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopyCaption = async (item, e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(item.formattedCaption);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveTokenDirectly = async () => {
    if (!tempTokenInput.trim()) return;
    const token = tempTokenInput.trim();
    setStoredDriveToken(token);
    setDriveToken(token);
    const user = await fetchAndStoreUserProfile(token);
    if (user) setGoogleUser(user);
    setShowDriveConfig(false);
    setDriveStatusMsg('Google Drive Token kaydedildi!');
    setTimeout(() => setDriveStatusMsg(null), 2500);
  };

  const handleConnectWithGis = async () => {
    const activeClientId = tempClientIdInput.trim() || clientId;
    if (!activeClientId) {
      setDriveStatusMsg('Lütfen Google OAuth Client ID girin.');
      return;
    }
    setStoredClientId(activeClientId);
    setClientId(activeClientId);

    try {
      setDriveStatusMsg('Google Giriş penceresi açılıyor...');
      const result = await requestGoogleDriveAuth(activeClientId);
      setDriveToken(result.token);
      if (result.user) setGoogleUser(result.user);
      setShowDriveConfig(false);
      setDriveStatusMsg('Google Drive başarıyla bağlandı!');
      setTimeout(() => setDriveStatusMsg(null), 3000);
    } catch (err) {
      setDriveStatusMsg(`Hata: ${err.message}`);
    }
  };

  const handleBackupSingleToDrive = async (item, e) => {
    e.stopPropagation();
    if (!driveToken) {
      setShowDriveConfig(true);
      setDriveStatusMsg('Lütfen önce Google ile Oturum Açın.');
      return;
    }

    try {
      setSyncingId(item.id);
      setDriveStatusMsg(`"${item.title?.slice(0, 25)}..." Drive'a yükleniyor...`);
      const gallery = item.savedGallery || [];
      const slideSettings = item.savedSlideSettings || {};

      const result = await backupPostToDrive(item, gallery, slideSettings, driveToken);
      if (onUpdateArchiveItem) {
        onUpdateArchiveItem({
          ...item,
          savedToDrive: true,
          driveBackupDate: new Date().toISOString(),
          driveFileId: result.fileId,
          driveWebViewLink: result.webViewLink
        });
      }
      setDriveStatusMsg(`"${item.title?.slice(0, 25)}" (${result.uploadedImagesCount} görsel) Drive'a yüklendi!`);
      setTimeout(() => setDriveStatusMsg(null), 3500);
    } catch (err) {
      console.error(err);
      setDriveStatusMsg(`Hata: ${err.message}`);
      alert(`Drive yükleme hatası: ${err.message}`);
    } finally {
      setSyncingId(null);
    }
  };

  const handleBackupAllToDrive = async () => {
    if (!driveToken) {
      setShowDriveConfig(true);
      setDriveStatusMsg('Lütfen önce Google ile Oturum Açın.');
      return;
    }

    try {
      setSyncAllLoading(true);
      setDriveStatusMsg('Tüm arşiv Google Drive\'a yükleniyor...');
      let count = 0;
      for (const item of archives) {
        const gallery = item.savedGallery || [];
        const slideSettings = item.savedSlideSettings || {};
        await backupPostToDrive(item, gallery, slideSettings, driveToken);
        count++;
        setDriveStatusMsg(`Yedekleniyor: ${count} / ${archives.length}...`);
      }
      setDriveStatusMsg(`Tüm arşiv (${archives.length} gönderi) Post Creator klasörüne başarıyla yedeklendi!`);
      setTimeout(() => setDriveStatusMsg(null), 4000);
    } catch (err) {
      console.error(err);
      setDriveStatusMsg(`Hata: ${err.message}`);
      alert(`Toplu yedekleme hatası: ${err.message}`);
    } finally {
      setSyncAllLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#121319] border-l border-white/10 h-full p-6 flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <Bookmark className="w-4 h-4 text-[#e6c280]" />
            <h3 className="font-serif text-lg font-bold text-white tracking-wide">
              Kayıtlı İçerik Arşivi
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/5 text-neutral-400">
              {archives.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Google Drive Status Bar & Quick Sync */}
        <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-emerald-950/20 via-black to-neutral-900 border border-emerald-500/20 text-xs font-mono space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cloud className={`w-4 h-4 ${driveToken ? 'text-emerald-400' : 'text-neutral-500'}`} />
              <span className="text-neutral-200 font-semibold">Google Drive Depolama</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded border ${
                  driveToken
                    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40'
                    : 'text-neutral-500 border-white/10'
                }`}
              >
                {driveToken ? 'Google Drive Bağlı' : 'Bağlı Değil'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowDriveConfig(!showDriveConfig)}
              className="text-[10px] text-[#e6c280] hover:underline"
            >
              {showDriveConfig ? 'Kapat' : driveToken ? 'Hesap Ayarları' : 'Giriş Yap'}
            </button>
          </div>

          {/* Logged in User Card */}
          {googleUser && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/50 border border-emerald-500/20">
              <div className="flex items-center space-x-2.5">
                {googleUser.picture ? (
                  <img src={googleUser.picture} alt="" className="w-6 h-6 rounded-full border border-emerald-400/40" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-400 font-bold">
                    G
                  </div>
                )}
                <div className="leading-tight">
                  <div className="text-[11px] font-sans font-semibold text-white">
                    {googleUser.name || 'Google Hesabı'}
                  </div>
                  <div className="text-[9px] font-mono text-neutral-400">
                    {googleUser.email || 'Drive Bağlantısı Aktif'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  logoutGoogleDrive();
                  setDriveToken('');
                  setGoogleUser(null);
                  setDriveQuota(null);
                  setDriveStatusMsg('Google oturumu kapatıldı.');
                  setTimeout(() => setDriveStatusMsg(null), 2000);
                }}
                className="text-[9px] font-mono text-neutral-400 hover:text-red-400 transition-colors px-1 py-0.5"
              >
                Çıkış
              </button>
            </div>
          )}

          {/* Drive Quota Preview */}
          {driveQuota && (
            <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-0.5">
              <span>Drive Kotası: {driveQuota.usageGb} GB / {driveQuota.limitGb} GB</span>
              <span className="text-emerald-400">%{driveQuota.percentUsed} Dolu</span>
            </div>
          )}

          {/* Drive Action Buttons */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-neutral-400">
              Görseller `Post Creator/images` klasöründe tutulur
            </span>
            <button
              type="button"
              disabled={syncAllLoading || archives.length === 0}
              onClick={handleBackupAllToDrive}
              className="px-2.5 py-1 rounded bg-[#e6c280]/15 hover:bg-[#e6c280]/25 text-[#e6c280] border border-[#e6c280]/30 text-[10px] flex items-center space-x-1.5 transition-all disabled:opacity-30"
              title="Tüm arşivi görselleriyle Google Drive'a aktar"
            >
              {syncAllLoading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Yedekleniyor...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-3 h-3" />
                  <span>Tümünü Drive'a Aktar</span>
                </>
              )}
            </button>
          </div>

          {/* Drive Config / Login Dropdown */}
          {showDriveConfig && (
            <div className="pt-2.5 border-t border-white/10 space-y-2.5 animate-fadeIn text-[11px]">
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-2">
                <span className="text-[10px] font-mono text-[#e6c280] font-semibold block">
                  1. Google ile Giriş Yap (OAuth 2.0)
                </span>
                <p className="text-[10px] text-neutral-400 leading-relaxed font-sans">
                  Google Drive'ınıza içerik ve görsel yazabilmek için Google hesabınızla oturum açılması gerekir.
                </p>
                <div>
                  <label className="text-[9px] text-neutral-400 block mb-0.5">Google OAuth Client ID:</label>
                  <input
                    type="text"
                    value={tempClientIdInput}
                    onChange={(e) => setTempClientIdInput(e.target.value)}
                    placeholder="...apps.googleusercontent.com"
                    className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-white text-[10px] font-mono focus:outline-none focus:border-[#e6c280]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleConnectWithGis}
                  className="w-full py-1.5 px-3 rounded-lg bg-white text-black hover:bg-neutral-200 font-sans font-semibold text-[11px] flex items-center justify-center space-x-2 transition-all shadow-md"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Google ile Oturum Aç</span>
                </button>
              </div>

              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1.5">
                <span className="text-[10px] font-mono text-neutral-400 font-semibold block">
                  2. Veya Doğrudan Google OAuth Access Token Gir:
                </span>
                <div className="flex space-x-1.5">
                  <input
                    type="password"
                    value={tempTokenInput}
                    onChange={(e) => setTempTokenInput(e.target.value)}
                    placeholder="ya29.a0A..."
                    className="flex-1 bg-black/60 border border-white/10 rounded px-2.5 py-1 text-white text-[10px] font-mono focus:outline-none focus:border-[#e6c280]"
                  />
                  <button
                    type="button"
                    onClick={handleSaveTokenDirectly}
                    className="px-2.5 py-1 rounded bg-white/10 text-white hover:bg-white/20 text-[10px]"
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            </div>
          )}

          {driveStatusMsg && (
            <div className="text-[10px] text-emerald-400 bg-emerald-950/30 p-1.5 rounded border border-emerald-500/20">
              {driveStatusMsg}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="py-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Başlık, kategori veya dönem ara..."
              className="w-full bg-[#0a0a0d] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#e6c280]"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-xs font-mono">
              {searchTerm ? 'Aramanıza uygun içerik bulunamadı.' : 'Henüz kaydedilmiş içerik yok.'}
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onLoadPost(item);
                  onClose();
                }}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#e6c280]/40 hover:bg-white/[0.05] transition-all cursor-pointer group relative"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#e6c280]/10 text-[#e6c280] border border-[#e6c280]/20">
                      {item.category}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-neutral-400">
                      {item.decade}
                    </span>
                    {item.savedToDrive && (
                      <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                        <Check className="w-2.5 h-2.5" />
                        <span>Drive'da</span>
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {/* Backup single to Drive */}
                    <button
                      type="button"
                      disabled={syncingId === item.id}
                      onClick={(e) => handleBackupSingleToDrive(item, e)}
                      title="Google Drive'a Görsellerle Yedekle"
                      className="p-1.5 rounded hover:bg-white/10 text-neutral-400 hover:text-[#e6c280] transition-colors"
                    >
                      {syncingId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#e6c280]" />
                      ) : (
                        <CloudUpload className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleCopyCaption(item, e)}
                      title="Metni Kopyala"
                      className="p-1.5 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                    >
                      {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePost(item.id);
                      }}
                      title="Arşivden Sil"
                      className="p-1.5 rounded hover:bg-red-500/20 text-neutral-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h4 className="font-serif font-bold text-sm text-white group-hover:text-[#e6c280] transition-colors leading-snug">
                  {item.title}
                </h4>
                
                <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1 font-sans">
                  "{item.hook}"
                </p>

                {/* Slayt Görselleri Önizleme Şeridi */}
                {item.thumbnails && item.thumbnails.some(Boolean) && (
                  <div className="flex items-center space-x-2 my-2.5 pt-1">
                    {item.thumbnails.map((thumb, idx) => (
                      <div
                        key={idx}
                        className="relative w-12 h-14 rounded-md overflow-hidden bg-black/60 border border-white/10 shrink-0 shadow-sm"
                      >
                        {thumb ? (
                          <img src={thumb} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[9px] font-mono text-neutral-600">
                            Boş
                          </div>
                        )}
                        <span className="absolute bottom-0 right-0 bg-black/80 px-1 text-[7px] font-mono text-neutral-300">
                          0{idx + 1}
                        </span>
                      </div>
                    ))}
                    <div className="text-[9px] font-mono text-neutral-500 pl-1">
                      4 Slayt Hazır
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[9px] font-mono text-neutral-500">
                  <span>{new Date(item.createdAt).toLocaleDateString('tr-TR')}</span>
                  <span className="text-[#e6c280] flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Görüntüle & Stüdyoya Yükle</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {archives.length > 0 && (
          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={onClearAll}
              className="text-neutral-500 hover:text-red-400 font-mono text-[11px] transition-colors"
            >
              Tüm Arşivi Temizle
            </button>
            <span className="font-mono text-[11px] text-neutral-500">
              {archives.length} kayıt
            </span>
          </div>
        )}

      </div>
    </div>
  );
}
