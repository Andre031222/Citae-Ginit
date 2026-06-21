const db = require('../config/database');
const crypto = require('crypto');

const VALID_COLORS = ['yellow', 'green', 'blue', 'pink', 'navy'];

function slugify(name) {
  return String(name || 'coleccion')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'coleccion';
}

class Collection {
  static async create(userId, { name, description = null, color = 'blue' }) {
    const safeColor = VALID_COLORS.includes(color) ? color : 'blue';
    const [result] = await db.execute(
      `INSERT INTO collections (user_id, name, description, color) VALUES (?, ?, ?, ?)`,
      [userId, name, description, safeColor]
    );
    return { id: result.insertId, name, description, color: safeColor };
  }

  static async listByUser(userId) {
    const [rows] = await db.execute(
      `SELECT c.*, COUNT(cp.id)::int AS paper_count
         FROM collections c
         LEFT JOIN collection_papers cp ON cp.collection_id = c.id
        WHERE c.user_id = ?
        GROUP BY c.id
        ORDER BY c.created_at ASC`,
      [userId]
    );
    return rows;
  }

  static async profileStats(username) {
    const [rows] = await db.execute(
      `SELECT
         COUNT(DISTINCT c.id)::int AS collections,
         COUNT(cp.id)::int AS papers
       FROM collections c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN collection_papers cp ON cp.collection_id = c.id
       WHERE u.username = ? AND c.is_public = TRUE`,
      [username]
    );
    return rows[0] || { collections: 0, papers: 0 };
  }

  static async findById(userId, id) {
    const [rows] = await db.execute(
      `SELECT * FROM collections WHERE user_id = ? AND id = ?`,
      [userId, id]
    );
    return rows[0];
  }

  static async update(userId, id, { name, description, color } = {}) {
    const sets = [];
    const params = [];
    if (name !== undefined) {
      sets.push(`name = ?`);
      params.push(name);
    }
    if (description !== undefined) {
      sets.push(`description = ?`);
      params.push(description);
    }
    if (color !== undefined && VALID_COLORS.includes(color)) {
      sets.push(`color = ?`);
      params.push(color);
    }
    if (sets.length === 0) return false;

    sets.push(`updated_at = NOW()`);
    params.push(userId, id);

    const [result] = await db.execute(
      `UPDATE collections SET ${sets.join(', ')} WHERE user_id = ? AND id = ?`,
      params
    );
    return result.affectedRows > 0;
  }

  static async remove(userId, id) {
    const [result] = await db.execute(
      `DELETE FROM collections WHERE user_id = ? AND id = ?`,
      [userId, id]
    );
    return result.affectedRows > 0;
  }

  static async addPaper(userId, collectionId, paperId) {
    const owned = await Collection.findById(userId, collectionId);
    if (!owned) return false;
    await db.execute(
      `INSERT INTO collection_papers (collection_id, paper_id)
       VALUES (?, ?) ON CONFLICT (collection_id, paper_id) DO NOTHING`,
      [collectionId, paperId]
    );
    return true;
  }

  static async removePaper(userId, collectionId, paperId) {
    const owned = await Collection.findById(userId, collectionId);
    if (!owned) return false;
    const [result] = await db.execute(
      `DELETE FROM collection_papers WHERE collection_id = ? AND paper_id = ?`,
      [collectionId, paperId]
    );
    return result.affectedRows > 0;
  }

  static async setVisibility(userId, id, isPublic) {
    const owned = await Collection.findById(userId, id);
    if (!owned) return null;

    if (!isPublic) {
      await db.execute(
        `UPDATE collections SET is_public = FALSE, updated_at = NOW() WHERE user_id = ? AND id = ?`,
        [userId, id]
      );
      return { is_public: false, public_slug: null };
    }

    let slug = owned.public_slug;
    if (!slug) {
      slug = `${slugify(owned.name)}-${crypto.randomBytes(3).toString('hex')}`;
    }
    await db.execute(
      `UPDATE collections SET is_public = TRUE, public_slug = ?, updated_at = NOW() WHERE user_id = ? AND id = ?`,
      [slug, userId, id]
    );
    await db.execute(`UPDATE users SET public_enabled = TRUE WHERE id = ?`, [userId]);
    return { is_public: true, public_slug: slug };
  }

  static async findBySlug(slug) {
    const [rows] = await db.execute(
      `SELECT c.id, c.name, c.description, c.color, c.public_slug, c.created_at,
              u.username, u.full_name, u.public_enabled
         FROM collections c
         JOIN users u ON u.id = c.user_id
        WHERE c.public_slug = ? AND c.is_public = TRUE`,
      [slug]
    );
    return rows[0];
  }

  static async papersOf(collectionId) {
    const [rows] = await db.execute(
      `SELECT p.id, p.title, p.authors, p.publication_year, p.journal,
              p.doi, p.url, p.abstract, p.publisher
         FROM collection_papers cp
         JOIN papers p ON p.id = cp.paper_id
        WHERE cp.collection_id = ?
        ORDER BY cp.added_at DESC`,
      [collectionId]
    );
    return rows;
  }

  static async publicByUser(username) {
    const [rows] = await db.execute(
      `SELECT c.id, c.name, c.description, c.color, c.public_slug,
              COUNT(cp.id)::int AS paper_count
         FROM collections c
         JOIN users u ON u.id = c.user_id
         LEFT JOIN collection_papers cp ON cp.collection_id = c.id
        WHERE u.username = ? AND c.is_public = TRUE
        GROUP BY c.id
        ORDER BY c.updated_at DESC`,
      [username]
    );
    return rows;
  }

  static async membershipForPapers(userId, paperIds) {
    if (!paperIds.length) return {};
    const placeholders = paperIds.map(() => '?').join(', ');
    const [rows] = await db.execute(
      `SELECT cp.paper_id, c.id, c.name, c.color
         FROM collection_papers cp
         JOIN collections c ON c.id = cp.collection_id
        WHERE c.user_id = ? AND cp.paper_id IN (${placeholders})`,
      [userId, ...paperIds]
    );
    const map = {};
    for (const row of rows) {
      if (!map[row.paper_id]) map[row.paper_id] = [];
      map[row.paper_id].push({ id: row.id, name: row.name, color: row.color });
    }
    return map;
  }
}

module.exports = Collection;
