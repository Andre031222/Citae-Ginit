const { buildCorpus, retrieve }        = require('../services/ragService');
const { answerFromLibrary, expandQuery } = require('../services/aiComparator');
const { analyzeCollection }            = require('../services/deepResearchService');
const Library    = require('../models/Library');
const Collection = require('../models/Collection');

const SMALL_CORPUS = 12;

class RagController {

  async ask(req, res, next) {
    try {
      const { question, history } = req.body;
      if (!question || !String(question).trim()) {
        return res.status(400).json({ error: 'La pregunta es requerida' });
      }

      const q = String(question).trim().slice(0, 500);

      const safeHistory = Array.isArray(history)
        ? history.filter(h => h && typeof h.content === 'string' && ['user', 'assistant'].includes(h.role)).slice(-6)
        : [];

      const corpus = await buildCorpus(req.user.id);

      if (!corpus.length) {
        return res.json({
          available: true,
          answer: 'Tu biblioteca todavía está vacía. Añade papers (favoritos, colecciones o etiquetas) y crea resaltados para poder preguntar sobre ellos.',
          citations: [],
          corpusSize: 0,
        });
      }

      let chunks;
      if (corpus.length <= SMALL_CORPUS) {
        chunks = corpus;
      } else {
        chunks = retrieve(corpus, q, 8);
        if (chunks.length < 3) {
          const expanded = await expandQuery(q);
          if (expanded) chunks = retrieve(corpus, `${q} ${expanded}`, 8);
        }
        if (chunks.length < 3) chunks = corpus.slice(0, 8);
      }

      const result = await answerFromLibrary({ question: q, chunks, history: safeHistory });

      res.json({ ...result, corpusSize: corpus.length, retrieved: chunks.length });
    } catch (error) {
      next(error);
    }
  }

  async deepResearch(req, res, next) {
    try {
      const { collectionId } = req.body;
      if (!collectionId) {
        return res.status(400).json({ error: 'collectionId es requerido' });
      }

      const collection = await Collection.findById(req.user.id, collectionId);
      if (!collection) {
        return res.status(404).json({ error: 'Colección no encontrada' });
      }

      const papers = await Library.listPapers(req.user.id, { collectionId: collection.id });
      const result = await analyzeCollection(papers, collection.name);

      res.json({ ...result, collection: { id: collection.id, name: collection.name } });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RagController();
