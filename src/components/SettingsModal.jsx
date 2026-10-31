import React, { useState, useEffect } from 'react';
import { X, Key, ExternalLink, Check, AlertCircle, ShieldCheck, Gauge, RotateCcw, RefreshCw } from 'lucide-react';
import { probeWorkingModels, getCachedModelProbe, pickBestModel } from '../services/gemini';
import { getQuotaStats, resetQuotaStats } from '../services/apiQuota';

export function SettingsModal({ isOpen, onClose, apiKey, onSaveApiKey, model, onSaveModel }) {
  const [tempKey, setTempKey] = useState(apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [tempModel, setTempModel] = useState(model || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: bool, message: string }
  const [quotaStats, setQuotaStats] = useState(() => getQuotaStats());
  // Model taraması: her model gerçekten denenir, yalnız cevap verenler (ok/yoğun) seçilebilir
  const [probe, setProbe] = useState({ results: null, at: null, loading: false, done: 0, total: 0, error: null });

  const runProbe = async (key, force) => {
    if (!key?.trim()) return null;
    setProbe((p) => ({ ...p, loading: true, done: 0, total: 0, error: null }));
    try {
      const results = await probeWorkingModels(key.trim(), {
        force,
        onProgress: (done, total) => setProbe((p) => ({ ...p, done, total }))
      });
      setProbe({ results, at: Date.now(), loading: false, done: 0, total: 0, error: null });
      setQuotaStats(getQuotaStats());
      return results;
    } catch (err) {
      setProbe((p) => ({ ...p, loading: false, error: err.message }));
      return null;
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setQuotaStats(getQuotaStats());
    setTempKey(apiKey || '');
    setTempModel(model || '');
    setTestResult(null);
    if (!apiKey?.trim()) {
      setProbe({ results: null, at: null, loading: false, done: 0, total: 0, error: null });
      return;
    }
    const cached = getCachedModelProbe(apiKey.trim());
    if (cached) setProbe({ results: cached.results, at: cached.at, loading: false, done: 0, total: 0, error: null });
    else runProbe(apiKey, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const selectable = (probe.results || []).filter((r) => r.status !== 'dead');
  const deadCount = (probe.results || []).filter((r) => r.status === 'dead').length;
  const recommendedId = pickBestModel(probe.results);
  const isSelectable = (id) => selectable.some((r) => r.id === id);
  const keyChanged = tempKey.trim() !== (apiKey || '').trim();

  const handleDirectSave = () => {
    if (!tempKey.trim()) {
      setTestResult({ success: false, message: 'Lütfen bir API anahtarı girin.' });
      return;
    }
    onSaveApiKey(tempKey.trim());
    // Çalışmayan model kaydedilmez
    if (isSelectable(tempModel)) onSaveModel(tempModel);
    setTestResult({ success: true, message: 'Kaydedildi!' });
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleTestAndSave = async () => {
    if (!tempKey.trim()) {
      setTestResult({ success: false, message: 'Lütfen bir API anahtarı girin.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Anahtar değiştiyse ya da hiç taranmadıysa modelleri baştan dene
      const results = await runProbe(tempKey, keyChanged || !probe.results);
      if (!results) throw new Error('Modeller denenemedi. API anahtarınızı kontrol edin.');
      const working = results.filter((r) => r.status !== 'dead');
      if (!working.length) throw new Error('Bu anahtarla çalışan model bulunamadı.');

      const chosen = working.some((r) => r.id === tempModel) ? tempModel : pickBestModel(results);

      onSaveApiKey(tempKey.trim());
      onSaveModel(chosen);
      setTempModel(chosen);

      setTestResult({
        success: true,
        message: `Bağlantı başarılı! ${working.length} model çalışıyor. (${chosen} aktif edildi)`
      });

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setTestResult({
        success: false,
        message: `Hata: ${err.message}`
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#121319] border border-white/10 rounded-xl p-6 sm:p-8 shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2.5 rounded-lg bg-[#e6c280]/10 border border-[#e6c280]/30 text-[#e6c280]">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold text-white tracking-wide">
              Gemini API Ayarları
            </h3>
            <p className="text-xs text-neutral-400 font-mono">
              Kişisel ve Ücretsiz Yapay Zeka Motoru
            </p>
          </div>
        </div>

        {/* Explanation */}
        <div className="mb-5 p-4 rounded-lg bg-neutral-900/80 border border-white/5 text-xs text-neutral-300 space-y-2">
          <div className="flex items-center space-x-2 text-[#e6c280] font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>%100 Ücretsiz ve Güvenli</span>
          </div>
          <p>
            Google AI Studio bireysel kullanım için ücretsizdir. API anahtarınız sunuculara gönderilmez, sadece tarayıcınızın yerel hafızasında saklanır.
          </p>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 text-[#e6c280] hover:underline pt-1 font-mono"
          >
            <span>Google AI Studio'dan Ücretsiz Anahtar Al</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Kalan İstek Hakkı & Kota Kartı */}
        <div className="mb-5 p-4 rounded-xl bg-gradient-to-br from-emerald-950/30 via-[#0e1017] to-black border border-emerald-500/25 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-emerald-400 font-mono text-xs font-semibold">
              <Gauge className="w-4 h-4" />
              <span>Google AI Studio Kota & İstek Durumu</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              Ücretsiz Tier
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 py-1">
            <div className="p-2.5 rounded-lg bg-black/60 border border-white/5 text-center">
              <span className="text-[10px] font-mono text-neutral-400 block">Kalan İstek</span>
              <span className="text-base font-mono font-bold text-emerald-400 block">
                {quotaStats.remaining.toLocaleString('tr-TR')}
              </span>
              <span className="text-[9px] font-mono text-neutral-500 block">/ {quotaStats.dailyLimit} Günlük</span>
            </div>

            <div className="p-2.5 rounded-lg bg-black/60 border border-white/5 text-center">
              <span className="text-[10px] font-mono text-neutral-400 block">Bugün Kullanılan</span>
              <span className="text-base font-mono font-bold text-white block">
                {quotaStats.used.toLocaleString('tr-TR')}
              </span>
              <span className="text-[9px] font-mono text-neutral-500 block">istek üretildi</span>
            </div>

            <div className="p-2.5 rounded-lg bg-black/60 border border-white/5 text-center">
              <span className="text-[10px] font-mono text-neutral-400 block">Hız Limiti</span>
              <span className="text-base font-mono font-bold text-[#e6c280] block">
                {quotaStats.rpmLimit} RPM
              </span>
              <span className="text-[9px] font-mono text-neutral-500 block">istek / dakika</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-neutral-400">
              <span>Günlük Kullanım: %{quotaStats.percentUsed}</span>
              <span className="text-emerald-400 font-bold">%{quotaStats.percentRemaining} Kullanılabilir</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-[#e6c280] rounded-full transition-all duration-300"
                style={{ width: `${Math.max(3, quotaStats.percentRemaining)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[9px] font-mono text-neutral-500 pt-0.5">
            <span>Kota her gün 00:00'da sıfırlanır (ücretsiz).</span>
            <button
              type="button"
              onClick={() => {
                resetQuotaStats();
                setQuotaStats(getQuotaStats());
              }}
              className="text-neutral-400 hover:text-emerald-400 flex items-center space-x-1 transition-colors"
              title="Günlük sayacı sıfırla"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Sayacı Sıfırla</span>
            </button>
          </div>
        </div>

        {/* API Key Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 mb-1.5">
              Google Gemini API Anahtarı
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-[#0a0a0d] border border-white/10 rounded-lg px-4 py-2.5 pr-20 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#e6c280] font-mono transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-xs text-neutral-400 hover:text-white font-mono"
              >
                {showKey ? 'Gizle' : 'Göster'}
              </button>
            </div>
          </div>

          {/* Model selection */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 mb-1.5 flex items-center justify-between">
              <span>Yapay Zeka Modeli</span>
              <button
                type="button"
                disabled={probe.loading || !tempKey.trim()}
                onClick={() => runProbe(tempKey, true)}
                className="text-[10px] font-normal normal-case tracking-normal text-neutral-400 hover:text-white disabled:opacity-40 flex items-center space-x-1 transition-colors"
                title="Hesabındaki modelleri yeniden dene"
              >
                <RefreshCw className={`w-3 h-3 ${probe.loading ? 'animate-spin' : ''}`} />
                <span>{probe.loading ? 'Deneniyor…' : 'Modelleri Yeniden Tara'}</span>
              </button>
            </label>

            {!tempKey.trim() ? (
              <p className="text-[11px] text-neutral-500 font-mono py-2">Modelleri görmek için önce API anahtarını girin.</p>
            ) : probe.loading && !probe.results ? (
              <p className="text-[11px] text-neutral-400 font-mono py-2">
                Hesabındaki modeller tek tek deneniyor{probe.total ? ` (${probe.done}/${probe.total})` : ''}… yalnızca cevap verenler listelenecek.
              </p>
            ) : probe.error && !probe.results ? (
              <p className="text-[11px] text-red-300 font-mono py-2">{probe.error}</p>
            ) : keyChanged ? (
              <p className="text-[11px] text-neutral-400 font-mono py-2">Yeni anahtarın modellerini görmek için "Modelleri Yeniden Tara" ya da "Doğrula ve Kaydet".</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 mb-2 max-h-52 overflow-y-auto pr-1">
                  {selectable.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setTempModel(m.id)}
                      title={m.status === 'busy' ? `Şu an yoğun (${m.code}); seçilebilir ama yavaş/başarısız olabilir` : `${m.id} — ${(m.ms / 1000).toFixed(1)} sn'de cevap verdi`}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        tempModel === m.id
                          ? 'border-[#e6c280] bg-[#e6c280]/10 text-white shadow-[0_0_12px_rgba(230,194,128,0.15)] ring-1 ring-[#e6c280]/40'
                          : 'border-white/10 bg-neutral-900/40 text-neutral-400 hover:border-white/20'
                      }`}
                    >
                      <div className="text-xs font-semibold text-white truncate">{m.displayName}</div>
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <span className="text-[9px] font-mono text-neutral-500 truncate">{m.id}</span>
                        {m.id === recommendedId ? (
                          <span className="text-[9px] font-mono text-[#e6c280] border border-[#e6c280]/30 px-1 rounded shrink-0">Önerilen</span>
                        ) : m.status === 'busy' ? (
                          <span className="text-[9px] font-mono text-amber-300 border border-amber-400/30 px-1 rounded shrink-0">Yoğun</span>
                        ) : (
                          <span className="text-[9px] font-mono text-emerald-300 shrink-0">{(m.ms / 1000).toFixed(1)} sn</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-mono text-neutral-500">
                  {selectable.length} model çalışıyor
                  {deadCount > 0 && ` · ${deadCount} model bu hesapta kapalı, listede gösterilmiyor`}
                  {probe.at && ` · son tarama ${new Date(probe.at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`}
                  {probe.loading && probe.total ? ` · yenileniyor ${probe.done}/${probe.total}` : ''}
                </p>
                {tempModel && !isSelectable(tempModel) && (
                  <p className="text-[10px] font-mono text-amber-300 mt-1">
                    Kayıtlı model ({tempModel}) bu hesapta çalışmıyor; listeden bir model seç.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Status Message */}
          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start space-x-2 ${
                testResult.success
                  ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-200'
                  : 'bg-red-950/40 border border-red-500/30 text-red-200'
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded text-xs font-mono text-neutral-400 hover:text-white transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleDirectSave}
              className="px-4 py-2 rounded bg-white/10 hover:bg-white/15 text-neutral-200 hover:text-white font-mono text-xs transition-colors border border-white/10"
              title="Test yapmadan doğrudan kaydet"
            >
              Doğrudan Kaydet
            </button>
            <button
              type="button"
              disabled={testing}
              onClick={handleTestAndSave}
              className="px-5 py-2.5 rounded bg-[#e6c280] hover:bg-[#d4b06e] text-black font-semibold text-xs font-mono uppercase tracking-wider transition-all disabled:opacity-50 flex items-center space-x-2 shadow-[0_0_15px_rgba(230,194,128,0.2)]"
            >
              {testing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Hızlı Doğrulanıyor...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Doğrula ve Kaydet</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
