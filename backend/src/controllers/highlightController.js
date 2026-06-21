const Highlight = require('../models/Highlight');
const Paper     = require('../models/Paper');
const { askAboutText } = require('../services/aiComparator');

// Asegura que el paper exista en `papers` para que el resaltado lo lleve a la biblioteca
async function ensurePaper({ paper_id, paper_doi, paper_title, paper_authors, paper_year, paper_journal, paper_url }) {
  if (paper_id) return paper_id;
  return Paper.findOrCreate({
    doi: paper_doi, title: paper_title, authors: paper_authors,
    publication_year: paper_year, journal: paper_journal, url: paper_url,
  });
}

class HighlightController {

  async getHighlights(req, res, next) {
    try {
      const userId = req.user.id;
      const { color, favorite, search, doi, title } = req.query;

      let highlights;
      if (doi || title) {
        // Para el drawer: resaltados de un paper concreto
        highlights = await Highlight.listByPaper(userId, { doi, title });
      } else {
        highlights = await Highlight.listByUser(userId, { color, favorite, search });
      }

      res.json({ highlights, total: highlights.length });
    } catch (error) {
      next(error);
    }
  }

  async addHighlight(req, res, next) {
    try {
      const userId = req.user.id;
      const {
        paper_id, paper_doi, paper_title, paper_authors, paper_year,
        paper_journal, paper_source, paper_url,
        quote, color, note, field, start_offset, end_offset,
      } = req.body;

      if (!quote || !quote.trim()) {
        return res.status(400).json({ error: 'El texto resaltado (quote) es requerido' });
      }

      const resolvedPaperId = await ensurePaper({
        paper_id, paper_doi, paper_title, paper_authors, paper_year, paper_journal, paper_url,
      });

      const result = await Highlight.create(userId, {
        paper_id: resolvedPaperId, paper_doi, paper_title, paper_authors, paper_year,
        paper_journal, paper_source, paper_url,
        quote: quote.trim(), color, note, field, start_offset, end_offset,
      });

      res.status(201).json({ message: 'Resaltado guardado', ...result });
    } catch (error) {
      next(error);
    }
  }

  async updateHighlight(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { note, color, is_favorite } = req.body;

      const updated = await Highlight.update(userId, id, { note, color, is_favorite });

      if (!updated) {
        return res.status(404).json({ error: 'Resaltado no encontrado o sin cambios' });
      }

      res.json({ message: 'Resaltado actualizado', success: true });
    } catch (error) {
      next(error);
    }
  }

  async deleteHighlight(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const removed = await Highlight.remove(userId, id);

      if (!removed) {
        return res.status(404).json({ error: 'Resaltado no encontrado' });
      }

      res.json({ message: 'Resaltado eliminado', success: true });
    } catch (error) {
      next(error);
    }
  }

  async clearHighlights(req, res, next) {
    try {
      const userId = req.user.id;
      const count = await Highlight.clear(userId);
      res.json({ message: `${count} resaltado(s) eliminados`, success: true });
    } catch (error) {
      next(error);
    }
  }

  /** Body: { question, quote, abstract, title, authors, year } */
  async askAssistant(req, res, next) {
    try {
      const { question, quote, abstract, field, title, authors, year, history } = req.body;

      if (!question && !quote) {
        return res.status(400).json({ error: 'question o quote son requeridos' });
      }

      const safeHistory = Array.isArray(history)
        ? history.slice(-6).filter(h => h.role && typeof h.content === 'string')
        : [];

      const safeField = ['abstract', 'fulltext'].includes(field) ? field : 'abstract';

      const result = await askAboutText({
        question: question || '¿Qué significa este fragmento en el contexto del paper?',
        quote,
        abstract,
        field: safeField,
        title,
        authors,
        year,
        history: safeHistory,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getDailyReview(req, res, next) {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);
      const [highlights, stats] = await Promise.all([
        Highlight.dailyReview(req.user.id, limit),
        Highlight.reviewStats(req.user.id),
      ]);
      res.json({ highlights, stats });
    } catch (error) {
      next(error);
    }
  }

  async markReviewed(req, res, next) {
    try {
      const ok = await Highlight.markReviewed(req.user.id, req.params.id);
      if (!ok) return res.status(404).json({ error: 'Resaltado no encontrado' });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HighlightController();
