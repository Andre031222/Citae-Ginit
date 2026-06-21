const { assertPublicUrl } = require('../src/utils/urlGuard');

describe('assertPublicUrl', () => {
  test('acepta una IP pública literal sin tocar la red', async () => {
    await expect(assertPublicUrl('http://8.8.8.8/path')).resolves.toBeUndefined();
  });

  test('rechaza URL inválida', async () => {
    await expect(assertPublicUrl('no es una url')).rejects.toThrow(/inválida/);
  });

  test('rechaza protocolos distintos de http/https', async () => {
    await expect(assertPublicUrl('ftp://example.com')).rejects.toThrow(/http o https/);
    await expect(assertPublicUrl('file:///etc/passwd')).rejects.toThrow();
  });

  test('rechaza localhost y 0.0.0.0', async () => {
    await expect(assertPublicUrl('http://localhost/x')).rejects.toThrow(/no permitida/);
    await expect(assertPublicUrl('http://0.0.0.0/x')).rejects.toThrow(/no permitida/);
  });

  test('rechaza IPs privadas literales (SSRF)', async () => {
    await expect(assertPublicUrl('http://127.0.0.1')).rejects.toThrow(/no permitida/);
    await expect(assertPublicUrl('http://10.0.0.5')).rejects.toThrow(/no permitida/);
    await expect(assertPublicUrl('http://192.168.1.1')).rejects.toThrow(/no permitida/);
    await expect(assertPublicUrl('http://169.254.169.254')).rejects.toThrow(/no permitida/);
  });

  test('rechaza puertos no estándar en URLs externas', async () => {
    await expect(assertPublicUrl('http://8.8.8.8:8080')).rejects.toThrow(/Puerto/);
  });
});
