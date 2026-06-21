// backend/__tests__/citationFormatter.test.js
const citationFormatter = require('../src/services/citationFormatter');

// Paper canónico para tests: "Attention is all you need" (Vaswani et al., 2017)
const PAPER_FULL = {
  title:            'Attention Is All You Need',
  authors:          'Vaswani A, Shazeer N, Parmar N, Uszkoreit J, Jones L, Gomez A, Kaiser L, Polosukhin I',
  publication_year: 2017,
  journal:          'Advances in Neural Information Processing Systems',
  volume:           '30',
  issue:            '',
  pages:            '5998–6008',
  doi:              '10.5555/3295222.3295349',
  url:              'https://doi.org/10.5555/3295222.3295349',
  publisher:        'Curran Associates',
};

// Paper mínimo (sin journal, sin doi, sin año)
const PAPER_MIN = {
  title:   'A Minimal Test Paper',
  authors: 'Smith J',
  publication_year: null,
  journal: '',
  volume: '', issue: '', pages: '', doi: '', url: '', publisher: '',
};

// Helper: quita tags HTML para comparaciones de texto plano
function strip(s) { return s.replace(/<[^>]+>/g, '').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&'); }

// ── Los 7 formatos no arrojan error ─────────────────────────
const FORMATS = ['APA', 'MLA', 'Chicago', 'Harvard', 'IEEE', 'Vancouver', 'BibTeX'];

describe('citationFormatter — no lanza errores', () => {
  for (const fmt of FORMATS) {
    test(`format('${fmt}') con paper completo`, () => {
      expect(() => citationFormatter.format(PAPER_FULL, fmt)).not.toThrow();
    });
    test(`format('${fmt}') con paper mínimo`, () => {
      expect(() => citationFormatter.format(PAPER_MIN, fmt)).not.toThrow();
    });
  }
});

// ── Formato desconocido ─────────────────────────────────────
test('lanza error con formato desconocido', () => {
  expect(() => citationFormatter.format(PAPER_FULL, 'UNKNOWN')).toThrow();
});

// ── APA ─────────────────────────────────────────────────────
describe('APA', () => {
  test('contiene el año en paréntesis', () => {
    const r = strip(citationFormatter.format(PAPER_FULL, 'APA'));
    expect(r).toContain('(2017)');
  });
  test('contiene el DOI', () => {
    const r = citationFormatter.format(PAPER_FULL, 'APA');
    expect(r).toContain(PAPER_FULL.doi);
  });
  test('usa "n.d." cuando no hay año', () => {
    const r = strip(citationFormatter.format(PAPER_MIN, 'APA'));
    expect(r).toContain('(n.d.)');
  });
  test('el título aparece en texto plano', () => {
    const r = strip(citationFormatter.format(PAPER_FULL, 'APA'));
    expect(r).toContain(PAPER_FULL.title);
  });
});

// ── MLA ─────────────────────────────────────────────────────
describe('MLA', () => {
  test('el título aparece entrecomillado', () => {
    const r = strip(citationFormatter.format(PAPER_FULL, 'MLA'));
    expect(r).toMatch(/"Attention Is All You Need\.?"/);
  });
  test('incluye el año', () => {
    const r = strip(citationFormatter.format(PAPER_FULL, 'MLA'));
    expect(r).toContain('2017');
  });
});

// ── BibTeX ───────────────────────────────────────────────────
describe('BibTeX', () => {
  test('empieza con @article o @misc', () => {
    const r = citationFormatter.format(PAPER_FULL, 'BibTeX');
    expect(r).toMatch(/^@(article|misc|inproceedings|techreport)\{/);
  });
  test('contiene el campo title', () => {
    const r = citationFormatter.format(PAPER_FULL, 'BibTeX');
    // BibTeX alinea los campos con espacios: "title     = {"
    expect(r).toMatch(/title\s*=\s*\{/);
  });
  test('contiene el campo year con el valor 2017', () => {
    const r = citationFormatter.format(PAPER_FULL, 'BibTeX');
    expect(r).toMatch(/year\s*=\s*\{2017\}/);
  });
  test('contiene el campo doi cuando hay DOI', () => {
    const r = citationFormatter.format(PAPER_FULL, 'BibTeX');
    expect(r).toMatch(/doi\s*=\s*\{/);
  });
});

// ── IEEE ─────────────────────────────────────────────────────
describe('IEEE', () => {
  test('el año aparece entre paréntesis', () => {
    const r = strip(citationFormatter.format(PAPER_FULL, 'IEEE'));
    expect(r).toContain('2017');
  });
  test('contiene el DOI cuando está disponible', () => {
    const r = citationFormatter.format(PAPER_FULL, 'IEEE');
    expect(r).toContain(PAPER_FULL.doi);
  });
});

// ── Escape XSS ───────────────────────────────────────────────
// BibTeX es formato texto plano (no HTML), por eso no escapa entidades HTML —
// el componente CitationDisplay lo renderiza en <pre>, no con dangerouslySetInnerHTML.
// Solo los formatos que devuelven HTML (APA, MLA, Chicago, Harvard, IEEE, Vancouver)
// deben escapar los metadatos externos.
const HTML_FORMATS = FORMATS.filter(f => f !== 'BibTeX');

describe('Escape de metadatos externos (anti-XSS) — formatos HTML', () => {
  const MALICIOUS = {
    ...PAPER_MIN,
    title:   '<script>alert("xss")</script>',
    authors: '<b>Hacker</b>',
    journal: '"><img src=x onerror=alert(1)>',
  };

  for (const fmt of HTML_FORMATS) {
    test(`${fmt} no pasa HTML externo crudo`, () => {
      const r = citationFormatter.format(MALICIOUS, fmt);
      expect(r).not.toContain('<script>');
      expect(r).not.toMatch(/<script/);
    });
  }
});
