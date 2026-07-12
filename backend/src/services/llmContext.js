const { AsyncLocalStorage } = require('async_hooks');

// Contexto por petición para el LLM. Guarda la request (para leer el usuario
// autenticado de forma perezosa) y acumula cambios de estado de las claves de
// usuario (agotada/inválida/activa) que el middleware persiste al finalizar.
const storage = new AsyncLocalStorage();

function run(seed, fn) {
  return storage.run(seed, fn);
}

function get() {
  return storage.getStore();
}

// Idioma de salida solicitado para la petición actual ('es' | 'en').
// Se siembra en el middleware a partir de la cabecera X-Citae-Lang.
function getLang() {
  const store = storage.getStore();
  return store && store.lang === 'en' ? 'en' : 'es';
}

// Nombre del idioma para instruir al modelo dentro del prompt.
function outputLanguage() {
  return getLang() === 'en' ? 'English' : 'español';
}

module.exports = { storage, run, get, getLang, outputLanguage };
