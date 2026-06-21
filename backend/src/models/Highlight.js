const db = require('../config/database');
const Paper = require('./Paper');

const VALID_COLORS = ['yellow', 'green', 'blue', 'pink', 'navy'];

class Highlight {
  static async create(userId, data) {
    const {
      paper_id = null,
      paper_doi = null,
      paper_title = null,
      paper_authors = null,
      paper_year = null,
      paper_journal = null,
      paper_source = null,
      paper_url = null,
      quote,
      color = 'yellow',
      note = null,
      field = 'abstract',
      start_offset = null,
      end_offset = null,
    } = data;

    const safeColor = VALID_COLORS.includes(color) ? color : 'yellow';

    const [result] = await db.execute(
      `INSERT INTO highlights
        (user_id, paper_id, paper_doi, paper_title, paper_authors, paper_year,
         paper_journal, paper_source, paper_url, quote, color, note,
         field, start_offset, end_offset)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, paper_id, paper_doi, paper_title, paper_authors, paper_year,
        paper_journal, paper_source, paper_url, quote, safeColor, note,
        field, start_offset, end_offset,
      ]
    );

    return { success: true, id: result.insertId };
  }

  static async listByUser(userId, { color, favorite, search } = {}) {
    let sql = `SELECT * FROM highlights WHERE user_id = ?`;
    const params = [userId];

    if (color && VALID_COLORS.includes(color)) {
      sql += ` AND color = ?`;
      params.push(color);
    }
    if (favorite === true || favorite === 'true') {
      sql += ` AND is_favorite = TRUE`;
    }
    if (search) {
      sql += ` AND (quote ILIKE ? OR note ILIKE ? OR paper_title ILIKE ?)`;
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    sql += ` ORDER BY created_at DESC`;

    const [rows] = await db.execute(sql, params);
    return rows;
  }

  // Match prioritario por DOI; si no existe, fallback por título exacto.
  static async listByPaper(userId, { doi, title } = {}) {
    if (!doi && !title) return [];

    if (doi) {
      const [rows] = await db.execute(
        `SELECT * FROM highlights WHERE user_id = ? AND paper_doi = ? ORDER BY start_offset ASC NULLS LAST, created_at ASC`,
        [userId, doi]
      );
      return rows;
    }

    // Fallback por título (ILIKE para case-insensitive)
    const [rows] = await db.execute(
      `SELECT * FROM highlights WHERE user_id = ? AND paper_title ILIKE ? ORDER BY start_offset ASC NULLS LAST, created_at ASC`,
      [userId, title]
    );
    return rows;
  }

  static async update(userId, id, { note, color, is_favorite } = {}) {
    const sets = [];
    const params = [];

    if (note !== undefined) {
      sets.push(`note = ?`);
      params.push(note);
    }
    if (color !== undefined && VALID_COLORS.includes(color)) {
      sets.push(`color = ?`);
      params.push(color);
    }
    if (is_favorite !== undefined) {
      sets.push(`is_favorite = ?`);
      params.push(Boolean(is_favorite));
    }
    if (sets.length === 0) return false;

    sets.push(`updated_at = NOW()`);
    params.push(userId, id);

    const [result] = await db.execute(
      `UPDATE highlights SET ${sets.join(', ')} WHERE user_id = ? AND id = ?`,
      params
    );
    return result.affectedRows > 0;
  }

  static async remove(userId, id) {
    const [result] = await db.execute(
      `DELETE FROM highlights WHERE user_id = ? AND id = ?`,
      [userId, id]
    );
    return result.affectedRows > 0;
  }

  static async clear(userId) {
    const [result] = await db.execute(
      `DELETE FROM highlights WHERE user_id = ?`,
      [userId]
    );
    return result.affectedRows;
  }

  // Backfill idempotente: enlaza con un paper los resaltados antiguos guardados con
  // paper_id NULL (creados antes de arreglar ensurePaper). Devuelve cuántos enlazó.
  static async backfillPaperLinks() {
    const [rows] = await db.execute(
      `SELECT id, paper_doi, paper_title, paper_authors, paper_year, paper_journal, paper_url
         FROM highlights
        WHERE paper_id IS NULL AND (paper_doi IS NOT NULL OR paper_title IS NOT NULL)`
    );
    let linked = 0;
    for (const h of rows) {
      const paperId = await Paper.findOrCreate({
        doi: h.paper_doi, title: h.paper_title, authors: h.paper_authors,
        publication_year: h.paper_year, journal: h.paper_journal, url: h.paper_url,
      });
      if (paperId) {
        await db.execute('UPDATE highlights SET paper_id = ? WHERE id = ?', [paperId, h.id]);
        linked++;
      }
    }
    return linked;
  }

  static async countByUser(userId) {
    const [rows] = await db.execute(
      `SELECT COUNT(*) as total FROM highlights WHERE user_id = ?`,
      [userId]
    );
    return parseInt(rows[0]?.total || '0');
  }

  /**
   * Repaso espaciado: prioriza los nunca repasados, luego los repasados hace más
   * tiempo. Excluye los ya repasados hoy. El que tiene nota pesa un poco más.
   */
  static async dailyReview(userId, limit = 5) {
    const [rows] = await db.execute(
      `SELECT * FROM highlights
        WHERE user_id = ?
          AND (last_reviewed_at IS NULL OR last_reviewed_at < CURRENT_DATE)
        ORDER BY
          (last_reviewed_at IS NOT NULL),
          COALESCE(review_count, 0) ASC,
          last_reviewed_at ASC NULLS FIRST,
          (note IS NULL),
          created_at DESC
        LIMIT ?`,
      [userId, limit]
    );
    return rows;
  }

  static async markReviewed(userId, id) {
    const [result] = await db.execute(
      `UPDATE highlights
          SET last_reviewed_at = CURRENT_TIMESTAMP,
              review_count = COALESCE(review_count, 0) + 1
        WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    return result.affectedRows > 0;
  }

  static async reviewStats(userId) {
    const [rows] = await db.execute(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE last_reviewed_at IS NULL OR last_reviewed_at < CURRENT_DATE)::int AS pending,
         COUNT(*) FILTER (WHERE last_reviewed_at >= CURRENT_DATE)::int AS done_today
       FROM highlights WHERE user_id = ?`,
      [userId]
    );
    return rows[0] || { total: 0, pending: 0, done_today: 0 };
  }
}

module.exports = Highlight;
