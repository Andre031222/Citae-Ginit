const db = require('../config/database');

class Library {
  static async listPapers(userId, { collectionId, tag, search } = {}) {
    const params = [userId, userId, userId, userId];
    let sql = `
      SELECT DISTINCT p.id, p.title, p.authors, p.publication_year, p.journal,
             p.volume, p.issue, p.pages, p.doi, p.url, p.abstract, p.publisher,
             p.created_at,
             (f.id IS NOT NULL) AS is_favorite
        FROM papers p
        LEFT JOIN favorites f         ON f.paper_id = p.id AND f.user_id = ?
        LEFT JOIN collection_papers cp ON cp.paper_id = p.id
        LEFT JOIN collections c       ON c.id = cp.collection_id AND c.user_id = ?
        LEFT JOIN paper_tags pt       ON pt.paper_id = p.id AND pt.user_id = ?
        LEFT JOIN highlights h        ON h.paper_id = p.id AND h.user_id = ?
        WHERE (f.id IS NOT NULL OR c.id IS NOT NULL OR pt.id IS NOT NULL OR h.id IS NOT NULL)`;

    if (collectionId) {
      sql += ` AND c.id = ?`;
      params.push(collectionId);
    }
    if (tag) {
      sql += ` AND p.id IN (
        SELECT pt2.paper_id FROM paper_tags pt2
        JOIN tags t2 ON t2.id = pt2.tag_id
        WHERE pt2.user_id = ? AND t2.name = ?)`;
      params.push(userId, tag);
    }
    if (search) {
      sql += ` AND (p.title ILIKE ? OR p.authors ILIKE ? OR p.journal ILIKE ?)`;
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    sql += ` ORDER BY p.created_at DESC LIMIT 500`;

    const [rows] = await db.execute(sql, params);
    return rows;
  }

  static async getActivity(userId) {
    const [statRows] = await db.execute(`
      SELECT
        (SELECT COUNT(*)::int FROM highlights    WHERE user_id = ?) AS highlights,
        (SELECT COUNT(*)::int FROM collections   WHERE user_id = ?) AS collections,
        (SELECT COUNT(*)::int FROM tags          WHERE user_id = ?) AS tags,
        (SELECT COUNT(DISTINCT p.id)::int
           FROM papers p
           LEFT JOIN favorites f         ON f.paper_id  = p.id AND f.user_id = ?
           LEFT JOIN collection_papers cp ON cp.paper_id = p.id
           LEFT JOIN collections c       ON c.id = cp.collection_id AND c.user_id = ?
           LEFT JOIN paper_tags pt       ON pt.paper_id  = p.id AND pt.user_id = ?
           LEFT JOIN highlights h        ON h.paper_id  = p.id AND h.user_id = ?
           WHERE (f.id IS NOT NULL OR c.id IS NOT NULL OR pt.id IS NOT NULL OR h.id IS NOT NULL)
        ) AS papers
    `, [userId, userId, userId, userId, userId, userId, userId]);

    const [activityRows] = await db.execute(`
      SELECT event_date::text, SUM(cnt)::int AS count
      FROM (
        SELECT DATE(created_at) AS event_date, 1 AS cnt
        FROM highlights WHERE user_id = ? AND created_at >= NOW() - INTERVAL '364 days'
        UNION ALL
        SELECT DATE(cp.added_at), 1
        FROM collection_papers cp
        JOIN collections c ON c.id = cp.collection_id
        WHERE c.user_id = ? AND cp.added_at >= NOW() - INTERVAL '364 days'
        UNION ALL
        SELECT DATE(created_at), 1
        FROM favorites WHERE user_id = ? AND created_at >= NOW() - INTERVAL '364 days'
        UNION ALL
        SELECT DATE(pt.created_at), 1
        FROM paper_tags pt WHERE pt.user_id = ? AND pt.created_at >= NOW() - INTERVAL '364 days'
      ) combined
      WHERE event_date IS NOT NULL
      GROUP BY event_date
      ORDER BY event_date
    `, [userId, userId, userId, userId]);

    const stats    = statRows[0] || { papers: 0, highlights: 0, collections: 0, tags: 0 };
    const activity = activityRows.map(r => ({ date: r.event_date, count: r.count }));
    return { stats, activity };
  }
}

module.exports = Library;
