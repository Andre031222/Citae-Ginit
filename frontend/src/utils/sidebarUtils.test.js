/**
 * @jest-environment node
 */
import { formatTime, groupByDate, groupHighlightsByPaper } from './sidebarUtils';

describe('formatTime', () => {
  test('menos de un minuto → "ahora"', () => {
    expect(formatTime(Date.now())).toBe('ahora');
  });
  test('minutos', () => {
    expect(formatTime(Date.now() - 30 * 60000)).toBe('30m');
  });
  test('horas', () => {
    expect(formatTime(Date.now() - 3 * 3600000)).toBe('3h');
  });
  test('ayer', () => {
    expect(formatTime(Date.now() - 30 * 3600000)).toBe('ayer');
  });
});

describe('groupByDate', () => {
  test('agrupa por antigüedad y omite grupos vacíos', () => {
    const items = [
      { id: 1, created_at: new Date().toISOString() },
      { id: 2, created_at: new Date(Date.now() - 10 * 86400000).toISOString() },
    ];
    const groups = groupByDate(items);
    const labels = groups.map(([label]) => label);
    expect(labels).toContain('today');
    expect(labels).toContain('month');
    expect(labels).not.toContain('yesterday');
  });
});

describe('groupHighlightsByPaper', () => {
  test('agrupa highlights del mismo paper por DOI', () => {
    const highlights = [
      { id: 1, paper_doi: '10.1/x', paper_title: 'A' },
      { id: 2, paper_doi: '10.1/x', paper_title: 'A' },
      { id: 3, paper_doi: '10.2/y', paper_title: 'B' },
    ];
    const groups = groupHighlightsByPaper(highlights);
    expect(groups).toHaveLength(2);
    expect(groups[0].items).toHaveLength(2);
  });

  test('usa el título cuando no hay DOI', () => {
    const groups = groupHighlightsByPaper([{ id: 1, paper_title: 'Sin DOI' }]);
    expect(groups[0].title).toBe('Sin DOI');
  });
});
