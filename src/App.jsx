import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { InputPanel } from './components/InputPanel';
import { OutputView } from './components/OutputView';
import { CarouselStudio } from './components/CarouselStudio';
import { SettingsModal } from './components/SettingsModal';
import { ArchiveDrawer } from './components/ArchiveDrawer';
import { GuideModal } from './components/GuideModal';
import { ProjectModal } from './components/ProjectModal';
import { LoginScreen } from './components/LoginScreen';
import { MetaConnectModal } from './components/MetaConnectModal';
import { MagazineModal } from './components/MagazineModal';
import { generateEditorialPost } from './services/gemini';
import {
  getAllProjects,
  getActiveProject,
  setActiveProjectId,
  saveProject,
  deleteProject
} from './services/projects';
import {
  getStoredGoogleUser,
  getStoredDriveToken,
  logoutGoogleDrive
} from './services/googleDrive';
import {
  getAllArchivesFromDb,
  saveArchiveToDb,
  batchSaveArchivesToDb,
  deleteArchiveFromDb,
  clearAllArchivesFromDb
} from './services/archiveDb';
import { AlertCircle, FileText, Layers, Sparkles, Key } from 'lucide-react';

export function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => getStoredGoogleUser());
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!getStoredGoogleUser() || !!getStoredDriveToken() || sessionStorage.getItem('lore_guest_mode') === 'true';
  });

  const handleLoginSuccess = (googleUser, token) => {
    setCurrentUser(googleUser);
    setIsAuthenticated(true);
    sessionStorage.removeItem('lore_guest_mode');
  };

  const handleGuestContinue = () => {
    sessionStorage.setItem('lore_guest_mode', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    logoutGoogleDrive();
    setCurrentUser(null);
    sessionStorage.removeItem('lore_guest_mode');
    setIsAuthenticated(false);
  };
  // Persistence & Settings
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('lore_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
  });
  const [model, setModel] = useState(() => {
    return localStorage.getItem('lore_gemini_model') || 'gemini-2.5-flash';
  });

  // Multi-Project State
  const [projects, setProjects] = useState(() => getAllProjects());
  const [activeProject, setActiveProject] = useState(() => getActiveProject());
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Editor Inputs (Aktif projeye göre başlatılır)
  const [category, setCategory] = useState(() => {
    const p = getActiveProject();
    return p?.categories?.[0]?.id || p?.categories?.[0]?.name || 'Dolap';
  });
  const [decade, setDecade] = useState(() => {
    const p = getActiveProject();
    return p?.filterOptions?.[0]?.id || p?.filterOptions?.[0]?.label || "80'ler";
  });
  const [customTopic, setCustomTopic] = useState('');

  // Generation State
  const [currentPost, setCurrentPost] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  // Gallery of user uploaded images
  const [gallery, setGallery] = useState([]);

  // Per-slide visual settings
  const [slideSettings, setSlideSettings] = useState({
    0: { imageId: null, filter: 'none', vignette: 75, zoom: 105, brightness: 100, showText: true, textOffsetY: 0, offsetX: 0, offsetY: 0 },
    1: { imageId: null, filter: 'none', vignette: 75, zoom: 105, brightness: 100, showText: true, textOffsetY: 0, offsetX: 0, offsetY: 0 },
    2: { imageId: null, filter: 'none', vignette: 75, zoom: 105, brightness: 100, showText: true, textOffsetY: 0, offsetX: 0, offsetY: 0 },
    3: { imageId: null, filter: 'none', vignette: 75, zoom: 105, brightness: 100, showText: true, textOffsetY: 0, offsetX: 0, offsetY: 0 },
  });

  // Tab State: 'editorial' | 'studio'
  const [activeTab, setActiveTab] = useState('editorial');

  // Archives (IndexedDB ve localStorage senkronize)
  const [archives, setArchives] = useState([]);

  useEffect(() => {
    getAllArchivesFromDb().then((items) => {
      if (items && items.length > 0) {
        setArchives(items);
      } else {
        try {
          const saved = localStorage.getItem('lore_archives');
          if (saved) setArchives(JSON.parse(saved));
        } catch {
          // ignore
        }
      }
    });
  }, []);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
  const [isMagazineOpen, setIsMagazineOpen] = useState(false);

  // Sync archives to localStorage for quick fallback
  useEffect(() => {
    try {
      // Save lighter version to localStorage without huge raw dataUrls if too large
      localStorage.setItem('lore_archives', JSON.stringify(archives.slice(0, 30)));
    } catch (e) {
      console.warn('localStorage dolu, IndexedDB kullanılıyor:', e);
    }
  }, [archives]);

  // Save API key
  const handleSaveApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem('lore_gemini_api_key', key);
  };

  const handleSaveModel = (newModel) => {
    setModel(newModel);
    localStorage.setItem('lore_gemini_model', newModel);
  };

  // Proje Değiştirme ve Stüdyo Çalışma Alanını Sıfırlama
  const handleSwitchProject = (targetProject) => {
    if (!targetProject) return;
    setActiveProjectId(targetProject.id);
    setActiveProject(targetProject);
    if (targetProject.categories?.[0]) {
      setCategory(targetProject.categories[0].id || targetProject.categories[0].name);
    }
    if (targetProject.filterOptions?.[0]) {
      setDecade(targetProject.filterOptions[0].id || targetProject.filterOptions[0].label);
    }
    // Önceki projeye ait içerik ve görselleri temizle, stüdyoyu temiz bekleme moduna al
    setCustomTopic('');
    setCurrentPost(null);
    setGallery([]);
    setSlideSettings({
      0: { imageId: null, filter: 'none', vignette: 75, zoom: 105, brightness: 100, showText: true, textOffsetY: 0, offsetX: 0, offsetY: 0, customQuote: null },
      1: { imageId: null, filter: 'none', vignette: 75, zoom: 105, brightness: 100, showText: true, textOffsetY: 0, offsetX: 0, offsetY: 0, customQuote: null },
      2: { imageId: null, filter: 'none', vignette: 75, zoom: 105, brightness: 100, showText: true, textOffsetY: 0, offsetX: 0, offsetY: 0, customQuote: null },
      3: { imageId: null, filter: 'none', vignette: 75, zoom: 105, brightness: 100, showText: true, textOffsetY: 0, offsetX: 0, offsetY: 0, customQuote: null },
    });
    setActiveTab('editorial');
    setErrorMessage(null);
  };

  // Post Creator Logosuna Tıklandığında Seçili Projede Temiz Boş Çalışma Alanı Açma
  const handleResetWorkspace = () => {
    setCurrentPost(null);
    setGallery([]);
    setCustomTopic('');
    setSlideSettings({
      0: { imageId: null, filter: 'none', vignette: 75, zoom: 105, brightness: 100, showText: true, textOffsetY: 0, offsetX: 0, offsetY: 0, customQuote: null },
      1: { imageId: null, filter: 'none', vignette: 75, zoom: 105, brightness: 100, showText: true, textOffsetY: 0, offsetX: 0, offsetY: 0, customQuote: null },
      2: { imageId: null, filter: 'none', vignette: 75, zoom: 105, brightness: 100, showText: true, textOffsetY: 0, offsetX: 0, offsetY: 0, customQuote: null },
      3: { imageId: null, filter: 'none', vignette: 75, zoom: 105, brightness: 100, showText: true, textOffsetY: 0, offsetX: 0, offsetY: 0, customQuote: null },
    });
    setActiveTab('editorial');
    setErrorMessage(null);
  };

  // Generate Post
  const handleGenerate = async () => {
    if (!apiKey) {
      setIsSettingsOpen(true);
      return;
    }

    setIsLoading(true);
    setProgressText('Küratör motoru başlatılıyor...');
    setErrorMessage(null);

    try {
      const result = await generateEditorialPost({
        apiKey,
        category,
        decade,
        customTopic,
        model,
        onProgress: (msg) => setProgressText(msg),
        project: activeProject
      });

      setCurrentPost(result);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'İçerik üretilirken bir hata oluştu.');
      if (err.message.includes('API')) {
        setIsSettingsOpen(true);
      }
    } finally {
      setIsLoading(false);
      setProgressText('');
    }
  };

  // Archive Handlers - Görseller, Slayt Ayarları ve Özel Metinlerle Birlikte Kayıt & Güncelleme
  const handleSaveToArchive = async (postToSave = currentPost) => {
    if (!postToSave) return;
    const existsIndex = archives.findIndex((a) => a.id === postToSave.id || a.title === postToSave.title);

    const activeSettings = postToSave.savedSlideSettings || slideSettings;
    const activeGallery = postToSave.savedGallery || gallery;

    const thumbs = [
      activeGallery.find((g) => g.id === activeSettings?.[0]?.imageId)?.dataUrl || null,
      activeGallery.find((g) => g.id === activeSettings?.[1]?.imageId)?.dataUrl || null,
      activeGallery.find((g) => g.id === activeSettings?.[2]?.imageId)?.dataUrl || null,
      activeGallery.find((g) => g.id === activeSettings?.[3]?.imageId)?.dataUrl || null,
    ];

    const activeWatermark = (activeProject?.watermark || activeProject?.shortCode || postToSave.watermark || postToSave.projectShortCode || 'L O R E').trim();
    const activeAccent = activeProject?.accentColor || postToSave.accentColor || '#e6c280';
    const activeProjectIdVal = activeProject?.id || postToSave.projectId || 'lore-magazine';
    const activeProjectNameVal = activeProject?.name || postToSave.projectName || 'Lore Magazine';
    const activeShortCode = activeProject?.shortCode || postToSave.projectShortCode || 'LORE';

    const updatedSlideQuotes = [
      activeSettings?.[1]?.customQuote || postToSave.slideQuotes?.[0],
      activeSettings?.[2]?.customQuote || postToSave.slideQuotes?.[1],
      activeSettings?.[3]?.customQuote || postToSave.slideQuotes?.[2]
    ];

    const enriched = {
      ...postToSave,
      projectId: activeProjectIdVal,
      projectName: activeProjectNameVal,
      projectShortCode: activeShortCode,
      watermark: activeWatermark,
      accentColor: activeAccent,
      slideQuotes: updatedSlideQuotes.some(Boolean) ? updatedSlideQuotes : postToSave.slideQuotes,
      savedGallery: activeGallery,
      savedSlideSettings: activeSettings,
      thumbnails: thumbs,
      updatedAt: new Date().toISOString()
    };

    await saveArchiveToDb(enriched);
    setCurrentPost(enriched);
    setSlideSettings(activeSettings);

    if (existsIndex >= 0) {
      const copy = [...archives];
      copy[existsIndex] = enriched;
      setArchives(copy);
    } else {
      setArchives([enriched, ...archives]);
    }
  };

  const handleDeletePost = async (id) => {
    await deleteArchiveFromDb(id);
    setArchives((prev) => prev.filter((a) => a.id !== id));
  };

  const handleClearAllArchives = async () => {
    if (window.confirm('Tüm kayıtlı arşivi ve görselleri silmek istediğinize emin misiniz?')) {
      await clearAllArchivesFromDb();
      setArchives([]);
    }
  };

  const handleLoadPostFromArchive = (item) => {
    const matchProj = item.projectId ? projects.find((p) => p.id === item.projectId) : activeProject;
    const enrichedItem = {
      ...item,
      watermark: item.watermark || matchProj?.watermark || item.projectShortCode || matchProj?.shortCode || 'L O R E',
      accentColor: item.accentColor || matchProj?.accentColor || '#e6c280'
    };

    setCurrentPost(enrichedItem);
    if (matchProj) {
      setActiveProject(matchProj);
      setActiveProjectId(matchProj.id);
    }
    if (item.category) setCategory(item.category);
    if (item.decade) setDecade(item.decade);
    if (item.savedGallery && item.savedGallery.length > 0) {
      setGallery(item.savedGallery);
    }
    if (item.savedSlideSettings) {
      setSlideSettings(item.savedSlideSettings);
    }
    setActiveTab('studio');
  };

  const handleUpdateArchiveItem = async (updatedItem) => {
    await saveArchiveToDb(updatedItem);
    setArchives((prev) => prev.map((a) => (a.id === updatedItem.id ? updatedItem : a)));
    setCurrentPost((curr) => {
      if (curr && (curr.id === updatedItem.id || curr.title === updatedItem.title)) {
        if (updatedItem.savedSlideSettings) {
          setSlideSettings(updatedItem.savedSlideSettings);
        }
        if (updatedItem.savedGallery) {
          setGallery(updatedItem.savedGallery);
        }
        return { ...curr, ...updatedItem };
      }
      return curr;
    });
  };

  const handleBatchUpdateArchives = async (updatedList) => {
    await batchSaveArchivesToDb(updatedList);
    setArchives(updatedList);
    setCurrentPost((curr) => {
      if (!curr) return null;
      const match = updatedList.find((u) => u.id === curr.id || u.title === curr.title);
      if (match) {
        if (match.savedSlideSettings) {
          setSlideSettings(match.savedSlideSettings);
        }
        if (match.savedGallery) {
          setGallery(match.savedGallery);
        }
        return { ...curr, ...match };
      }
      return curr;
    });
  };

  const isCurrentPostSaved = currentPost
    ? archives.some((a) => a.id === currentPost.id || a.title === currentPost.title)
    : false;

  // Giriş Kapısı (Login Gate)
  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        onGuestContinue={handleGuestContinue}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#090a0d] text-neutral-200 flex flex-col font-sans selection:bg-[#e6c280] selection:text-black">
      
      {/* Top Header */}
      <Header
        hasApiKey={!!apiKey}
        onOpenSettings={() => setIsSettingsOpen(true)}
        archiveCount={archives.length}
        onOpenArchive={() => setIsArchiveOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        user={currentUser}
        onLogout={handleLogout}
        model={model}
        activeProject={activeProject}
        onOpenProjects={() => setIsProjectModalOpen(true)}
        onResetWorkspace={handleResetWorkspace}
        onOpenMetaModal={() => setIsMetaModalOpen(true)}
        onOpenMagazine={() => setIsMagazineOpen(true)}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Banner if API Key is Missing */}
        {!apiKey && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-transparent border border-amber-500/30 flex items-center justify-between text-xs animate-fadeIn">
            <div className="flex items-center space-x-3 text-amber-200">
              <Key className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                İçerik motorunun çalışması için ücretsiz Gemini API anahtarınızı tanımlayın. (1 dakikada alınabilir)
              </span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3.5 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-black font-semibold font-mono text-[11px] tracking-wider uppercase transition-colors shrink-0 ml-4"
            >
              Anahtar Tanımla
            </button>
          </div>
        )}

        {/* Error message banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs flex items-center justify-between animate-fadeIn">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-white font-mono text-xs ml-4"
            >
              Kapat
            </button>
          </div>
        )}

        {/* Two-Column Studio Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Input & Control Room (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center space-x-2 pb-1 border-b border-white/5">
              <span className="w-2 h-2 rounded-full bg-[#e6c280]" />
              <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-neutral-300">
                Parametre & Küratör Odası
              </h2>
            </div>

            <InputPanel
              selectedCategory={category}
              onSelectCategory={setCategory}
              selectedDecade={decade}
              onSelectDecade={setDecade}
              customTopic={customTopic}
              onChangeCustomTopic={setCustomTopic}
              onGenerate={handleGenerate}
              isLoading={isLoading}
              progressText={progressText}
              model={model}
              onOpenSettings={() => setIsSettingsOpen(true)}
              project={activeProject}
              onOpenProjects={() => setIsProjectModalOpen(true)}
            />

            {/* Quick Tips */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-neutral-400 font-mono space-y-2">
              <div className="text-neutral-300 font-semibold flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#e6c280]" />
                <span>Küratör Püf Noktası:</span>
              </div>
              <p>
                Birden fazla görsel yükleyip <strong>istediğiniz slaytın arkasına istediğiniz görseli</strong> atayabilirsiniz. Yapılan değişiklikleri geri almak için <kbd className="text-[#e6c280] font-bold">Ctrl + Z</kbd> tuşlarını kullanabilirsiniz.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: Output Studio & Visual Mockup (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* View Switcher Tabs (2 Clean Tabs) */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center space-x-2">
                
                {/* 1. Metin & Caption */}
                <button
                  type="button"
                  onClick={() => setActiveTab('editorial')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-mono flex items-center space-x-2 transition-all ${
                    activeTab === 'editorial'
                      ? 'bg-[#e6c280] text-black font-bold shadow-[0_0_15px_rgba(230,194,128,0.2)]'
                      : 'text-neutral-400 hover:text-white bg-white/5'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Editoryal Metin & Caption</span>
                </button>

                {/* 2. Carousel & Görsel Stüdyosu */}
                <button
                  type="button"
                  onClick={() => setActiveTab('studio')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-mono flex items-center space-x-2 transition-all ${
                    activeTab === 'studio'
                      ? 'bg-[#e6c280] text-black font-bold shadow-[0_0_15px_rgba(230,194,128,0.2)]'
                      : 'text-neutral-400 hover:text-white bg-white/5'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Carousel & Görsel Stüdyosu</span>
                  {gallery.length > 0 && (
                    <span className="bg-[#e6c280] text-black font-bold text-[9px] px-1.5 py-0.2 rounded-full">
                      {gallery.length}
                    </span>
                  )}
                </button>

              </div>

              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest hidden sm:inline">
                Dergi Mizanpajı
              </span>
            </div>

            {/* Tab Contents */}
            {activeTab === 'editorial' ? (
              <OutputView
                post={currentPost}
                onSaveToArchive={handleSaveToArchive}
                isSaved={isCurrentPostSaved}
                onOpenEditor={() => setActiveTab('studio')}
                hasImages={gallery.length > 0}
                model={model}
              />
            ) : (
              <CarouselStudio
                post={currentPost}
                project={activeProject}
                gallery={gallery}
                onUpdateGallery={setGallery}
                slideSettings={slideSettings}
                onUpdateSlideSettings={setSlideSettings}
                onSaveToArchive={handleSaveToArchive}
                isSaved={isCurrentPostSaved}
                onOpenMetaConnect={() => setIsMetaModalOpen(true)}
                onOpenMagazine={() => setIsMagazineOpen(true)}
              />
            )}

          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 mt-12 bg-black/40">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-[11px] font-mono text-neutral-500 tracking-wider">
            POST CREATOR · EDİTORYAL İÇERİK MOTORU & BİRLEŞİK INSTAGRAM STÜDYOSU
          </p>
        </div>
      </footer>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
        model={model}
        onSaveModel={handleSaveModel}
      />

      <ArchiveDrawer
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        archives={archives}
        onLoadPost={handleLoadPostFromArchive}
        onDeletePost={handleDeletePost}
        onClearAll={handleClearAllArchives}
        onUpdateArchiveItem={handleUpdateArchiveItem}
        activeProject={activeProject}
        onBatchUpdateArchives={handleBatchUpdateArchives}
        onOpenMagazine={() => setIsMagazineOpen(true)}
      />

      <GuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onOpenSettings={() => {
          setIsGuideOpen(false);
          setIsSettingsOpen(true);
        }}
        onOpenProjects={() => {
          setIsGuideOpen(false);
          setIsProjectModalOpen(true);
        }}
        onOpenMeta={() => {
          setIsGuideOpen(false);
          setIsMetaModalOpen(true);
        }}
      />

      {/* Multi-Project Manager Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        projects={projects}
        activeProject={activeProject}
        onSelectProject={(id) => {
          const p = projects.find((x) => x.id === id);
          if (p) handleSwitchProject(p);
        }}
        onSaveProject={(proj) => {
          saveProject(proj);
          const updated = getAllProjects();
          setProjects(updated);
          handleSwitchProject(proj);
        }}
        onDeleteProject={(id) => {
          deleteProject(id);
          const updated = getAllProjects();
          setProjects(updated);
          const newActive = getActiveProject();
          handleSwitchProject(newActive);
        }}
      />

      {/* Meta / Instagram Connect Modal */}
      <MetaConnectModal
        isOpen={isMetaModalOpen}
        onClose={() => setIsMetaModalOpen(false)}
      />

      {/* 90's Editorial Magazine Reader Modal */}
      <MagazineModal
        isOpen={isMagazineOpen}
        onClose={() => setIsMagazineOpen(false)}
        archives={archives}
        activeProject={activeProject}
        onLoadPostToStudio={(p) => {
          handleLoadPostFromArchive(p);
          setIsMagazineOpen(false);
        }}
        onUpdateArchiveItem={handleUpdateArchiveItem}
      />

    </div>
  );
}

export default App;
