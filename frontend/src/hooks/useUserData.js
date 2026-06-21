import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import notify from '../services/swal';
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
    try { await api.delete('/auth/history'); setUserHistory([]); notify.success('Historial eliminado'); }
    catch { notify.error('Error al limpiar historial'); }
  }, []);

  const handleRemoveFavorite = useCallback(async (id) => {
    try { await api.delete(`/auth/favorites/${id}`); notify.success('Eliminado de favoritos'); loadFavorites(); }
    catch { notify.error('Error al eliminar'); }
  }, [loadFavorites]);

  const handleCreateHighlight = useCallback(async (payload) => {
    if (!user) return;
    try { await createHighlight(payload); loadHighlights(); }
    catch { notify.error('Error al guardar el resaltado'); }
  }, [user, loadHighlights]);

  const handleUpdateHighlight = useCallback(async (id, changes) => {
    try { await updateHighlight(id, changes); loadHighlights(); }
    catch { notify.error('Error al actualizar el apunte'); }
  }, [loadHighlights]);

  const handleDeleteHighlight = useCallback(async (id) => {
    try { await deleteHighlight(id); loadHighlights(); }
    catch { notify.error('Error al eliminar el resaltado'); }
  }, [loadHighlights]);

  const handleClearHighlights = useCallback(async () => {
    try { await clearAllHighlights(); setUserHighlights([]); notify.success('Todos los apuntes eliminados'); }
    catch { notify.error('Error al limpiar apuntes'); }
  }, []);

  return {
    userHistory, userFavorites, userHighlights,
    loadHistory, loadFavorites, loadHighlights,
    handleClearHistory, handleRemoveFavorite,
    handleCreateHighlight, handleUpdateHighlight, handleDeleteHighlight, handleClearHighlights,
  };
}
