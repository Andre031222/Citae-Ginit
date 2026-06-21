const citationFormatter = require('./citationFormatter');

function htmlToPlain(s) {
  return String(s || '')
    .replace(/<i>(.*?)<\/i>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function splitAuthors(authors) {
  return String(authors || '').split(',').map(a => a.trim()).filter(Boolean);
}

function toBibTeX(papers) {
  return papers.map(p => citationFormatter.format(p, 'BibTeX')).join('\n\n') + '\n';
}

function toRIS(papers) {
  const records = papers.map(p => {
    const lines = ['TY  - JOUR'];
    for (const author of splitAuthors(p.authors)) lines.push(`AU  - ${author}`);
    lines.push(`TI  - ${p.title || ''}`);
    if (p.journal)          lines.push(`JO  - ${p.journal}`);
    if (p.publication_year) lines.push(`PY  - ${p.publication_year}`);
    if (p.volume)           lines.push(`VL  - ${p.volume}`);
    if (p.issue)            lines.push(`IS  - ${p.issue}`);
    if (p.pages) {
      const [start, end] = String(p.pages).split(/[-–]/).map(s => s.trim());
      if (start) lines.push(`SP  - ${start}`);
      if (end)   lines.push(`EP  - ${end}`);
    }
    if (p.publisher) lines.push(`PB  - ${p.publisher}`);
    if (p.doi)       lines.push(`DO  - ${p.doi}`);
    if (p.url)       lines.push(`UR  - ${p.url}`);
    if (p.abstract)  lines.push(`AB  - ${String(p.abstract).replace(/\s+/g, ' ').trim()}`);
    lines.push('ER  - ');
    return lines.join('\r\n');
  });
  return records.join('\r\n\r\n') + '\r\n';
}

function csvCell(value) {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCSV(papers, tagsMap = {}) {
  const header = ['title', 'authors', 'year', 'journal', 'volume', 'issue', 'pages', 'doi', 'url', 'publisher', 'tags'];
  const rows = papers.map(p => [
    p.title, p.authors, p.publication_year, p.journal, p.volume, p.issue,
    p.pages, p.doi, p.url, p.publisher,
    (tagsMap[p.id] || []).map(t => t.name).join('; '),
  ].map(csvCell).join(','));
  return [header.join(','), ...rows].join('\r\n') + '\r\n';
}

function toMarkdown(papers, tagsMap = {}, title = 'Biblioteca') {
  const lines = [`# ${title}`, ''];
  for (const p of papers) {
    lines.push(`## ${p.title || 'Sin título'}`);
    const meta = [p.authors, p.publication_year, p.journal].filter(Boolean).join(' · ');
    if (meta) lines.push(`*${meta}*`);
    const tags = (tagsMap[p.id] || []).map(t => `\`#${t.name}\``).join(' ');
    if (tags) lines.push(tags);
    if (p.doi)       lines.push(`DOI: [${p.doi}](https://doi.org/${p.doi})`);
    else if (p.url)  lines.push(`URL: ${p.url}`);
    lines.push('', `> ${htmlToPlain(citationFormatter.format(p, 'APA'))}`, '');
  }
  return lines.join('\n');
}

const EXPORT_FORMATS = {
  bibtex:   { build: toBibTeX,   ext: 'bib', mime: 'application/x-bibtex' },
  ris:      { build: toRIS,      ext: 'ris', mime: 'application/x-research-info-systems' },
  csv:      { build: toCSV,      ext: 'csv', mime: 'text/csv' },
  markdown: { build: toMarkdown, ext: 'md',  mime: 'text/markdown' },
};

module.exports = { EXPORT_FORMATS, toBibTeX, toRIS, toCSV, toMarkdown };
