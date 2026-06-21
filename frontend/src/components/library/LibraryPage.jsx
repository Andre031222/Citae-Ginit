import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Library, ChevronLeft, Search, X, Plus, Download,
  Trash2, Edit, FolderPlus, Tag as TagIcon, Loader, GitCompare, Radar, Sparkles, FileText, Globe,
} from '../Icons';
import notify from '../../services/swal';
import {
  getLibraryPapers, getCollections, getTags,
  createCollection, updateCollection, deleteCollection,
  addPaperToCollection, removePaperFromCollection,
  addPaperTags, removePaperTag, autoTagPaper, deleteTag,
  exportCollection, exportLibrary, comparePapersFromLibrary,
  setCollectionVisibility,
} from '../../services/libraryService';
import { colorHex } from '../../constants/highlightColors';
import PaperCover     from '../common/PaperCover';
import CollectionModal from './CollectionModal';
import CompareModal    from './CompareModal';
import ActivityHeatmap from './ActivityHeatmap';
import LibraryDetail   from './LibraryDetail';

const EXPORT_OPTIONS = [
  { key: 'bibtex',   label: 'BibTeX (.bib)' },
  { key: 'ris',      label: 'RIS (.ris)'     },
  { key: 'markdown', label: 'Markdown (.md)' },
  { key: 'csv',      label: 'CSV (.csv)'     },
];

const ExportMenu = ({ onExport, disabled }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="lib-export-wrap" ref={ref}>
      <button className="lib-btn-primary lib-export-btn" onClick={() => setOpen(o => !o)} disabled={disabled}>
        <Download size={14} />
        Exportar
      </button>
      {open && (
        <div className="lib-folder-menu lib-export-menu">
          {EXPORT_OPTIONS.map(opt => (
            <button key={opt.key} className="lib-folder-item" onClick={() => { setOpen(false); onExport(opt.key); }}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const LibraryPage = ({ user }) => {
  const navigate = useNavigate();

  const [papers,      setPapers]      = useState([]);
  const [collections, setCollections] = useState([]);
  const [tags,        setTags]        = useState([]);
  const [loading,     setLoading]     = useState(true);

  const [activeCollection, setActiveCollection] = useState(null);
  const [activeTag,        setActiveTag]        = useState(null);
  const [search,           setSearch]           = useState('');
  const [searchInput,      setSearchInput]      = useState('');

  const [modal,         setModal]         = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [autoTaggingId, setAutoTaggingId] = useState(null);

  const [compareMode,     setCompareMode]     = useState(false);
  const [selectedIds,     setSelectedIds]     = useState(new Set());
  const [comparing,       setComparing]       = useState(false);
  const [compareResult,   setCompareResult]   = useState(null);

  const [selectedId,      setSelectedId]      = useState(null);
  const selected = papers.find(p => p.id === selectedId) || null;

  useEffect(() => {
    if (selectedId && !papers.some(p => p.id === selectedId)) {
      setSelectedId(null);
    }
  }, [papers, selectedId]);

  const loadSidebar = useCallback(async () => {
    const [cols, tgs] = await Promise.all([getCollections(), getTags()]);
    setCollections(cols);
    setTags(tgs);
  }, []);

  const loadPapers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getLibraryPapers({ collection: activeCollection?.id, tag: activeTag, search });
      setPapers(result);
    } catch {
      notify.error('No se pudo cargar la biblioteca');
    } finally {
      setLoading(false);
    }
  }, [activeCollection, activeTag, search]);

  useEffect(() => { loadSidebar().catch(() => {}); }, [loadSidebar]);
  useEffect(() => { loadPapers(); }, [loadPapers]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadSidebar(), loadPapers()]);
  }, [loadSidebar, loadPapers]);

  const handleSaveCollection = async (payload) => {
    setSaving(true);
    try {
      if (modal?.collection) {
        await updateCollection(modal.collection.id, payload);
        notify.success('Colección actualizada');
      } else {
        await createCollection(payload);
        notify.success('Colección creada');
      }
      setModal(null);
      await loadSidebar();
    } catch (err) {
      notify.error(err.response?.data?.error || 'No se pudo guardar la colección');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCollection = async (collection) => {
    const result = await notify.confirm({
      title: `¿Eliminar "${collection.name}"?`,
      text: 'Los papers no se borran, solo la colección.',
      confirmText: 'Eliminar',
    });
    if (!result.isConfirmed) return;
    try {
      await deleteCollection(collection.id);
      if (activeCollection?.id === collection.id) setActiveCollection(null);
      notify.success('Colección eliminada');
      await refreshAll();
    } catch {
      notify.error('No se pudo eliminar la colección');
    }
  };

  const handleShareCollection = async (collection) => {
    try {
      const result = await setCollectionVisibility(collection.id, !collection.is_public);
      await loadSidebar();
      if (result.is_public) {
        const url = `${window.location.origin}/c/${result.public_slug}`;
        try { await navigator.clipboard.writeText(url); } catch {}
        notify.success('Enlace público copiado', url);
      } else {
        notify.info('Colección hecha privada', 'El enlace dejó de funcionar');
      }
    } catch {
      notify.error('No se pudo cambiar la visibilidad');
    }
  };

  const handleToggleCollection = async (paper, collection, add) => {
    try {
      if (add) await addPaperToCollection(collection.id, paper.id);
      else     await removePaperFromCollection(collection.id, paper.id);
      await refreshAll();
    } catch {
      notify.error('No se pudo actualizar la colección');
    }
  };

  const handleAddTag = async (paper, name) => {
    try {
      await addPaperTags(paper.id, [name]);
      await refreshAll();
    } catch {
      notify.error('No se pudo añadir la etiqueta');
    }
  };

  const handleRemoveTag = async (paper, tag) => {
    try {
      await removePaperTag(paper.id, tag.id);
      if (activeTag === tag.name) setActiveTag(null);
      await refreshAll();
    } catch {
      notify.error('No se pudo quitar la etiqueta');
    }
  };

  const handleAutoTag = async (paper) => {
    setAutoTaggingId(paper.id);
    try {
      const result = await autoTagPaper(paper.id);
      if (!result.available) notify.info('IA no disponible', 'Configura GROQ_API_KEY en el servidor');
      else { notify.success(`${result.tags.length} etiqueta(s) aplicadas`); await refreshAll(); }
    } catch {
      notify.error('No se pudieron sugerir etiquetas');
    } finally {
      setAutoTaggingId(null);
    }
  };

  const handleDeleteTag = async (tag) => {
    const result = await notify.confirm({
      title: `¿Eliminar #${tag.name}?`,
      text: 'Se quitará de todos los papers.',
      confirmText: 'Eliminar',
    });
    if (!result.isConfirmed) return;
    try {
      await deleteTag(tag.id);
      if (activeTag === tag.name) setActiveTag(null);
      await refreshAll();
    } catch {
      notify.error('No se pudo eliminar la etiqueta');
    }
  };

  const handleExport = async (format) => {
    try {
      if (activeCollection) await exportCollection(activeCollection.id, format);
      else                  await exportLibrary(format, { tag: activeTag, search });
      notify.success('Exportación descargada');
    } catch (err) {
      if (err.response?.status === 404) notify.warning('No hay papers para exportar');
      else notify.error('No se pudo exportar');
    }
  };

  const handleCompare = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length < 2) { notify.info('Selecciona al menos 2 papers'); return; }
    setComparing(true);
    try {
      const result = await comparePapersFromLibrary(ids);
      setCompareResult(result);
    } catch {
      notify.error('No se pudo comparar los papers');
    } finally {
      setComparing(false);
    }
  };

  const toggleSelectPaper = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      else notify.info('Máximo 4 papers para comparar');
      return next;
    });
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setSelectedIds(new Set());
  };

  const selectCollection = (collection) => {
    setActiveTag(null);
    setActiveCollection(prev => prev?.id === collection?.id ? null : collection);
  };

  const selectTag = (name) => {
    setActiveCollection(null);
    setActiveTag(prev => prev === name ? null : name);
  };

  const showAll = !activeCollection && !activeTag;

  return (
    <div className="lib-page">
      <header className="lib-topbar">
        <button className="lib-back" onClick={() => navigate('/app')} title="Volver al chat">
          <ChevronLeft size={16} />
          Chat
        </button>

        <div className="lib-brand">
          <Library size={18} />
          <h1 className="lib-title">Biblioteca</h1>
          <span className="lib-count">{papers.length}</span>
        </div>

        <div className="lib-search">
          <Search size={14} />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por título, autor o revista…"
          />
          {searchInput && (
            <button className="lib-icon-btn" onClick={() => setSearchInput('')} title="Limpiar">
              <X size={12} />
            </button>
          )}
        </div>

        <div className="lib-topbar-actions">
          <button
            className={`lib-btn-ghost ${compareMode ? 'is-active' : ''}`}
            onClick={() => compareMode ? exitCompareMode() : setCompareMode(true)}
            title="Comparar papers"
            disabled={papers.length < 2}
          >
            <GitCompare size={14} />
            {compareMode ? 'Cancelar' : 'Comparar'}
          </button>
          <button
            className="lib-btn-ghost"
            onClick={() => navigate(activeCollection ? `/research?collection=${activeCollection.id}` : '/research')}
            title="Deep Research — análisis de una colección"
          >
            <FileText size={14} />
            Research
          </button>
          <button
            className="lib-btn-ghost"
            onClick={() => navigate('/ask')}
            title="Pregunta a tu biblioteca"
          >
            <Sparkles size={14} />
            Preguntar
          </button>
          <button
            className="lib-btn-ghost"
            onClick={() => navigate('/radar')}
            title="Radar de afirmaciones"
          >
            <Radar size={14} />
            Radar
          </button>
          <ExportMenu onExport={handleExport} disabled={loading || papers.length === 0} />
        </div>
      </header>

      <div className="lib-body">
        <aside className="lib-rail">
          {user && (
            <div className="lib-profile">
              <div className="lib-profile-avatar">
                {user.avatar_url
                  ? <img src={user.avatar_url} alt={user.full_name || user.username} />
                  : <span>{(user.full_name || user.username || 'U').charAt(0).toUpperCase()}</span>}
              </div>
              <div className="lib-profile-info">
                <span className="lib-profile-name">{user.full_name || user.username}</span>
                <span className="lib-profile-handle">@{user.username}</span>
              </div>
            </div>
          )}

          <button
            className={`lib-rail-item ${showAll ? 'is-active' : ''}`}
            onClick={() => { setActiveCollection(null); setActiveTag(null); }}
          >
            <Library size={14} />
            <span className="lib-rail-name">Todos los papers</span>
          </button>

          <div className="lib-rail-section">
            <span className="lib-rail-heading">Colecciones</span>
            <button className="lib-icon-btn" onClick={() => setModal({})} title="Nueva colección">
              <Plus size={13} />
            </button>
          </div>

          {collections.length === 0 && (
            <button className="lib-rail-empty" onClick={() => setModal({})}>
              <FolderPlus size={14} />
              Crea tu primera colección
            </button>
          )}

          {collections.map(c => (
            <div
              key={c.id}
              className={`lib-rail-item lib-rail-collection ${activeCollection?.id === c.id ? 'is-active' : ''}`}
            >
              <button className="lib-rail-main" onClick={() => selectCollection(c)}>
                <span className="lib-dot" style={{ background: colorHex(c.color) }} />
                <span className="lib-rail-name" title={c.description || c.name}>{c.name}</span>
                {c.is_public && <Globe size={11} className="lib-rail-public" />}
                <span className="lib-rail-count">{c.paper_count}</span>
              </button>
              <span className="lib-rail-tools">
                <button
                  className={`lib-icon-btn ${c.is_public ? 'is-public' : ''}`}
                  onClick={() => handleShareCollection(c)}
                  title={c.is_public ? 'Pública — clic para copiar enlace o hacer privada' : 'Compartir — hacer pública y copiar enlace'}
                >
                  <Globe size={12} />
                </button>
                <button className="lib-icon-btn" onClick={() => setModal({ collection: c })} title="Editar">
                  <Edit size={12} />
                </button>
                <button className="lib-icon-btn" onClick={() => handleDeleteCollection(c)} title="Eliminar">
                  <Trash2 size={12} />
                </button>
              </span>
            </div>
          ))}

          <div className="lib-rail-divider" />
          <ActivityHeatmap />

          <div className="lib-rail-section">
            <span className="lib-rail-heading">Etiquetas</span>
          </div>

          {tags.length === 0 && (
            <span className="lib-rail-hint">
              <TagIcon size={13} />
              Etiqueta papers desde sus tarjetas
            </span>
          )}

          <div className="lib-rail-tags">
            {tags.map(tag => (
              <span key={tag.id} className={`lib-tag lib-rail-tag ${activeTag === tag.name ? 'is-active' : ''}`}>
                <button className="lib-tag-name" onClick={() => selectTag(tag.name)}>
                  #{tag.name} <em>{tag.paper_count}</em>
                </button>
                <button className="lib-tag-remove" onClick={() => handleDeleteTag(tag)} title="Eliminar etiqueta">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        </aside>

        <main className="lib-main">
          {(activeCollection || activeTag || search) && (
            <div className="lib-filterbar">
              <span className="lib-filterbar-label">Filtrando por:</span>
              {activeCollection && (
                <span className="lib-filter-chip">
                  <span className="lib-dot" style={{ background: colorHex(activeCollection.color) }} />
                  {activeCollection.name}
                  <button className="lib-tag-remove" onClick={() => setActiveCollection(null)}><X size={10} /></button>
                </span>
              )}
              {activeTag && (
                <span className="lib-filter-chip">
                  #{activeTag}
                  <button className="lib-tag-remove" onClick={() => setActiveTag(null)}><X size={10} /></button>
                </span>
              )}
              {search && (
                <span className="lib-filter-chip">
                  "{search}"
                  <button className="lib-tag-remove" onClick={() => setSearchInput('')}><X size={10} /></button>
                </span>
              )}
            </div>
          )}

          {compareMode && (
            <div className="lib-filterbar">
              <GitCompare size={13} />
              <span className="lib-filterbar-label">
                Modo comparación — selecciona 2 a 4 papers
              </span>
              {selectedIds.size > 0 && (
                <span className="lib-filter-chip">
                  {selectedIds.size} seleccionado(s)
                  <button className="lib-tag-remove" onClick={() => setSelectedIds(new Set())}><X size={10} /></button>
                </span>
              )}
            </div>
          )}

          {loading ? (
            <div className="lib-loading">
              <Loader size={22} className="lib-spin" />
              Cargando biblioteca…
            </div>
          ) : papers.length === 0 ? (
            <div className="lib-empty">
              <Library size={36} />
              <h2>Tu biblioteca está vacía</h2>
              <p>
                Los papers llegan aquí cuando los marcas como favoritos en el chat,
                los añades a una colección o les pones etiquetas.
              </p>
              <button className="lib-btn-primary" onClick={() => navigate('/app')}>
                Buscar papers en el chat
              </button>
            </div>
          ) : (
            <div className="lib-grid2">
              {papers.map(paper => {
                const isChecked = selectedIds.has(paper.id);
                const firstAuthor = paper.authors?.split(',')[0]?.trim();
                const meta = [firstAuthor, paper.publication_year, paper.journal].filter(Boolean).join(' · ');
                return (
                  <div
                    key={paper.id}
                    className={[
                      'lib-card2',
                      selectedId === paper.id ? 'is-active' : '',
                      compareMode && selectedIds.size > 0 && !isChecked ? 'is-dimmed' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => compareMode ? toggleSelectPaper(paper.id) : setSelectedId(paper.id)}
                  >
                    {compareMode && (
                      <span className={`lib-card-select ${isChecked ? 'is-selected' : ''}`}>
                        {isChecked && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </span>
                    )}
                    <PaperCover paper={paper} size={64} className="lib-card2-cover" />
                    <div className="lib-card2-body">
                      <span className="lib-card2-title">{paper.title}</span>
                      {meta && <span className="lib-card2-meta">{meta}</span>}
                      <div className="lib-card2-foot">
                        {paper.is_favorite && <span className="lib-li-fav">★</span>}
                        {(paper.collections || []).slice(0, 4).map(c => (
                          <span key={c.id} className="lib-li-dot" style={{ background: colorHex(c.color) }} title={c.name} />
                        ))}
                        {(paper.tags || []).length > 0 && (
                          <span className="lib-li-tagcount">{paper.tags.length} etiq.</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {selected && !compareMode && (
          <aside className="lib-detail-drawer">
            <button className="lib-detail-close" onClick={() => setSelectedId(null)} title="Cerrar">
              <X size={16} />
            </button>
            <LibraryDetail
              paper={selected}
              collections={collections}
              onToggleCollection={handleToggleCollection}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              onAutoTag={handleAutoTag}
              autoTagging={autoTaggingId === selected?.id}
              onFilterTag={selectTag}
            />
          </aside>
        )}
      </div>

      {compareMode && selectedIds.size >= 2 && !compareResult && (
        <div className="cmp-bar">
          <span className="cmp-bar-count">{selectedIds.size} papers seleccionados</span>
          <div className="cmp-bar-actions">
            <button className="cmp-bar-btn cmp-bar-btn-ghost" onClick={exitCompareMode}>
              Cancelar
            </button>
            <button
              className="cmp-bar-btn cmp-bar-btn-primary"
              onClick={handleCompare}
              disabled={comparing}
            >
              {comparing ? <><Loader size={12} className="lib-spin" /> Comparando…</> : 'Comparar con IA'}
            </button>
          </div>
        </div>
      )}

      {modal && (
        <CollectionModal
          initial={modal.collection}
          onSave={handleSaveCollection}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}

      {compareResult && (
        <CompareModal result={compareResult} onClose={() => { setCompareResult(null); exitCompareMode(); }} />
      )}
    </div>
  );
};

export default LibraryPage;
