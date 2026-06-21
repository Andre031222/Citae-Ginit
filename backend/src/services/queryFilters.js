// Parser de filtros en lenguaje natural (ES + EN): extrae rango de años,
// umbral de citas y tipo, y devuelve la consulta limpia + los filtros.
// Sin LLM: heurísticas con regex, deterministas y rápidas.

const Y = '(19|20)\\d{2}';

/**
 * @param {string} rawInput
 * @returns {{ cleanQuery: string, filters: { yearFrom?: number, yearTo?: number, minCitations?: number, type?: 'preprint'|'article' } }}
 */
function parseNaturalFilters(rawInput) {
  let s = ` ${(rawInput || '').trim()} `;
  const filters = {};
  const currentYear = new Date().getFullYear();

  const strip = (re) => { s = s.replace(re, ' '); };

  // Rango: "entre 2018 y 2022" / "between 2018 and 2022" / "de 2018 a 2022"
  let m = s.match(new RegExp(`\\b(?:entre|between|de|from)\\s+(${Y})\\s+(?:y|and|a|to|hasta|-)\\s+(${Y})\\b`, 'i'));
  if (m) {
    const a = parseInt(m[1]), b = parseInt(m[3]);
    filters.yearFrom = Math.min(a, b);
    filters.yearTo   = Math.max(a, b);
    strip(new RegExp(m[0], 'i'));
  }

  // "últimos N años" / "last N years"
  if (filters.yearFrom == null) {
    m = s.match(/\b(?:[uú]ltimos?|last|past)\s+(\d{1,2})\s+(?:a[ñn]os|years)\b/i);
    if (m) {
      filters.yearFrom = currentYear - parseInt(m[1]) + 1;
      strip(new RegExp(m[0], 'i'));
    }
  }
  // "último año" / "este año" / "this year"
  if (filters.yearFrom == null && /\b(?:[uú]ltimo\s+a[ñn]o|este\s+a[ñn]o|this\s+year)\b/i.test(s)) {
    filters.yearFrom = currentYear;
    strip(/\b(?:[uú]ltimo\s+a[ñn]o|este\s+a[ñn]o|this\s+year)\b/i);
  }

  // Desde / después de / a partir de / since / after
  if (filters.yearFrom == null) {
    m = s.match(new RegExp(`\\b(?:desde|despu[eé]s\\s+de|a\\s+partir\\s+de|since|after|posteriores?\\s+a)\\s+(${Y})\\b`, 'i'));
    if (m) {
      filters.yearFrom = parseInt(m[1]);
      strip(new RegExp(m[0], 'i'));
    }
  }

  // Antes de / hasta / before / until
  if (filters.yearTo == null) {
    m = s.match(new RegExp(`\\b(?:antes\\s+de|hasta|before|until|anteriores?\\s+a)\\s+(${Y})\\b`, 'i'));
    if (m) {
      filters.yearTo = parseInt(m[1]);
      strip(new RegExp(m[0], 'i'));
    }
  }

  // Citas: "más de N citas" / "al menos N citas" / "N+ citas" / "more than N citations"
  m = s.match(/\b(?:m[aá]s\s+de|al\s+menos|m[ií]nimo|more\s+than|at\s+least|over)\s+(\d{1,6})\s*(?:\+)?\s*(?:citas?|citations?|cited)\b/i);
  if (!m) m = s.match(/\b(\d{1,6})\s*\+\s*(?:citas?|citations?)\b/i);
  if (m) {
    filters.minCitations = parseInt(m[1]);
    strip(new RegExp(m[0], 'i'));
  }

  // Tipo: preprint / artículo revisado
  if (/\b(?:preprints?|pre-?prints?|arxiv)\b/i.test(s)) {
    filters.type = 'preprint';
    strip(/\b(?:preprints?|pre-?prints?)\b/i);
  } else if (/\b(?:revisad[oa]s?\s+por\s+pares|peer[-\s]?reviewed|art[ií]culos?\s+publicad[oa]s?|published\s+articles?)\b/i.test(s)) {
    filters.type = 'article';
    strip(/\b(?:revisad[oa]s?\s+por\s+pares|peer[-\s]?reviewed|published\s+articles?)\b/i);
  }

  // Limpieza de conectores sueltos que pudieran quedar
  const cleanQuery = s
    .replace(/\b(?:art[ií]culos?|papers?|estudios?|investigaci[oó]n(?:es)?|sobre|acerca\s+de|publicad[oa]s?)\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    // conectores colgantes al final (con/de/with/and/y/that…) que quedan tras el strip
    .replace(/\s+(?:con|de|del|with|and|y|que|sobre|about)\s*$/i, '')
    .trim();

  return { cleanQuery: cleanQuery || (rawInput || '').trim(), filters };
}

/**
 * Aplica filtros a una lista de candidatos ya rankeada.
 * No descarta si el dato no existe (ej. sin año) salvo que el filtro lo exija claramente.
 */
function applyFilters(candidates, filters = {}) {
  if (!filters || Object.keys(filters).length === 0) return candidates;
  return candidates.filter(c => {
    const year  = c.publication_year || null;
    const cites = c.citationCount || 0;

    if (filters.yearFrom != null) { if (!year || year < filters.yearFrom) return false; }
    if (filters.yearTo   != null) { if (!year || year > filters.yearTo)   return false; }
    if (filters.minCitations != null && cites < filters.minCitations) return false;
    if (filters.type === 'preprint' && c.source !== 'arxiv') return false;
    if (filters.type === 'article'  && c.source === 'arxiv') return false;

    return true;
  });
}

function hasFilters(filters) {
  return !!filters && Object.values(filters).some(v => v != null);
}

module.exports = { parseNaturalFilters, applyFilters, hasFilters };
