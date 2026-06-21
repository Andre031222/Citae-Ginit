import React, { useState } from 'react';
import { Star, Trash2, Check, ImageIcon } from '../Icons';
import { HIGHLIGHT_COLORS, colorHex, colorName } from '../../constants/highlightColors';
import { formatDate } from '../../utils/sidebarUtils';
import QuoteshotModal from '../share/QuoteshotModal';

const HighlightDetail = ({ hl, onBack, onUpdate, onDelete, onOpenPaper }) => {
  const [noteVal,   setNoteVal]   = useState(hl.note || '');
  const [editNote,  setEditNote]  = useState(false);
  const [savedNote, setSavedNote] = useState(false);
  const [showShot,  setShowShot]  = useState(false);

  const saveNote = () => {
    onUpdate?.(hl.id, { note: noteVal });
    setEditNote(false);
    setSavedNote(true);
    setTimeout(() => setSavedNote(false), 1800);
  };

  const hlHex = colorHex(hl.color);

  return (
    <div className="cs-detail-panel">
      <div className="cs-detail-topbar">
        <button className="cs-detail-back" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Apuntes
        </button>
        <div className="cs-detail-actions-top">
          <button
            className="cs-detail-fav"
            title="Crear imagen compartible (Quoteshot)"
            onClick={() => setShowShot(true)}
          ><ImageIcon size={13} /></button>
          <button
            className={`cs-detail-fav ${hl.is_favorite ? 'cs-detail-fav-on' : ''}`}
            title={hl.is_favorite ? 'Quitar favorito' : 'Marcar favorito'}
            onClick={() => onUpdate?.(hl.id, { is_favorite: !hl.is_favorite })}
          ><Star size={13} /></button>
          <button
            className="cs-detail-del"
            title="Eliminar apunte"
            onClick={() => { onDelete?.(hl.id); onBack(); }}
          ><Trash2 size={13} /></button>
        </div>
      </div>

      <button className="cs-detail-paper-chip" onClick={() => onOpenPaper?.(hl)}>
        <div className="cs-detail-paper-chip-body">
          <span className="cs-detail-paper-title">{hl.paper_title || 'Paper sin título'}</span>
          {hl.paper_authors && (
            <span className="cs-detail-paper-meta">
              {hl.paper_authors.split(',')[0].trim()}
              {hl.paper_year ? ` · ${hl.paper_year}` : ''}
            </span>
          )}
        </div>
        <svg className="cs-detail-open-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </button>

      <div className="cs-detail-quote-card" style={{ '--hl-accent': hlHex }}>
        <div className="cs-detail-quote-bar" style={{ background: hlHex }} />
        <div className="cs-detail-quote-content">
          <div className="cs-detail-color-tag" style={{ background: hlHex + '28', color: hlHex, borderColor: hlHex + '44' }}>
            <span className="cs-detail-color-dot" style={{ background: hlHex }} />
            {colorName(hl.color)}
          </div>
          <blockquote className="cs-detail-quote-text">"{hl.quote}"</blockquote>
          <span className="cs-detail-date">{formatDate(hl.created_at)}</span>
        </div>
      </div>

      <div className="cs-detail-section">
        <span className="cs-detail-section-label">Color</span>
        <div className="cs-detail-color-row">
          {HIGHLIGHT_COLORS.map(c => (
            <button
              key={c.key}
              className={`cs-detail-color-swatch ${hl.color === c.key ? 'cs-detail-swatch-active' : ''}`}
              style={{ background: colorHex(c.key) }}
              title={colorName(c.key)}
              onClick={() => onUpdate?.(hl.id, { color: c.key })}
            />
          ))}
        </div>
      </div>

      <div className="cs-detail-section">
        <div className="cs-detail-section-header">
          <span className="cs-detail-section-label">Nota</span>
          {!editNote && (
            <button className="cs-detail-note-edit-btn" onClick={() => setEditNote(true)}>
              {noteVal ? 'Editar' : '+ Añadir nota'}
            </button>
          )}
        </div>

        {editNote ? (
          <div className="cs-detail-note-edit">
            <textarea
              className="cs-detail-note-textarea"
              value={noteVal}
              onChange={e => setNoteVal(e.target.value)}
              rows={4}
              placeholder="Escribe tu nota aquí…"
              autoFocus
            />
            <div className="cs-detail-note-btns">
              <button className="cs-detail-note-cancel" onClick={() => { setNoteVal(hl.note || ''); setEditNote(false); }}>Cancelar</button>
              <button className="cs-detail-note-save" onClick={saveNote}>
                {savedNote ? <><Check size={11} /> Guardado</> : 'Guardar'}
              </button>
            </div>
          </div>
        ) : (
          noteVal
            ? <p className="cs-detail-note-text">{noteVal}</p>
            : <p className="cs-detail-note-empty">Sin nota. Clic en "+ Añadir nota" para agregar.</p>
        )}
      </div>

      <button className="cs-detail-open-paper-btn" onClick={() => onOpenPaper?.(hl)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        Abrir paper en el drawer
      </button>

      {showShot && (
        <QuoteshotModal highlight={hl} onClose={() => setShowShot(false)} />
      )}
    </div>
  );
};

export default HighlightDetail;
