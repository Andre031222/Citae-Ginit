/**
 * @jest-environment node
 */
import { formatCitation, formatMultiple, CITATION_FORMATS } from './citationFormatter';

const paper = {
  title: 'Attention Is All You Need',
  authors: 'Ashish Vaswani and Noam Shazeer',
  publication_year: 2017,
  journal: 'Advances in Neural Information Processing Systems',
  volume: '30',
  issue: '1',
  pages: '5998-6008',
  doi: '10.5555/3295222',
  publisher: 'Curran Associates',
};

describe('CITATION_FORMATS', () => {
  test('expone los 7 estilos', () => {
    expect(CITATION_FORMATS).toEqual(['APA', 'MLA', 'Chicago', 'Harvard', 'IEEE', 'Vancouver', 'BibTeX']);
  });
});

describe('formatCitation', () => {
  test('APA: apellido, año entre paréntesis, título y DOI', () => {
    const c = formatCitation(paper, 'APA');
    expect(c).toContain('Vaswani');
    expect(c).toContain('(2017)');
    expect(c).toContain('Attention Is All You Need');
    expect(c).toContain('https://doi.org/10.5555/3295222');
  });

  test('MLA: título entre comillas y et al. con 3+ autores', () => {
    const c = formatCitation({ ...paper, authors: 'A One, B Two, C Three' }, 'MLA');
    expect(c).toContain('"Attention Is All You Need."');
    expect(c).toContain('et al.');
  });

  test('IEEE: numera la referencia con el índice dado', () => {
    expect(formatCitation(paper, 'IEEE', 3)).toMatch(/^\[3\]/);
  });

  test('Vancouver: empieza con el número de referencia', () => {
    expect(formatCitation(paper, 'Vancouver', 5)).toMatch(/^5\./);
  });

  test('BibTeX: entrada @article con clave apellido+año', () => {
    const c = formatCitation(paper, 'BibTeX');
    expect(c).toMatch(/^@article\{vaswani2017,/);
    expect(c).toContain('author    = {Ashish Vaswani and Noam Shazeer}');
    expect(c).toContain('doi       = {10.5555/3295222}');
  });

  test('formato desconocido cae a APA', () => {
    expect(formatCitation(paper, 'XYZ')).toBe(formatCitation(paper, 'APA'));
  });

  test('tolera metadatos faltantes sin lanzar', () => {
    expect(() => formatCitation({ title: 'Solo título' }, 'APA')).not.toThrow();
    expect(formatCitation({ authors: 'X Y' }, 'APA')).toContain('Sin título');
  });
});

describe('formatMultiple', () => {
  test('une varias citas separadas por doble salto de línea', () => {
    const out = formatMultiple([paper, { ...paper, title: 'Otro' }], 'APA');
    expect(out.split('\n\n')).toHaveLength(2);
    expect(out).toContain('Otro');
  });
});
