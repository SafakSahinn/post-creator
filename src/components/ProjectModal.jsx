import React, { useState } from 'react';
import {
  X,
  Plus,
  Check,
  Trash2,
  Edit3,
  Sparkles,
  Layers,
  FolderPlus,
  Palette,
  ArrowRight,
  HelpCircle,
  Copy
} from 'lucide-react';
import { BUILTIN_PROJECTS } from '../services/projects';
import { countIssuesForProject } from '../services/magazineIssues';

export function ProjectModal({
  isOpen,
  onClose,
  projects,
  archives = [],
  activeProject,
  onSelectProject,
  onSaveProject,
  onDeleteProject
}) {
  const [view, setView] = useState('list'); // 'list' | 'create' | 'edit'
  const [editingProject, setEditingProject] = useState(null);
  // Formun başladığı proje (düzenlenen ya da kopyalanan şablon); ad eski haline
  // dönerse orijinal id geri verilir ki hazır konu önerileri (curatedTopics) kaybolmasın
  const [sourceProject, setSourceProject] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    shortCode: '',
    watermark: '',
    tagline: '',
    badge: 'Kültür & Medya',
    buttonText: 'İçeriği Üret',
    accentColor: '#e6c280',
    editorialTone: '',
    filterTypeLabel: '02 / DÖNEM VEYA ODAK BELİRLE',
    filterCategoryTitle: 'Filtre',
    categories: [
      { id: 'Kat1', name: 'Kategori 1', sublabel: 'Alt Başlık', badge: 'Özel', iconName: 'Box', tooltip: { title: 'Kategori 1', description: 'Açıklama' } },
      { id: 'Kat2', name: 'Kategori 2', sublabel: 'Alt Başlık', badge: 'Özel', iconName: 'Film', tooltip: { title: 'Kategori 2', description: 'Açıklama' } },
      { id: 'Kat3', name: 'Kategori 3', sublabel: 'Alt Başlık', badge: 'Özel', iconName: 'Shirt', tooltip: { title: 'Kategori 3', description: 'Açıklama' } },
      { id: 'Kat4', name: 'Kategori 4', sublabel: 'Alt Başlık', badge: 'Özel', iconName: 'Utensils', tooltip: { title: 'Kategori 4', description: 'Açıklama' } }
    ],
    filterOptions: [
      { id: 'Opt1', label: 'Seçenek 1', sublabel: 'Alt Açıklama 1' },
      { id: 'Opt2', label: 'Seçenek 2', sublabel: 'Alt Açıklama 2' },
      { id: 'Opt3', label: 'Seçenek 3', sublabel: 'Alt Açıklama 3' },
      { id: 'Opt4', label: 'Seçenek 4', sublabel: 'Alt Açıklama 4' }
    ],
    curatedTopics: {}
  });

  if (!isOpen) return null;

  const handleStartCreate = (template = null) => {
    if (template) {
      // Derin kopya: form düzenlemeleri şablonun (yerleşik proje dahil) kendi
      // kategori/filtre nesnelerini yerinde değiştirmesin
      setFormData({
        ...JSON.parse(JSON.stringify(template)),
        id: 'proj_' + Date.now(),
        name: `${template.name} (Kopya)`,
        shortCode: template.shortCode + '2',
        watermark: template.watermark || template.shortCode || ''
      });
    } else {
      setFormData({
        id: 'proj_' + Date.now(),
        name: '',
        shortCode: '',
        watermark: '',
        tagline: '',
        badge: 'Özel Kanal',
        buttonText: 'İçeriği Üret',
        accentColor: '#e6c280',
        editorialTone: 'Minimalist, entelektüel, derinlikli ve akıcı dergi üslubu. Kesinlikle hiçbir emoji kullanma.',
        filterTypeLabel: '02 / ODAK VE DERİNLİK',
        filterCategoryTitle: 'Filtre',
        categories: [
          { id: 'Kategori 1', name: 'Kategori 1', sublabel: 'Alt Başlık 1', badge: '01', iconName: 'Box', tooltip: { title: 'Kategori 1', description: 'Açıklama 1' } },
          { id: 'Kategori 2', name: 'Kategori 2', sublabel: 'Alt Başlık 2', badge: '02', iconName: 'Film', tooltip: { title: 'Kategori 2', description: 'Açıklama 2' } },
          { id: 'Kategori 3', name: 'Kategori 3', sublabel: 'Alt Başlık 3', badge: '03', iconName: 'Shirt', tooltip: { title: 'Kategori 3', description: 'Açıklama 3' } },
          { id: 'Kategori 4', name: 'Kategori 4', sublabel: 'Alt Başlık 4', badge: '04', iconName: 'Utensils', tooltip: { title: 'Kategori 4', description: 'Açıklama 4' } }
        ],
        filterOptions: [
          { id: 'Filtre 1', label: 'Filtre 1', sublabel: 'Açıklama 1' },
          { id: 'Filtre 2', label: 'Filtre 2', sublabel: 'Açıklama 2' },
          { id: 'Filtre 3', label: 'Filtre 3', sublabel: 'Açıklama 3' },
          { id: 'Filtre 4', label: 'Filtre 4', sublabel: 'Açıklama 4' }
        ],
        curatedTopics: {}
      });
    }
    setEditingProject(null);
    setSourceProject(template);
    setView('create');
  };

  const handleStartEdit = (proj) => {
    setEditingProject(proj);
    setSourceProject(proj);
    setFormData({
      ...JSON.parse(JSON.stringify(proj)),
      watermark: proj.watermark || proj.shortCode || ''
    });
    setView('edit');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Lütfen proje adını girin.');
      return;
    }
    const name = formData.name.trim();
    // Kategori/filtre id'si adından türetiliyor; boş veya tekrarlanan ad seçimi bozar
    // (iki kart birden seçili görünür, React anahtarı çakışır)
    const checkNames = (list, label) => {
      const names = list.map((x) => (x.id || '').trim());
      if (names.some((n) => !n)) return `${label} adları boş bırakılamaz.`;
      const lower = names.map((n) => n.toLocaleLowerCase('tr-TR'));
      if (new Set(lower).size !== lower.length) return `Her ${label.toLocaleLowerCase('tr-TR')} adı farklı olmalı.`;
      return null;
    };
    const nameError = checkNames(formData.categories || [], 'Kategori')
      || checkNames(formData.filterOptions || [], 'Filtre seçeneği');
    if (nameError) {
      alert(nameError);
      return;
    }
    const cleanShort = formData.shortCode?.trim().toLocaleUpperCase('tr-TR') || name.slice(0, 4).toLocaleUpperCase('tr-TR');
    const cleanWatermark = formData.watermark?.trim().toLocaleUpperCase('tr-TR') || cleanShort;
    const finalProj = {
      ...formData,
      id: editingProject?.id || formData.id || 'proj_' + Date.now(),
      name,
      categories: (formData.categories || []).map((c) => ({ ...c, id: c.id.trim(), name: (c.name || c.id).trim() })),
      filterOptions: (formData.filterOptions || []).map((o) => ({ ...o, id: o.id.trim(), label: (o.label || o.id).trim() })),
      shortCode: cleanShort,
      watermark: cleanWatermark,
      buttonText: formData.buttonText?.trim() || `${name} İçeriğini Üret`
    };

    // onSaveProject kaydı ve proje geçişini kendisi yapar (ayrıca onSelectProject
    // çağırmak eski proje listesinden düzenleme öncesi sürümü geri yüklüyordu)
    onSaveProject(finalProj);
    setView('list');
  };

  const handleClose = () => {
    setView('list');
    setEditingProject(null);
    setSourceProject(null);
    onClose();
  };

  // Nesneleri yerinde değiştirmeden güncelle (kopyalanan şablonla paylaşım riski)
  const handleCategoryChange = (index, field, value) => {
    const updated = formData.categories.map((cat, i) => {
      if (i !== index) return cat;
      if (field === 'title' || field === 'description') {
        return { ...cat, tooltip: { ...cat.tooltip, [field]: value } };
      }
      const next = { ...cat, [field]: value };
      if (field === 'name') {
        const orig = sourceProject?.categories?.[index];
        next.id = orig && (orig.name || orig.id) === value ? orig.id : value;
      }
      return next;
    });
    setFormData({ ...formData, categories: updated });
  };

  const handleFilterOptionChange = (index, field, value) => {
    const updated = formData.filterOptions.map((opt, i) => {
      if (i !== index) return opt;
      const next = { ...opt, [field]: value };
      if (field === 'label') {
        const orig = sourceProject?.filterOptions?.[index];
        next.id = orig && (orig.label || orig.id) === value ? orig.id : value;
      }
      return next;
    });
    setFormData({ ...formData, filterOptions: updated });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#121319] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#e6c280]/20 border border-[#e6c280]/30 flex items-center justify-center text-[#e6c280]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-white tracking-wide">
                {view === 'list' ? 'Post Creator Projeleri' : view === 'create' ? 'Yeni Proje Oluştur' : 'Projeyi Düzenle'}
              </h3>
              <p className="text-[11px] font-mono text-neutral-400">
                {view === 'list'
                  ? 'Farklı konseptlerde içerik stüdyoları arasında geçiş yapın veya yenisini ekleyin'
                  : 'Kategorileri, filtreleri ve yayıncılık üslubunu belirleyin'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {view === 'list' ? (
            <div className="space-y-6">
              
              {/* Top Action Bar */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                  Mevcut Projeler ({projects.length})
                </span>
                <button
                  type="button"
                  onClick={() => handleStartCreate(null)}
                  className="px-3 py-1.5 rounded-lg bg-[#e6c280] text-black font-semibold font-mono text-xs flex items-center space-x-1.5 hover:bg-[#d4b06e] transition-all shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Yeni Proje Oluştur</span>
                </button>
              </div>

              {/* Project Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {projects.map((proj) => {
                  const isActive = activeProject?.id === proj.id;
                  const isBuiltin = BUILTIN_PROJECTS.some((b) => b.id === proj.id);

                  return (
                    <div
                      key={proj.id}
                      className={`p-4 rounded-xl border transition-all text-left flex flex-col justify-between relative group ${
                        isActive
                          ? 'border-[#e6c280] bg-[#e6c280]/10 shadow-[0_0_20px_rgba(230,194,128,0.15)] ring-1 ring-[#e6c280]/30'
                          : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="text-[9px] font-mono px-2 py-0.5 rounded border font-semibold tracking-wider uppercase"
                            style={{
                              borderColor: `${proj.accentColor || '#e6c280'}40`,
                              backgroundColor: `${proj.accentColor || '#e6c280'}15`,
                              color: proj.accentColor || '#e6c280'
                            }}
                          >
                            {proj.badge || proj.shortCode}
                          </span>
                          
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartCreate(proj);
                              }}
                              title="Bu projeyi şablon olarak çoğalt"
                              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 text-xs"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(proj);
                              }}
                              title="Projeyi düzenle"
                              className="p-1 rounded text-neutral-400 hover:text-[#e6c280] hover:bg-white/10 text-xs"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {!isBuiltin && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // projectId'siz eski kayıtlar varsayılan projeye (Lore Magazine) aittir
                                  const postCount = archives.filter((a) => (a?.projectId || 'lore-magazine') === proj.id).length;
                                  const issueCount = countIssuesForProject(proj.id);
                                  const issueNote = issueCount > 0 ? ` ve ${issueCount} dergi sayısı` : '';
                                  const warning = postCount > 0 || issueCount > 0
                                    ? `"${proj.name}" projesinde ${postCount} gönderi${issueNote} var.\n\nProje silinirse bunlar saklanır ama hiçbir projede görünmez.\n\nYine de silmek istiyor musunuz?`
                                    : `"${proj.name}" projesinde hiç gönderi yok. Silmek istediğinize emin misiniz?`;
                                  if (window.confirm(warning)) {
                                    onDeleteProject(proj.id);
                                  }
                                }}
                                title="Projeyi sil"
                                className="p-1 rounded text-neutral-400 hover:text-red-400 hover:bg-red-500/10 text-xs"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <h4 className="font-serif font-bold text-base text-white tracking-wide mb-1 flex items-center space-x-2">
                          <span>{proj.name}</span>
                          {isActive && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                              Aktif
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] font-sans text-neutral-400 line-clamp-2 mb-3">
                          {proj.tagline || proj.editorialTone}
                        </p>

                        {/* Category preview pills */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {proj.categories?.slice(0, 4).map((c, i) => (
                            <span
                              key={i}
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-neutral-300 border border-white/5"
                            >
                              {c.name || c.id}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Select button */}
                      <button
                        type="button"
                        onClick={() => {
                          onSelectProject(proj.id);
                          handleClose();
                        }}
                        className={`w-full py-2 rounded-lg font-mono text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                          isActive
                            ? 'bg-[#e6c280] text-black shadow-sm'
                            : 'bg-white/5 hover:bg-white/10 text-neutral-200 border border-white/10'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Şu An Seçili</span>
                          </>
                        ) : (
                          <span>Bu Projeyi Başlat &rarr;</span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Ready Preset Templates */}
              <div className="pt-4 border-t border-white/10">
                <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 block mb-2.5">
                  Hazır Proje Şablonlarından Başlat:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BUILTIN_PROJECTS.map((bp) => (
                    <button
                      key={bp.id}
                      type="button"
                      onClick={() => handleStartCreate(bp)}
                      className="p-2.5 rounded-lg border border-white/10 bg-black/40 hover:border-[#e6c280]/40 text-left transition-all"
                    >
                      <div className="text-[11px] font-semibold text-white truncate">{bp.name}</div>
                      <div className="text-[9px] font-mono text-[#e6c280] truncate mt-0.5">{bp.badge}</div>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            /* CREATE / EDIT FORM */
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Back to list button */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="text-xs font-mono text-neutral-400 hover:text-white flex items-center space-x-1"
                >
                  <span>&larr; Proje Listesine Dön</span>
                </button>
                <span className="text-[10px] font-mono text-[#e6c280]">
                  {view === 'create' ? 'Yeni Proje Oluşturuluyor' : 'Proje Düzenleniyor'}
                </span>
              </div>

              {/* 1. Temel Proje Bilgileri */}
              <div className="space-y-3">
                <span className="text-xs font-mono uppercase tracking-wider text-[#e6c280] block font-semibold">
                  1. Proje Kimliği & Marka
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-neutral-400 block mb-1">Proje Adı *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          name: val,
                          shortCode: prev.shortCode ? prev.shortCode : val.slice(0, 4).toUpperCase(),
                          watermark: prev.watermark ? prev.watermark : val.slice(0, 8).toUpperCase()
                        }));
                      }}
                      placeholder="Örn: Cinema Scope veya Tech Radar"
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#e6c280]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-neutral-400 block mb-1">Kısa Kod (Kapak)</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={formData.shortCode}
                      onChange={(e) => setFormData({ ...formData, shortCode: e.target.value.toUpperCase() })}
                      placeholder="Örn: CINE"
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white uppercase font-mono placeholder-neutral-600 focus:outline-none focus:border-[#e6c280]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-[#e6c280] block mb-1 font-semibold flex items-center justify-between">
                      <span>Slayt Köşe Logosu *</span>
                      <span className="text-[9px] text-neutral-400 font-normal">Tüm slaytlarda çıkar</span>
                    </label>
                    <input
                      type="text"
                      maxLength={14}
                      value={formData.watermark}
                      onChange={(e) => setFormData({ ...formData, watermark: e.target.value.toUpperCase() })}
                      placeholder="Örn: LORE veya TECH"
                      className="w-full bg-black/50 border border-[#e6c280]/40 rounded-lg px-3 py-2 text-xs text-[#e6c280] font-bold tracking-widest uppercase font-serif placeholder-neutral-600 focus:outline-none focus:border-[#e6c280]"
                    />
                  </div>
                </div>

                {/* Slayt Köşe Logosu Canlı Önizleme */}
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-black/40 border border-white/10">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-neutral-400">Slayt Başlık Logosu Önizleme:</span>
                    <span
                      className="font-serif tracking-[0.3em] text-xs font-bold uppercase px-2.5 py-0.5 rounded border"
                      style={{
                        color: formData.accentColor || '#e6c280',
                        borderColor: `${formData.accentColor || '#e6c280'}40`,
                        backgroundColor: `${formData.accentColor || '#e6c280'}10`
                      }}
                    >
                      {formData.watermark || formData.shortCode || formData.name || 'LOGO'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500 hidden sm:inline">01 / 04</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-neutral-400 block mb-1">Slogan / Alt Başlık</label>
                    <input
                      type="text"
                      value={formData.tagline}
                      onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                      placeholder="Örn: Auteur Sineması & Sahne Analizleri"
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#e6c280]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-neutral-400 block mb-1">Üret Butonu Metni</label>
                    <input
                      type="text"
                      value={formData.buttonText}
                      onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                      placeholder="Örn: Sinema Postunu Üret"
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#e6c280]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-neutral-400 block mb-1">
                    Yapay Zeka Editoryal Persona & Üslup (Sistem Direktifi)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.editorialTone}
                    onChange={(e) => setFormData({ ...formData, editorialTone: e.target.value })}
                    placeholder="Yapay zekanın nasıl bir ses tonu ve entelektüel derinlikle içerik üreteceğini tanımlayın..."
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#e6c280] font-sans"
                  />
                </div>
              </div>

              {/* 2. Kategori Tanımları (Görselinizdeki 01 / Kategori) */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#e6c280] block font-semibold">
                    2. Kontrol Panelindeki 4 Kategori (01 / KATEGORİ)
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">Mizanpajda 4 blok olarak görünür</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {formData.categories.map((cat, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-neutral-400 font-semibold">
                          Kategori 0{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={cat.badge || ''}
                          onChange={(e) => handleCategoryChange(idx, 'badge', e.target.value)}
                          placeholder="Rozet (Örn: Giyim)"
                          className="w-24 bg-black/60 border border-white/10 rounded px-1.5 py-0.5 text-[9px] font-mono text-[#e6c280] focus:outline-none focus:border-[#e6c280]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-mono text-neutral-500 block">Başlık</label>
                          <input
                            type="text"
                            value={cat.name}
                            onChange={(e) => handleCategoryChange(idx, 'name', e.target.value)}
                            placeholder="Örn: Dolap"
                            className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-xs text-white font-semibold focus:outline-none focus:border-[#e6c280]"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-mono text-neutral-500 block">Alt Metin</label>
                          <input
                            type="text"
                            value={cat.sublabel}
                            onChange={(e) => handleCategoryChange(idx, 'sublabel', e.target.value)}
                            placeholder="Örn: Moda & Stil"
                            className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-xs text-neutral-300 focus:outline-none focus:border-[#e6c280]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-mono text-neutral-500 block">Hover Açıklaması (Tooltip)</label>
                        <input
                          type="text"
                          value={cat.tooltip?.description || ''}
                          onChange={(e) => handleCategoryChange(idx, 'description', e.target.value)}
                          placeholder="Kullanıcı fareyi üzerine getirdiğinde çıkan açıklama..."
                          className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[11px] text-neutral-400 focus:outline-none focus:border-[#e6c280]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Filtre / Dönem / Odak Seçenekleri (Görselinizdeki 02 / DÖNEM RUHU) */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#e6c280] block font-semibold">
                    3. İkinci Aşama Filtresi (02 / DÖNEM VEYA ODAK)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-neutral-400 block mb-1">Bölüm 2 Başlık Metni</label>
                    <input
                      type="text"
                      value={formData.filterTypeLabel}
                      onChange={(e) => setFormData({ ...formData, filterTypeLabel: e.target.value })}
                      placeholder="Örn: 02 / DÖNEM RUHUNU BELİRLE veya 02 / ANALİZ DERİNLİĞİ"
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#e6c280]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-neutral-400 block mb-1">Sağ Üst Küçük Etiket</label>
                    <input
                      type="text"
                      value={formData.filterCategoryTitle}
                      onChange={(e) => setFormData({ ...formData, filterCategoryTitle: e.target.value })}
                      placeholder="Örn: Kronoloji, Format, Derinlik"
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#e6c280]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {formData.filterOptions.map((opt, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-black/40 border border-white/10 space-y-1.5">
                      <span className="text-[9px] font-mono text-neutral-500 block">Seçenek 0{idx + 1}</span>
                      <input
                        type="text"
                        value={opt.label}
                        onChange={(e) => handleFilterOptionChange(idx, 'label', e.target.value)}
                        placeholder="Örn: 80'ler"
                        className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-xs text-white font-semibold focus:outline-none focus:border-[#e6c280]"
                      />
                      <input
                        type="text"
                        value={opt.sublabel}
                        onChange={(e) => handleFilterOptionChange(idx, 'sublabel', e.target.value)}
                        placeholder="Örn: Analog Parlaklık..."
                        className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[10px] text-neutral-400 focus:outline-none focus:border-[#e6c280]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="px-4 py-2 rounded-lg border border-white/10 text-neutral-400 hover:text-white text-xs font-mono"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#e6c280] text-black font-semibold text-xs font-mono uppercase tracking-wider hover:bg-[#d4b06e] transition-all shadow-md flex items-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Projeyi Kaydet & Başlat</span>
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
}
