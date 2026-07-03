const db = require('../config/database');
const { encrypt, decrypt, mask } = require('../utils/keyCrypto');

const PROVIDERS = ['groq', 'google', 'openrouter'];
const MAX_PER_USER = 10;

class UserApiKey {
  static providers() { return PROVIDERS; }

  static async create(userId, provider, rawKey, status = 'active') {
    const [res] = await db.execute(
      `INSERT INTO user_api_keys (user_id, provider, key_ciphertext, key_masked, status)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, provider, encrypt(rawKey), mask(rawKey), status]
    );
    return res.insertId;
  }

  static async countByUser(userId) {
    const [rows] = await db.execute(
      `SELECT COUNT(*)::int AS n FROM user_api_keys WHERE user_id = ?`, [userId]
    );
    return rows[0]?.n || 0;
  }

  // Vista para el frontend — nunca incluye el texto de la clave.
  static async listByUser(userId) {
    const [rows] = await db.execute(
      `SELECT id, provider, key_masked, status, last_error, last_used_at, created_at
         FROM user_api_keys WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    return rows;
  }

  // Claves activas descifradas para usar en las llamadas al LLM.
  static async listActiveDecrypted(userId) {
    const [rows] = await db.execute(
      `SELECT id, provider, key_ciphertext FROM user_api_keys
        WHERE user_id = ? AND status = 'active' ORDER BY created_at ASC`,
      [userId]
    );
    const out = [];
    for (const r of rows) {
      try { out.push({ id: r.id, provider: r.provider, key: decrypt(r.key_ciphertext) }); }
      catch (_) { /* clave corrupta o clave maestra cambiada: se ignora */ }
    }
    return out;
  }

  static async getDecrypted(userId, id) {
    const [rows] = await db.execute(
      `SELECT id, provider, key_ciphertext FROM user_api_keys WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    if (!rows[0]) return null;
    try { return { id: rows[0].id, provider: rows[0].provider, key: decrypt(rows[0].key_ciphertext) }; }
    catch (_) { return null; }
  }

  static async setStatus(id, status, error = null) {
    await db.execute(
      `UPDATE user_api_keys SET status = ?, last_error = ?, last_used_at = NOW() WHERE id = ?`,
      [status, error, id]
    );
  }

  static async remove(userId, id) {
    const [res] = await db.execute(
      `DELETE FROM user_api_keys WHERE id = ? AND user_id = ?`, [id, userId]
    );
    return res.affectedRows > 0;
  }
}

UserApiKey.MAX_PER_USER = MAX_PER_USER;
module.exports = UserApiKey;
