const { parseNaturalFilters, applyFilters, hasFilters } = require('../src/services/queryFilters');

describe('parseNaturalFilters', () => {
  test('extrae rango "entre X y Y"', () => {
    const { filters } = parseNaturalFilters('machine learning entre 2018 y 2022');
    expect(filters.yearFrom).toBe(2018);
    expect(filters.yearTo).toBe(2022);
  });

  test('normaliza el rango aunque venga invertido', () => {
    const { filters } = parseNaturalFilters('algo entre 2022 y 2018');
    expect(filters.yearFrom).toBe(2018);
    expect(filters.yearTo).toBe(2022);
  });

  test('extrae "desde N"', () => {
    const { filters } = parseNaturalFilters('redes neuronales desde 2020');
    expect(filters.yearFrom).toBe(2020);
    expect(filters.yearTo).toBeUndefined();
  });

  test('extrae "antes de N"', () => {
    const { filters } = parseNaturalFilters('estudios antes de 2015');
    expect(filters.yearTo).toBe(2015);
  });

  test('extrae umbral de citas "más de N citas"', () => {
    const { filters } = parseNaturalFilters('deep learning más de 100 citas');
    expect(filters.minCitations).toBe(100);
  });

  test('extrae umbral con formato "N+ citas"', () => {
    const { filters } = parseNaturalFilters('transformers 250+ citas');
    expect(filters.minCitations).toBe(250);
  });

  test('detecta tipo preprint', () => {
    const { filters } = parseNaturalFilters('atención preprint');
    expect(filters.type).toBe('preprint');
  });

  test('detecta tipo article (peer-reviewed)', () => {
    const { filters } = parseNaturalFilters('genética peer-reviewed');
    expect(filters.type).toBe('article');
  });

  test('devuelve la consulta limpia sin los tokens de filtro ni conectores colgantes', () => {
    const { cleanQuery } = parseNaturalFilters('artículos sobre redes neuronales con más de 50 citas');
    expect(cleanQuery).not.toMatch(/citas|sobre|artículos/i);
    expect(cleanQuery).not.toMatch(/\bcon\s*$/i);
    expect(cleanQuery).toContain('redes neuronales');
  });

  test('sin filtros devuelve la consulta original', () => {
    const { cleanQuery, filters } = parseNaturalFilters('attention is all you need');
    expect(cleanQuery).toBe('attention is all you need');
    expect(Object.keys(filters)).toHaveLength(0);
  });

  test('entrada vacía no rompe', () => {
    const r = parseNaturalFilters('');
    expect(r.cleanQuery).toBe('');
    expect(r.filters).toEqual({});
  });
});

describe('applyFilters', () => {
  const candidates = [
    { title: 'A', publication_year: 2010, citationCount: 500, source: 'crossref' },
    { title: 'B', publication_year: 2021, citationCount: 10,  source: 'arxiv' },
    { title: 'C', publication_year: 2023, citationCount: 0,   source: 'openalex' },
    { title: 'D', citationCount: 999, source: 'crossref' },
  ];

  test('sin filtros devuelve todos', () => {
    expect(applyFilters(candidates, {})).toHaveLength(4);
  });

  test('filtra por yearFrom y descarta los sin año', () => {
    const r = applyFilters(candidates, { yearFrom: 2020 });
    expect(r.map(c => c.title)).toEqual(['B', 'C']);
  });

  test('filtra por minCitations', () => {
    const r = applyFilters(candidates, { minCitations: 100 });
    expect(r.map(c => c.title)).toEqual(['A', 'D']);
  });

  test('type preprint solo deja arxiv', () => {
    const r = applyFilters(candidates, { type: 'preprint' });
    expect(r.map(c => c.title)).toEqual(['B']);
  });

  test('type article excluye arxiv', () => {
    const r = applyFilters(candidates, { type: 'article' });
    expect(r.map(c => c.title)).toEqual(['A', 'C', 'D']);
  });
});

describe('hasFilters', () => {
  test('false para vacío o nulo', () => {
    expect(hasFilters({})).toBe(false);
    expect(hasFilters(null)).toBe(false);
  });
  test('true cuando hay algún valor', () => {
    expect(hasFilters({ yearFrom: 2020 })).toBe(true);
  });
});
