import api from './api';

const BASE = '/papers/authors';

export async function searchAuthors(query) {
  const q = (query || '').trim();
  if (q.length < 2) return [];
  const { data } = await api.get(`${BASE}?q=${encodeURIComponent(q)}`);
  return data.authors || [];
}

export async function getAuthorWorks(authorId, sort = 'cited') {
  const id = encodeURIComponent(authorId);
  const { data } = await api.get(`${BASE}/${id}/works?sort=${sort === 'recent' ? 'recent' : 'cited'}`);
  return data.works || [];
}
