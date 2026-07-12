import { useState, useCallback } from 'react';
import api from '../services/api';
import notify from '../services/swal';
import i18n from '../i18n';

export function useBibliography({ loadFavorites, setMessages }) {
  const [biblioItems, setBiblioItems] = useState([]);

  const handleFavorite = useCallback(async (paperId) => {
    if (!paperId) return;
    try {
      const { data } = await api.post('/auth/favorites', { paperId });
      if (data.success) { notify.success(i18n.t('shell.notify.savedFavorite')); loadFavorites(); }
      else notify.info(i18n.t('shell.notify.favoritesTitle'), data.message || i18n.t('shell.notify.alreadyFavorite'));
    } catch { notify.error(i18n.t('shell.errors.saveFavorite')); }
  }, [loadFavorites]);

  const handleExport = useCallback(async (paper, citations) => {
    if (!paper) return;
    try {
      const { data } = await api.post('/citations/export',
        { paperId: paper.id, formats: Object.keys(citations) },
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([data]));
      const a   = document.createElement('a');
      a.href = url; a.setAttribute('download', `citas-${paper.id}.txt`);
      document.body.appendChild(a); a.click(); a.remove();
      notify.success(i18n.t('shell.notify.exported'));
    } catch { notify.error(i18n.t('shell.errors.export')); }
  }, []);

  const handleMetaUpdate = useCallback(async (msgId, paper, draft) => {
    try {
      await api.put(`/papers/${paper.id}`, {
        title:            draft.title,
        authors:          draft.authors,
        publication_year: draft.publication_year ? parseInt(draft.publication_year) : null,
        journal:          draft.journal,
        volume:           draft.volume,
        issue:            draft.issue,
        pages:            draft.pages,
        doi:              draft.doi,
      });
      const { data } = await api.post(`/papers/${paper.id}/citations/generate-all?force=true`);
      const citationsMap = {};
      data.citations.forEach(c => { citationsMap[c.format_type] = c.citation_text; });
      const updatedPaper = { ...paper, ...draft,
        publication_year: draft.publication_year ? parseInt(draft.publication_year) : null };
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, paper: updatedPaper, citations: citationsMap } : m
      ));
      setBiblioItems(prev => prev.map(b =>
        b.msgId === msgId ? { ...b, paper: updatedPaper, citations: citationsMap } : b
      ));
      notify.success(i18n.t('shell.notify.metaUpdated'));
    } catch {
      throw new Error(i18n.t('shell.errors.updateMeta'));
    }
  }, [setMessages]);

  const handleAddToBiblio = useCallback((msg) => {
    if (!msg.paper) return;
    setBiblioItems(prev => {
      const exists = prev.some(b => b.msgId === msg.id);
      if (exists) return prev.filter(b => b.msgId !== msg.id);
      return [...prev, { msgId: msg.id, paper: msg.paper, citations: msg.citations || {} }];
    });
  }, []);

  return {
    biblioItems, setBiblioItems,
    handleFavorite, handleExport, handleMetaUpdate, handleAddToBiblio,
  };
}
