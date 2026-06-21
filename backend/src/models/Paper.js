const db = require('../config/database');

class Paper {
  static async create(paperData) {
    const {
      title, authors, publication_year, journal, volume, issue, pages,
      doi, url, abstract, publisher, full_pdf_text,
    } = paperData;

    const [result] = await db.execute(
      `INSERT INTO papers
         (title, authors, publication_year, journal, volume, issue, pages, doi, url, abstract, publisher, full_pdf_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, authors, publication_year, journal, volume, issue, pages, doi, url, abstract, publisher, full_pdf_text || null]
    );

    return { id: result.insertId, ...paperData };
  }

  static async findById(id) {
    const [rows] = await db.execute('SELECT * FROM papers WHERE id = ?', [id]);
    return rows[0];
  }

  // Devuelve el id de un paper existente (por DOI, o por título exacto) o lo crea.
  // Los papers son globales por DOI. Devuelve null si no hay datos suficientes.
  static async findOrCreate({ doi, title, authors, publication_year, journal, url } = {}) {
    if (!doi && !title) return null;
    try {
      let existing = null;
      if (doi) existing = await Paper.findByDOI(doi);
      if (!existing && title) {
        const matches = await Paper.findByTitle(title); // devuelve un array (LIKE)
        existing = (matches || []).find(
          p => (p.title || '').trim().toLowerCase() === title.trim().toLowerCase()
        ) || null;
      }
      if (existing) return existing.id;

      const created = await Paper.create({
        title:            title || 'Sin título',
        authors:          authors || null,
        publication_year: publication_year || null,
        journal:          journal || null,
        doi:              doi || null,
        url:              url || null,
      });
      return created.id;
    } catch {
      // Carrera por DOI único: re-buscar
      if (doi) { const p = await Paper.findByDOI(doi); if (p) return p.id; }
      return null;
    }
  }

  static async findByDOI(doi) {
    const [rows] = await db.execute('SELECT * FROM papers WHERE doi = ?', [doi]);
    return rows[0];
  }

  static async findByTitle(title) {
    const [rows] = await db.execute(
      'SELECT * FROM papers WHERE title LIKE ? LIMIT 10',
      [`%${title}%`]
    );
    return rows;
  }

  static async findAll(limit = 20, offset = 0) {
    const [rows] = await db.execute(
      'SELECT * FROM papers ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    return rows;
  }

  static async update(id, paperData) {
    // Allowlist explícita — previene mass-assignment de columnas arbitrarias
    const ALLOWED = new Set([
      'title', 'authors', 'publication_year', 'journal', 'volume',
      'issue', 'pages', 'doi', 'url', 'abstract', 'publisher', 'full_pdf_text',
    ]);

    const filtered = Object.entries(paperData).filter(([k]) => ALLOWED.has(k));
    if (filtered.length === 0) return false;

    const fields = filtered.map(([k]) => `${k} = ?`).join(', ');
    const values = [...filtered.map(([, v]) => v), id];

    const [result] = await db.execute(
      `UPDATE papers SET ${fields} WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await db.execute('DELETE FROM papers WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async search(query) {
    const searchTerm = `%${query}%`;
    const [rows] = await db.execute(
      `SELECT * FROM papers 
       WHERE title LIKE ? 
          OR authors LIKE ? 
          OR journal LIKE ? 
          OR doi LIKE ?
       ORDER BY created_at DESC 
       LIMIT 20`,
      [searchTerm, searchTerm, searchTerm, searchTerm]
    );
    return rows;
  }
}

module.exports = Paper;