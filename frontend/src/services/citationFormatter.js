// Formatea citas académicas en 7 estilos desde metadatos de candidatos.
// Funciona 100% client-side — no requiere backend ni persistencia en BD.

export const CITATION_FORMATS = ['APA', 'MLA', 'Chicago', 'Harvard', 'IEEE', 'Vancouver', 'BibTeX'];

/** Divide "First Middle Last" → { first: "First Middle", last: "Last" } */
function splitName(fullName) {
  const parts = (fullName || '').trim().split(/\s+/);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: '', last: parts[0] };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

/** "First Last" → "Last, F." (APA/Chicago style) */
function lastCommaInitials(fullName) {
  const { first, last } = splitName(fullName);
  const inits = first.split(/\s+/).map(w => w[0]?.toUpperCase() + '.').filter(Boolean).join(' ');
  return last + (inits ? `, ${inits}` : '');
}

/** "First Last" → "Last, First" (MLA style) */
function lastCommaFirst(fullName) {
  const { first, last } = splitName(fullName);
  return last + (first ? `, ${first}` : '');
}

/** "First Last" → "F. Last" (IEEE style) */
function initialsLast(fullName) {
  const { first, last } = splitName(fullName);
  const inits = first.split(/\s+/).map(w => w[0]?.toUpperCase() + '.').filter(Boolean).join('. ');
  return (inits ? inits + ' ' : '') + last;
}

/** "First Last" → "Last FM" (Vancouver style) */
function lastInitialsCaps(fullName) {
  const { first, last } = splitName(fullName);
  const caps = first.split(/\s+/).map(w => w[0]?.toUpperCase() || '').join('');
  return last + (caps ? ' ' + caps : '');
}

/** Parsea la cadena de autores en array de nombres completos */
function parseAuthors(authorsStr) {
  if (!authorsStr) return [];
  // Puede venir separado por ", " pero apellidos también llevan coma
  // Heurística: split por ", " pero reconocer que "Last, First" es UN autor
  // Usamos split por " and " primero, luego por ";"
  let raw = authorsStr
    .replace(/ and /gi, '|||')
    .replace(/;/g, '|||')
    .split('|||')
    .flatMap(s => {
      // Si el fragmento no tiene coma, puede ser "First Last" o múltiples "First Last"
      // Si tiene exactamente una coma: podría ser "Last, First"
      const commas = (s.match(/,/g) || []).length;
      if (commas <= 1) return [s.trim()];
      // Más de una coma: probablemente "First Last, First Last, First Last"
      return s.split(',').map(a => a.trim()).filter(Boolean);
    });

  return raw.filter(a => a.length > 1);
}

function formatAPA(p) {
  const authors = parseAuthors(p.authors);
  let authorStr;
  if (authors.length === 0) {
    authorStr = 'Autor desconocido';
  } else if (authors.length === 1) {
    authorStr = lastCommaInitials(authors[0]);
  } else if (authors.length <= 20) {
    const mapped = authors.map(a => lastCommaInitials(a));
    const last   = mapped.pop();
    authorStr    = mapped.join(', ') + ', & ' + last;
  } else {
    const first19 = authors.slice(0, 19).map(a => lastCommaInitials(a)).join(', ');
    const last1   = lastCommaInitials(authors[authors.length - 1]);
    authorStr     = first19 + ', … ' + last1;
  }

  const year    = p.publication_year ? `(${p.publication_year})` : '(s.f.)';
  const title   = p.title || 'Sin título';
  const journal = p.journal ? p.journal : '';
  const vol     = p.volume  ? p.volume  : '';
  const issue   = p.issue   ? `(${p.issue})` : '';
  const pages   = p.pages   ? p.pages   : '';
  const doi     = p.doi     ? `https://doi.org/${p.doi}` : '';

  let cit = `${authorStr}. ${year}. ${title}.`;
  if (journal) { cit += ` ${journal},`; }
  if (vol)    { cit += ` ${vol}${issue}`; }
  else if (issue) { cit += ` ${issue}`; }
  if (pages)  { cit += `, ${pages}`; }
  cit += '.';
  if (doi)    { cit += ` ${doi}`; }
  return cit.replace(/,\s*\./g, '.').replace(/\s{2,}/g, ' ').trim();
}

function formatMLA(p) {
  const authors = parseAuthors(p.authors);
  let authorStr = '';
  if (authors.length === 1) {
    authorStr = lastCommaFirst(authors[0]) + '.';
  } else if (authors.length === 2) {
    authorStr = lastCommaFirst(authors[0]) + ', and ' + authors[1] + '.';
  } else if (authors.length > 2) {
    authorStr = lastCommaFirst(authors[0]) + ', et al.';
  }

  const title   = p.title   ? `"${p.title}."` : '"Sin título."';
  const journal = p.journal ? p.journal : '';
  const vol     = p.volume  ? `vol. ${p.volume}` : '';
  const no      = p.issue   ? `no. ${p.issue}` : '';
  const year    = p.publication_year ? `${p.publication_year}` : 's.f.';
  const pages   = p.pages   ? `pp. ${p.pages}` : '';
  const doi     = p.doi     ? `doi:${p.doi}` : '';

  const parts = [
    authorStr,
    title,
    journal,
    [vol, no].filter(Boolean).join(', '),
    year + (pages ? `, ${pages}` : '') + '.',
    doi,
  ].filter(Boolean);
  return parts.join(' ').replace(/\.\s*\./g, '.').trim();
}

function formatChicago(p) {
  const authors = parseAuthors(p.authors);
  let authorStr;
  if (authors.length === 0) {
    authorStr = 'Autor desconocido';
  } else if (authors.length === 1) {
    authorStr = lastCommaFirst(authors[0]);
  } else {
    authorStr = lastCommaFirst(authors[0]) + ', and ' + authors.slice(1).join(', ');
  }

  const year    = p.publication_year ? `${p.publication_year}` : 's.f.';
  const title   = p.title   ? `"${p.title}"` : '"Sin título"';
  const journal = p.journal ? p.journal : '';
  const vol     = p.volume  ? p.volume  : '';
  const no      = p.issue   ? `no. ${p.issue}` : '';
  const pages   = p.pages   ? p.pages : '';
  const doi     = p.doi     ? `https://doi.org/${p.doi}` : '';

  let cit = `${authorStr}. ${year}. ${title}.`;
  if (journal) { cit += ` ${journal}`; }
  if (vol)     { cit += ` ${vol}`; }
  if (no)      { cit += `, ${no}`; }
  if (pages)   { cit += ` (${year}): ${pages}`; }
  cit += '.';
  if (doi)     { cit += ` ${doi}`; }
  return cit.replace(/\.\s*\./g, '.').trim();
}

function formatHarvard(p) {
  const authors = parseAuthors(p.authors);
  let authorStr;
  if (authors.length === 0) {
    authorStr = 'Autor desconocido';
  } else if (authors.length <= 3) {
    authorStr = authors.map(a => lastCommaInitials(a)).join(', ');
  } else {
    authorStr = lastCommaInitials(authors[0]) + ' et al.';
  }

  const year    = p.publication_year ? `(${p.publication_year})` : '(s.f.)';
  const title   = `'${p.title || 'Sin título'}'`;
  const journal = p.journal ? p.journal : '';
  const vol     = p.volume  ? `vol. ${p.volume}` : '';
  const no      = p.issue   ? `no. ${p.issue}` : '';
  const pages   = p.pages   ? `pp. ${p.pages}` : '';
  const doi     = p.doi     ? `doi: ${p.doi}` : '';

  let cit = `${authorStr} ${year} ${title},`;
  if (journal) cit += ` ${journal},`;
  if (vol)     cit += ` ${vol},`;
  if (no)      cit += ` ${no},`;
  if (pages)   cit += ` ${pages}.`;
  else         cit  = cit.replace(/,$/, '.');
  if (doi)     cit += ` ${doi}`;
  return cit.replace(/,\./g, '.').trim();
}

function formatIEEE(p, index = 1) {
  const authors = parseAuthors(p.authors);
  const authorStr = authors.length > 0
    ? authors.map(a => initialsLast(a)).join(', ')
    : 'Unknown Author';

  const title   = p.title   ? `"${p.title}"` : '"Unknown Title"';
  const journal = p.journal ? p.journal : '';
  const vol     = p.volume  ? `vol. ${p.volume}` : '';
  const no      = p.issue   ? `no. ${p.issue}` : '';
  const pages   = p.pages   ? `pp. ${p.pages}` : '';
  const year    = p.publication_year ? String(p.publication_year) : 's.f.';
  const doi     = p.doi     ? `doi: ${p.doi}` : '';

  const parts = [
    `[${index}] ${authorStr},`,
    title + ',',
    journal && journal + ',',
    vol && vol + ',',
    no && no + ',',
    pages && pages + ',',
    year + '.',
    doi,
  ].filter(Boolean);
  return parts.join(' ').replace(/,\s*\./g, '.').trim();
}

function formatVancouver(p, index = 1) {
  const authors = parseAuthors(p.authors);
  const authorStr = authors.length > 0
    ? (authors.length > 6
        ? authors.slice(0, 6).map(a => lastInitialsCaps(a)).join(', ') + ', et al'
        : authors.map(a => lastInitialsCaps(a)).join(', '))
    : '';

  const year    = p.publication_year ? String(p.publication_year) : '';
  const title   = p.title || '';
  const journal = p.journal || '';
  const vol     = p.volume  ? p.volume : '';
  const issue   = p.issue   ? `(${p.issue})` : '';
  const pages   = p.pages   ? `:${p.pages}` : '';
  const doi     = p.doi     ? ` doi: ${p.doi}` : '';

  return `${index}. ${authorStr}. ${title}. ${journal}. ${year};${vol}${issue}${pages}.${doi}`
    .replace(/\s{2,}/g, ' ').replace(/\.\s*\./g, '.').trim();
}

function formatBibTeX(p) {
  const authors = parseAuthors(p.authors);
  const authorBib = authors.join(' and ') || 'Unknown';
  const firstLast = splitName(authors[0] || '').last.toLowerCase().replace(/[^a-z]/g, '') || 'unknown';
  const year      = p.publication_year ? String(p.publication_year) : '0000';
  const key       = `${firstLast}${year}`;

  const lines = [
    `  author    = {${authorBib}}`,
    `  title     = {${(p.title || '').replace(/[{}]/g, '')}}`,
    p.journal   && `  journal   = {${p.journal}}`,
    year !== '0000' && `  year      = {${year}}`,
    p.volume    && `  volume    = {${p.volume}}`,
    p.issue     && `  number    = {${p.issue}}`,
    p.pages     && `  pages     = {${p.pages}}`,
    p.publisher && `  publisher = {${p.publisher}}`,
    p.doi       && `  doi       = {${p.doi}}`,
    p.url && !p.doi && `  url       = {${p.url}}`,
  ].filter(Boolean);

  return `@article{${key},\n${lines.join(',\n')}\n}`;
}

/**
 * Formatea una cita en el estilo indicado.
 * @param {object} candidate  Objeto con title, authors, publication_year, journal, etc.
 * @param {string} format     'APA' | 'MLA' | 'Chicago' | 'Harvard' | 'IEEE' | 'Vancouver' | 'BibTeX'
 * @param {number} index      Número de referencia (para IEEE y Vancouver)
 */
export function formatCitation(candidate, format, index = 1) {
  switch (format) {
    case 'APA':       return formatAPA(candidate);
    case 'MLA':       return formatMLA(candidate);
    case 'Chicago':   return formatChicago(candidate);
    case 'Harvard':   return formatHarvard(candidate);
    case 'IEEE':      return formatIEEE(candidate, index);
    case 'Vancouver': return formatVancouver(candidate, index);
    case 'BibTeX':    return formatBibTeX(candidate);
    default:          return formatAPA(candidate);
  }
}

/**
 * Formatea múltiples candidatos en el mismo estilo.
 * BibTeX usa doble salto de línea entre entradas.
 */
export function formatMultiple(candidates, format) {
  const sep = format === 'BibTeX' ? '\n\n' : '\n\n';
  return candidates
    .map((c, i) => formatCitation(c, format, i + 1))
    .join(sep);
}
