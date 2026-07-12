import axios from 'axios';
import authService from './authService';
import i18n from '../i18n';

// En producción cae a API relativa (/api) si el build no define REACT_APP_API_URL.
const API_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request: añade token de authService (cookie o localStorage)
api.interceptors.request.use(
  config => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Idioma actual de la interfaz → el backend lo usa para que la IA responda igual.
    const lang = (i18n.resolvedLanguage || i18n.language || 'es').slice(0, 2);
    config.headers['X-Citae-Lang'] = lang === 'en' ? 'en' : 'es';
    return config;
  },
  error => Promise.reject(error)
);

// Response: 401 → limpia sesión y emite evento; App.jsx escucha y redirige con React Router
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      authService.removeToken();
      authService.removeUser();
      window.dispatchEvent(new CustomEvent('citae:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
