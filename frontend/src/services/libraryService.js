import api from './api';

const BASE = '/library';

export async function getLibraryPapers(filters = {}) {
  const params = new URLSearchParams();
  if (filters.collection) params.set('collection', filters.collection);
  if (filters.tag)        params.set('tag',        filters.tag);
  if (filters.search)     params.set('search',     filters.search);
  const qs = params.toString();
  const { data } = await api.get(`${BASE}/papers${qs ? '?' + qs : ''}`);
  return data.papers || [];
}

export async function getCollections() {
  const { data } = await api.get(`${BASE}/collections`);
  return data.collections || [];
}

export async function createCollection(payload) {
  const { data } = await api.post(`${BASE}/collections`, payload);
  return data.collection;
}

export async function updateCollection(id, changes) {
  const { data } = await api.put(`${BASE}/collections/${id}`, changes);
  return data;
}

export async function deleteCollection(id) {
  const { data } = await api.delete(`${BASE}/collections/${id}`);
  return data;
}

export async function setCollectionVisibility(id, isPublic) {
  const { data } = await api.put(`${BASE}/collections/${id}/visibility`, { is_public: isPublic });
  return data;
}

export async function addPaperToCollection(collectionId, paperId) {
  const { data } = await api.post(`${BASE}/collections/${collectionId}/papers`, { paper_id: paperId });
  return data;
}

export async function removePaperFromCollection(collectionId, paperId) {
  const { data } = await api.delete(`${BASE}/collections/${collectionId}/papers/${paperId}`);
  return data;
}

export async function getTags() {
  const { data } = await api.get(`${BASE}/tags`);
  return data.tags || [];
}

export async function addPaperTags(paperId, tags) {
  const { data } = await api.post(`${BASE}/papers/${paperId}/tags`, { tags });
  return data.tags || [];
}

export async function removePaperTag(paperId, tagId) {
  const { data } = await api.delete(`${BASE}/papers/${paperId}/tags/${tagId}`);
  return data;
}

export async function deleteTag(tagId) {
  const { data } = await api.delete(`${BASE}/tags/${tagId}`);
  return data;
}

export async function autoTagPaper(paperId) {
  const { data } = await api.post(`${BASE}/papers/${paperId}/auto-tags`);
  return data;
}

async function downloadFile(url) {
  const response = await api.get(url, { responseType: 'blob' });
  const disposition = response.headers['content-disposition'] || '';
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename = match ? match[1] : 'export.txt';

  const blobUrl = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}

export async function exportCollection(collectionId, format) {
  await downloadFile(`${BASE}/collections/${collectionId}/export?format=${format}`);
}

export async function exportLibrary(format, filters = {}) {
  const params = new URLSearchParams({ format });
  if (filters.tag)    params.set('tag',    filters.tag);
  if (filters.search) params.set('search', filters.search);
  await downloadFile(`${BASE}/export?${params.toString()}`);
}

export async function getActivity() {
  const { data } = await api.get(`${BASE}/activity`);
  return data;
}

export async function verifyClaimRadar(claim) {
  const { data } = await api.post('/claim/radar', { claim });
  return data;
}

export async function comparePapersFromLibrary(paperIds) {
  const { data } = await api.post('/claim/compare', { paperIds });
  return data;
}

export async function askLibrary(question, history = []) {
  const { data } = await api.post('/rag/ask', { question, history });
  return data;
}

export async function deepResearch(collectionId) {
  const { data } = await api.post('/rag/deep-research', { collectionId });
  return data;
}
