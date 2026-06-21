const axios   = require('axios');
const cheerio = require('cheerio');

const TIMEOUT = 8000;
const MAILTO  = 'support@citae.app';
const TTL_MS  = 5 * 60 * 1000;

const cache = new Map();

function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + TTL_MS });
}

function crossRefAuthors(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  return arr
    .map(a => `${a.given || ''} ${a.family || ''}`.trim())
    .filter(Boolean)
    .join(', ');
}

function reconstructAbstract(idx) {
  if (!idx || typeof idx !== 'object') return '';
  const words = [];
  for (const [word, positions] of Object.entries(idx)) {
    for (const pos of positions) {
      words[pos] = word;
    }
  }
  return words.filter(Boolean).join(' ').substring(0, 2000);
}

async function fetchCrossRefByDoi(doi) {
  const r = await axios.get(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
    timeout: TIMEOUT,
    headers: { 'User-Agent': `CITAE/1.0 (mailto:${MAILTO})` },
  });
  const d = r.data.message;
  return {
    title:            d.title?.[0]                          || '',
    authors:          crossRefAuthors(d.author),
    publication_year: d.published?.['date-parts']?.[0]?.[0] || null,
    journal:          d['container-title']?.[0]             || '',
    volume:           d.volume                              || '',
    issue:            d.issue                               || '',
    pages:            d.page                                || '',
    doi:              d.DOI                                 || doi,
    url:              d.URL || `https://doi.org/${d.DOI || doi}`,
    publisher:        d.publisher                           || '',
    abstract:         (d.abstract || '').replace(/<[^>]+>/g, ''),
  };
}

async function fetchSemanticScholarByDoi(doi) {
  const r = await axios.get(
    `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}`,
    {
      params: { fields: 'title,authors,year,venue,externalIds,publicationVenue,abstract,journal' },
      timeout: TIMEOUT,
    }
  );
  const p = r.data;
  const doiOut = p.externalIds?.DOI || doi;
  return {
    title:            p.title || '',
    authors:          (p.authors || []).map(a => a.name).join(', '),
    publication_year: p.year || null,
    journal:          p.journal?.name || p.venue || p.publicationVenue?.name || '',
    volume: '', issue: '', pages: '', publisher: '',
    doi:              doiOut,
    url:              `https://doi.org/${doiOut}`,
    abstract:         p.abstract || '',
  };
}

async function searchCrossRefMulti(title) {
  const key = `crossref:${title.toLowerCase().trim()}`;
  const cached = getCache(key);
  if (cached) return cached;

  const r = await axios.get('https://api.crossref.org/works', {
    params: {
      'query.bibliographic': title,
      rows:   12,
      select: 'DOI,title,author,published,container-title,volume,issue,page,publisher,URL,abstract',
    },
    timeout: TIMEOUT,
    headers: { 'User-Agent': `CITAE/1.0 (mailto:${MAILTO})` },
  });

  const items = r.data?.message?.items || [];
  const result = items
    .filter(d => d.title?.[0])
    .map(d => ({
      title:            d.title[0],
      authors:          crossRefAuthors(d.author),
      publication_year: d.published?.['date-parts']?.[0]?.[0] || null,
      journal:          d['container-title']?.[0] || '',
      volume:           d.volume    || '',
      issue:            d.issue     || '',
      pages:            d.page      || '',
      doi:              d.DOI       || '',
      url:              d.URL || (d.DOI ? `https://doi.org/${d.DOI}` : ''),
      publisher:        d.publisher || '',
      abstract:         (d.abstract || '').replace(/<[^>]+>/g, '').substring(0, 2000),
      source:           'crossref',
      sourceId:         d.DOI || d.title?.[0] || '',
    }));

  setCache(key, result);
  return result;
}

async function searchSemanticScholarMulti(title) {
  const key = `semanticscholar:${title.toLowerCase().trim()}`;
  const cached = getCache(key);
  if (cached) return cached;

  const headers = {};
  if (process.env.SEMANTIC_SCHOLAR_KEY) {
    headers['x-api-key'] = process.env.SEMANTIC_SCHOLAR_KEY;
  }

  const r = await axios.get('https://api.semanticscholar.org/graph/v1/paper/search', {
    params: {
      query:  title,
      limit:  12,
      fields: 'title,authors,year,venue,externalIds,publicationVenue,abstract,citationCount',
    },
    timeout: TIMEOUT,
    headers,
  });

  const papers = r.data?.data || [];
  const result = papers
    .filter(p => p.title)
    .map(p => {
      const doi = p.externalIds?.DOI || '';
      return {
        title:            p.title,
        authors:          (p.authors || []).map(a => a.name).join(', '),
        publication_year: p.year || null,
        journal:          p.venue || p.publicationVenue?.name || '',
        volume: '', issue: '', pages: '',
        doi,
        url:          doi ? `https://doi.org/${doi}` : '',
        publisher:    '',
        abstract:     (p.abstract || '').substring(0, 2000),
        citationCount: p.citationCount || 0,
        source:       'semanticscholar',
        sourceId:     p.paperId || doi || p.title || '',
      };
    });

  setCache(key, result);
  return result;
}

async function searchOpenAlex(title) {
  const key = `openalex:${title.toLowerCase().trim()}`;
  const cached = getCache(key);
  if (cached) return cached;

  const r = await axios.get('https://api.openalex.org/works', {
    params: {
      search:   title,
      per_page: 12,
      mailto:   MAILTO,
    },
    timeout: TIMEOUT,
    headers: { 'User-Agent': `CITAE/1.0 (mailto:${MAILTO})` },
  });

  const results = r.data?.results || [];
  const result = results
    .filter(w => w.display_name)
    .map(w => {
      const rawDoi = w.doi || '';
      const doi    = rawDoi.replace(/^https?:\/\/doi\.org\//i, '');
      const biblio = w.biblio || {};
      const loc    = w.primary_location || {};
      const src    = loc.source || {};
      const pages  = (biblio.first_page && biblio.last_page)
        ? `${biblio.first_page}–${biblio.last_page}`
        : (biblio.first_page || '');

      return {
        title:            w.display_name,
        authors:          (w.authorships || [])
                            .map(a => a.author?.display_name || '')
                            .filter(Boolean)
                            .join(', '),
        publication_year: w.publication_year || null,
        journal:          src.display_name || '',
        volume:           biblio.volume || '',
        issue:            biblio.issue  || '',
        pages,
        doi,
        url:           doi ? `https://doi.org/${doi}` : (w.id || ''),
        publisher:     src.host_organization_name || '',
        abstract:      reconstructAbstract(w.abstract_inverted_index),
        citationCount: w.cited_by_count || 0,
        source:        'openalex',
        sourceId:      w.id || doi || w.display_name || '',
      };
    });

  setCache(key, result);
  return result;
}

async function searchArxiv(title) {
  const key = `arxiv:${title.toLowerCase().trim()}`;
  const cached = getCache(key);
  if (cached) return cached;

  const r = await axios.get('https://export.arxiv.org/api/query', {
    params: {
      search_query: `all:${title}`,
      max_results:  12,
      sortBy:       'relevance',
    },
    timeout: TIMEOUT,
    headers: { 'User-Agent': `CITAE/1.0 (mailto:${MAILTO})` },
    responseType: 'text',
  });

  const $ = cheerio.load(r.data, { xmlMode: true });
  const entries = [];

  $('entry').each((_, el) => {
    const $el = $(el);

    const rawTitle = $el.find('title').first().text().replace(/\s+/g, ' ').trim();
    if (!rawTitle) return;

    const rawSummary = $el.find('summary').first().text().replace(/\s+/g, ' ').trim();
    const pubDate    = $el.find('published').first().text().trim();
    const year       = pubDate ? parseInt(pubDate.substring(0, 4)) : null;
    const absId      = $el.find('id').first().text().trim();

    let doi = '';
    $el.find('arxiv\\:doi').each((_, doiEl) => { doi = $(doiEl).text().trim(); });
    if (!doi) $el.find('doi').each((_, doiEl) => { doi = $(doiEl).text().trim(); });

    let journalRef = '';
    $el.find('arxiv\\:journal_ref').each((_, jEl) => { journalRef = $(jEl).text().trim(); });
    if (!journalRef) $el.find('journal_ref').each((_, jEl) => { journalRef = $(jEl).text().trim(); });

    const authors = [];
    $el.find('author > name').each((_, nameEl) => {
      const name = $(nameEl).text().trim();
      if (name) authors.push(name);
    });

    entries.push({
      title:            rawTitle,
      authors:          authors.join(', '),
      publication_year: year,
      journal:          journalRef || '',
      volume: '', issue: '', pages: '',
      doi,
      url:       doi ? `https://doi.org/${doi}` : absId,
      publisher: 'arXiv',
      abstract:  rawSummary.substring(0, 2000),
      source:    'arxiv',
      sourceId:  absId || doi || rawTitle,
    });
  });

  setCache(key, entries);
  return entries;
}

function shortAuthorId(id) {
  // OpenAlex devuelve IDs como "https://openalex.org/A5023888391" → "A5023888391"
  return String(id || '').replace(/^https?:\/\/openalex\.org\//i, '');
}

async function searchAuthors(name) {
  const key = `authors:${name.toLowerCase().trim()}`;
  const cached = getCache(key);
  if (cached) return cached;

  const r = await axios.get('https://api.openalex.org/authors', {
    params: { search: name, per_page: 10, mailto: MAILTO },
    timeout: TIMEOUT,
    headers: { 'User-Agent': `CITAE/1.0 (mailto:${MAILTO})` },
  });

  const results = (r.data?.results || [])
    .filter(a => a.display_name)
    .map(a => {
      const inst = a.last_known_institutions?.[0] || a.last_known_institution || {};
      return {
        id:               shortAuthorId(a.id),
        name:             a.display_name,
        orcid:            (a.orcid || '').replace(/^https?:\/\/orcid\.org\//i, ''),
        worksCount:       a.works_count || 0,
        citationCount:    a.cited_by_count || 0,
        hIndex:           a.summary_stats?.h_index || 0,
        institution:      inst.display_name || '',
        institutionCountry: inst.country_code || '',
        topics:           (a.topics || a.x_concepts || [])
                            .slice(0, 5)
                            .map(t => t.display_name)
                            .filter(Boolean),
      };
    });

  setCache(key, results);
  return results;
}

async function authorWorks(authorId, { sort = 'cited' } = {}) {
  const id  = shortAuthorId(authorId);
  const key = `authorworks:${id}:${sort}`;
  const cached = getCache(key);
  if (cached) return cached;

  const sortParam = sort === 'recent'
    ? 'publication_date:desc'
    : 'cited_by_count:desc';

  const r = await axios.get('https://api.openalex.org/works', {
    params: {
      filter:   `author.id:${id}`,
      per_page: 25,
      sort:     sortParam,
      mailto:   MAILTO,
    },
    timeout: TIMEOUT,
    headers: { 'User-Agent': `CITAE/1.0 (mailto:${MAILTO})` },
  });

  const results = (r.data?.results || [])
    .filter(w => w.display_name)
    .map(w => {
      const rawDoi = w.doi || '';
      const doi    = rawDoi.replace(/^https?:\/\/doi\.org\//i, '');
      const biblio = w.biblio || {};
      const loc    = w.primary_location || {};
      const src    = loc.source || {};
      const pages  = (biblio.first_page && biblio.last_page)
        ? `${biblio.first_page}–${biblio.last_page}`
        : (biblio.first_page || '');
      return {
        title:            w.display_name,
        authors:          (w.authorships || [])
                            .map(a => a.author?.display_name || '')
                            .filter(Boolean)
                            .join(', '),
        publication_year: w.publication_year || null,
        journal:          src.display_name || '',
        volume:           biblio.volume || '',
        issue:            biblio.issue  || '',
        pages,
        doi,
        url:              doi ? `https://doi.org/${doi}` : (w.id || ''),
        publisher:        src.host_organization_name || '',
        abstract:         reconstructAbstract(w.abstract_inverted_index),
        citationCount:    w.cited_by_count || 0,
        source:           'openalex',
        sourceId:         w.id || doi || w.display_name || '',
      };
    });

  setCache(key, results);
  return results;
}

module.exports = {
  fetchCrossRefByDoi,
  fetchSemanticScholarByDoi,
  searchCrossRefMulti,
  searchSemanticScholarMulti,
  searchOpenAlex,
  searchArxiv,
  searchAuthors,
  authorWorks,
};
