class CitationFormatter {
  constructor() {
    this.formats = {
      APA: this.formatAPA.bind(this),
      MLA: this.formatMLA.bind(this),
      Chicago: this.formatChicago.bind(this),
      Harvard: this.formatHarvard.bind(this),
      IEEE: this.formatIEEE.bind(this),
      Vancouver: this.formatVancouver.bind(this),
      BibTeX: this.formatBibTeX.bind(this),
    };
  }

  // Escapa caracteres HTML en metadatos externos para prevenir XSS.
  // Solo los <i></i> que el formateador inserta explícitamente son HTML válido.
  esc(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Divide el string de autores por coma y filtra tokens vacíos (doble espacio, etc.)
  parseAuthors(authorsString) {
    if (!authorsString) return [];
    return authorsString.split(',').map(a => a.trim()).filter(Boolean);
  }

  format(paper, formatType) {
    const formatter = this.formats[formatType];
    if (!formatter) {
      throw new Error(`Format ${formatType} not supported`);
    }
    return formatter(paper);
  }

  // APA Format (7th edition)
  formatAPA(paper) {
    const authors = this.formatAuthorsAPA(paper.authors);
    const year = paper.publication_year || 'n.d.';
    const title = this.esc(paper.title);
    const isArxiv = paper.publisher === 'arXiv' || paper.source === 'arxiv';
    const journal = paper.journal ? `<i>${this.esc(paper.journal)}</i>` : '';
    const volume = paper.volume ? `<i>${this.esc(paper.volume)}</i>` : '';
    const issue = paper.issue ? `(${this.esc(paper.issue)})` : '';
    const pages = this.esc(paper.pages || '');
    const doi = paper.doi ? `https://doi.org/${paper.doi}` : '';

    let citation = `${authors} (${year}). ${title}.`;

    if (journal) {
      citation += ` ${journal}`;
      if (volume) citation += `, ${volume}`;
      if (issue) citation += issue;
      if (pages) citation += `, ${pages}`;
      citation += '.';
    } else if (isArxiv) {
      // Formato APA para preprints arXiv
      citation += ` arXiv.`;
    }

    if (doi) {
      citation += ` ${doi}`;
    } else if (paper.url && !journal && !isArxiv) {
      citation += ` Retrieved from ${paper.url}`;
    } else if (paper.url && isArxiv && !doi) {
      citation += ` ${paper.url}`;
    }

    return citation;
  }

  // MLA Format (9th edition)
  formatMLA(paper) {
    const authors = this.formatAuthorsMLA(paper.authors);
    const title = `&quot;${this.esc(paper.title)}.&quot;`;
    const journal = paper.journal ? `<i>${this.esc(paper.journal)}</i>,` : '';
    const volume = this.esc(paper.volume || '');
    const issue = paper.issue ? `.${this.esc(paper.issue)}` : '';
    const year = paper.publication_year || '';
    const pages = paper.pages ? `, pp. ${this.esc(paper.pages)}` : '';
    const doi = paper.doi ? `, doi:${paper.doi}` : '';

    let citation = `${authors} ${title}`;

    if (journal) {
      citation += ` ${journal}`;
      if (volume) {
        citation += ` vol. ${volume}`;
        if (issue) citation += issue;
      }
      if (year) citation += `, ${year}`;
      if (pages) citation += pages;
      citation += '.';
    }

    if (doi) {
      citation += doi;
    } else if (paper.url && !journal) {
      // MLA 9 — fuente web sin DOI: URL seguida de fecha de acceso
      const accessed = new Date().toLocaleDateString('en-US', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
      citation += ` ${paper.url}. Accessed ${accessed}.`;
    }

    return citation;
  }

  // Chicago Format (17th edition)
  formatChicago(paper) {
    const authors = this.formatAuthorsChicago(paper.authors);
    const title = `&quot;${this.esc(paper.title)}.&quot;`;
    const journal = paper.journal ? `<i>${this.esc(paper.journal)}</i>` : '';
    const volume = this.esc(paper.volume || '');
    const issue = paper.issue ? `, no. ${this.esc(paper.issue)}` : '';
    const year = paper.publication_year ? ` (${paper.publication_year})` : '';
    const pages = paper.pages ? `: ${this.esc(paper.pages)}` : '';
    const doi = paper.doi ? `. https://doi.org/${paper.doi}` : '';

    let citation = `${authors} ${title}`;

    if (journal) {
      citation += ` ${journal} ${volume}${issue}${year}${pages}.`;
    }

    if (doi) {
      citation += doi;
    } else if (paper.url && !journal) {
      const accessed = new Date().toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      });
      citation += ` Accessed ${accessed}. ${paper.url}.`;
    }

    return citation;
  }

  // Harvard Format
  formatHarvard(paper) {
    const authors = this.formatAuthorsHarvard(paper.authors);
    const year = paper.publication_year || 'n.d.';
    const title = `&#39;${this.esc(paper.title)}&#39;`;
    const journal = paper.journal ? `, <i>${this.esc(paper.journal)}</i>` : '';
    const volume = paper.volume ? `, vol. ${this.esc(paper.volume)}` : '';
    const issue = paper.issue ? `, no. ${this.esc(paper.issue)}` : '';
    const pages = paper.pages ? `, pp. ${this.esc(paper.pages)}` : '';
    const doi = paper.doi ? `, DOI: ${paper.doi}` : '';

    let citation = `${authors} ${year}, ${title}${journal}${volume}${issue}${pages}`;

    if (doi) {
      citation += doi;
    } else if (paper.url) {
      citation += `, viewed ${new Date().toLocaleDateString('en-GB')}, &lt;${paper.url}&gt;`;
    }

    citation += '.';
    return citation;
  }

  // IEEE Format
  formatIEEE(paper) {
    const authors = this.formatAuthorsIEEE(paper.authors);
    const title = `&quot;${this.esc(paper.title)},&quot;`;
    const journal = paper.journal ? ` <i>${this.esc(paper.journal)}</i>,` : '';
    const volume = paper.volume ? ` vol. ${this.esc(paper.volume)},` : '';
    const issue = paper.issue ? ` no. ${this.esc(paper.issue)},` : '';
    const pages = paper.pages ? ` pp. ${this.esc(paper.pages)},` : '';
    const year = paper.publication_year ? ` ${paper.publication_year}.` : '';
    const doi = paper.doi ? ` doi: ${paper.doi}.` : '';

    let citation = `${authors} ${title}${journal}${volume}${issue}${pages}${year}`;

    if (doi) {
      citation += doi;
    } else if (paper.url && !journal) {
      citation += ` [Online]. Available: ${paper.url}`;
    }

    return citation;
  }

  // Vancouver Format
  formatVancouver(paper) {
    const authors = this.formatAuthorsVancouver(paper.authors);
    const title = this.esc(paper.title);
    const journal = paper.journal ? ` ${this.esc(paper.journal)}.` : '';
    const year = paper.publication_year || '';
    const volume = this.esc(paper.volume || '');
    const issue = paper.issue ? `(${this.esc(paper.issue)})` : '';
    const pages = paper.pages ? `:${this.esc(paper.pages)}` : '';
    const doi = paper.doi ? ` doi: ${paper.doi}.` : '';

    let citation = `${authors} ${title}.${journal}`;

    if (year) {
      citation += ` ${year}`;
      if (volume) citation += `;${volume}`;
      if (issue) citation += issue;
      if (pages) citation += pages;
      citation += '.';
    }

    if (doi) {
      citation += doi;
    } else if (paper.url && !journal) {
      citation += ` Available from: ${paper.url}`;
    }

    return citation;
  }

  // BibTeX Format — BibTeX usa llaves, no HTML; solo sanitizamos {} y \ del texto
  formatBibTeX(paper) {
    const bibEsc = s => (s || '').replace(/\\/g, '\\\\').replace(/[{}]/g, '');
    const firstAuthor = this.parseAuthors(paper.authors)[0] || 'unknown';
    const lastName = firstAuthor.split(' ').pop().toLowerCase().replace(/[^a-z]/g, '') || 'unknown';
    const year = paper.publication_year || 'n.d.';
    const firstWord = (paper.title || 'untitled').split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
    const key = `${lastName}${year}${firstWord}`;

    const authorsBib = this.formatAuthorsBibTeX(paper.authors);

    const fields = [
      `  author    = {${authorsBib}}`,
      `  title     = {${bibEsc(paper.title || '')}}`,
      paper.journal   ? `  journal   = {${bibEsc(paper.journal)}}`   : null,
      year !== 'n.d.' ? `  year      = {${year}}`                    : null,
      paper.volume    ? `  volume    = {${bibEsc(paper.volume)}}`    : null,
      paper.issue     ? `  number    = {${bibEsc(paper.issue)}}`     : null,
      paper.pages     ? `  pages     = {${bibEsc(paper.pages).replace(/-/g, '--')}}` : null,
      paper.doi       ? `  doi       = {${paper.doi}}`               : null,
      !paper.doi && paper.url ? `  url = {${paper.url}}`             : null,
      paper.publisher ? `  publisher = {${bibEsc(paper.publisher)}}` : null,
    ].filter(Boolean).join(',\n');

    return `@article{${key},\n${fields}\n}`;
  }

  formatAuthorsBibTeX(authorsString) {
    const authors = this.parseAuthors(authorsString);
    if (!authors.length) return 'Unknown Author';
    return authors.join(' and ');
  }

  formatAuthorsAPA(authorsString) {
    const authors = this.parseAuthors(authorsString);
    if (!authors.length) return 'Unknown Author';

    if (authors.length === 1) {
      return this.formatSingleAuthorAPA(authors[0]);
    } else if (authors.length === 2) {
      return `${this.formatSingleAuthorAPA(authors[0])}, &amp; ${this.formatSingleAuthorAPA(authors[1])}`;
    } else if (authors.length <= 20) {
      const formatted = authors.slice(0, -1).map(a => this.formatSingleAuthorAPA(a)).join(', ');
      return `${formatted}, &amp; ${this.formatSingleAuthorAPA(authors[authors.length - 1])}`;
    } else {
      const formatted = authors.slice(0, 19).map(a => this.formatSingleAuthorAPA(a)).join(', ');
      return `${formatted}, ... ${this.formatSingleAuthorAPA(authors[authors.length - 1])}`;
    }
  }

  formatSingleAuthorAPA(author) {
    const parts = author.split(' ').filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return this.esc(parts[0]);
    const lastName = this.esc(parts[parts.length - 1]);
    const initials = parts.slice(0, -1).map(n => n[0].toUpperCase() + '.').join(' ');
    return `${lastName}, ${initials}`;
  }

  formatAuthorsMLA(authorsString) {
    const authors = this.parseAuthors(authorsString);
    if (!authors.length) return 'Unknown Author.';

    if (authors.length === 1) {
      return this.formatSingleAuthorMLA(authors[0]) + '.';
    } else if (authors.length === 2) {
      return `${this.formatSingleAuthorMLA(authors[0])}, and ${this.esc(authors[1])}.`;
    } else if (authors.length === 3) {
      return `${this.formatSingleAuthorMLA(authors[0])}, ${this.esc(authors[1])}, and ${this.esc(authors[2])}.`;
    } else {
      return `${this.formatSingleAuthorMLA(authors[0])}, et al.`;
    }
  }

  formatSingleAuthorMLA(author) {
    const parts = author.split(' ').filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return this.esc(parts[0]);
    const lastName = this.esc(parts[parts.length - 1]);
    const firstName = this.esc(parts.slice(0, -1).join(' '));
    return `${lastName}, ${firstName}`;
  }

  formatAuthorsChicago(authorsString) {
    const authors = this.parseAuthors(authorsString);
    if (!authors.length) return 'Unknown Author.';

    if (authors.length === 1) {
      return this.formatSingleAuthorChicago(authors[0]) + '.';
    } else if (authors.length <= 3) {
      const formatted = authors.slice(0, -1).map((a, i) =>
        i === 0 ? this.formatSingleAuthorChicago(a) : this.esc(a)
      ).join(', ');
      return `${formatted}, and ${this.esc(authors[authors.length - 1])}.`;
    } else {
      return `${this.formatSingleAuthorChicago(authors[0])}, et al.`;
    }
  }

  formatSingleAuthorChicago(author) {
    const parts = author.split(' ').filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return this.esc(parts[0]);
    const lastName = this.esc(parts[parts.length - 1]);
    const firstName = this.esc(parts.slice(0, -1).join(' '));
    return `${lastName}, ${firstName}`;
  }

  formatAuthorsHarvard(authorsString) {
    const authors = this.parseAuthors(authorsString);
    if (!authors.length) return 'Unknown Author';

    if (authors.length === 1) {
      return this.esc(authors[0]);
    } else if (authors.length === 2) {
      return `${this.esc(authors[0])} &amp; ${this.esc(authors[1])}`;
    } else if (authors.length === 3) {
      return `${this.esc(authors[0])}, ${this.esc(authors[1])} &amp; ${this.esc(authors[2])}`;
    } else {
      return `${this.esc(authors[0])} et al.`;
    }
  }

  formatAuthorsIEEE(authorsString) {
    const authors = this.parseAuthors(authorsString);
    if (!authors.length) return 'Unknown Author,';

    if (authors.length === 1) {
      return this.formatSingleAuthorIEEE(authors[0]) + ',';
    } else if (authors.length <= 3) {
      const formatted = authors.map(a => this.formatSingleAuthorIEEE(a));
      return formatted.slice(0, -1).join(', ') + ', and ' + formatted[formatted.length - 1] + ',';
    } else {
      return this.formatSingleAuthorIEEE(authors[0]) + ' et al.,';
    }
  }

  formatSingleAuthorIEEE(author) {
    const parts = author.split(' ').filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return this.esc(parts[0]);
    const lastName = this.esc(parts[parts.length - 1]);
    const initials = parts.slice(0, -1).map(n => n[0].toUpperCase() + '.').join(' ');
    return `${initials} ${lastName}`;
  }

  formatAuthorsVancouver(authorsString) {
    const authors = this.parseAuthors(authorsString);
    if (!authors.length) return 'Unknown Author.';

    if (authors.length <= 6) {
      return authors.map(a => this.formatSingleAuthorVancouver(a)).join(', ') + '.';
    } else {
      return authors.slice(0, 6).map(a => this.formatSingleAuthorVancouver(a)).join(', ') + ', et al.';
    }
  }

  formatSingleAuthorVancouver(author) {
    const parts = author.split(' ').filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return this.esc(parts[0]);
    const lastName = this.esc(parts[parts.length - 1]);
    const initials = parts.slice(0, -1).map(n => n[0].toUpperCase()).join('');
    return `${lastName} ${initials}`;
  }
}

module.exports = new CitationFormatter();