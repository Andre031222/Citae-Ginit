const crypto = require('crypto');

// Cifrado en reposo de las claves de IA de los usuarios (AES-256-GCM).
// La clave maestra se deriva de API_KEY_ENC_SECRET (recomendado, exclusivo)
// o, si no existe, de JWT_SECRET. Nunca se guardan claves en texto plano.
const RAW = process.env.API_KEY_ENC_SECRET || process.env.JWT_SECRET || '';
const MASTER = crypto.scryptSync(RAW || 'citae-fallback-inseguro', 'citae-api-keys-v1', 32);

function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', MASTER, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

function decrypt(payload) {
  const [ivH, tagH, dataH] = String(payload).split(':');
  if (!ivH || !tagH || !dataH) throw new Error('Formato de cifrado invalido');
  const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER, Buffer.from(ivH, 'hex'));
  decipher.setAuthTag(Buffer.from(tagH, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(dataH, 'hex')), decipher.final()]).toString('utf8');
}

// Vista enmascarada para el frontend: "gsk_••••4f2a"
function mask(key) {
  const k = String(key);
  if (k.length <= 8) return '••••';
  return `${k.slice(0, 4)}••••${k.slice(-4)}`;
}

module.exports = { encrypt, decrypt, mask, isConfigured: () => Boolean(RAW) };
