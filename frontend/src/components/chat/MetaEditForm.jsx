import React, { useState } from 'react';
import { Loader } from '../Icons';

function MetaEditForm({ paper, onSave, onCancel, saving }) {
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
          <label>Título</label>
          <input value={draft.title} onChange={e => set('title', e.target.value)} required />
        </div>
        <div className="meta-edit-field meta-edit-full">
          <label>Autores <span className="meta-edit-hint">(separados por coma)</span></label>
          <input value={draft.authors} onChange={e => set('authors', e.target.value)} />
        </div>
        <div className="meta-edit-field">
          <label>Año</label>
          <input type="number" min="1000" max="2100" value={draft.publication_year}
            onChange={e => set('publication_year', e.target.value)} />
        </div>
        <div className="meta-edit-field">
          <label>Revista / Journal</label>
          <input value={draft.journal} onChange={e => set('journal', e.target.value)} />
        </div>
        <div className="meta-edit-field">
          <label>Volumen</label>
          <input value={draft.volume} onChange={e => set('volume', e.target.value)} />
        </div>
        <div className="meta-edit-field">
          <label>Número</label>
          <input value={draft.issue} onChange={e => set('issue', e.target.value)} />
        </div>
        <div className="meta-edit-field">
          <label>Páginas</label>
          <input value={draft.pages} onChange={e => set('pages', e.target.value)} />
        </div>
        <div className="meta-edit-field">
          <label>DOI</label>
          <input value={draft.doi} onChange={e => set('doi', e.target.value)} />
        </div>
      </div>
      <div className="meta-edit-actions">
        <button type="submit" className="meta-edit-save" disabled={saving}>
          {saving ? <><Loader size={13} className="spinning" /> Guardando…</> : 'Guardar y regenerar citas'}
        </button>
        <button type="button" className="meta-edit-cancel" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default MetaEditForm;
