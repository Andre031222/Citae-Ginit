import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check } from '../Icons';
import { HIGHLIGHT_COLORS } from '../../constants/highlightColors';

const CollectionModal = ({ initial, onSave, onClose, saving }) => {
  const { t } = useTranslation();
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
            {initial ? t('library.collectionModal.editTitle') : t('library.collectionModal.newTitle')}
          </span>
          <button type="button" className="lib-icon-btn" onClick={onClose} title={t('library.close')}>
            <X size={14} />
          </button>
        </div>

        <label className="lib-modal-label" htmlFor="lib-col-name">{t('library.collectionModal.nameLabel')}</label>
        <input
          id="lib-col-name"
          className="lib-modal-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('library.collectionModal.namePlaceholder')}
          maxLength={120}
          autoFocus
        />

        <label className="lib-modal-label" htmlFor="lib-col-desc">{t('library.collectionModal.descLabel')}</label>
        <textarea
          id="lib-col-desc"
          className="lib-modal-input lib-modal-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('library.collectionModal.descPlaceholder')}
          rows={2}
        />

        <span className="lib-modal-label">{t('library.collectionModal.colorLabel')}</span>
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
          <button type="button" className="lib-btn-ghost" onClick={onClose}>{t('library.cancel')}</button>
          <button type="submit" className="lib-btn-primary" disabled={!name.trim() || saving}>
            {saving ? t('library.collectionModal.saving') : initial ? t('library.collectionModal.saveChanges') : t('library.collectionModal.create')}
          </button>
        </div>
      </form>
    </>
  );
};

export default CollectionModal;
