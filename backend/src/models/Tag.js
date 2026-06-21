const db = require('../config/database');

const MAX_TAG_LENGTH = 60;

function normalize(name) {
  return String(name || '').trim().toLowerCase().slice(0, MAX_TAG_LENGTH);
}

class Tag {
  static async ensure(userId, names) {
    const clean = [...new Set(names.map(normalize).filter(Boolean))];
    const out = [];
    for (const name of clean) {
      const [result] = await db.execute(
        `INSERT INTO tags (user_id, name) VALUES (?, ?)
         ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name`,
        [userId, name]
      );
      out.push({ id: result.insertId, name });
    }
    return out;
  }

  static async listByUser(userId) {
    const [rows] = await db.execute(
      `SELECT t.id, t.name, COUNT(pt.id)::int AS paper_count
         FROM tags t
         LEFT JOIN paper_tags pt ON pt.tag_id = t.id
        WHERE t.user_id = ?
        GROUP BY t.id
        ORDER BY paper_count DESC, t.name ASC`,
      [userId]
    );
    return rows;
  }

  static async addToPaper(userId, paperId, names) {
    const tags = await Tag.ensure(userId, names);
    for (const tag of tags) {
      await db.execute(
        `INSERT INTO paper_tags (tag_id, paper_id, user_id)
         VALUES (?, ?, ?) ON CONFLICT (tag_id, paper_id) DO NOTHING`,
        [tag.id, paperId, userId]
      );
    }
    return Tag.forPaper(userId, paperId);
  }

  static async removeFromPaper(userId, paperId, tagId) {
    const [result] = await db.execute(
      `DELETE FROM paper_tags WHERE user_id = ? AND paper_id = ? AND tag_id = ?`,
      [userId, paperId, tagId]
    );
    await db.execute(
      `DELETE FROM tags t WHERE t.user_id = ? AND t.id = ?
         AND NOT EXISTS (SELECT 1 FROM paper_tags pt WHERE pt.tag_id = t.id)`,
      [userId, tagId]
    );
    return result.affectedRows > 0;
  }

  static async remove(userId, tagId) {
    const [result] = await db.execute(
      `DELETE FROM tags WHERE user_id = ? AND id = ?`,
      [userId, tagId]
    );
    return result.affectedRows > 0;
  }

  static async forPaper(userId, paperId) {
    const [rows] = await db.execute(
      `SELECT t.id, t.name
         FROM paper_tags pt
         JOIN tags t ON t.id = pt.tag_id
        WHERE pt.user_id = ? AND pt.paper_id = ?
        ORDER BY t.name ASC`,
      [userId, paperId]
    );
    return rows;
  }

  static async forPapers(userId, paperIds) {
    if (!paperIds.length) return {};
    const placeholders = paperIds.map(() => '?').join(', ');
    const [rows] = await db.execute(
      `SELECT pt.paper_id, t.id, t.name
         FROM paper_tags pt
         JOIN tags t ON t.id = pt.tag_id
        WHERE pt.user_id = ? AND pt.paper_id IN (${placeholders})
        ORDER BY t.name ASC`,
      [userId, ...paperIds]
    );
    const map = {};
    for (const row of rows) {
      if (!map[row.paper_id]) map[row.paper_id] = [];
      map[row.paper_id].push({ id: row.id, name: row.name });
    }
    return map;
  }
}

module.exports = Tag;
