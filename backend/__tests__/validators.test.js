const { requireString, requireEmail, requireMinLength } = require('../src/utils/validators');

describe('requireString', () => {
  test('devuelve el valor recortado', () => {
    expect(requireString('  hola  ', 'campo')).toBe('hola');
  });
  test('lanza ValidationError si está vacío o no es string', () => {
    expect(() => requireString('', 'campo')).toThrow('campo es requerido');
    expect(() => requireString('   ', 'campo')).toThrow(/requerido/);
    expect(() => requireString(null, 'campo')).toThrow(/requerido/);
    try { requireString('', 'x'); } catch (e) { expect(e.name).toBe('ValidationError'); }
  });
});

describe('requireEmail', () => {
  test('normaliza a minúsculas', () => {
    expect(requireEmail('User@Example.COM')).toBe('user@example.com');
  });
  test('rechaza formatos inválidos', () => {
    expect(() => requireEmail('no-es-email')).toThrow(/inválido/);
    expect(() => requireEmail('a@b')).toThrow(/inválido/);
    expect(() => requireEmail('a @b.com')).toThrow(/inválido/);
  });
});

describe('requireMinLength', () => {
  test('acepta longitud suficiente', () => {
    expect(requireMinLength('secreto123', 'password', 8)).toBe('secreto123');
  });
  test('rechaza si es demasiado corto', () => {
    expect(() => requireMinLength('abc', 'password', 8)).toThrow(/al menos 8/);
  });
});
