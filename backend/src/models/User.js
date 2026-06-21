const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create(userData) {
    const { username, email, password, full_name } = userData;

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await db.execute(
      'INSERT INTO users (username, email, password, full_name) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, full_name || null]
    );
    
    return { 
      id: result.insertId, 
      username, 
      email, 
      full_name 
    };
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT id, username, email, full_name, first_name, last_name,
              avatar_url, profile_image_path, timezone, is_active, role, created_at
       FROM users WHERE id = ?`,
      [id]
    );
    if (!rows[0]) return null;
    const u = rows[0];
    // Exponer la URL de imagen de perfil de forma unificada
    if (u.profile_image_path && !u.avatar_url) {
      const origin = process.env.API_PUBLIC_URL || 'http://localhost:5000';
      u.avatar_url = `${origin}${u.profile_image_path}`;
    }
    return u;
  }

  static async findByEmail(email) {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0];
  }

  static async findByUsername(username) {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return rows[0];
  }

  static async validatePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async update(id, userData) {
    // Allowlist explícita — previene mass-assignment de columnas arbitrarias
    const ALLOWED = new Set([
      'username', 'email', 'full_name', 'first_name', 'last_name',
      'timezone', 'avatar_url', 'profile_image_path', 'is_active',
    ]);

    const fields = [];
    const values = [];

    Object.entries(userData).forEach(([key, value]) => {
      if (key !== 'password' && ALLOWED.has(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (userData.password) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      fields.push('password = ?');
      values.push(hashedPassword);
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = NOW()');
    values.push(id);

    const [result] = await db.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  }

  // ── Administración de usuarios (solo super_admin) ──
  static async listAll({ limit = 100, offset = 0, search = '' } = {}) {
    const like = `%${search}%`;
    const [rows] = await db.execute(
      `SELECT id, username, email, full_name, avatar_url, role, is_active, created_at
       FROM users
       WHERE (? = '' OR email ILIKE ? OR username ILIKE ? OR full_name ILIKE ?)
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [search, like, like, like, limit, offset]
    );
    return rows;
  }

  static async countAll(search = '') {
    const like = `%${search}%`;
    const [rows] = await db.execute(
      `SELECT COUNT(*) AS total FROM users
       WHERE (? = '' OR email ILIKE ? OR username ILIKE ? OR full_name ILIKE ?)`,
      [search, like, like, like]
    );
    return parseInt(rows[0].total, 10);
  }

  static async setRole(id, role) {
    const [result] = await db.execute(
      'UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?',
      [role, id]
    );
    return result.affectedRows > 0;
  }

  static async setActive(id, isActive) {
    const [result] = await db.execute(
      'UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?',
      [isActive, id]
    );
    return result.affectedRows > 0;
  }

  static async updateAvatar(id, avatarUrl) {
    const [result] = await db.execute(
      'UPDATE users SET avatar_url = ? WHERE id = ?',
      [avatarUrl, id]
    );
    return result.affectedRows > 0;
  }

  static async getProfileImagePath(id) {
    const [rows] = await db.execute(
      'SELECT profile_image_path FROM users WHERE id = ?',
      [id]
    );
    return rows[0]?.profile_image_path || null;
  }

  static async ensureUniqueUsername(base) {
    const [rows] = await db.execute(
      'SELECT username FROM users WHERE username LIKE ?',
      [base + '%']
    );
    const taken = new Set(rows.map(r => r.username));
    if (!taken.has(base)) return base;
    let n = 2;
    while (taken.has(`${base}${n}`)) n++;
    return `${base}${n}`;
  }

  static async findOrCreateGoogle({ googleId, email, name, picture }) {
    const existing = await User.findByEmail(email);
    if (existing) {
      if (picture && !existing.avatar_url) {
        await User.updateAvatar(existing.id, picture);
        existing.avatar_url = picture;
      }
      return existing;
    }

    const base = email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 30) || 'user';
    const username = await User.ensureUniqueUsername(base);
    const passwordHash = await bcrypt.hash(googleId + process.env.JWT_SECRET, 10);

    const [result] = await db.execute(
      `INSERT INTO users (username, email, password, full_name, avatar_url, is_active)
       VALUES (?, ?, ?, ?, ?, true)`,
      [username, email, passwordHash, name || username, picture || null]
    );

    return {
      id: result.insertId,
      username,
      email,
      full_name: name || username,
      avatar_url: picture || null,
      is_active: true,
    };
  }

  static async saveSession(userId, token, expiresIn = '7d') {
    const expiresAt = new Date();
    const days = parseInt(expiresIn) || 7;
    expiresAt.setDate(expiresAt.getDate() + days);
    
    const [result] = await db.execute(
      'INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, token, expiresAt]
    );
    
    return result.insertId;
  }

  static async findByToken(token) {
    const [rows] = await db.execute(
      `SELECT u.* FROM users u 
       JOIN user_sessions s ON u.id = s.user_id 
       WHERE s.token = ? AND s.expires_at > NOW() AND u.is_active = TRUE`,
      [token]
    );
    return rows[0];
  }

  static async removeSession(token) {
    const [result] = await db.execute(
      'DELETE FROM user_sessions WHERE token = ?',
      [token]
    );
    return result.affectedRows > 0;
  }

  static async cleanExpiredSessions() {
    const [result] = await db.execute(
      'DELETE FROM user_sessions WHERE expires_at < NOW()'
    );
    return result.affectedRows;
  }

  static async addFavorite(userId, paperId) {
    try {
      const [result] = await db.execute(
        'INSERT INTO favorites (user_id, paper_id) VALUES (?, ?)',
        [userId, paperId]
      );
      return { success: true, id: result.insertId };
    } catch (error) {
      if (error.code === '23505') {
        return { success: false, message: 'Ya está en favoritos' };
      }
      throw error;
    }
  }

  static async removeFavorite(userId, paperId) {
    const [result] = await db.execute(
      'DELETE FROM favorites WHERE user_id = ? AND paper_id = ?',
      [userId, paperId]
    );
    return result.affectedRows > 0;
  }

  static async getFavorites(userId, limit = 20, offset = 0) {
    const [rows] = await db.execute(
      `SELECT p.*, f.created_at as favorited_at 
       FROM papers p 
       JOIN favorites f ON p.id = f.paper_id 
       WHERE f.user_id = ? 
       ORDER BY f.created_at DESC 
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return rows;
  }

  static async isFavorite(userId, paperId) {
    const [rows] = await db.execute(
      'SELECT 1 FROM favorites WHERE user_id = ? AND paper_id = ?',
      [userId, paperId]
    );
    return rows.length > 0;
  }

  static async getPaperHistory(userId, limit = 20, offset = 0) {
    const [rows] = await db.execute(
      `SELECT * FROM papers 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return rows;
  }

  static async addToSearchHistory(userId, searchQuery, searchType = 'citation', paperData = null, sessionData = null) {
    try {
      const sessionJson = sessionData ? JSON.stringify(sessionData) : null;

      // Evitar duplicados exactos recientes (últimas 24 horas)
      const [existing] = await db.execute(
        `SELECT id FROM search_history
         WHERE user_id = ? AND search_query = ? AND created_at > NOW() - INTERVAL '1 day'`,
        [userId, searchQuery]
      );

      if (existing.length > 0) {
        // Actualizar timestamp Y session_data con el estado más reciente
        await db.execute(
          `UPDATE search_history SET created_at = NOW(), session_data = ?
           WHERE id = ?`,
          [sessionJson, existing[0].id]
        );
        return { success: true, id: existing[0].id, updated: true };
      }

      const [result] = await db.execute(
        `INSERT INTO search_history
         (user_id, search_query, search_type, paper_title, paper_authors, paper_year, paper_id, session_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          searchQuery,
          searchType,
          paperData?.title || null,
          paperData?.authors || null,
          paperData?.publication_year || null,
          paperData?.id || null,
          sessionJson,
        ]
      );

      return { success: true, id: result.insertId, created: true };
    } catch (error) {
      throw error;
    }
  }

  static async getSearchHistory(userId, limit = 50, offset = 0) {
    const [rows] = await db.execute(
      `SELECT
        id,
        search_query,
        search_type,
        paper_title,
        paper_authors,
        paper_year,
        paper_id,
        session_data,
        created_at
       FROM search_history
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    return rows.map(row => ({
      ...row,
      display_title: row.paper_title || User.formatQueryForDisplay(row.search_query),
      display_subtitle: row.paper_authors
        ? `${row.paper_authors}${row.paper_year ? ` • ${row.paper_year}` : ''}`
        : `Búsqueda: ${row.search_type}`,
      has_paper_data: !!row.paper_title,
      // session_data ya viene como objeto desde PostgreSQL JSONB
      session_data: row.session_data || null,
    }));
  }

  static formatQueryForDisplay(query) {
    // Detectar si es un DOI y formatearlo mejor
    if (query.includes('10.') && (query.includes('/') || query.includes('doi'))) {
      const doiMatch = query.match(/10\.\d+\/[^\s]+/);
      if (doiMatch) {
        return `DOI: ${doiMatch[0]}`;
      }
    }
    
    // Detectar si es una URL y extraer información útil
    if (query.startsWith('http')) {
      try {
        const url = new URL(query);
        if (url.hostname.includes('arxiv')) {
          return `ArXiv Paper`;
        } else if (url.hostname.includes('pubmed')) {
          return `PubMed Paper`;
        } else if (url.hostname.includes('scholar.google')) {
          return `Google Scholar Paper`;
        } else {
          return `Paper desde ${url.hostname}`;
        }
      } catch (e) {
        return query;
      }
    }
    
    // Si es texto normal, truncar si es muy largo
    return query.length > 60 ? query.substring(0, 60) + '...' : query;
  }

  static async clearSearchHistory(userId) {
    const [result] = await db.execute(
      'DELETE FROM search_history WHERE user_id = ?',
      [userId]
    );
    return result.affectedRows > 0;
  }

  static async deleteSearchHistoryItem(userId, historyId) {
    const [result] = await db.execute(
      'DELETE FROM search_history WHERE user_id = ? AND id = ?',
      [userId, historyId]
    );
    return result.affectedRows > 0;
  }

  static async cleanOldHistory(userId, days = 30) {
    const [result] = await db.execute(
      `DELETE FROM search_history
       WHERE user_id = ? AND created_at < NOW() - (? || ' days')::INTERVAL`,
      [userId, days]
    );
    return result.affectedRows;
  }

  static async getSearchHistoryCount(userId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as total FROM search_history WHERE user_id = ?',
      [userId]
    );
    return rows[0].total;
  }

  static async getHistoryStatsSql(userId) {
    const [rows1] = await db.execute(
      'SELECT COUNT(*) as total, COUNT(DISTINCT DATE(created_at)) as active_days, MIN(created_at) as first_search, MAX(created_at) as last_search FROM search_history WHERE user_id = ?',
      [userId]
    );
    const [rows2] = await db.execute(
      'SELECT search_type, COUNT(*) as type_count FROM search_history WHERE user_id = ? GROUP BY search_type',
      [userId]
    );
    return {
      total: parseInt(rows1[0].total),
      active_days: parseInt(rows1[0].active_days),
      first_search: rows1[0].first_search,
      last_search: rows1[0].last_search,
      by_type: rows2,
    };
  }
}

module.exports = User;