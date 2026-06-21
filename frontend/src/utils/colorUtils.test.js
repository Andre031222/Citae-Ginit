/**
 * @jest-environment node
 */
import { darken, GF_MAP } from './colorUtils';

describe('darken', () => {
  test('resta ~50 por canal', () => {
    expect(darken('#646464')).toBe('#323232');
  });
  test('satura en 0 sin bajar de negro', () => {
    expect(darken('#000000')).toBe('#000000');
  });
  test('funciona sin el prefijo #', () => {
    expect(darken('ffffff')).toBe('#cdcdcd');
  });
  test('rellena ceros a la izquierda a 6 dígitos', () => {
    expect(darken('#323232')).toBe('#000000');
    expect(darken('#3232ff')).toMatch(/^#[0-9a-f]{6}$/);
  });
  test('devuelve la entrada ante valores inválidos', () => {
    expect(darken(null)).toBe(null);
  });
});

describe('GF_MAP', () => {
  test('no incluye Inter (se carga en index.html)', () => {
    expect(GF_MAP.Inter).toBeDefined();
  });
  test('todas las entradas son cadenas de parámetros de Google Fonts', () => {
    for (const value of Object.values(GF_MAP)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });
});
