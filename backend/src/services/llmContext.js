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

module.exports = { storage, run, get };
