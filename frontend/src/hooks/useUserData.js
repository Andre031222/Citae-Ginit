import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import notify from '../services/swal';
import i18n from '../i18n';
import {
  getHighlights, createHighlight, updateHighlight,
  deleteHighlight, clearAllHighlights,
} from '../services/highlightService';

export function useUserData(user) {
  const [userHistory,   setUserHistory]   = useState([]);
  const [userFavorites, setUserFavorites] = useState([]);
  const [userHighlights, setUserHighlights] = useState([]);

  const loadHistory = useCallback(async () => {
    try { setUserHistory((await api.get('/auth/history')).data.history || []); }
    catch (err) { console.warn('[loadHistory]', err?.message); }
  }, []);

  const loadFavorites = useCallback(async () => {
    try { setUserFavorites((await api.get('/auth/favorites')).data.favorites || []); }
    catch (err) { console.warn('[loadFavorites]', err?.message); }
  }, []);

  const loadHighlights = useCallback(async () => {
    try { setUserHighlights(await getHighlights()); }
    catch (err) { console.warn('[loadHighlights]', err?.message); }
  }, []);

  useEffect(() => {
    if (user) { loadHistory(); loadFavorites(); loadHighlights(); }
    else { setUserHistory([]); setUserFavorites([]); setUserHighlights([]); }
  }, [user, loadHistory, loadFavorites, loadHighlights]);

  const handleClearHistory = useCallback(async () => {
    try { await api.delete('/auth/history'); setUserHistory([]); notify.success(i18n.t('shell.notify.historyCleared')); }
    catch { notify.error(i18n.t('shell.errors.clearHistory')); }
  }, []);

  const handleRemoveFavorite = useCallback(async (id) => {
    try { await api.delete(`/auth/favorites/${id}`); notify.success(i18n.t('shell.notify.removedFavorite')); loadFavorites(); }
    catch { notify.error(i18n.t('shell.errors.removeFavorite')); }
  }, [loadFavorites]);

  const handleCreateHighlight = useCallback(async (payload) => {
    if (!user) return;
    try { await createHighlight(payload); loadHighlights(); }
    catch { notify.error(i18n.t('shell.errors.saveHighlight')); }
  }, [user, loadHighlights]);

  const handleUpdateHighlight = useCallback(async (id, changes) => {
    try { await updateHighlight(id, changes); loadHighlights(); }
    catch { notify.error(i18n.t('shell.errors.updateNote')); }
  }, [loadHighlights]);

  const handleDeleteHighlight = useCallback(async (id) => {
    try { await deleteHighlight(id); loadHighlights(); }
    catch { notify.error(i18n.t('shell.errors.deleteHighlight')); }
  }, [loadHighlights]);

  const handleClearHighlights = useCallback(async () => {
    try { await clearAllHighlights(); setUserHighlights([]); notify.success(i18n.t('shell.notify.allNotesCleared')); }
    catch { notify.error(i18n.t('shell.errors.clearNotes')); }
  }, []);

  return {
    userHistory, userFavorites, userHighlights,
    loadHistory, loadFavorites, loadHighlights,
    handleClearHistory, handleRemoveFavorite,
    handleCreateHighlight, handleUpdateHighlight, handleDeleteHighlight, handleClearHighlights,
  };
}
