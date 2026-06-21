const axios = require('axios');
const { assertPublicUrl } = require('../utils/urlGuard');
const Paper           = require('../models/Paper');
const Citation        = require('../models/Citation');
const scraperService  = require('../services/scraperService');
const pdfService      = require('../services/pdfService');
const ocrService      = require('../services/ocrService');
const citationFormatter = require('../services/citationFormatter');
const {
  fetchCrossRefByDoi,
  fetchSemanticScholarByDoi,
  searchCrossRefMulti,
  searchSemanticScholarMulti,
  searchOpenAlex,
  searchArxiv,
  searchAuthors,
  authorWorks,
} = require('../services/searchSources');
const { parseQuery, dedupeAndMerge, scoreCandidate, classify } = require('../services/candidateMatcher');
const { parseNaturalFilters, applyFilters, hasFilters } = require('../services/queryFilters');
const { summarizeCandidates, generateAbstractFallback } = require('../services/aiComparator');
const { fetchPreviewImage, fetchPdfUrl } = require('../services/previewService');

const FORMATS = ['APA', 'MLA', 'Chicago', 'Harvard', 'IEEE', 'Vancouver', 'BibTeX'];

/** Guarda paper en DB (reutiliza si ya existe por DOI) */
async function upsertPaper(meta) {
  if (meta.doi) {
    const existing = await Paper.findByDOI(meta.doi);
    if (existing) return existing;
  }
  return Paper.create({
    title:            (meta.title            || 'Sin título').substring(0, 500),
    authors:          (meta.authors          || '').substring(0, 1000),
    publication_year: meta.publication_year  || null,
    journal:          (meta.journal          || '').substring(0, 300),
    volume:           meta.volume            || '',
    issue:            meta.issue             || '',
    pages:            meta.pages             || '',
    doi:              meta.doi               || '',
    url:              (meta.url              || '').substring(0, 1000),
    abstract:         (meta.abstract         || '').substring(0, 3000),
    publisher:        meta.publisher         || '',
    full_pdf_text:    (meta.full_text && meta.full_text.trim()) ? meta.full_text : null,
  });
}

/** Genera y guarda citaciones en los 7 formatos */
async function buildCitations(paper) {
  const out = [];
  for (const fmt of FORMATS) {
    try {
      let row = await Citation.findByPaperAndFormat(paper.id, fmt);
      if (!row) {
        const text = citationFormatter.format(paper, fmt);
        row = await Citation.create({ paper_id: paper.id, format_type: fmt, citation_text: text });
      }
      out.push({ format_type: fmt, citation_text: row.citation_text });
    } catch (e) {
      console.error(`Citation ${fmt}:`, e.message);
    }
  }
  return out;
}

function detectType(raw) {
  const s = raw.trim();
  if (/^10\.\d{4,}\/\S/.test(s))                 return 'doi';
  if (/doi\.org\/(10\.\d{4,}\/\S+)/i.test(s))    return 'doi_url';
  if (/^https?:\/\//i.test(s))                    return 'url';
  return 'title';
}

/** Extrae DOI desde una URL del tipo doi.org/… */
function doiFromUrl(url) {
  const m = url.match(/doi\.org\/(10\.\d{4,}\/\S+)/i);
  return m ? m[1].replace(/[.)]+$/, '') : null;
}

/** Extrae DOI embebido en cualquier URL (ej. scopus, springer, etc.) */
function doiFromString(s) {
  const m = s.match(/(10\.\d{4,}\/[-._;()\/:A-Za-z0-9]+)/);
  return m ? m[1].replace(/[.)]+$/, '') : null;
}

/** Convierte abstract_inverted_index de OpenAlex → texto plano */
function invertedIndexToText(idx) {
  if (!idx || typeof idx !== 'object') return '';
  const words = [];
  for (const [word, positions] of Object.entries(idx)) {
    for (const pos of positions) { words[pos] = word; }
  }
  return words.filter(Boolean).join(' ');
}

async function extractFromUrl(url) {
  // Validar que la URL sea pública antes de hacer cualquier request (anti-SSRF)
  await assertPublicUrl(url);

  // Primero: intenta extraer un DOI embebido en la URL o en las meta tags
  const doiInUrl = doiFromString(url);
  if (doiInUrl) {
    try { return await fetchCrossRefByDoi(doiInUrl); } catch (_) {}
    try { return await fetchSemanticScholarByDoi(doiInUrl); } catch (_) {}
  }

  // Segundo: obtén la página y analiza meta tags sin Puppeteer (más rápido)
  // Se siguen redirects manualmente para re-validar anti-SSRF en cada salto (TOCTOU fix)
  try {
    const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
    let currentUrl = url;
    let html;
    for (let hops = 0; hops <= 3; hops++) {
      // Re-validar cada URL antes de seguir el redirect
      await assertPublicUrl(currentUrl);
      const resp = await axios.get(currentUrl, {
        timeout: 12000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CitoBot/1.0)',
          'Accept': 'text/html',
        },
        maxRedirects: 0,            // no seguir redirects automáticamente
        maxContentLength: 5_000_000,
        validateStatus: s => s < 500,
      });
      if (REDIRECT_STATUSES.has(resp.status)) {
        const location = resp.headers['location'];
        if (!location) break;
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }
      html = resp.data;
      break;
    }
    if (!html) throw new Error('No se pudo obtener la página');

    // Extrae meta tags clave con regex (Cheerio-free, más rápido)
    const meta = (name) => {
      const patterns = [
        new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'),
        new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`, 'i'),
      ];
      for (const p of patterns) {
        const m = html.match(p);
        if (m) return m[1].trim();
      }
      return '';
    };

    const allMeta = (name) => {
      const results = [];
      const patterns = [
        new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'gi'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'gi'),
      ];
      for (const p of patterns) {
        let m;
        while ((m = p.exec(html)) !== null) results.push(m[1].trim());
      }
      return results;
    };

    const title   = meta('citation_title')  || meta('og:title')  || meta('DC.Title') || '';
    const doi     = (meta('citation_doi')   || meta('DC.Identifier') || doiFromString(html) || '').replace(/^doi:?\s*/i, '');
    const journal = meta('citation_journal_title') || meta('citation_conference_title') || '';
    const year    = (meta('citation_publication_date') || meta('citation_year') || meta('DC.Date') || '').substring(0, 4);
    const vol     = meta('citation_volume');
    const iss     = meta('citation_issue');
    const pgs     = meta('citation_firstpage') && meta('citation_lastpage')
                    ? `${meta('citation_firstpage')}–${meta('citation_lastpage')}`
                    : meta('citation_firstpage') || '';
    const pub     = meta('citation_publisher') || meta('og:site_name') || '';
    const authors = allMeta('citation_author').join(', ') || meta('author') || meta('DC.Creator') || '';

    if (doi) {
      // Si encontramos DOI en la página, enriquece con CrossRef
      try {
        const enriched = await fetchCrossRefByDoi(doi);
        return {
          ...enriched,
          title:  title  || enriched.title,
          authors: authors || enriched.authors,
        };
      } catch (_) {}
    }

    if (title) {
      return {
        title,
        authors,
        publication_year: year ? parseInt(year) : null,
        journal,
        volume: vol || '',
        issue:  iss || '',
        pages:  pgs,
        doi,
        url,
        publisher: pub,
        abstract:  '',
      };
    }
  } catch (err) {
    console.log('HTTP meta extraction failed:', err.message);
  }

  // Tercero: Puppeteer como último recurso (la URL ya fue validada al inicio)
  try {
    return await scraperService.extract(url);
  } catch (err) {
    throw new Error('No se pudieron extraer metadatos de esa URL');
  }
}

async function searchByTitle(title) {
  try { const [hit] = await searchCrossRefMulti(title);        if (hit) return hit; } catch (_) {}
  try { const [hit] = await searchSemanticScholarMulti(title); if (hit) return hit; } catch (_) {}
  throw new Error('No se encontró información para ese título. Prueba con el DOI o URL del artículo.');
}

const paperController = {

  extractMetadata: async (req, res) => {
    try {
      const { input } = req.body;
      if (!input?.trim()) {
        return res.status(400).json({ error: 'Se requiere un DOI, URL o título' });
      }

      const s    = input.trim();
      const type = detectType(s);
      let meta   = null;

      if (type === 'doi') {
        // DOI directo — CrossRef primero, Semantic Scholar de respaldo
        try       { meta = await fetchCrossRefByDoi(s); }
        catch (_) { meta = await fetchSemanticScholarByDoi(s); }

      } else if (type === 'doi_url') {
        const doi = doiFromUrl(s);
        try       { meta = await fetchCrossRefByDoi(doi); }
        catch (_) { meta = await fetchSemanticScholarByDoi(doi); }

      } else if (type === 'url') {
        meta = await extractFromUrl(s);

      } else {
        meta = await searchByTitle(s);
      }

      if (!meta?.title) {
        return res.status(422).json({ error: 'No se pudieron obtener metadatos' });
      }

      const paper = await upsertPaper(meta);
      return res.json({ paper });

    } catch (err) {
      console.error('extractMetadata:', err.message);
      return res.status(422).json({ error: err.message || 'Error al extraer metadatos' });
    }
  },

  uploadPDF: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo PDF' });
      }
      const meta    = await pdfService.extractFromPDF(req.file.buffer);
      const paper   = await upsertPaper(meta);
      const warning = meta.partial
        ? 'Algunos metadatos no pudieron ser extraídos automáticamente.'
        : undefined;
      return res.json({ paper, warning });
    } catch (err) {
      console.error('uploadPDF:', err.message);
      return res.status(500).json({ error: 'Error al procesar el PDF' });
    }
  },

  uploadImage: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ninguna imagen' });
      }
      let text;
      try {
        text = await ocrService.extractTextFromImage(req.file.buffer);
      } catch (ocrErr) {
        console.error('uploadImage OCR:', ocrErr.message);
        return res.status(500).json({ error: 'No se pudo procesar la imagen (OCR no disponible)' });
      }
      if (!text || text.replace(/\s+/g, ' ').trim().length < 20) {
        return res.status(422).json({
          error: 'No se detectó texto legible en la imagen. Prueba con una captura más nítida del título o el DOI del artículo.',
        });
      }
      const meta    = await pdfService.extractFromText(text);
      const paper   = await upsertPaper(meta);
      const warning = meta.partial
        ? 'Algunos metadatos no pudieron ser extraídos de la imagen. Puedes editarlos manualmente.'
        : undefined;
      return res.json({ paper, warning });
    } catch (err) {
      console.error('uploadImage:', err.message);
      return res.status(500).json({ error: 'Error al procesar la imagen' });
    }
  },

  generateAllCitations: async (req, res) => {
    try {
      const paper = await Paper.findById(req.params.id);
      if (!paper) return res.status(404).json({ error: 'Paper no encontrado' });
      // force=true: borra citas existentes para reflejar metadatos actualizados
      if (req.query.force === 'true') {
        await Citation.deleteByPaperId(paper.id);
      }
      const citations = await buildCitations(paper);
      return res.json({ citations });
    } catch (err) {
      console.error('generateAllCitations:', err.message);
      return res.status(500).json({ error: 'Error al generar citaciones' });
    }
  },

  getAllPapers: async (req, res) => {
    try {
      const { limit = 20, offset = 0 } = req.query;
      const papers = await Paper.findAll(parseInt(limit), parseInt(offset));
      res.json({ papers, total: papers.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  searchPapers: async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) return res.json({ papers: [] });
      const papers = await Paper.search(q);
      res.json({ papers, query: q });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  getPaperById: async (req, res) => {
    try {
      const paper = await Paper.findById(req.params.id);
      if (!paper) return res.status(404).json({ error: 'Paper no encontrado' });
      res.json({ paper });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  getPaperFullText: async (req, res) => {
    try {
      const paper = await Paper.findById(req.params.id);
      if (!paper) return res.status(404).json({ error: 'Paper no encontrado' });
      if (!paper.full_pdf_text) {
        return res.json({ available: false });
      }
      res.json({ available: true, full_text: paper.full_pdf_text });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  updatePaper: async (req, res) => {
    try {
      await Paper.update(req.params.id, req.body);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  deletePaper: async (req, res) => {
    try {
      await Paper.delete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // POST /api/papers/search-candidates
  // Búsqueda multi-fuente con ranking y comparación.
  // Para DOI/URL: resuelve directamente (mismo flujo que /extract).
  // Para TÍTULO: consulta 4 fuentes en paralelo, deduplica, rankea
  // y clasifica como 'exact' | 'compare' | 'refine'.
  searchCandidates: async (req, res) => {
    try {
      const { input, filters: clientFilters } = req.body;
      if (!input?.trim()) {
        return res.status(400).json({ error: 'Se requiere un DOI, URL o título' });
      }

      const s    = input.trim();
      const type = detectType(s);

      // Camino rápido: DOI / URL / doi_url — mismo flujo que /extract
      if (type !== 'title') {
        let meta = null;
        if (type === 'doi') {
          try       { meta = await fetchCrossRefByDoi(s); }
          catch (_) { meta = await fetchSemanticScholarByDoi(s); }
        } else if (type === 'doi_url') {
          const doi = doiFromUrl(s);
          try       { meta = await fetchCrossRefByDoi(doi); }
          catch (_) { meta = await fetchSemanticScholarByDoi(doi); }
        } else {
          meta = await extractFromUrl(s);
        }
        if (!meta?.title) {
          return res.status(422).json({ error: 'No se pudieron obtener metadatos' });
        }
        const paper = await upsertPaper(meta);
        return res.json({ action: 'exact', paper });
      }

      // Búsqueda en lenguaje natural: extraer filtros (años/citas/tipo).
      // Los filtros del cliente (UI) tienen prioridad sobre los detectados en el texto.
      const nl = parseNaturalFilters(s);
      const filters = { ...nl.filters, ...(clientFilters || {}) };
      const searchText = nl.cleanQuery || s;

      // Camino título: 4 fuentes en paralelo
      const queryParsed = parseQuery(searchText);

      const results = await Promise.allSettled([
        searchCrossRefMulti(queryParsed.title),
        searchSemanticScholarMulti(queryParsed.title),
        searchOpenAlex(queryParsed.title),
        searchArxiv(queryParsed.title),
      ]);

      const allCandidates = results
        .filter(r => r.status === 'fulfilled' && Array.isArray(r.value))
        .flatMap(r => r.value);

      const unified = dedupeAndMerge(allCandidates);

      const rankedAll = unified
        .map(cand => {
          const { score, breakdown } = scoreCandidate(queryParsed, cand);
          return { ...cand, score, scoreBreakdown: breakdown };
        })
        .sort((a, b) => b.score - a.score);

      // Aplicar filtros (transparencia: informamos cuántos se descartaron)
      const ranked = hasFilters(filters) ? applyFilters(rankedAll, filters) : rankedAll;
      const filteredOut = rankedAll.length - ranked.length;

      const searchMeta = {
        searchedFor:  queryParsed.title,
        filters:      hasFilters(filters) ? filters : null,
        totalFound:   rankedAll.length,
        filteredOut:  filteredOut > 0 ? filteredOut : 0,
      };

      // Clasificar — forceCompare=true: búsquedas por título nunca auto-seleccionan,
      // el usuario siempre ve la lista y elige
      const result = classify(ranked, true);

      // El camino 'exact' queda reservado para DOI/URL (gestionado arriba).
      // Para títulos, classify con forceCompare=true nunca devuelve 'exact'.

      // Compare: narrativa IA de relación entre resultados y búsqueda
      if (result.action === 'compare') {
        const aiResult = await summarizeCandidates(s, result.candidates);
        return res.json({
          action:          'compare',
          query:           s,                      // query original para mostrar como título
          candidates:      result.candidates,
          recommendation:  result.recommendation,
          searchMeta,
          ...(aiResult.available ? { aiNarrative: aiResult.narrative } : {}),
        });
      }

      // Refine
      return res.json({
        action:     'refine',
        query:      s,
        candidates: result.candidates || [],
        message:    result.message,
        searchMeta,
      });

    } catch (err) {
      console.error('searchCandidates:', err.message);
      return res.status(422).json({ error: err.message || 'Error al buscar candidatos' });
    }
  },

  // POST /api/papers/from-candidate
  // Persiste el candidato elegido por el usuario y devuelve el paper.
  // Recibe la meta completa que el front ya tiene (shape de NormalizedCandidate).
  // Soporta candidatos sin DOI (arXiv/preprints).
  fromCandidate: async (req, res) => {
    try {
      const { candidate } = req.body;
      if (!candidate?.title) {
        return res.status(400).json({ error: 'Se requiere el candidato con al menos un título' });
      }
      const paper = await upsertPaper(candidate);
      return res.json({ paper });
    } catch (err) {
      console.error('fromCandidate:', err.message);
      return res.status(500).json({ error: 'Error al guardar el paper seleccionado' });
    }
  },

  // GET /api/papers/abstract?doi=&title=&authors=&year=&journal=
  // Cadena de fuentes (real primero, IA solo si todo falla):
  //   1. Semantic Scholar por DOI
  //   2. OpenAlex por DOI
  //   3. Semantic Scholar por título (búsqueda)
  //   4. OpenAlex por título (búsqueda)
  //   5. Groq IA — último recurso, marca isAiGenerated:true
  fetchAbstract: async (req, res) => {
    const { doi, title, authors, year, journal } = req.query;
    if (!doi?.trim() && !title?.trim()) {
      return res.status(400).json({ error: 'Se requiere DOI o título' });
    }

    let abstract = '';

    // 1 & 2: búsquedas por DOI
    if (doi?.trim()) {
      const cleanDoi = doi.trim().replace(/^https?:\/\/doi\.org\//i, '');

      // 1. Semantic Scholar por DOI
      try {
        const r = await axios.get(
          `https://api.semanticscholar.org/graph/v1/paper/DOI:${cleanDoi}?fields=abstract`,
          { timeout: 6000 }
        );
        abstract = r.data?.abstract || '';
      } catch (_) {}

      // 2. OpenAlex por DOI
      if (!abstract) {
        try {
          const r = await axios.get(
            `https://api.openalex.org/works/doi:${cleanDoi}?mailto=support@citae.app`,
            { timeout: 6000 }
          );
          abstract = invertedIndexToText(r.data?.abstract_inverted_index);
        } catch (_) {}
      }
    }

    // 3 & 4: búsquedas por título
    if (!abstract && title?.trim()) {
      const q = encodeURIComponent(title.trim());

      // 3. Semantic Scholar por título
      try {
        const r = await axios.get(
          `https://api.semanticscholar.org/graph/v1/paper/search?query=${q}&limit=3&fields=abstract,title`,
          { timeout: 7000 }
        );
        const hit = (r.data?.data || []).find(p => p.abstract);
        abstract = hit?.abstract || '';
      } catch (_) {}

      // 4. OpenAlex por título
      if (!abstract) {
        try {
          const r = await axios.get(
            `https://api.openalex.org/works?search=${q}&per_page=3&mailto=support@citae.app`,
            { timeout: 7000 }
          );
          const hit = (r.data?.results || []).find(p => p.abstract_inverted_index);
          abstract = invertedIndexToText(hit?.abstract_inverted_index);
        } catch (_) {}
      }
    }

    if (abstract) {
      return res.json({ abstract: abstract.substring(0, 3000), isAiGenerated: false });
    }

    // 5. Último recurso: Groq genera un resumen basado en los metadatos
    if (title?.trim()) {
      const generated = await generateAbstractFallback({ title, authors, year, journal });
      if (generated) {
        return res.json({ abstract: generated.substring(0, 2000), isAiGenerated: true });
      }
    }

    return res.json({ abstract: '', isAiGenerated: false });
  },

  fetchPreview: async (req, res) => {
    try {
      const { doi, url } = req.query;
      if (!doi && !url) {
        return res.json({ image: null });
      }
      const result = await fetchPreviewImage({ doi, url });
      res.set('Cache-Control', 'public, max-age=86400');
      res.json(result);
    } catch {
      res.json({ image: null });
    }
  },

  fetchPdfUrl: async (req, res) => {
    try {
      const { doi, url } = req.query;
      if (!doi && !url) return res.json({ pdfUrl: null });
      const result = await fetchPdfUrl({ doi, url });
      res.set('Cache-Control', 'public, max-age=86400');
      res.json(result);
    } catch {
      res.json({ pdfUrl: null });
    }
  },

  searchAuthors: async (req, res) => {
    try {
      const q = (req.query.q || '').trim();
      if (q.length < 2) return res.json({ authors: [] });
      const authors = await searchAuthors(q);
      return res.json({ authors });
    } catch (err) {
      console.error('searchAuthors:', err.message);
      return res.status(502).json({ error: 'No se pudo consultar el directorio de autores' });
    }
  },

  authorWorks: async (req, res) => {
    try {
      const id   = (req.params.id || '').trim();
      const sort = req.query.sort === 'recent' ? 'recent' : 'cited';
      if (!id) return res.status(400).json({ error: 'Se requiere el id del autor' });
      const works = await authorWorks(id, { sort });
      return res.json({ works });
    } catch (err) {
      console.error('authorWorks:', err.message);
      return res.status(502).json({ error: 'No se pudieron obtener las publicaciones del autor' });
    }
  },
};

module.exports = paperController;
