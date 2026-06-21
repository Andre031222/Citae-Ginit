import React, { useState } from 'react';
import { X, Check } from '../Icons';
import { HIGHLIGHT_COLORS } from '../../constants/highlightColors';

const CollectionModal = ({ initial, onSave, onClose, saving }) => {
  const [name, setName]               = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [color, setColor]             = useState(initial?.color || 'blue');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), color });
  };

  return (
    <>
      <div className="lib-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <form className="lib-modal" onSubmit={handleSubmit}>
        <div className="lib-modal-header">
          <span className="lib-modal-title">
            {initial ? 'Editar colección' : 'Nueva colección'}
          </span>
          <button type="button" className="lib-icon-btn" onClick={onClose} title="Cerrar">
            <X size={14} />
          </button>
        </div>

        <label className="lib-modal-label" htmlFor="lib-col-name">Nombre</label>
        <input
          id="lib-col-name"
          className="lib-modal-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Tesis — capítulo 2"
          maxLength={120}
          autoFocus
        />

        <label className="lib-modal-label" htmlFor="lib-col-desc">Descripción (opcional)</label>
        <textarea
          id="lib-col-desc"
          className="lib-modal-input lib-modal-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Para qué es esta colección"
          rows={2}
        />

        <span className="lib-modal-label">Color</span>
        <div className="lib-modal-colors">
          {HIGHLIGHT_COLORS.map(c => (
            <button
              key={c.key}
              type="button"
              className={`lib-color-swatch ${color === c.key ? 'is-active' : ''}`}
              style={{ background: c.hex }}
              onClick={() => setColor(c.key)}
              title={c.name}
            >
              {color === c.key && <Check size={12} />}
            </button>
          ))}
        </div>

        <div className="lib-modal-actions">
          <button type="button" className="lib-btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="lib-btn-primary" disabled={!name.trim() || saving}>
            {saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear colección'}
          </button>
        </div>
      </form>
    </>
  );
};

export default CollectionModal;
