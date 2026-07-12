import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        {t('library.page.export')}
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
  const { t } = useTranslation();
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
      notify.error(t('library.page.errorLoad'));
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
        notify.success(t('library.page.collectionUpdated'));
      } else {
        await createCollection(payload);
        notify.success(t('library.page.collectionCreated'));
      }
      setModal(null);
      await loadSidebar();
    } catch (err) {
      notify.error(err.response?.data?.error || t('library.page.errorSaveCollection'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCollection = async (collection) => {
    const result = await notify.confirm({
      title: t('library.page.confirmDeleteCollectionTitle', { name: collection.name }),
      text: t('library.page.confirmDeleteCollectionText'),
      confirmText: t('library.page.deleteConfirm'),
    });
    if (!result.isConfirmed) return;
    try {
      await deleteCollection(collection.id);
      if (activeCollection?.id === collection.id) setActiveCollection(null);
      notify.success(t('library.page.collectionDeleted'));
      await refreshAll();
    } catch {
      notify.error(t('library.page.errorDeleteCollection'));
    }
  };

  const handleShareCollection = async (collection) => {
    try {
      const result = await setCollectionVisibility(collection.id, !collection.is_public);
      await loadSidebar();
      if (result.is_public) {
        const url = `${window.location.origin}/c/${result.public_slug}`;
        try { await navigator.clipboard.writeText(url); } catch {}
        notify.success(t('library.page.publicLinkCopied'), url);
      } else {
        notify.info(t('library.page.collectionMadePrivate'), t('library.page.linkStoppedWorking'));
      }
    } catch {
      notify.error(t('library.page.errorVisibility'));
    }
  };

  const handleToggleCollection = async (paper, collection, add) => {
    try {
      if (add) await addPaperToCollection(collection.id, paper.id);
      else     await removePaperFromCollection(collection.id, paper.id);
      await refreshAll();
    } catch {
      notify.error(t('library.page.errorUpdateCollection'));
    }
  };

  const handleAddTag = async (paper, name) => {
    try {
      await addPaperTags(paper.id, [name]);
      await refreshAll();
    } catch {
      notify.error(t('library.page.errorAddTag'));
    }
  };

  const handleRemoveTag = async (paper, tag) => {
    try {
      await removePaperTag(paper.id, tag.id);
      if (activeTag === tag.name) setActiveTag(null);
      await refreshAll();
    } catch {
      notify.error(t('library.page.errorRemoveTag'));
    }
  };

  const handleAutoTag = async (paper) => {
    setAutoTaggingId(paper.id);
    try {
      const result = await autoTagPaper(paper.id);
      if (!result.available) notify.info(t('library.page.aiUnavailable'), t('library.page.aiConfigHint'));
      else { notify.success(t('library.page.tagsApplied', { count: result.tags.length })); await refreshAll(); }
    } catch {
      notify.error(t('library.page.errorSuggestTags'));
    } finally {
      setAutoTaggingId(null);
    }
  };

  const handleDeleteTag = async (tag) => {
    const result = await notify.confirm({
      title: t('library.page.confirmDeleteTagTitle', { name: tag.name }),
      text: t('library.page.confirmDeleteTagText'),
      confirmText: t('library.page.deleteConfirm'),
    });
    if (!result.isConfirmed) return;
    try {
      await deleteTag(tag.id);
      if (activeTag === tag.name) setActiveTag(null);
      await refreshAll();
    } catch {
      notify.error(t('library.page.errorDeleteTag'));
    }
  };

  const handleExport = async (format) => {
    try {
      if (activeCollection) await exportCollection(activeCollection.id, format);
      else                  await exportLibrary(format, { tag: activeTag, search });
      notify.success(t('library.page.exportDownloaded'));
    } catch (err) {
      if (err.response?.status === 404) notify.warning(t('library.page.noExportPapers'));
      else notify.error(t('library.page.errorExport'));
    }
  };

  const handleCompare = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length < 2) { notify.info(t('library.page.selectMin2')); return; }
    setComparing(true);
    try {
      const result = await comparePapersFromLibrary(ids);
      setCompareResult(result);
    } catch {
      notify.error(t('library.page.errorCompare'));
    } finally {
      setComparing(false);
    }
  };

  const toggleSelectPaper = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      else notify.info(t('library.page.max4'));
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
        <button className="lib-back" onClick={() => navigate('/app')} title={t('library.page.backToChat')}>
          <ChevronLeft size={16} />
          {t('library.page.chat')}
        </button>

        <div className="lib-brand">
          <Library size={18} />
          <h1 className="lib-title">{t('library.page.title')}</h1>
          <span className="lib-count">{papers.length}</span>
        </div>

        <div className="lib-search">
          <Search size={14} />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('library.page.searchPlaceholder')}
          />
          {searchInput && (
            <button className="lib-icon-btn" onClick={() => setSearchInput('')} title={t('library.page.clear')}>
              <X size={12} />
            </button>
          )}
        </div>

        <div className="lib-topbar-actions">
          <button
            className={`lib-btn-ghost ${compareMode ? 'is-active' : ''}`}
            onClick={() => compareMode ? exitCompareMode() : setCompareMode(true)}
            title={t('library.page.comparePapers')}
            disabled={papers.length < 2}
          >
            <GitCompare size={14} />
            {compareMode ? t('library.cancel') : t('library.page.compare')}
          </button>
          <button
            className="lib-btn-ghost"
            onClick={() => navigate(activeCollection ? `/research?collection=${activeCollection.id}` : '/research')}
            title={t('library.page.researchTitle')}
          >
            <FileText size={14} />
            {t('library.page.research')}
          </button>
          <button
            className="lib-btn-ghost"
            onClick={() => navigate('/ask')}
            title={t('library.page.askTitle')}
          >
            <Sparkles size={14} />
            {t('library.page.ask')}
          </button>
          <button
            className="lib-btn-ghost"
            onClick={() => navigate('/radar')}
            title={t('library.page.radarTitle')}
          >
            <Radar size={14} />
            {t('library.page.radar')}
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
            <span className="lib-rail-name">{t('library.page.allPapers')}</span>
          </button>

          <div className="lib-rail-section">
            <span className="lib-rail-heading">{t('library.page.collectionsHeading')}</span>
            <button className="lib-icon-btn" onClick={() => setModal({})} title={t('library.page.newCollection')}>
              <Plus size={13} />
            </button>
          </div>

          {collections.length === 0 && (
            <button className="lib-rail-empty" onClick={() => setModal({})}>
              <FolderPlus size={14} />
              {t('library.page.createFirstCollection')}
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
                  title={c.is_public ? t('library.page.publicShareTitle') : t('library.page.shareTitle')}
                >
                  <Globe size={12} />
                </button>
                <button className="lib-icon-btn" onClick={() => setModal({ collection: c })} title={t('library.page.edit')}>
                  <Edit size={12} />
                </button>
                <button className="lib-icon-btn" onClick={() => handleDeleteCollection(c)} title={t('library.page.delete')}>
                  <Trash2 size={12} />
                </button>
              </span>
            </div>
          ))}

          <div className="lib-rail-divider" />
          <ActivityHeatmap />

          <div className="lib-rail-section">
            <span className="lib-rail-heading">{t('library.page.tagsHeading')}</span>
          </div>

          {tags.length === 0 && (
            <span className="lib-rail-hint">
              <TagIcon size={13} />
              {t('library.page.tagsHint')}
            </span>
          )}

          <div className="lib-rail-tags">
            {tags.map(tag => (
              <span key={tag.id} className={`lib-tag lib-rail-tag ${activeTag === tag.name ? 'is-active' : ''}`}>
                <button className="lib-tag-name" onClick={() => selectTag(tag.name)}>
                  #{tag.name} <em>{tag.paper_count}</em>
                </button>
                <button className="lib-tag-remove" onClick={() => handleDeleteTag(tag)} title={t('library.page.deleteTag')}>
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        </aside>

        <main className="lib-main">
          {(activeCollection || activeTag || search) && (
            <div className="lib-filterbar">
              <span className="lib-filterbar-label">{t('library.page.filteringBy')}</span>
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
                {t('library.page.compareModeLabel')}
              </span>
              {selectedIds.size > 0 && (
                <span className="lib-filter-chip">
                  {t('library.page.selectedCount', { count: selectedIds.size })}
                  <button className="lib-tag-remove" onClick={() => setSelectedIds(new Set())}><X size={10} /></button>
                </span>
              )}
            </div>
          )}

          {loading ? (
            <div className="lib-loading">
              <Loader size={22} className="lib-spin" />
              {t('library.page.loadingLibrary')}
            </div>
          ) : papers.length === 0 ? (
            <div className="lib-empty">
              <Library size={36} />
              <h2>{t('library.page.emptyTitle')}</h2>
              <p>
                {t('library.page.emptyText')}
              </p>
              <button className="lib-btn-primary" onClick={() => navigate('/app')}>
                {t('library.page.searchInChat')}
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
                          <span className="lib-li-tagcount">{t('library.page.tagCount', { count: paper.tags.length })}</span>
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
            <button className="lib-detail-close" onClick={() => setSelectedId(null)} title={t('library.close')}>
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
          <span className="cmp-bar-count">{t('library.page.selectedPapers', { count: selectedIds.size })}</span>
          <div className="cmp-bar-actions">
            <button className="cmp-bar-btn cmp-bar-btn-ghost" onClick={exitCompareMode}>
              {t('library.cancel')}
            </button>
            <button
              className="cmp-bar-btn cmp-bar-btn-primary"
              onClick={handleCompare}
              disabled={comparing}
            >
              {comparing ? <><Loader size={12} className="lib-spin" /> {t('library.page.comparing')}</> : t('library.page.compareWithAi')}
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
