function requireString(value, name) {
  if (!value || typeof value !== 'string' || !value.trim()) {
    const err = new Error(`${name} es requerido`);
    err.name = 'ValidationError';
    throw err;
  }
  return value.trim();
}

function requireEmail(value) {
  const email = requireString(value, 'email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const err = new Error('Correo electrónico inválido');
    err.name = 'ValidationError';
    throw err;
  }
  return email.toLowerCase();
}

function requireMinLength(value, name, min) {
  const str = requireString(value, name);
  if (str.length < min) {
    const err = new Error(`${name} debe tener al menos ${min} caracteres`);
    err.name = 'ValidationError';
    throw err;
  }
  return str;
}

module.exports = { requireString, requireEmail, requireMinLength };
