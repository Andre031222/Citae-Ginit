const Library    = require('../models/Library');
const Collection = require('../models/Collection');
const Tag        = require('../models/Tag');
const Paper      = require('../models/Paper');
const { EXPORT_FORMATS } = require('../services/exportFormatter');
const { suggestTags }    = require('../services/aiComparator');

function slugify(name) {
  return String(name || 'biblioteca')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'biblioteca';
}

async function buildExport(res, papers, userId, format, title) {
  const fmt = EXPORT_FORMATS[String(format || 'bibtex').toLowerCase()];
  if (!fmt) {
    return res.status(400).json({ error: 'Formato no soportado. Usa: bibtex, ris, csv, markdown' });
  }
  if (!papers.length) {
    return res.status(404).json({ error: 'No hay papers para exportar' });
  }
  const tagsMap = await Tag.forPapers(userId, papers.map(p => p.id));
  const content = fmt.build(papers, tagsMap, title);

  res.setHeader('Content-Type', `${fmt.mime}; charset=utf-8`);
  res.setHeader('Content-Disposition', `attachment; filename="${slugify(title)}.${fmt.ext}"`);
  res.send(content);
}

class LibraryController {

  async getPapers(req, res, next) {
    try {
      const userId = req.user.id;
      const { collection, tag, search } = req.query;

      const papers = await Library.listPapers(userId, {
        collectionId: collection ? parseInt(collection, 10) : null,
        tag,
        search,
      });

      const ids = papers.map(p => p.id);
      const [tagsMap, collectionsMap] = await Promise.all([
        Tag.forPapers(userId, ids),
        Collection.membershipForPapers(userId, ids),
      ]);

      const enriched = papers.map(p => ({
        ...p,
        tags:        tagsMap[p.id]        || [],
        collections: collectionsMap[p.id] || [],
      }));

      res.json({ papers: enriched, total: enriched.length });
    } catch (error) {
      next(error);
    }
  }

  async getCollections(req, res, next) {
    try {
      const collections = await Collection.listByUser(req.user.id);
      res.json({ collections });
    } catch (error) {
      next(error);
    }
  }

  async createCollection(req, res, next) {
    try {
      const { name, description, color } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'El nombre de la colección es requerido' });
      }
      const collection = await Collection.create(req.user.id, {
        name: name.trim().slice(0, 120),
        description: description?.trim() || null,
        color,
      });
      res.status(201).json({ collection });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Ya tienes una colección con ese nombre' });
      }
      next(error);
    }
  }

  async updateCollection(req, res, next) {
    try {
      const { name, description, color } = req.body;
      const updated = await Collection.update(req.user.id, req.params.id, {
        name: name?.trim().slice(0, 120),
        description,
        color,
      });
      if (!updated) {
        return res.status(404).json({ error: 'Colección no encontrada o sin cambios' });
      }
      res.json({ success: true });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Ya tienes una colección con ese nombre' });
      }
      next(error);
    }
  }

  async deleteCollection(req, res, next) {
    try {
      const removed = await Collection.remove(req.user.id, req.params.id);
      if (!removed) {
        return res.status(404).json({ error: 'Colección no encontrada' });
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async setCollectionVisibility(req, res, next) {
    try {
      const result = await Collection.setVisibility(req.user.id, req.params.id, req.body.is_public === true);
      if (!result) {
        return res.status(404).json({ error: 'Colección no encontrada' });
      }
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async addPaperToCollection(req, res, next) {
    try {
      const { paper_id } = req.body;
      if (!paper_id) {
        return res.status(400).json({ error: 'paper_id es requerido' });
      }
      const paper = await Paper.findById(paper_id);
      if (!paper) {
        return res.status(404).json({ error: 'Paper no encontrado' });
      }
      const added = await Collection.addPaper(req.user.id, req.params.id, paper_id);
      if (!added) {
        return res.status(404).json({ error: 'Colección no encontrada' });
      }
      res.status(201).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async removePaperFromCollection(req, res, next) {
    try {
      const removed = await Collection.removePaper(req.user.id, req.params.id, req.params.paperId);
      if (!removed) {
        return res.status(404).json({ error: 'Paper no encontrado en la colección' });
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async exportCollection(req, res, next) {
    try {
      const userId = req.user.id;
      const collection = await Collection.findById(userId, req.params.id);
      if (!collection) {
        return res.status(404).json({ error: 'Colección no encontrada' });
      }
      const papers = await Library.listPapers(userId, { collectionId: collection.id });
      await buildExport(res, papers, userId, req.query.format, collection.name);
    } catch (error) {
      next(error);
    }
  }

  async exportLibrary(req, res, next) {
    try {
      const userId = req.user.id;
      const { tag, search, format } = req.query;
      const papers = await Library.listPapers(userId, { tag, search });
      await buildExport(res, papers, userId, format, tag ? `biblioteca-${tag}` : 'biblioteca');
    } catch (error) {
      next(error);
    }
  }

  async getTags(req, res, next) {
    try {
      const tags = await Tag.listByUser(req.user.id);
      res.json({ tags });
    } catch (error) {
      next(error);
    }
  }

  async addPaperTags(req, res, next) {
    try {
      const { tags } = req.body;
      if (!Array.isArray(tags) || !tags.length) {
        return res.status(400).json({ error: 'tags debe ser un array con al menos una etiqueta' });
      }
      const paper = await Paper.findById(req.params.id);
      if (!paper) {
        return res.status(404).json({ error: 'Paper no encontrado' });
      }
      const result = await Tag.addToPaper(req.user.id, paper.id, tags.slice(0, 10));
      res.status(201).json({ tags: result });
    } catch (error) {
      next(error);
    }
  }

  async removePaperTag(req, res, next) {
    try {
      const removed = await Tag.removeFromPaper(req.user.id, req.params.id, req.params.tagId);
      if (!removed) {
        return res.status(404).json({ error: 'Etiqueta no encontrada en el paper' });
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async autoTagPaper(req, res, next) {
    try {
      const paper = await Paper.findById(req.params.id);
      if (!paper) {
        return res.status(404).json({ error: 'Paper no encontrado' });
      }
      const result = await suggestTags({
        title:    paper.title,
        abstract: paper.abstract,
        journal:  paper.journal,
      });
      if (!result.available) {
        return res.json({ available: false, tags: [] });
      }
      const saved = await Tag.addToPaper(req.user.id, paper.id, result.tags);
      res.json({ available: true, tags: saved });
    } catch (error) {
      next(error);
    }
  }

  async deleteTag(req, res, next) {
    try {
      const removed = await Tag.remove(req.user.id, req.params.id);
      if (!removed) {
        return res.status(404).json({ error: 'Etiqueta no encontrada' });
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async getActivity(req, res, next) {
    try {
      const result = await Library.getActivity(req.user.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LibraryController();
