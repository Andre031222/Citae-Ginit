const authService = require('../services/authService');
const User = require('../models/User');

class AuthController {
  async register(req, res, next) {
    try {
      const { username, email, password, full_name } = req.body;
      
      const result = await authService.register({
        username,
        email,
        password,
        full_name
      });
      
      res.status(201).json({
        message: 'Usuario registrado exitosamente',
        user: result.user,
        token: result.token
      });
    } catch (error) {
      if (error.message.includes('ya está registrado') || 
          error.message.includes('ya está en uso')) {
        return res.status(409).json({ error: error.message });
      }
      if (error.message.includes('requeridos') || 
          error.message.includes('6 caracteres')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      
      const result = await authService.login({ username, password });
      
      res.json({
        message: 'Login exitoso',
        user: result.user,
        token: result.token
      });
    } catch (error) {
      if (error.message === 'Credenciales inválidas') {
        return res.status(401).json({ error: error.message });
      }
      if (error.message === 'Cuenta desactivada') {
        return res.status(403).json({ error: error.message });
      }
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      await authService.logout(req.token);
      res.json({ message: 'Logout exitoso' });
    } catch (error) {
      next(error);
    }
  }

  async validateToken(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(401).json({ valid: false });
      res.json({ valid: true, user });
    } catch (error) {
      next(error);
    }
  }

  async getSearchHistory(req, res, next) {
    try {
      const userId = req.user.id;
      const { limit = 50, offset = 0 } = req.query;
      
      const history = await User.getSearchHistory(userId, limit, offset);
      const total = await User.getSearchHistoryCount(userId);
      
      res.json({ 
        history,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      console.error('Error getting search history:', error);
      next(error);
    }
  }

  async addToSearchHistory(req, res, next) {
    try {
      const userId = req.user.id;
      const { query, type = 'citation', paperData = null, sessionData = null } = req.body;

      if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'Query es requerido' });
      }

      const result = await User.addToSearchHistory(userId, query.trim(), type, paperData, sessionData);

      res.json({
        message: 'Agregado al historial',
        ...result
      });
    } catch (error) {
      console.error('Error adding to history:', error);
      next(error);
    }
  }

  async clearSearchHistory(req, res, next) {
    try {
      const userId = req.user.id;
      
      const cleared = await User.clearSearchHistory(userId);
      
      res.json({ 
        message: cleared ? 'Historial limpiado' : 'No había historial que limpiar',
        success: cleared 
      });
    } catch (error) {
      console.error('Error clearing history:', error);
      next(error);
    }
  }

  async deleteSearchHistoryItem(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'ID del item es requerido' });
      }
      
      const deleted = await User.deleteSearchHistoryItem(userId, id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Item no encontrado o no pertenece al usuario' });
      }
      
      res.json({ 
        message: 'Item eliminado del historial',
        success: true 
      });
    } catch (error) {
      console.error('Error deleting history item:', error);
      next(error);
    }
  }

  async addFavorite(req, res, next) {
    try {
      const userId = req.user.id;
      const { paperId } = req.body;
      
      if (!paperId) {
        return res.status(400).json({ error: 'Paper ID es requerido' });
      }
      
      const result = await User.addFavorite(userId, paperId);
      
      res.json(result);
    } catch (error) {
      console.error('Error adding favorite:', error);
      next(error);
    }
  }

  async removeFavorite(req, res, next) {
    try {
      const userId = req.user.id;
      const { paperId } = req.params;
      
      const removed = await User.removeFavorite(userId, paperId);
      
      if (!removed) {
        return res.status(404).json({ error: 'Favorito no encontrado' });
      }
      
      res.json({ 
        message: 'Removido de favoritos',
        success: true 
      });
    } catch (error) {
      console.error('Error removing favorite:', error);
      next(error);
    }
  }

  async getFavorites(req, res, next) {
    try {
      const userId = req.user.id;
      const { limit = 20, offset = 0 } = req.query;
      
      const favorites = await User.getFavorites(userId, limit, offset);
      
      res.json({ 
        favorites,
        total: favorites.length 
      });
    } catch (error) {
      console.error('Error getting favorites:', error);
      next(error);
    }
  }

  async checkFavorite(req, res, next) {
    try {
      const userId = req.user.id;
      const { paperId } = req.params;
      
      const isFavorite = await User.isFavorite(userId, paperId);
      
      res.json({ isFavorite });
    } catch (error) {
      console.error('Error checking favorite:', error);
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      res.json({ user });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const { full_name, avatar_url } = req.body;
      const userId = req.user.id;
      
      const updated = await User.update(userId, {
        full_name,
        avatar_url
      });
      
      if (!updated) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      const user = await User.findById(userId);
      res.json({ 
        message: 'Perfil actualizado exitosamente',
        user 
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user.id;
      
      await authService.changePassword(userId, oldPassword, newPassword);
      
      res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
      if (error.message.includes('incorrecta') || 
          error.message.includes('6 caracteres')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }

  async updateAvatar(req, res, next) {
    try {
      const { avatar_url } = req.body;
      const userId = req.user.id;
      
      const updated = await User.update(userId, { avatar_url });
      
      if (!updated) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      const user = await User.findById(userId);
      res.json({ 
        message: 'Avatar actualizado exitosamente',
        user 
      });
    } catch (error) {
      next(error);
    }
  }

  async getHistoryStats(req, res, next) {
    try {
      const userId = req.user.id;
      const stats = await User.getHistoryStatsSql(userId);
      res.json({
        total_searches: stats.total,
        active_days: stats.active_days,
        first_search: stats.first_search,
        last_search: stats.last_search,
        by_type: stats.by_type,
      });
    } catch (error) {
      next(error);
    }
  }

  async cleanOldHistory(req, res, next) {
    try {
      const userId = req.user.id;
      const days = parseInt(req.query.days) || 30;
      const result = await User.cleanOldHistory(userId, days);
      res.json({ message: `Historial anterior a ${days} días eliminado`, cleaned_count: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();