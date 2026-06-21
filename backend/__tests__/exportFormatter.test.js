const { toRIS, toCSV, toMarkdown, EXPORT_FORMATS } = require('../src/services/exportFormatter');

const paper = {
  id: 1,
  title: 'Attention Is All You Need',
  authors: 'Ashish Vaswani, Noam Shazeer',
  publication_year: 2017,
  journal: 'NeurIPS',
  volume: '30',
  issue: '1',
  pages: '5998-6008',
  doi: '10.48550/arXiv.1706.03762',
  url: 'https://arxiv.org/abs/1706.03762',
  publisher: 'Curran Associates',
};

describe('toRIS', () => {
  const ris = toRIS([paper]);
  test('abre con TY y cierra con ER', () => {
    expect(ris).toMatch(/^TY {2}- JOUR/);
    expect(ris).toMatch(/ER {2}- /);
  });
  test('incluye una línea AU por autor', () => {
    const aus = ris.split('\r\n').filter(l => l.startsWith('AU  - '));
    expect(aus).toHaveLength(2);
  });
  test('divide pages en SP y EP', () => {
    expect(ris).toContain('SP  - 5998');
    expect(ris).toContain('EP  - 6008');
  });
});

describe('toCSV', () => {
  test('incluye cabecera y escapa comas dentro de comillas', () => {
    const csv = toCSV([paper]);
    const [header, row] = csv.split('\r\n');
    expect(header.startsWith('title,authors,year')).toBe(true);
    expect(row).toContain('"Ashish Vaswani, Noam Shazeer"');
  });
  test('añade las etiquetas desde tagsMap', () => {
    const csv = toCSV([paper], { 1: [{ name: 'nlp' }, { name: 'transformers' }] });
    expect(csv).toContain('nlp; transformers');
  });
});

describe('toMarkdown', () => {
  test('usa el título como encabezado y enlaza el DOI', () => {
    const md = toMarkdown([paper], {}, 'Mi colección');
    expect(md).toMatch(/^# Mi colección/);
    expect(md).toContain('## Attention Is All You Need');
    expect(md).toContain('https://doi.org/10.48550/arXiv.1706.03762');
  });
});

describe('EXPORT_FORMATS', () => {
  test('expone los 4 formatos con build/ext/mime', () => {
    expect(Object.keys(EXPORT_FORMATS).sort()).toEqual(['bibtex', 'csv', 'markdown', 'ris']);
    for (const fmt of Object.values(EXPORT_FORMATS)) {
      expect(typeof fmt.build).toBe('function');
      expect(fmt.ext).toBeTruthy();
      expect(fmt.mime).toBeTruthy();
    }
  });
});
