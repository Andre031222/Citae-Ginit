import api from './api';

export const getBranding = async () => {
  const { data } = await api.get('/branding');
  return data.branding;
};

export const updateBranding = async (fields) => {
  const { data } = await api.put('/branding', fields);
  return data.branding;
};

export const uploadBrandingAsset = async (slot, file) => {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post(`/branding/${slot}`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.branding;
};

export const uploadFeatureImage = async (index, file) => {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post(`/branding/feature/${index}/image`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.branding;
};

export const deleteFeatureImage = async (index) => {
  const { data } = await api.delete(`/branding/feature/${index}/image`);
  return data.branding;
};
