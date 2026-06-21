import { useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';

const API_ORIGIN = (process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api')).replace(/\/api\/?$/, '');

// Garantiza una URL de avatar absoluta desde profile_image_path (persiste tras recargar)
function normalizeUser(u) {
  if (!u) return u;
  const img = u.profile_image_url
    || (u.profile_image_path ? `${API_ORIGIN}${u.profile_image_path}` : null)
    || u.avatar_url
    || null;
  return { ...u, profile_image_url: img, avatar_url: img };
}

export function useAuth() {
  const [user, setUserRaw]    = useState(null);
  const setUser = useCallback((u) => setUserRaw(typeof u === 'function' ? u : normalizeUser(u)), []);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const hashParams  = new URLSearchParams(window.location.hash.slice(1));
      const qsParams    = new URLSearchParams(window.location.search);
      const googleToken = hashParams.get('token') || qsParams.get('token');
      const googleUser  = hashParams.get('user')  || qsParams.get('user');

      if (googleToken && googleUser) {
        const parsedUser = JSON.parse(decodeURIComponent(googleUser));
        authService.setToken(googleToken);
        authService.setUser(parsedUser);
        setUser(parsedUser);
        window.history.replaceState({}, '', '/app');
        return;
      }

      const saved = authService.getUser();
      if (saved && authService.isAuthenticated()) {
        const v = await authService.validateToken();
        if (v?.valid) setUser(v.user);
        else authService.logout();
      }
    } catch (_) {}
    finally { setLoading(false); }
  }, [setUser]);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      window.location.replace('/login');
    };
    window.addEventListener('citae:unauthorized', onUnauthorized);
    return () => window.removeEventListener('citae:unauthorized', onUnauthorized);
  }, [setUser]);

  const handleLogin = useCallback((u) => setUser(u), [setUser]);

  const handleUserUpdate = useCallback((u) => {
    const merged = normalizeUser(u);
    setUserRaw(merged);
    authService.setUser(merged);
  }, []);

  return { user, setUser, loading, handleLogin, handleUserUpdate };
}
