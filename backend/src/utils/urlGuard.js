const dns  = require('dns').promises;
const net  = require('net');
const { URL } = require('url');

// Rangos IPv4 privados/reservados (RFC1918, loopback, link-local, CGNAT, etc.)
const PRIVATE_IPV4 = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^198\.1[89]\./,
  /^198\.51\.100\./,
  /^203\.0\.113\./,
  /^2[23]\d\./,
  /^24[0-9]\./,
  /^25[0-5]\./,
];

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    return PRIVATE_IPV4.some(re => re.test(ip));
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1') return true;
    if (lower === '::') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    if (lower.startsWith('fe80')) return true;
    if (lower.startsWith('::ffff:')) return isPrivateIp(lower.slice(7));
    return false;
  }
  return true;
}

async function assertPublicUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('URL inválida');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Solo se permiten URLs http o https');
  }

  const { hostname, port } = parsed;

  // Bloquear hostnames internos literales
  if (
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname === '[::]'
  ) {
    throw new Error('URL no permitida');
  }

  // Puerto: solo 80, 443 o vacío
  if (port && port !== '80' && port !== '443') {
    throw new Error('Puerto no permitido en URLs externas');
  }

  // Si el hostname ya es una IP, verificar directamente
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error('URL no permitida');
    return;
  }

  // Resolver hostname → IPs y verificar cada una
  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw new Error('No se pudo resolver el dominio');
  }

  for (const { address } of addresses) {
    if (isPrivateIp(address)) throw new Error('URL no permitida');
  }
}

module.exports = { assertPublicUrl };
