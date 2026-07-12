import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader } from '../Icons';

function MetaEditForm({ paper, onSave, onCancel, saving }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState({
    title:            paper.title            || '',
    authors:          paper.authors          || '',
    publication_year: paper.publication_year || '',
    journal:          paper.journal          || '',
    volume:           paper.volume           || '',
    issue:            paper.issue            || '',
    pages:            paper.pages            || '',
    doi:              paper.doi              || '',
  });
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  return (
    <form className="meta-edit-form" onSubmit={e => { e.preventDefault(); onSave(draft); }}>
      <div className="meta-edit-grid">
        <div className="meta-edit-field meta-edit-full">
          <label>{t('chatview.meta.title')}</label>
          <input value={draft.title} onChange={e => set('title', e.target.value)} required />
        </div>
        <div className="meta-edit-field meta-edit-full">
          <label>{t('chatview.meta.authors')} <span className="meta-edit-hint">{t('chatview.meta.authorsHint')}</span></label>
          <input value={draft.authors} onChange={e => set('authors', e.target.value)} />
        </div>
        <div className="meta-edit-field">
          <label>{t('chatview.meta.year')}</label>
          <input type="number" min="1000" max="2100" value={draft.publication_year}
            onChange={e => set('publication_year', e.target.value)} />
        </div>
        <div className="meta-edit-field">
          <label>{t('chatview.meta.journal')}</label>
          <input value={draft.journal} onChange={e => set('journal', e.target.value)} />
        </div>
        <div className="meta-edit-field">
          <label>{t('chatview.meta.volume')}</label>
          <input value={draft.volume} onChange={e => set('volume', e.target.value)} />
        </div>
        <div className="meta-edit-field">
          <label>{t('chatview.meta.issue')}</label>
          <input value={draft.issue} onChange={e => set('issue', e.target.value)} />
        </div>
        <div className="meta-edit-field">
          <label>{t('chatview.meta.pages')}</label>
          <input value={draft.pages} onChange={e => set('pages', e.target.value)} />
        </div>
        <div className="meta-edit-field">
          <label>{t('chatview.meta.doi')}</label>
          <input value={draft.doi} onChange={e => set('doi', e.target.value)} />
        </div>
      </div>
      <div className="meta-edit-actions">
        <button type="submit" className="meta-edit-save" disabled={saving}>
          {saving ? <><Loader size={13} className="spinning" /> {t('chatview.meta.saving')}</> : t('chatview.meta.save')}
        </button>
        <button type="button" className="meta-edit-cancel" onClick={onCancel} disabled={saving}>
          {t('chatview.meta.cancel')}
        </button>
      </div>
    </form>
  );
}

export default MetaEditForm;
