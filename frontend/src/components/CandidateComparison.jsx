import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCitation, formatMultiple, CITATION_FORMATS } from '../services/citationFormatter';
import HighlightableText from './HighlightableText';
import api from '../services/api';
import { User, LinkIcon, Calendar, Star, Check, Sparkles, ChevronDown, ChevronRight, Trash2, X } from './Icons';
import CopyButton from './common/CopyButton';
import PaperCover from './common/PaperCover';

const SOURCE_LABELS = {
  crossref:        'CrossRef',
  semanticscholar: 'Semantic Scholar',
  openalex:        'OpenAlex',
  arxiv:           'arXiv',
};

// clave única y determinista por candidato
function candidateKey(c) {
  if (c.doi) return `doi:${c.doi}`;
  if (c.title) return `t:${c.title}`;
  return `${c.authors || ''}_${c.publication_year || ''}_${c.score || ''}`;
}

// Extracción de keywords relevantes
const KW_STOP = new Set([
  'the','a','an','of','in','and','or','for','to','with','on','at','by','from','is','are',
  'was','were','this','that','these','those','has','have','had','been','be','as','its',
  'la','el','en','de','y','del','los','las','un','una','por','para','con','que','se','al',
  'lo','más','entre','sobre','este','esta','estos','estas','cada','como','also','using',
  'based','study','analysis','approach','novel','method','methods','via','into','such',
]);

function extractKw(text) {
  if (!text) return [];
  return [...new Set(
    text.toLowerCase()
      .replace(/[^a-záéíóúüñ\s]/gi, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !KW_STOP.has(w))
  )];
}

const ScoreBadge = React.memo(function ScoreBadge({ score, breakdown }) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const cls = score >= 85 ? 'score-high' : score >= 65 ? 'score-mid' : 'score-low';

  if (!breakdown) {
    return <span className={`cc-score-badge ${cls}`}>{score}%</span>;
  }

  const signals = [
    { label: t('paperui.score.titleSim'),      val: breakdown.titleSim,                      icon: <Check size={11} />,    show: true },
    { label: t('paperui.score.sourceBoost'),   val: breakdown.sourceBoost,                   icon: <Check size={11} />,    show: breakdown.sourceBoost > 0 },
    { label: t('paperui.score.citationBoost'), val: Math.round(breakdown.citationBoost),      icon: <Star size={11} />,     show: breakdown.citationBoost > 0 },
    { label: t('paperui.score.authorBoost'),   val: breakdown.authorBoost,                    icon: <User size={11} />,     show: breakdown.authorBoost > 0 },
    { label: t('paperui.score.doiBoost'),      val: breakdown.doiBoost,                       icon: <LinkIcon size={11} />, show: breakdown.doiBoost > 0 },
    { label: t('paperui.score.yearBoost'),     val: breakdown.yearBoost,                      icon: <Calendar size={11} />, show: breakdown.yearBoost !== 0 },
  ].filter(s => s.show);

  return (
    <span
      className={`cc-score-badge ${cls} cc-score-badge-tip`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={(e) => { e.stopPropagation(); setShow(v => !v); }}
    >
      {score}%
      {show && (
        <span className="cc-score-tip" onClick={e => e.stopPropagation()}>
          <span className="cc-score-tip-title">{t('paperui.score.signalsTitle')}</span>
          {signals.map(s => (
            <span key={s.label} className="cc-score-tip-row">
              <span className="cc-score-tip-icon">{s.icon}</span>
              <span className="cc-score-tip-label">{s.label}</span>
              <span className={`cc-score-tip-val ${s.val > 0 ? 'pos' : s.val < 0 ? 'neg' : ''}`}>
                {s.val > 0 ? `+${s.val}` : s.val}
              </span>
            </span>
          ))}
        </span>
      )}
    </span>
  );
});

const SourceChips = ({ sources = [] }) => (
  <div className="cc-sources">
    {sources.map(s => (
      <span key={s} className="cc-chip">{SOURCE_LABELS[s] || s}</span>
    ))}
  </div>
);


/* REFERENCE DRAWER — inline, sin portal ni position fixed.
   Se renderiza en App.jsx como columna del chat-layout. */
export function ReferenceDrawer({
  candidate, onChoose, onClose, choosing,
  user, userHighlights,
  onCreateHighlight, onUpdateHighlight, onDeleteHighlight, onAskAssistant,
}) {
  const { t } = useTranslation();
  const [tab, setTab]               = useState('abstract');
  const [abstract, setAbstract]     = useState(candidate.abstract || '');
  const [isAiGenerated, setIsAiGen] = useState(false);
  const [loadingAbs, setLoadingAbs] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [fullText, setFullText]     = useState(null);
  const [loadingFull, setLoadingFull] = useState(false);

  // Fuente única de verdad: deriva los highlights de este paper desde el estado global
  const paperHighlights = useMemo(() => {
    if (!userHighlights) return [];
    return userHighlights.filter(h =>
      (candidate.doi   && h.paper_doi   === candidate.doi) ||
      (candidate.title && h.paper_title === candidate.title)
    );
  }, [userHighlights, candidate.doi, candidate.title]);

  // Escape se maneja centralizado en App.jsx (prioridad: Profile → drawer → sidebar)

  useEffect(() => {
    setTab('abstract');
    setAbstract(candidate.abstract || '');
    setIsAiGen(false);
    setNotesExpanded(false);
    setFullText(null);

    if (!candidate.abstract) {
      setLoadingAbs(true);
      let cancelled = false;
      const p = new URLSearchParams();
      if (candidate.doi)              p.set('doi',     candidate.doi);
      if (candidate.title)            p.set('title',   candidate.title);
      if (candidate.authors)          p.set('authors', candidate.authors);
      if (candidate.publication_year) p.set('year',    String(candidate.publication_year));
      if (candidate.journal)          p.set('journal', candidate.journal);
      // Usa la instancia api (con token JWT, baseURL de env) — no fetch crudo
      api.get(`/papers/abstract?${p.toString()}`)
        .then(res => {
          if (!cancelled && res.data.abstract) {
            setAbstract(res.data.abstract);
            setIsAiGen(res.data.isAiGenerated || false);
          }
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoadingAbs(false); });
      return () => { cancelled = true; };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate.doi, candidate.title, candidate.abstract]);

  // Carga el texto completo del PDF si hay paper_id en DB
  useEffect(() => {
    if (!candidate.paper_id) return;
    let cancelled = false;
    setLoadingFull(true);
    api.get(`/papers/${candidate.paper_id}/full-text`)
      .then(res => {
        if (!cancelled) {
          setFullText(res.data.available ? res.data.full_text : null);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingFull(false); });
    return () => { cancelled = true; };
  }, [candidate.paper_id]);

  const doiUrl  = candidate.doi ? `https://doi.org/${candidate.doi}` : null;
  const openUrl = doiUrl || candidate.url || null;

  const metaRows = [
    [t('paperui.drawer.meta.publisher'), candidate.publisher],
    [t('paperui.drawer.meta.journal'),   candidate.journal],
    [t('paperui.drawer.meta.year'),      candidate.publication_year],
    [t('paperui.drawer.meta.volume'),    candidate.volume],
    [t('paperui.drawer.meta.issue'),     candidate.issue],
    [t('paperui.drawer.meta.pages'),     candidate.pages],
    [t('paperui.drawer.meta.doi'),       candidate.doi],
    [t('paperui.drawer.meta.sources'),   candidate.sources?.join(', ')],
    [t('paperui.drawer.meta.citations'), candidate.citationCount > 0 ? candidate.citationCount.toLocaleString() : null],
  ].filter(([, v]) => v);

  const hasPdfText = fullText && fullText.trim().length > 0;
  const TABS = hasPdfText
    ? ['abstract', 'fulltext', 'meta', 'cite']
    : ['abstract', 'meta', 'cite'];
  const TAB_LABELS = {
    abstract: t('paperui.drawer.tabs.abstract'),
    fulltext: t('paperui.drawer.tabs.fulltext'),
    meta:     t('paperui.drawer.tabs.meta'),
    cite:     t('paperui.drawer.tabs.cite'),
  };

  return (
    <>
    <div className="cc-drawer-backdrop" onClick={onClose} aria-hidden="true" />
    <aside className="cc-drawer" aria-label={t('paperui.drawer.aria')}>

      {/* Header */}
      <div className="cc-drawer-header">
        <span className="cc-drawer-header-title">{t('paperui.drawer.reference')}</span>
        <div className="cc-drawer-header-btns">
          {openUrl && (
            <a href={openUrl} target="_blank" rel="noopener noreferrer"
              className="cc-drawer-icon-btn" title={t('paperui.drawer.openDownload')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </a>
          )}
          <button className="cc-drawer-icon-btn cc-drawer-close" onClick={onClose} title={t('paperui.drawer.close')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Body (scrollable) */}
      <div className="cc-drawer-body">

        <div className="cc-drawer-match-row">
          <span className="cc-drawer-match-label">{t('paperui.drawer.match')}</span>
          <ScoreBadge score={candidate.score} breakdown={candidate.scoreBreakdown} />
          {candidate.citationCount > 0 && (
            <span className="cc-drawer-citations">
              {t('paperui.drawer.citations', { count: candidate.citationCount, formatted: candidate.citationCount.toLocaleString() })}
            </span>
          )}
        </div>
        <SourceChips sources={candidate.sources} />

        <h2 className="cc-drawer-title">{candidate.title}</h2>

        <p className="cc-drawer-authors">
          {candidate.authors || t('paperui.drawer.unknownAuthors')}
          {candidate.publication_year && <> · {candidate.publication_year}</>}
          {candidate.journal && <> · <em>{candidate.journal}</em></>}
        </p>

        {doiUrl && (
          <a href={doiUrl} target="_blank" rel="noopener noreferrer" className="cc-drawer-doi">
            DOI: {candidate.doi}
          </a>
        )}

        {/* Tabs */}
        <div className="cc-drawer-tabs" role="tablist">
          {TABS.map(t => (
            <button key={t} role="tab" aria-selected={tab === t}
              className={`cc-drawer-tab ${tab === t ? 'cc-drawer-tab-active' : ''}`}
              onClick={() => setTab(t)}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Abstract */}
        {tab === 'abstract' && (
          loadingAbs
            ? <div className="cc-abs-loading">
                <span className="cc-abs-loading-dot" />
                <span className="cc-abs-loading-dot" />
                <span className="cc-abs-loading-dot" />
                <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 6 }}>{t('paperui.drawer.searchingAbstract')}</span>
              </div>
            : abstract
              ? <div className="cc-abs-wrap">
                  {isAiGenerated && <span className="cc-ai-summary-badge"><Sparkles size={11} /> {t('paperui.drawer.aiSummaryBadge')}</span>}
                  {user
                    ? <HighlightableText
                        text={abstract}
                        field="abstract"
                        highlights={paperHighlights.filter(h => !h.field || h.field === 'abstract')}
                        user={user}
                        onCreateHighlight={(payload) => {
                          onCreateHighlight?.({
                            ...payload,
                            paper_doi:     candidate.doi,
                            paper_title:   candidate.title,
                            paper_authors: candidate.authors,
                            paper_year:    candidate.publication_year,
                            paper_journal: candidate.journal,
                            paper_source:  (candidate.sources || [])[0] || null,
                            paper_url:     candidate.url || null,
                          });
                          // paperHighlights se actualiza automáticamente vía userHighlights (prop)
                        }}
                        onUpdateHighlight={(id, changes) => {
                          onUpdateHighlight?.(id, changes);
                        }}
                        onDeleteHighlight={(id) => {
                          onDeleteHighlight?.(id);
                        }}
                        onAskAssistant={onAskAssistant}
                        paperMeta={{
                          paper_doi:     candidate.doi,
                          paper_title:   candidate.title,
                          paper_authors: candidate.authors,
                          paper_year:    candidate.publication_year,
                          paper_journal: candidate.journal,
                          paper_source:  (candidate.sources || [])[0] || null,
                          paper_url:     candidate.url || null,
                        }}
                      />
                    : <p className="cc-drawer-abstract">{abstract}</p>
                  }
                </div>
              : <p className="cc-drawer-no-abstract">{t('paperui.drawer.noAbstract')}</p>
        )}

        {/* Texto completo del PDF */}
        {tab === 'fulltext' && (
          loadingFull
            ? <div className="cc-abs-loading">
                <span className="cc-abs-loading-dot" /><span className="cc-abs-loading-dot" /><span className="cc-abs-loading-dot" />
                <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 6 }}>{t('paperui.drawer.loadingText')}</span>
              </div>
            : hasPdfText
              ? <div className="cc-abs-wrap">
                  <div className="cc-fulltext-header">
                    <span className="cc-ai-summary-badge" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
                      {t('paperui.drawer.pdfExtracted')}
                    </span>
                  </div>
                  {user
                    ? <HighlightableText
                        text={fullText}
                        field="fulltext"
                        highlights={paperHighlights.filter(h => h.field === 'fulltext')}
                        user={user}
                        onCreateHighlight={(payload) => {
                          onCreateHighlight?.({
                            ...payload,
                            paper_doi:     candidate.doi,
                            paper_title:   candidate.title,
                            paper_authors: candidate.authors,
                            paper_year:    candidate.publication_year,
                            paper_journal: candidate.journal,
                            paper_source:  (candidate.sources || [])[0] || null,
                            paper_url:     candidate.url || null,
                          });
                        }}
                        onUpdateHighlight={onUpdateHighlight}
                        onDeleteHighlight={onDeleteHighlight}
                        onAskAssistant={onAskAssistant}
                        paperMeta={{
                          paper_doi:     candidate.doi,
                          paper_title:   candidate.title,
                          paper_authors: candidate.authors,
                          paper_year:    candidate.publication_year,
                          paper_journal: candidate.journal,
                          paper_source:  (candidate.sources || [])[0] || null,
                          paper_url:     candidate.url || null,
                        }}
                      />
                    : <pre className="cc-fulltext-pre">{fullText}</pre>
                  }
                </div>
              : <p className="cc-drawer-no-abstract">{t('paperui.drawer.noFulltext')}</p>
        )}

        {/* Apuntes de este paper (acordeón) */}
        {(tab === 'abstract' || tab === 'fulltext') && user && paperHighlights.filter(h => h.field === (tab === 'fulltext' ? 'fulltext' : 'abstract')).length > 0 && (
          <div className="cc-paper-notes">
            <button
              className="cc-paper-notes-toggle"
              onClick={() => setNotesExpanded(v => !v)}
            >
              <span className="cc-paper-notes-toggle-icon">{notesExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
              {tab === 'fulltext' ? t('paperui.drawer.notesPdf') : t('paperui.drawer.notesAbstract')}
              <span className="cc-paper-notes-count">
                {paperHighlights.filter(h => h.field === (tab === 'fulltext' ? 'fulltext' : 'abstract')).length}
              </span>
            </button>
            {notesExpanded && (
              <div className="cc-paper-notes-list">
                {paperHighlights.filter(h => h.field === (tab === 'fulltext' ? 'fulltext' : 'abstract')).map(hl => (
                  <div key={hl.id} className={`cc-note-item cc-note-item-${hl.color}`}>
                    <div className="cc-note-color-bar" />
                    <div className="cc-note-content">
                      <p className="cc-note-quote">"{hl.quote}"</p>
                      {hl.note && <p className="cc-note-text">{hl.note}</p>}
                    </div>
                    <div className="cc-note-actions">
                      <button
                        className="cc-note-del"
                        title={t('paperui.drawer.deleteNote')}
                        onClick={() => {
                          onDeleteHighlight?.(hl.id);
                          // paperHighlights se actualiza automáticamente vía userHighlights
                        }}
                      ><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Metadatos */}
        {tab === 'meta' && (
          <div className="cc-drawer-meta-table">
            {metaRows.length > 0
              ? metaRows.map(([k, v]) => (
                  <div key={k} className="cc-meta-row">
                    <span className="cc-meta-key">{k}</span>
                    <span className="cc-meta-val">{v}</span>
                  </div>
                ))
              : <p className="cc-drawer-no-abstract">{t('paperui.drawer.noMeta')}</p>
            }
          </div>
        )}

        {/* Citar — 7 formatos */}
        {tab === 'cite' && (
          <div className="cc-cite-tab">
            <p className="cc-cite-intro">
              {t('paperui.drawer.citeIntro')}
            </p>
            {CITATION_FORMATS.map(fmt => {
              const text = formatCitation(candidate, fmt);
              return (
                <div key={fmt} className="cc-cite-block">
                  <div className="cc-cite-block-header">
                    <span className="cc-cite-fmt-name">{fmt}</span>
                    <CopyButton text={text} className="cc-copy-btn cc-cite-copy-btn" classNameOk="cc-copy-ok" label={t('paperui.copy')} resetMs={2200} />
                  </div>
                  <pre
                    className="cc-cite-text"
                    contentEditable
                    suppressContentEditableWarning
                    onFocus={e => {
                      const range = document.createRange();
                      range.selectNodeContents(e.target);
                      window.getSelection().removeAllRanges();
                      window.getSelection().addRange(range);
                    }}
                  >{text}</pre>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="cc-drawer-footer">
        <button className="cc-choose-btn" onClick={() => onChoose(candidate)} disabled={choosing}>
          {choosing ? t('paperui.drawer.loading') : t('paperui.drawer.choose')}
        </button>
      </div>
    </aside>
    </>
  );
}

/* FILA DE LA LISTA — div.cc-row > label.cc-row-check + button.cc-row-inner.
   Estructura que separa el checkbox del clic en el cuerpo de la fila. */
const CandidateRow = React.memo(function CandidateRow({ candidate, isActive, isSelected, onToggleSelect, onClick, rank, queryKws = [] }) {
  const { t } = useTranslation();
  const firstAuthor  = candidate.authors?.split(',')[0]?.trim() || '';
  const citStr       = candidate.citationCount > 0
    ? (candidate.citationCount >= 1000
        ? t('paperui.row.citationsK', { n: (candidate.citationCount / 1000).toFixed(1) })
        : t('paperui.row.citations', { count: candidate.citationCount }))
    : null;
  const multiSource  = (candidate.sources || []).length >= 2;

  const sharedKws = queryKws.length
    ? [...new Set(queryKws.filter(w => candidate.title?.toLowerCase().includes(w)))].slice(0, 4)
    : [];

  return (
    <div className={`cc-row ${isActive ? 'cc-row-active' : ''} ${isSelected ? 'cc-row-selected' : ''} ${rank === 0 ? 'cc-row-top' : ''}`}>

      {/* Checkbox */}
      <label
        className="cc-row-check"
        title={isSelected ? t('paperui.row.deselect') : t('paperui.row.selectToCopy')}
        onClick={e => e.stopPropagation()}
      >
        <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(candidate)} />
        <span className="cc-row-check-box" />
      </label>

      {/* Cuerpo clickeable → abre drawer */}
      <button className="cc-row-inner" onClick={onClick} title={candidate.title}>
        <div className="cc-row-body">
          {rank === 0 && (
            <span className="cc-row-best">
              <Star size={10} /> {t('paperui.row.bestMatch')}
            </span>
          )}

          <span className="cc-row-title">{candidate.title}</span>

          <span className="cc-row-sub">
            {firstAuthor && <span className="cc-row-author"><User size={11} /> {firstAuthor}{candidate.authors?.includes(',') ? ' et al.' : ''}</span>}
            {candidate.publication_year && (
              <><span className="cc-row-sep">·</span><span className="cc-row-meta-item">{candidate.publication_year}</span></>
            )}
            {candidate.journal && (
              <><span className="cc-row-sep">·</span><span className="cc-row-journal">{candidate.journal}</span></>
            )}
          </span>

          <span className="cc-row-tags">
            <ScoreBadge score={candidate.score} breakdown={candidate.scoreBreakdown} />
            {citStr && <span className="cc-row-citations">{citStr}</span>}
            {multiSource && (
              <span className="cc-row-verified" title={t('paperui.row.verifiedIn', { count: candidate.sources.length })}>
                <Check size={10} /> {t('paperui.row.sourcesCount', { count: candidate.sources.length })}
              </span>
            )}
            {(candidate.sources || []).map(s => (
              <span key={s} className="cc-row-source-chip">{SOURCE_LABELS[s] || s}</span>
            ))}
          </span>

          {sharedKws.length > 0 && (
            <span className="cc-row-kws" aria-label={t('paperui.row.sharedThemesAria')}>
              {sharedKws.map(w => <span key={w} className="cc-row-kw">{w}</span>)}
            </span>
          )}
        </div>

        <PaperCover paper={candidate} size={92} className="cc-row-cover" />
      </button>
    </div>
  );
});

// Opciones de orden. La etiqueta visible se resuelve en render vía t(`paperui.sort.${key}`).
const SORT_OPTIONS = [
  { key: 'score' },
  { key: 'year' },
  { key: 'citations' },
];

const CandidateComparison = ({
  candidates = [],
  action,
  query,
  recommendation,
  aiNarrative,
  message,
  activeCandidate,
  onRowClick,
}) => {
  const { t } = useTranslation();
  // Multi-selección
  const [selected, setSelected]     = useState(new Set());
  const [bulkFormat, setBulkFormat] = useState('APA');
  const [bulkCopied, setBulkCopied] = useState(false);

  // Filtros
  const [sortBy,       setSortBy]       = useState('score');
  const [filterSource, setFilterSource] = useState('all');

  // Limpiar selección cuando cambian los candidatos (nueva búsqueda)
  useEffect(() => {
    setSelected(new Set());
    setSortBy('score');
    setFilterSource('all');
  }, [candidates]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSelect = (c) => {
    const key = candidateKey(c);
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const allSelected  = candidates.length > 0 && candidates.every(c => selected.has(candidateKey(c)));
  const noneSelected = selected.size === 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(candidates.map(c => candidateKey(c))));
    }
  };

  const selectedCandidates = candidates.filter(c => selected.has(candidateKey(c)));

  const handleBulkCopy = () => {
    const text = formatMultiple(selectedCandidates, bulkFormat);
    navigator.clipboard.writeText(text).then(() => {
      setBulkCopied(true);
      setTimeout(() => setBulkCopied(false), 2500);
    }).catch(() => {});
  };

  const availableSources = useMemo(
    () => [...new Set(candidates.flatMap(c => c.sources || []))],
    [candidates]
  );

  const displayCandidates = useMemo(
    () => candidates
      .filter(c => filterSource === 'all' || (c.sources || []).includes(filterSource))
      .sort((a, b) => {
        if (sortBy === 'score')     return (b.score || 0)            - (a.score || 0);
        if (sortBy === 'year')      return (b.publication_year || 0)  - (a.publication_year || 0);
        if (sortBy === 'citations') return (b.citationCount || 0)     - (a.citationCount || 0);
        return 0;
      }),
    [candidates, filterSource, sortBy]
  );

  const isActive = (c) => {
    if (!activeCandidate) return false;
    if (activeCandidate.doi && c.doi) return activeCandidate.doi === c.doi;
    return activeCandidate.title === c.title;
  };

  const filtersActive = sortBy !== 'score' || filterSource !== 'all';

  const queryKws = useMemo(() => extractKw(query || ''), [query]);

  const sharedThemes = useMemo(
    () => queryKws
      .map(kw => ({ kw, count: candidates.filter(c => c.title?.toLowerCase().includes(kw)).length }))
      .filter(({ count }) => count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 7),
    [queryKws, candidates]
  );

  // Modo refine
  if (action === 'refine') {
    return (
      <div className="cc-container cc-refine">
        {query && <p className="cc-query-label">{t('paperui.refine.searchLabel')} <strong>"{query}"</strong></p>}
        <div className="cc-refine-icon">🔍</div>
        <p className="cc-refine-msg">{message || t('paperui.refine.noClearMatch')}</p>
        <p className="cc-refine-hint">
          {t('paperui.refine.hintPrefix')}<strong>DOI</strong>{t('paperui.refine.hintMid')}<strong>{t('paperui.refine.author')}</strong>{t('paperui.refine.hintOr')}<strong>{t('paperui.refine.year')}</strong>{t('paperui.refine.hintSuffix')}
        </p>
        {candidates.length > 0 && (
          <details className="cc-refine-details">
            <summary>{t('paperui.refine.showApprox', { count: candidates.length })}</summary>
            <div className="cc-list" style={{ marginTop: '0.75rem' }}>
              {candidates.map((c) => (
                <CandidateRow
                  key={candidateKey(c)}
                  candidate={c}
                  isActive={isActive(c)}
                  isSelected={selected.has(candidateKey(c))}
                  onToggleSelect={toggleSelect}
                  onClick={() => onRowClick?.(c)}
                  queryKws={queryKws}
                />
              ))}
            </div>
          </details>
        )}
      </div>
    );
  }

  // Modo compare
  return (
    <div className="cc-container">

      {query && (
        <div className="cc-search-title">
          <h2 className="cc-search-title-text">"{query}"</h2>
        </div>
      )}

      {aiNarrative && (
        <div className="cc-ai-analysis">
          <div className="cc-ai-analysis-header">
            <span className="cc-ai-analysis-icon"><Sparkles size={13} /></span>
            <span className="cc-ai-analysis-label">{t('paperui.compare.directSummary')}</span>
          </div>
          <p className="cc-ai-analysis-text">{aiNarrative}</p>
        </div>
      )}

      {sharedThemes.length >= 2 && (
        <div className="cc-themes-bar">
          <span className="cc-themes-bar-label">{t('paperui.compare.sharedThemes')}</span>
          <div className="cc-themes-bar-tags">
            {sharedThemes.map(({ kw, count }) => (
              <span key={kw} className="cc-theme-tag" title={t('paperui.compare.themeCount', { count, total: candidates.length })}>
                {kw}
                <span className="cc-theme-count">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Barra de filtros */}
      <div className="cc-filter-bar">
        <div className="cc-filter-bar-left">
          {/* Ordenar por */}
          <div className="cc-filter-group">
            <span className="cc-filter-label">{t('paperui.compare.sortLabel')}</span>
            <select
              className="cc-filter-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.key} value={o.key}>{t(`paperui.sort.${o.key}`)}</option>
              ))}
            </select>
          </div>

          {/* Filtrar por fuente */}
          {availableSources.length > 1 && (
            <div className="cc-filter-group">
              <span className="cc-filter-label">{t('paperui.compare.sourceLabel')}</span>
              <div className="cc-source-pills">
                <button
                  className={`cc-source-pill ${filterSource === 'all' ? 'cc-source-pill-active' : ''}`}
                  onClick={() => setFilterSource('all')}
                >
                  {t('paperui.compare.allSources')}
                </button>
                {availableSources.map(src => (
                  <button
                    key={src}
                    className={`cc-source-pill ${filterSource === src ? 'cc-source-pill-active' : ''}`}
                    onClick={() => setFilterSource(src)}
                  >
                    {SOURCE_LABELS[src] || src}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {filtersActive && (
          <button
            className="cc-filter-reset"
            onClick={() => { setSortBy('score'); setFilterSource('all'); }}
            title={t('paperui.compare.resetFilters')}
          >
            <X size={12} /> {t('paperui.compare.reset')}
          </button>
        )}
      </div>

      {/* Encabezado de la lista con "select all" */}
      <div className="cc-list-header">
        <label className="cc-select-all" title={allSelected ? t('paperui.compare.deselectAll') : t('paperui.compare.selectAll')}>
          <input
            type="checkbox"
            checked={allSelected}
            ref={el => { if (el) el.indeterminate = !allSelected && !noneSelected; }}
            onChange={toggleAll}
          />
          <span className="cc-select-all-box" />
          <span className="cc-list-count">
            {displayCandidates.length !== candidates.length
              ? t('paperui.compare.resultsFiltered', { shown: displayCandidates.length, total: candidates.length, count: candidates.length })
              : t('paperui.compare.results', { count: candidates.length })
            }
            {!noneSelected && (
              <span className="cc-list-count-sel">{t('paperui.compare.selectedCount', { count: selected.size })}</span>
            )}
          </span>
        </label>
        {displayCandidates[0]?.score > 0 && (
          <span className="cc-best-badge">
            <Star size={12} /> {t('paperui.compare.matchPercent', { score: displayCandidates[0].score })}
          </span>
        )}
      </div>

      {/* Lista */}
      <div className="cc-list">
        {displayCandidates.length === 0 ? (
          <div className="cc-empty-filter">
            <p>{t('paperui.compare.emptyFilter')}</p>
            <button onClick={() => setFilterSource('all')}>{t('paperui.compare.viewAllSources')}</button>
          </div>
        ) : (
          displayCandidates.map((c, i) => (
            <CandidateRow
              key={candidateKey(c)}
              rank={i}
              candidate={c}
              isActive={isActive(c)}
              isSelected={selected.has(candidateKey(c))}
              onToggleSelect={toggleSelect}
              onClick={() => onRowClick?.(c)}
              queryKws={queryKws}
            />
          ))
        )}
      </div>

      {/* Pista */}
      {noneSelected && displayCandidates.length > 0 && (
        <p className="cc-list-hint">
          {activeCandidate
            ? t('paperui.compare.hintActive')
            : t('paperui.compare.hintIdle')}
        </p>
      )}

      {/* Barra de acción — aparece al seleccionar ≥1 fila */}
      {!noneSelected && (
        <div className="cc-action-bar">
          <span className="cc-action-count">
            {t('paperui.compare.citeCount', { count: selected.size })}
          </span>

          <select
            className="cc-format-select"
            value={bulkFormat}
            onChange={e => setBulkFormat(e.target.value)}
            title={t('paperui.compare.citationFormat')}
          >
            {CITATION_FORMATS.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          <button
            className={`cc-action-copy-btn ${bulkCopied ? 'cc-action-copy-ok' : ''}`}
            onClick={handleBulkCopy}
          >
            {bulkCopied ? <><Check size={13} /> {t('paperui.copied')}</> : t('paperui.compare.copyCites', { count: selected.size })}
          </button>

          <button
            className="cc-action-clear-btn"
            onClick={() => setSelected(new Set())}
            title={t('paperui.compare.clearSelection')}
          >
            <X size={13} />
          </button>
        </div>
      )}

    </div>
  );
};

export default CandidateComparison;
