import React, { useState, useRef, useEffect } from 'react';
import { Star, Sparkles, Plus, X, ExternalLink, Folder, Check, Loader } from '../Icons';
import { colorHex } from '../../constants/highlightColors';

const LibraryCard = ({
  paper,
  collections,
  onToggleCollection,
  onAddTag,
  onRemoveTag,
  onAutoTag,
  onFilterTag,
  autoTagging,
}) => {
  const [tagInputOpen, setTagInputOpen] = useState(false);
  const [tagValue, setTagValue]         = useState('');
  const [folderOpen, setFolderOpen]     = useState(false);
  const folderRef = useRef(null);

  useEffect(() => {
    if (!folderOpen) return;
    const handler = (e) => {
      if (folderRef.current && !folderRef.current.contains(e.target)) setFolderOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [folderOpen]);

  const submitTag = (e) => {
    e.preventDefault();
    const value = tagValue.trim();
    if (!value) return;
    onAddTag(paper, value);
    setTagValue('');
    setTagInputOpen(false);
  };

  const memberIds = new Set((paper.collections || []).map(c => c.id));
  const meta = [paper.authors, paper.publication_year, paper.journal].filter(Boolean).join(' · ');
  const link = paper.doi ? `https://doi.org/${paper.doi}` : paper.url;

  return (
    <article className="lib-card">
      <div className="lib-card-head">
        <h3 className="lib-card-title">{paper.title}</h3>
        {paper.is_favorite && (
          <span className="lib-card-fav" title="En favoritos">
            <Star size={13} />
          </span>
        )}
      </div>

      {meta && <p className="lib-card-meta">{meta}</p>}

      {(paper.collections || []).length > 0 && (
        <div className="lib-card-collections">
          {paper.collections.map(c => (
            <span key={c.id} className="lib-card-collection">
              <span className="lib-dot" style={{ background: colorHex(c.color) }} />
              {c.name}
            </span>
          ))}
        </div>
      )}

      <div className="lib-card-tags">
        {(paper.tags || []).map(tag => (
          <span key={tag.id} className="lib-tag">
            <button className="lib-tag-name" onClick={() => onFilterTag(tag.name)} title={`Filtrar por #${tag.name}`}>
              #{tag.name}
            </button>
            <button className="lib-tag-remove" onClick={() => onRemoveTag(paper, tag)} title="Quitar etiqueta">
              <X size={10} />
            </button>
          </span>
        ))}

        {tagInputOpen ? (
          <form className="lib-tag-form" onSubmit={submitTag}>
            <input
              className="lib-tag-input"
              value={tagValue}
              onChange={(e) => setTagValue(e.target.value)}
              onBlur={() => { if (!tagValue.trim()) setTagInputOpen(false); }}
              placeholder="etiqueta"
              maxLength={60}
              autoFocus
            />
          </form>
        ) : (
          <button className="lib-tag-add" onClick={() => setTagInputOpen(true)} title="Añadir etiqueta">
            <Plus size={11} /> tag
          </button>
        )}
      </div>

      <div className="lib-card-actions">
        <button
          className="lib-action-btn"
          onClick={() => onAutoTag(paper)}
          disabled={autoTagging}
          title="Sugerir etiquetas con IA"
        >
          {autoTagging ? <Loader size={13} className="lib-spin" /> : <Sparkles size={13} />}
          IA
        </button>

        <div className="lib-folder-wrap" ref={folderRef}>
          <button
            className="lib-action-btn"
            onClick={() => setFolderOpen(o => !o)}
            title="Colecciones"
          >
            <Folder size={13} />
            Colección
          </button>

          {folderOpen && (
            <div className="lib-folder-menu">
              {collections.length === 0 && (
                <span className="lib-folder-empty">Crea una colección primero</span>
              )}
              {collections.map(c => (
                <button
                  key={c.id}
                  className="lib-folder-item"
                  onClick={() => onToggleCollection(paper, c, !memberIds.has(c.id))}
                >
                  <span className="lib-dot" style={{ background: colorHex(c.color) }} />
                  <span className="lib-folder-name">{c.name}</span>
                  {memberIds.has(c.id) && <Check size={12} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {link && (
          <a className="lib-action-btn" href={link} target="_blank" rel="noopener noreferrer" title="Abrir fuente">
            <ExternalLink size={13} />
            Fuente
          </a>
        )}
      </div>
    </article>
  );
};

export default LibraryCard;
