import React, { useState } from 'react';
import notify from '../../services/swal';
import CandidateComparison from '../CandidateComparison';
import CitationDisplay from '../CitationDisplay';
import MetaEditForm from './MetaEditForm';
import SearchProgress from './SearchProgress';
import { AlertCircle, Check, Plus, Edit, Star, ExternalLink, Search, Filter } from '../Icons';
import citoLogo from '../../assets/citae-logo-v2.png';

function SearchTransparency({ meta }) {
  if (!meta) return null;
  const f = meta.filters || {};
  const chips = [];
  if (f.yearFrom && f.yearTo) chips.push(`${f.yearFrom}–${f.yearTo}`);
  else if (f.yearFrom)        chips.push(`desde ${f.yearFrom}`);
  else if (f.yearTo)          chips.push(`hasta ${f.yearTo}`);
  if (f.minCitations)         chips.push(`≥ ${f.minCitations} citas`);
  if (f.type === 'preprint')  chips.push('preprints');
  if (f.type === 'article')   chips.push('artículos');

  return (
    <div className="chat-search-meta">
      <span className="csm-query">
        <Search size={12} />
        Búsqueda: <strong>{meta.searchedFor}</strong>
      </span>
      {chips.length > 0 && (
        <span className="csm-filters">
          <Filter size={11} />
          {chips.map((c, i) => <span key={i} className="csm-chip">{c}</span>)}
        </span>
      )}
      {meta.filteredOut > 0 && (
        <span className="csm-note">{meta.filteredOut} resultado{meta.filteredOut !== 1 ? 's' : ''} ocultos por los filtros</span>
      )}
    </div>
  );
}

function paperLink(paper) {
  if (paper?.doi)   return `https://doi.org/${paper.doi}`;
  if (paper?.url)   return paper.url;
  if (paper?.title) return `https://scholar.google.com/scholar?q=${encodeURIComponent(paper.title)}`;
  return null;
}

const AssistantMsg = ({
  msg, onExport, onFavorite, onChooseCandidate, onOpenDrawer,
  activeCandidate, user, onMetaUpdate, onAddToBiblio, inBiblio,
}) => {
  const [editing, setEditing]       = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);

  const handleMetaSave = async (draft) => {
    setSavingMeta(true);
    try {
      await onMetaUpdate(msg.id, msg.paper, draft);
      setEditing(false);
    } catch {
      notify.error('Error al actualizar los metadatos');
    } finally { setSavingMeta(false); }
  };

  if (!msg.loading && !msg.error && msg.candidates) {
    return (
      <div className="chat-results-block">
        <SearchTransparency meta={msg.searchMeta} />
        <CandidateComparison
          candidates={msg.candidates}
          action={msg.action}
          query={msg.query}
          recommendation={msg.recommendation}
          aiNarrative={msg.aiNarrative}
          message={msg.message}
          activeCandidate={activeCandidate}
          onRowClick={onOpenDrawer}
        />
      </div>
    );
  }

  if (msg.loading) {
    return (
      <div className="chat-loading-row">
        {msg.searching ? (
          <SearchProgress query={msg.query} />
        ) : (
          <div className="chat-thinking">
            <span /><span /><span />
            {msg.loadingText && <span className="chat-loading-text">{msg.loadingText}</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="chat-msg chat-msg-assistant">
      <div className="chat-avatar">
        <img src={citoLogo} alt="Citae" />
      </div>
      <div className="chat-response">
        {msg.error ? (
          <div className="chat-error">
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            {msg.error}
          </div>
        ) : (
          <>
            <div className="chat-paper-card">
              <div className="chat-paper-header">
                <div className="chat-paper-meta">
                  {!editing && <>
                    <h4 className="chat-paper-title">{msg.paper?.title}</h4>
                    <p className="chat-paper-sub">
                      {msg.paper?.authors}
                      {msg.paper?.publication_year ? ` · ${msg.paper.publication_year}` : ''}
                      {msg.paper?.journal ? ` · ${msg.paper.journal}` : ''}
                    </p>
                    <div className="chat-paper-links">
                      {msg.paper?.doi && (
                        <a className="chat-paper-doi" href={`https://doi.org/${msg.paper.doi}`}
                          target="_blank" rel="noopener noreferrer">
                          DOI: {msg.paper.doi}
                        </a>
                      )}
                      {paperLink(msg.paper) && (
                        <a className="chat-paper-open" href={paperLink(msg.paper)}
                          target="_blank" rel="noopener noreferrer">
                          Ver paper <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                    <div className="chat-paper-trust-row">
                      {msg.paper?.doi && (
                        <span className="chat-paper-trust-badge">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          DOI verificado
                        </span>
                      )}
                      {msg.paper?.source && (
                        <span className="chat-paper-trust-badge chat-paper-trust-badge-neutral">
                          {msg.paper.source}
                        </span>
                      )}
                    </div>
                  </>}
                </div>
                <div className="chat-paper-actions">
                  {msg.paper && !editing && (
                    <button
                      className={`chat-biblio-btn ${inBiblio ? 'chat-biblio-btn-active' : ''}`}
                      onClick={() => onAddToBiblio(msg)}
                      title={inBiblio ? 'Quitar de bibliografía' : 'Añadir a bibliografía'}
                    >
                      {inBiblio ? <Check size={11} /> : <Plus size={11} />} Bib
                    </button>
                  )}
                  {msg.paper && (
                    <button
                      className={`chat-edit-btn ${editing ? 'chat-edit-btn-active' : ''}`}
                      onClick={() => setEditing(v => !v)}
                      title="Editar metadatos"
                    >
                      <Edit size={13} />
                    </button>
                  )}
                  {user && (
                    <button className="chat-fav-btn" onClick={() => onFavorite(msg.paper?.id)}
                      title="Guardar en favoritos">
                      <Star size={15} />
                    </button>
                  )}
                </div>
              </div>
              {editing && msg.paper && (
                <MetaEditForm
                  paper={msg.paper}
                  onSave={handleMetaSave}
                  onCancel={() => setEditing(false)}
                  saving={savingMeta}
                />
              )}
            </div>
            {msg.citations && Object.keys(msg.citations).length > 0 && (
              <CitationDisplay citations={msg.citations} onExport={() => onExport(msg.paper, msg.citations)} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AssistantMsg;
