import api from './api';

// Gestión de usuarios (solo super_admin)
export const listUsers = async (params = {}) => {
  const { data } = await api.get('/admin/users', { params });
  return data; // { users, total }
};

export const setUserRole = async (id, role) => {
  const { data } = await api.patch(`/admin/users/${id}/role`, { role });
  return data;
};

export const setUserActive = async (id, isActive) => {
  const { data } = await api.patch(`/admin/users/${id}/active`, { is_active: isActive });
  return data;
};
