import React, { useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit3,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Check,
  X,
  Search
} from 'lucide-react';
import { InstagramIcon } from './Icons';

// Gönderinin küçük önizleme görseli (kayıtlı ilk slayt ya da galerideki ilk görsel)
function postThumb(post) {
  return (post?.thumbnails || []).find(Boolean) || post?.savedGallery?.[0]?.dataUrl || null;
}

const isPublished = (post) => Boolean(post?.instagramPublishedAt || post?.publishedToInstagram);

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Projenin kayıtlı dergi sayıları listesi (dergi açılınca ilk ekran)
 */
export function MagazineIssueList({ issues, archives, projectName, onOpen, onEdit, onDelete, onCreate }) {
  const postById = useMemo(() => new Map(archives.map((p) => [p.id, p])), [archives]);

  return (
    <div className="w-full max-w-4xl mx-auto py-4 sm:py-8">
      <div className="flex items-end justify-between gap-3 mb-6">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#e6c280]">{projectName}</p>
          <h2 className="font-serif text-2xl sm:text-3xl font-black text-white tracking-tight">Dergi Sayıları</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Her sayı, arşivden seçtiğiniz gönderilerden oluşur ve burada saklanır.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="shrink-0 px-3.5 py-2 rounded-lg bg-[#e6c280] text-black font-semibold font-mono text-xs flex items-center gap-1.5 hover:bg-[#d4b06e] transition-all shadow-md cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Yeni Sayı</span>
        </button>
      </div>

      {issues.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
          <BookOpen className="w-8 h-8 mx-auto text-neutral-500 mb-3" />
          <p className="text-sm text-neutral-300 font-semibold">Bu projede henüz dergi sayısı yok.</p>
          <p className="text-xs text-neutral-500 mt-1">
            "Yeni Sayı" ile arşivdeki gönderilerden ilk sayınızı oluşturun.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {issues.map((issue) => {
            const posts = issue.postIds.map((id) => postById.get(id)).filter(Boolean);
            const cover = posts.map(postThumb).find(Boolean);
            const missing = issue.postIds.length - posts.length;
            return (
              <div
                key={issue.id}
                className="group rounded-xl border border-white/10 bg-[#14151b] overflow-hidden flex flex-col hover:border-[#e6c280]/40 transition-all"
              >
                <button
                  type="button"
                  onClick={() => onOpen(issue.id)}
                  className="relative h-40 bg-black/50 overflow-hidden cursor-pointer text-left"
                  title="Sayıyı aç"
                >
                  {cover ? (
                    <img src={cover} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-600">
                      <BookOpen className="w-8 h-8" />
                    </div>
                  )}
                  <span className="absolute top-2 left-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/70 text-[#e6c280] border border-[#e6c280]/30">
                    SAYI #{String(issue.number).padStart(2, '0')}
                  </span>
                </button>
                <div className="p-3 flex-1 flex flex-col">
                  <h3 className="font-serif font-bold text-white text-sm leading-snug line-clamp-2">
                    {issue.title || `Sayı ${issue.number}`}
                  </h3>
                  <p className="text-[10px] font-mono text-neutral-500 mt-1">
                    {formatDate(issue.createdAt)} · {posts.length} gönderi
                    {missing > 0 && <span className="text-amber-500/80"> · {missing} silinmiş</span>}
                  </p>
                  <div className="mt-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpen(issue.id)}
                      className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 font-mono text-[11px] font-semibold cursor-pointer"
                    >
                      Oku &rarr;
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(issue.id)}
                      title="Sayıyı düzenle"
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-[#e6c280] hover:bg-white/10 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(issue)}
                      title="Sayıyı sil"
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Sayı oluşturma / düzenleme: arşivden gönderi seçimi + sürükleyerek sıralama
 */
export function MagazineIssueEditor({ initialIssue, projectPosts, issues, onSave, onCancel }) {
  const [title, setTitle] = useState(initialIssue.title || '');
  const [selectedIds, setSelectedIds] = useState(() => {
    // Arşivden silinmiş gönderileri listeden at
    const existing = new Set(projectPosts.map((p) => p.id));
    return initialIssue.postIds.filter((id) => existing.has(id));
  });
  const [search, setSearch] = useState('');
  const [onlyPublished, setOnlyPublished] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const dragIndexRef = useRef(null);

  const postById = useMemo(() => new Map(projectPosts.map((p) => [p.id, p])), [projectPosts]);

  // Gönderinin yer aldığı diğer sayılar (bilgi rozeti; bir gönderi birden çok sayıda olabilir)
  const otherIssuesByPost = useMemo(() => {
    const map = new Map();
    issues
      .filter((i) => i.id !== initialIssue.id)
      .forEach((i) => i.postIds.forEach((id) => {
        if (!map.has(id)) map.set(id, []);
        map.get(id).push(i.number);
      }));
    return map;
  }, [issues, initialIssue.id]);

  const selectedSet = new Set(selectedIds);
  const q = search.trim().toLocaleLowerCase('tr-TR');
  const available = projectPosts.filter((p) => {
    if (onlyPublished && !isPublished(p)) return false;
    if (!q) return true;
    return [p.title, p.shortTitle, p.category, p.decade]
      .some((v) => typeof v === 'string' && v.toLocaleLowerCase('tr-TR').includes(q));
  });

  const toggle = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const move = (from, to) => {
    if (to < 0 || to >= selectedIds.length || from === to) return;
    setSelectedIds((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const allVisibleSelected = available.length > 0 && available.every((p) => selectedSet.has(p.id));
  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      const visible = new Set(available.map((p) => p.id));
      setSelectedIds((prev) => prev.filter((id) => !visible.has(id)));
    } else {
      setSelectedIds((prev) => [...prev, ...available.map((p) => p.id).filter((id) => !prev.includes(id))]);
    }
  };

  const handleSave = () => {
    if (selectedIds.length === 0) return;
    onSave({ ...initialIssue, title: title.trim(), postIds: selectedIds });
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-4 sm:py-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#e6c280]">
            {initialIssue.createdAt ? 'Sayıyı Düzenle' : 'Yeni Sayı'} · SAYI #{String(initialIssue.number).padStart(2, '0')}
          </p>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`Sayı başlığı (isteğe bağlı) — örn: Kış Sayısı`}
            className="mt-1 w-full max-w-md bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#e6c280]"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-white/10 text-neutral-400 hover:text-white text-xs font-mono cursor-pointer"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={selectedIds.length === 0}
            title={selectedIds.length === 0 ? 'En az bir gönderi seçin' : 'Sayıyı kaydet'}
            className="px-4 py-2 rounded-lg bg-[#e6c280] text-black font-semibold text-xs font-mono flex items-center gap-1.5 hover:bg-[#d4b06e] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Sayıyı Kaydet ({selectedIds.length})</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Arşiv: seçilebilir gönderiler */}
        <section className="rounded-xl border border-white/10 bg-[#14151b] flex flex-col min-h-0">
          <div className="p-3 border-b border-white/10 flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-semibold mr-auto">
              Arşiv ({projectPosts.length})
            </span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ara..."
                className="w-36 bg-black/50 border border-white/10 rounded-lg pl-7 pr-2 py-1 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#e6c280]"
              />
            </div>
            <button
              type="button"
              onClick={() => setOnlyPublished((v) => !v)}
              title="Sadece Instagram'da yayınlanmış gönderiler"
              className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                onlyPublished ? 'border-pink-500/50 bg-pink-950/30 text-pink-300' : 'border-white/10 text-neutral-400 hover:text-white'
              }`}
            >
              <InstagramIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={toggleAllVisible}
              disabled={available.length === 0}
              className="px-2 py-1 rounded-lg border border-white/10 text-[11px] font-mono text-neutral-300 hover:text-white disabled:opacity-40 cursor-pointer"
            >
              {allVisibleSelected ? 'Hiçbirini Seçme' : 'Tümünü Seç'}
            </button>
          </div>
          <div className="overflow-y-auto max-h-[55vh] p-2 space-y-1">
            {available.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-8">
                {projectPosts.length === 0 ? 'Bu projenin arşivinde gönderi yok.' : 'Eşleşen gönderi yok.'}
              </p>
            ) : (
              available.map((post) => {
                const checked = selectedSet.has(post.id);
                const thumb = postThumb(post);
                const others = otherIssuesByPost.get(post.id) || [];
                return (
                  <label
                    key={post.id}
                    className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                      checked ? 'border-[#e6c280]/50 bg-[#e6c280]/10' : 'border-transparent hover:bg-white/[0.04]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(post.id)}
                      className="accent-[#e6c280] w-3.5 h-3.5 shrink-0"
                    />
                    <div className="w-10 h-10 rounded bg-black/60 overflow-hidden shrink-0">
                      {thumb && <img src={thumb} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-white font-semibold truncate">{post.title || 'Başlıksız gönderi'}</p>
                      <p className="text-[10px] font-mono text-neutral-500 truncate">
                        {[post.category, post.decade, formatDate(post.updatedAt || post.createdAt)].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {others.length > 0 && (
                        <span
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-neutral-400 border border-white/10"
                          title="Bu gönderinin yer aldığı diğer sayılar"
                        >
                          #{others.map((n) => String(n).padStart(2, '0')).join(', #')}
                        </span>
                      )}
                      {isPublished(post) && <InstagramIcon className="w-3 h-3 text-pink-400" />}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </section>

        {/* Sayının içeriği: sürükleyerek sıralama */}
        <section className="rounded-xl border border-white/10 bg-[#14151b] flex flex-col min-h-0">
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[#e6c280] font-semibold">
              Sayının İçeriği ({selectedIds.length})
            </span>
            <span className="text-[10px] font-mono text-neutral-500">Sürükleyerek sıralayın</span>
          </div>
          <ol className="overflow-y-auto max-h-[55vh] p-2 space-y-1">
            {selectedIds.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-8">Soldan gönderi seçin.</p>
            ) : (
              selectedIds.map((id, idx) => {
                const post = postById.get(id);
                if (!post) return null;
                const thumb = postThumb(post);
                return (
                  <li
                    key={id}
                    draggable
                    onDragStart={(e) => {
                      dragIndexRef.current = idx;
                      setDragIndex(idx);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', String(idx));
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      const from = dragIndexRef.current;
                      if (from === null || from === idx) return;
                      move(from, idx);
                      dragIndexRef.current = idx;
                      setDragIndex(idx);
                    }}
                    onDrop={(e) => e.preventDefault()}
                    onDragEnd={() => {
                      dragIndexRef.current = null;
                      setDragIndex(null);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-lg border bg-black/30 select-none transition-colors ${
                      dragIndex === idx ? 'border-[#e6c280] opacity-60' : 'border-white/10'
                    }`}
                  >
                    <GripVertical className="w-4 h-4 text-neutral-500 cursor-grab active:cursor-grabbing shrink-0" />
                    <span className="text-[10px] font-mono text-[#e6c280] w-5 text-right shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="w-9 h-9 rounded bg-black/60 overflow-hidden shrink-0">
                      {thumb && <img src={thumb} alt="" className="w-full h-full object-cover" draggable={false} />}
                    </div>
                    <p className="text-xs text-white font-semibold truncate flex-1 min-w-0">{post.title || 'Başlıksız gönderi'}</p>
                    <div className="flex items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => move(idx, idx - 1)}
                        disabled={idx === 0}
                        title="Yukarı taşı"
                        className="p-1 rounded text-neutral-400 hover:text-white disabled:opacity-25 cursor-pointer"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(idx, idx + 1)}
                        disabled={idx === selectedIds.length - 1}
                        title="Aşağı taşı"
                        className="p-1 rounded text-neutral-400 hover:text-white disabled:opacity-25 cursor-pointer"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggle(id)}
                        title="Sayıdan çıkar"
                        className="p-1 rounded text-neutral-400 hover:text-red-400 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ol>
        </section>
      </div>
    </div>
  );
}
