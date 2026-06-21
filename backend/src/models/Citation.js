const db = require('../config/database');

class Citation {
  static async create(citationData) {
    const { paper_id, format_type, citation_text } = citationData;

    const [result] = await db.execute(
      'INSERT INTO citations (paper_id, format_type, citation_text) VALUES (?, ?, ?)',
      [paper_id, format_type, citation_text]
    );

    return { id: result.insertId, ...citationData };
  }

  static async findByPaperId(paperId) {
    const [rows] = await db.execute(
      'SELECT * FROM citations WHERE paper_id = ? ORDER BY format_type',
      [paperId]
    );
    return rows;
  }

  static async findByPaperAndFormat(paperId, formatType) {
    const [rows] = await db.execute(
      'SELECT * FROM citations WHERE paper_id = ? AND format_type = ?',
      [paperId, formatType]
    );
    return rows[0];
  }

  static async deleteByPaperId(paperId) {
    const [result] = await db.execute(
      'DELETE FROM citations WHERE paper_id = ?',
      [paperId]
    );
    return result.affectedRows;
  }

  static async getRecentCitations(limit = 10) {
    const [rows] = await db.execute(
      `SELECT c.*, p.title, p.authors 
       FROM citations c 
       JOIN papers p ON c.paper_id = p.id 
       ORDER BY c.created_at DESC 
       LIMIT ?`,
      [limit]
    );
    return rows;
  }
}

module.exports = Citation;