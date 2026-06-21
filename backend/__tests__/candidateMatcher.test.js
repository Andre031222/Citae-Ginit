// backend/__tests__/candidateMatcher.test.js
const {
  normalizeString,
  dedupeAndMerge,
  parseQuery,
  scoreCandidate,
  classify,
} = require('../src/services/candidateMatcher');

// ── normalizeString ──────────────────────────────────────────
describe('normalizeString', () => {
  test('quita acentos y pasa a minúsculas', () => {
    expect(normalizeString('Análisis de Datos')).toBe('analisis de datos');
  });
  test('elimina caracteres no alfanuméricos', () => {
    expect(normalizeString('Hello, World!')).toBe('hello world');
  });
  test('maneja string vacío y null', () => {
    expect(normalizeString('')).toBe('');
    expect(normalizeString(null)).toBe('');
  });
});

// ── parseQuery ───────────────────────────────────────────────
describe('parseQuery', () => {
  test('extrae el año correctamente', () => {
    const r = parseQuery('Attention is all you need 2017');
    expect(r.year).toBe(2017);
  });
  test('devuelve null si no hay año', () => {
    const r = parseQuery('Deep learning survey');
    expect(r.year).toBeNull();
  });
});

// ── dedupeAndMerge ───────────────────────────────────────────
describe('dedupeAndMerge', () => {
  test('fusiona candidatos con el mismo DOI', () => {
    const a = { title: 'Paper A', doi: '10.1000/xyz', source: 'crossref', citationCount: 100 };
    const b = { title: 'Paper A', doi: '10.1000/xyz', source: 'semanticscholar', citationCount: 80, abstract: 'Un resumen.' };
    const result = dedupeAndMerge([a, b]);
    expect(result).toHaveLength(1);
    expect(result[0].sources).toContain('crossref');
    expect(result[0].sources).toContain('semanticscholar');
    expect(result[0].citationCount).toBe(100); // max
    expect(result[0].abstract).toBe('Un resumen.');
  });
  test('no fusiona candidatos con DOI vacío', () => {
    const a = { title: 'Paper Alpha', doi: '', source: 'arxiv', citationCount: 0 };
    const b = { title: 'Paper Beta', doi: '', source: 'arxiv', citationCount: 0 };
    const result = dedupeAndMerge([a, b]);
    expect(result).toHaveLength(2);
  });
  test('ignora candidatos sin título', () => {
    const result = dedupeAndMerge([{ doi: '10.1/x', source: 'crossref' }]);
    expect(result).toHaveLength(0);
  });
});

// ── scoreCandidate ───────────────────────────────────────────
describe('scoreCandidate', () => {
  const qParsed = parseQuery('Attention is all you need');

  test('match exacto de título produce score alto (≥ 85)', () => {
    const cand = {
      title: 'Attention is all you need',
      doi: '10.1234/abc',
      sources: ['crossref', 'semanticscholar', 'openalex'],
      citationCount: 15000,
      publication_year: null,
      authors: 'Vaswani A, Shazeer N',
    };
    const { score } = scoreCandidate(qParsed, cand);
    expect(score).toBeGreaterThanOrEqual(85);
  });

  test('título completamente diferente produce score bajo (< 40)', () => {
    const cand = {
      title: 'Quantum mechanics and photon entanglement',
      doi: '',
      sources: ['crossref'],
      citationCount: 0,
      publication_year: null,
      authors: '',
    };
    const { score } = scoreCandidate(qParsed, cand);
    expect(score).toBeLessThan(40);
  });

  test('año incorrecto penaliza el score', () => {
    const qWithYear = parseQuery('Attention is all you need 2017');
    const candCorrect  = { title: 'Attention is all you need', doi: '10.1/x', sources: ['crossref'], citationCount: 0, publication_year: 2017, authors: '' };
    const candWrong    = { title: 'Attention is all you need', doi: '10.1/x', sources: ['crossref'], citationCount: 0, publication_year: 2015, authors: '' };
    const { score: sOk }  = scoreCandidate(qWithYear, candCorrect);
    const { score: sBad } = scoreCandidate(qWithYear, candWrong);
    expect(sOk).toBeGreaterThan(sBad);
  });

  test('corroboración multi-fuente aumenta el score', () => {
    // Usamos un título con match parcial para que el score base no sature a 100
    const qPartial = parseQuery('neural attention mechanisms');
    const base = { title: 'Attention is all you need', doi: '', citationCount: 0, publication_year: null, authors: '' };
    const oneSource   = { ...base, sources: ['crossref'] };
    const fourSources = { ...base, sources: ['crossref', 'semanticscholar', 'openalex', 'arxiv'] };
    const { score: s1 } = scoreCandidate(qPartial, oneSource);
    const { score: s4 } = scoreCandidate(qPartial, fourSources);
    // Con 4 fuentes el boost es +22 vs 0; con score base bajo el score final es diferente
    expect(s4).toBeGreaterThan(s1);
  });

  test('author boost cuando el autor está en la query', () => {
    // Query con token "vaswani" que no está en el título → debería detectarse como autor
    const qAuthor = parseQuery('neural information systems vaswani');
    const candWithAuthor    = { title: 'Attention is all you need', doi: '', sources: ['crossref'], citationCount: 0, publication_year: null, authors: 'Vaswani A, Shazeer N' };
    const candWithoutAuthor = { title: 'Attention is all you need', doi: '', sources: ['crossref'], citationCount: 0, publication_year: null, authors: 'Smith J' };
    const { breakdown: bAuth }  = scoreCandidate(qAuthor, candWithAuthor);
    const { breakdown: bNoAuth } = scoreCandidate(qAuthor, candWithoutAuthor);
    // El breakdown debe mostrar authorBoost > 0 cuando el autor está en la query
    expect(bAuth.authorBoost).toBeGreaterThan(0);
    expect(bNoAuth.authorBoost).toBe(0);
  });
});

// ── classify ─────────────────────────────────────────────────
describe('classify', () => {
  test('devuelve refine con array vacío', () => {
    const r = classify([]);
    expect(r.action).toBe('refine');
  });

  test('devuelve compare cuando hay candidatos válidos con forceCompare', () => {
    const candidates = [
      { title: 'Attention is all you need', doi: '10.1/x', sources: ['crossref'], score: 88, citationCount: 10000, publication_year: 2017, authors: '' },
      { title: 'Attention mechanisms survey', doi: '10.1/y', sources: ['crossref'], score: 55, citationCount: 100, publication_year: 2018, authors: '' },
    ];
    const r = classify(candidates, true);
    expect(r.action).toBe('compare');
    expect(r.candidates.length).toBeGreaterThanOrEqual(1);
  });

  test('devuelve refine cuando los scores son demasiado bajos', () => {
    const candidates = [
      { title: 'Unrelated paper', doi: '', sources: ['crossref'], score: 15, citationCount: 0, publication_year: null, authors: '' },
    ];
    const r = classify(candidates, true);
    expect(r.action).toBe('refine');
  });
});
