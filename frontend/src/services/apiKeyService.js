import api from './api';

// Claves de IA propias del usuario (BYOK). El backend nunca devuelve la clave
// en claro: solo su versión enmascarada y su estado.
export const listApiKeys = async () => {
  const { data } = await api.get('/keys');
  return data; // { providers: [...], keys: [{ id, provider, key_masked, status, ... }] }
};

export const addApiKey = async (provider, key) => {
  const { data } = await api.post('/keys', { provider, key });
  return data; // { id, keys }
};

export const testApiKey = async (id) => {
  const { data } = await api.post(`/keys/${id}/test`);
  return data; // { ok, status, reason }
};

export const removeApiKey = async (id) => {
  const { data } = await api.delete(`/keys/${id}`);
  return data; // { ok }
};
