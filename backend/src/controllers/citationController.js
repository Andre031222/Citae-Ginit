const Citation = require('../models/Citation');
const Paper = require('../models/Paper');
const citationFormatter = require('../services/citationFormatter');

class CitationController {
  async generateCitation(req, res, next) {
    try {
      const { paperId, format } = req.body;

      if (!paperId || !format) {
        return res.status(400).json({ 
          error: 'Se requiere paperId y format' 
        });
      }

      const existingCitation = await Citation.findByPaperAndFormat(paperId, format);
      if (existingCitation) {
        return res.json({
          citation: existingCitation,
          fromCache: true
        });
      }

      const paper = await Paper.findById(paperId);
      if (!paper) {
        return res.status(404).json({ error: 'Paper no encontrado' });
      }

      const citationText = citationFormatter.format(paper, format);
      const citation = await Citation.create({
        paper_id: paperId,
        format_type: format,
        citation_text: citationText
      });

      res.json({
        citation,
        fromCache: false
      });
    } catch (error) {
      next(error);
    }
  }

  async getCitationsByPaper(req, res, next) {
    try {
      const { paperId } = req.params;
      const citations = await Citation.findByPaperId(paperId);
      
      res.json({ citations });
    } catch (error) {
      next(error);
    }
  }

  async getRecentCitations(req, res, next) {
    try {
      const { limit = 10 } = req.query;
      const citations = await Citation.getRecentCitations(parseInt(limit));
      
      res.json({ citations });
    } catch (error) {
      next(error);
    }
  }

  async quickCitation(req, res, next) {
    try {
      const { paperData, format } = req.body;

      if (!paperData || !format) {
        return res.status(400).json({ 
          error: 'Se requiere paperData y format' 
        });
      }

      if (!paperData.title || !paperData.authors) {
        return res.status(400).json({ 
          error: 'Se requiere al menos título y autores' 
        });
      }

      const citationText = citationFormatter.format(paperData, format);

      res.json({
        citation: {
          format_type: format,
          citation_text: citationText
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async exportCitations(req, res, next) {
    try {
      const { paperId, formats } = req.body;

      if (!paperId || !formats || !Array.isArray(formats)) {
        return res.status(400).json({ 
          error: 'Se requiere paperId y un array de formats' 
        });
      }

      const paper = await Paper.findById(paperId);
      if (!paper) {
        return res.status(404).json({ error: 'Paper no encontrado' });
      }

      const citations = {};
      for (const format of formats) {
        citations[format] = citationFormatter.format(paper, format);
      }

      const content = Object.entries(citations)
        .map(([format, text]) => `=== ${format} ===\n${text}\n`)
        .join('\n');

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="citations-${paperId}.txt"`);
      res.send(content);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CitationController();