import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ExternalLink, Plus, Folder, Sparkles, Loader, X, Check, Tag as TagIcon, Library, Highlighter, Copy, LinkIcon,
} from '../Icons';
import PaperCover from '../common/PaperCover';
import { colorHex } from '../../constants/highlightColors';
import { getHighlights } from '../../services/highlightService';
import { formatCitation } from '../../services/citationFormatter';
import api from '../../services/api';
import notify from '../../services/swal';

function cleanQuote(q) {
  return String(q || '').replace(/^[\s"'—–-]+|[\s"']+$/g, '');
}

// Resalta dentro del abstract las partes que coinciden con los highlights del usuario
function renderAbstractHighlighted(abstract, highlights) {
  if (!abstract) return null;
  const ranges = [];
  for (const h of highlights) {
    const q = cleanQuote(h.quote);
    if (q.length < 8) continue;
    const idx = abstract.indexOf(q);
    if (idx >= 0) ranges.push({ start: idx, end: idx + q.length, color: colorHex(h.color) });
  }
  if (!ranges.length) return abstract;

  ranges.sort((a, b) => a.start - b.start);
  const parts = [];
  let pos = 0;
  ranges.forEach((r, i) => {
    if (r.start < pos) return;
    if (r.start > pos) parts.push(<span key={`t${i}`}>{abstract.slice(pos, r.start)}</span>);
    parts.push(
      <mark key={`m${i}`} className="ld-mark" style={{ background: `${r.color}59` }}>
        {abstract.slice(r.start, r.end)}
      </mark>
    );
    pos = r.end;
  });
  if (pos < abstract.length) parts.push(<span key="end">{abstract.slice(pos)}</span>);
  return parts;
}

const FolderMenu = ({ collections, memberIds, onToggle }) => {
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
    <div className="lib-folder-wrap" ref={ref}>
      <button className="ld-action" onClick={() => setOpen(o => !o)}>
        <Folder size={14} /> {t('library.detail.collection')}
      </button>
      {open && (
        <div className="lib-folder-menu ld-folder-menu">
          {collections.length === 0 && <span className="lib-folder-empty">{t('library.detail.folderEmpty')}</span>}
          {collections.map(c => {
            const inIt = memberIds.has(c.id);
            return (
              <button key={c.id} className="lib-folder-item" onClick={() => onToggle(c, !inIt)}>
                <span className="lib-dot" style={{ background: colorHex(c.color) }} />
                <span className="lib-folder-name">{c.name}</span>
                {inIt && <Check size={13} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const LibraryDetail = ({
  paper, collections,
  onToggleCollection, onAddTag, onRemoveTag, onAutoTag, autoTagging, onFilterTag,
}) => {
  const { t } = useTranslation();
  const [tagInput, setTagInput] = useState('');
  const [adding, setAdding]     = useState(false);
  const [highlights, setHighlights] = useState([]);
  const [abstract, setAbstract]     = useState('');
  const [loadingAbs, setLoadingAbs] = useState(false);

  const paperId    = paper?.id;
  const paperDoi   = paper?.doi;
  const paperTitle = paper?.title;

  useEffect(() => {
    if (!paperId) { setHighlights([]); return; }
    let active = true;
    getHighlights({ doi: paperDoi, title: paperTitle })
      .then(hls => {
        if (!active) return;
        const sorted = hls.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        setHighlights(sorted);
      })
      .catch(() => { if (active) setHighlights([]); });
    return () => { active = false; };
  }, [paperId, paperDoi, paperTitle]);

  useEffect(() => {
    if (!paper) { setAbstract(''); return; }
    if (paper.abstract) { setAbstract(paper.abstract); setLoadingAbs(false); return; }

    let active = true;
    setAbstract('');
    setLoadingAbs(true);
    const p = new URLSearchParams();
    if (paper.doi)              p.set('doi',     paper.doi);
    if (paper.title)            p.set('title',   paper.title);
    if (paper.authors)          p.set('authors', paper.authors);
    if (paper.publication_year) p.set('year',    String(paper.publication_year));
    if (paper.journal)          p.set('journal', paper.journal);
    api.get(`/papers/abstract?${p.toString()}`)
      .then(res => { if (active) setAbstract(res.data?.abstract || ''); })
      .catch(() => {})
      .finally(() => { if (active) setLoadingAbs(false); });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperId]);

  if (!paper) {
    return (
      <div className="ld-empty">
        <Library size={32} />
        <p>{t('library.detail.selectPaper')}</p>
      </div>
    );
  }

  const memberIds = new Set((paper.collections || []).map(c => c.id));
  const url = paper.url || (paper.doi ? `https://doi.org/${paper.doi}` : null);

  const submitTag = (e) => {
    e.preventDefault();
    const v = tagInput.trim();
    if (!v) return;
    onAddTag(paper, v);
    setTagInput('');
    setAdding(false);
  };

  return (
    <div className="ld">
      <div className="ld-hero">
        <PaperCover paper={paper} size={120} className="ld-cover" />
        <div className="ld-hero-meta">
          {paper.is_favorite && <span className="ld-fav-badge">{t('library.detail.favorite')}</span>}
          <h2 className="ld-title">{paper.title}</h2>
          <p className="ld-authors">
            {paper.authors || t('library.detail.unknownAuthors')}
            {paper.publication_year ? ` · ${paper.publication_year}` : ''}
          </p>
          {paper.journal && <p className="ld-journal">{paper.journal}</p>}
          {paper.doi && (
            <a className="ld-doi" href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer">
              <LinkIcon size={11} /> {paper.doi}
            </a>
          )}
        </div>
      </div>

      <div className="ld-actions">
        <FolderMenu collections={collections} memberIds={memberIds} onToggle={(c, add) => onToggleCollection(paper, c, add)} />
        <button className="ld-action" onClick={() => onAutoTag(paper)} disabled={autoTagging}>
          {autoTagging ? <Loader size={14} className="lib-spin" /> : <Sparkles size={14} />}
          {t('library.detail.autoTag')}
        </button>
        <button className="ld-action" onClick={() => {
          const cite = formatCitation(paper, 'APA');
          navigator.clipboard.writeText(cite).then(() => notify.success(t('library.detail.citationCopied'))).catch(() => {});
        }}>
          <Copy size={14} /> {t('library.detail.cite')}
        </button>
        {url && (
          <a className="ld-action" href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} /> {t('library.detail.open')}
          </a>
        )}
      </div>

      <div className="ld-section">
        <span className="ld-section-label"><TagIcon size={12} /> {t('library.detail.tagsLabel')}</span>
        <div className="ld-tags">
          {(paper.tags || []).map(tg => (
            <span key={tg.id} className="ld-tag">
              <button className="ld-tag-name" onClick={() => onFilterTag(tg.name)}>#{tg.name}</button>
              <button className="ld-tag-x" onClick={() => onRemoveTag(paper, tg)} title={t('library.detail.remove')}><X size={9} /></button>
            </span>
          ))}
          {adding ? (
            <form className="ld-tag-form" onSubmit={submitTag}>
              <input
                autoFocus
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onBlur={() => { if (!tagInput.trim()) setAdding(false); }}
                placeholder={t('library.detail.newTagPlaceholder')}
              />
            </form>
          ) : (
            <button className="ld-tag-add" onClick={() => setAdding(true)}><Plus size={11} /> {t('library.detail.add')}</button>
          )}
        </div>
      </div>

      {(paper.collections || []).length > 0 && (
        <div className="ld-section">
          <span className="ld-section-label"><Folder size={12} /> {t('library.detail.inCollections')}</span>
          <div className="ld-collections">
            {paper.collections.map(c => (
              <span key={c.id} className="ld-coll-chip" style={{ '--c': colorHex(c.color) }}>
                <span className="lib-dot" style={{ background: colorHex(c.color) }} />
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {highlights.some(hl => hl.note) && (
        <div className="ld-section">
          <span className="ld-section-label"><Highlighter size={12} /> {t('library.detail.yourNotes')}</span>
          <div className="ld-highlights">
            {highlights.filter(hl => hl.note).map((hl, i) => (
              <div key={hl.id} className="ld-hl" style={{ '--c': colorHex(hl.color) }}>
                <span className="ld-hl-bar" />
                <div className="ld-hl-body">
                  <p className="ld-hl-quote">"{cleanQuote(hl.quote)}"</p>
                  <p className="ld-hl-note">{hl.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ld-section ld-abstract-section">
        <span className="ld-section-label">
          {t('library.detail.summary')}
          {highlights.length > 0 && (
            <em className="ld-hl-count">
              <Highlighter size={11} /> {t('library.detail.highlightsCount', { count: highlights.length })}
            </em>
          )}
        </span>
        {loadingAbs
          ? <p className="ld-abstract ld-abstract-empty"><Loader size={13} className="lib-spin" /> {t('library.detail.loadingSummary')}</p>
          : abstract
            ? <p className="ld-abstract">{renderAbstractHighlighted(abstract, highlights)}</p>
            : <p className="ld-abstract ld-abstract-empty">{t('library.detail.noSummary')}</p>}
      </div>
    </div>
  );
};

export default LibraryDetail;
