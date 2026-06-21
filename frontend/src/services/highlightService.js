// Wrapper delgado sobre la instancia axios de api.js (ya añade JWT automáticamente).

import api from './api';

const BASE = '/highlights';

/**
 * Listar resaltados.
 * @param {{ color?, favorite?, search?, doi?, title? }} filters
 */
export async function getHighlights(filters = {}) {
  const params = new URLSearchParams();
  if (filters.color)    params.set('color',    filters.color);
  if (filters.favorite) params.set('favorite', 'true');
  if (filters.search)   params.set('search',   filters.search);
  if (filters.doi)      params.set('doi',       filters.doi);
  if (filters.title)    params.set('title',     filters.title);
  const qs = params.toString();
  const { data } = await api.get(`${BASE}${qs ? '?' + qs : ''}`);
  return data.highlights || [];
}

/**
 * Crear un nuevo resaltado.
 * @param {object} payload
 */
export async function createHighlight(payload) {
  const { data } = await api.post(BASE, payload);
  return data;
}

/**
 * Actualizar nota/color/is_favorite de un resaltado.
 * @param {number} id
 * @param {{ note?, color?, is_favorite? }} changes
 */
export async function updateHighlight(id, changes) {
  const { data } = await api.put(`${BASE}/${id}`, changes);
  return data;
}

/**
 * Eliminar un resaltado.
 * @param {number} id
 */
export async function deleteHighlight(id) {
  const { data } = await api.delete(`${BASE}/${id}`);
  return data;
}

/**
 * Limpiar todos los resaltados del usuario.
 */
export async function clearAllHighlights() {
  const { data } = await api.delete(BASE);
  return data;
}

/**
 * Reading Assistant — preguntar a la IA sobre el texto/paper.
 * @param {{ question, quote?, abstract?, title?, authors?, year? }} payload
 */
export async function askAssistant(payload) {
  const { data } = await api.post(`${BASE}/ask`, payload);
  return data;
}

/** Repaso espaciado: set de resaltados del día + estadísticas. */
export async function getDailyReview(limit = 5) {
  const { data } = await api.get(`${BASE}/daily?limit=${limit}`);
  return data;
}

/** Marcar un resaltado como repasado hoy. */
export async function markReviewed(id) {
  const { data } = await api.post(`${BASE}/${id}/reviewed`);
  return data;
}

