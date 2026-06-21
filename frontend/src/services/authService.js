import api from './api';
import Cookies from 'js-cookie';

const TOKEN_KEY = 'cito_token';
const USER_KEY = 'cito_user';

class AuthService {
  constructor() {
    if (!AuthService.instance) {
      AuthService.instance = this;
    }
    return AuthService.instance;
  }

  async register(userData) {
    const response = await api.post('/auth/register', userData);
    const { user, token } = response.data;

    this.setToken(token);
    this.setUser(user);

    return response.data;
  }

  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    const { user, token } = response.data;

    this.setToken(token);
    this.setUser(user);

    return response.data;
  }

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // No importa si falla, limpiamos igual
      console.error('Logout error:', error);
    } finally {
      this.removeToken();
      this.removeUser();
    }
  }

  async validateToken() {
    try {
      const response = await api.get('/auth/validate');
      return response.data;
    } catch (error) {
      this.removeToken();
      this.removeUser();
      return null;
    }
  }

  async updateProfile(profileData) {
    const response = await api.put('/auth/profile', profileData);
    const { user } = response.data;
    this.setUser(user);
    return response.data;
  }

  async changePassword(passwords) {
    return await api.post('/auth/change-password', passwords);
  }

  // Guarda en cookie (authService) Y en localStorage('token') (interceptor de api.js).
  // Mantener ambos en sincronía evita que alguno de los dos interceptores no encuentre el token.
  setToken(token) {
    Cookies.set(TOKEN_KEY, token, {
      expires: 7,
      sameSite: 'Strict',
      secure: window.location.protocol === 'https:',
    });
    localStorage.setItem('token', token);
  }

  getToken() {
    return Cookies.get(TOKEN_KEY) || localStorage.getItem('token') || null;
  }

  removeToken() {
    Cookies.remove(TOKEN_KEY);
    localStorage.removeItem('token');
  }

  setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  getUser() {
    const userStr = localStorage.getItem(USER_KEY);
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      this.removeUser();
      return null;
    }
  }

  removeUser() {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('user'); // legacy cleanup
  }

  isAuthenticated() {
    return !!this.getToken();
  }
}

// Exporta una única instancia (singleton)
const instance = new AuthService();
Object.freeze(instance);
export default instance;
