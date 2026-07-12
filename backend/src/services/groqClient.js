const axios = require('axios');
const llm = require('./llmContext');

const GROQ_SMART = process.env.GROQ_MODEL      || 'llama-3.3-70b-versatile';
const GROQ_FAST  = process.env.GROQ_MODEL_FAST || 'llama-3.1-8b-instant';
const GOOGLE_SMART = process.env.GOOGLE_MODEL      || 'gemini-2.5-flash';
const GOOGLE_FAST  = process.env.GOOGLE_MODEL_FAST || 'gemini-2.0-flash';

// Todos los proveedores hablan el formato compatible con OpenAI
// (/chat/completions con { model, messages } y Authorization: Bearer).
const PROVIDER_CONFIG = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    headers: () => ({}),
    modelFor: (tier) => (tier === 'fast' ? GROQ_FAST : GROQ_SMART),
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    headers: () => ({ 'HTTP-Referer': 'https://citae.local', 'X-Title': 'Citae' }),
    modelFor: (tier) => (tier === 'fast'
      ? (process.env.OPENROUTER_MODEL_FAST || 'meta-llama/llama-3.3-70b-instruct:free')
      : (process.env.OPENROUTER_MODEL || 'deepseek/deepseek-r1:free')),
  },
  google: {
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    headers: () => ({}),
    modelFor: (tier) => (tier === 'fast' ? GOOGLE_FAST : GOOGLE_SMART),
  },
};

function collectKeys(prefix) {
  const keys = [];
  if (process.env[`${prefix}S`]) {
    keys.push(...process.env[`${prefix}S`].split(',').map(k => k.trim()));
  }
  for (const suffix of ['', '_2', '_3', '_4', '_5', '_6', '_7', '_8']) {
    const v = process.env[`${prefix}${suffix}`];
    if (v) keys.push(v.trim());
  }
  return [...new Set(keys.filter(Boolean))];
}

// Proveedores de la plataforma (claves del servidor). Actúan como red de
// seguridad: se prueban DESPUÉS de las claves propias del usuario.
const PLATFORM = [];
for (const [name, prefix] of [['groq', 'GROQ_API_KEY'], ['openrouter', 'OPENROUTER_API_KEY'], ['google', 'GOOGLE_API_KEY']]) {
  const keys = collectKeys(prefix);
  if (keys.length) {
    PLATFORM.push({ name, config: name, keys, keyIds: keys.map(() => null), isUser: false });
  }
}

const cooldownUntil = new Map();
const cursors = new Map();

function hasKeys() {
  return PLATFORM.length > 0;
}

function keyCount() {
  return PLATFORM.reduce((s, p) => s + p.keys.length, 0);
}

function providerSummary() {
  return PLATFORM.map(p => `${p.name}:${p.keys.length}`).join(', ') || 'ninguno';
}

function tierOf(model) {
  if (model === 'fast' || model === 'smart') return model;
  return model === GROQ_FAST ? 'fast' : 'smart';
}

function nextKeyIndex(provider, now) {
  const cur = cursors.get(provider.name) || 0;
  for (let i = 0; i < provider.keys.length; i++) {
    const idx = (cur + i) % provider.keys.length;
    const until = cooldownUntil.get(provider.keys[idx]) || 0;
    if (until < now) {
      cursors.set(provider.name, (idx + 1) % provider.keys.length);
      return idx;
    }
  }
  return -1;
}

// Carga perezosa de las claves del usuario autenticado (una vez por petición).
async function loadUserProviders(store) {
  if (!store || store.userProvidersLoaded) return store?.userProviders || [];
  store.userProvidersLoaded = true;
  store.userProviders = [];
  const userId = store.req?.user?.id;
  if (!userId) return [];
  try {
    const UserApiKey = require('../models/UserApiKey');
    const rows = await UserApiKey.listActiveDecrypted(userId);
    const byProvider = {};
    for (const r of rows) {
      if (!PROVIDER_CONFIG[r.provider]) continue;
      if (!byProvider[r.provider]) {
        byProvider[r.provider] = { name: `user:${r.provider}`, config: r.provider, keys: [], keyIds: [], isUser: true };
      }
      byProvider[r.provider].keys.push(r.key);
      byProvider[r.provider].keyIds.push(r.id);
    }
    store.userProviders = Object.values(byProvider);
  } catch (_) {
    store.userProviders = [];
  }
  return store.userProviders;
}

function recordKeyUpdate(store, provider, keyIndex, status, error) {
  if (!store || !provider.isUser) return;
  const id = provider.keyIds[keyIndex];
  if (!id) return;
  (store.keyUpdates || (store.keyUpdates = [])).push({ id, status, error: error || null });
}

async function groqChat({ model, messages, max_tokens, temperature = 0.4, timeout = 12000 }) {
  const store = llm.get();
  const userProviders = await loadUserProviders(store);
  const runtime = [...userProviders, ...PLATFORM];
  if (!runtime.length) return null;

  // Directiva de idioma FUERTE (como system, alta prioridad): fuerza el idioma
  // de salida sin importar el idioma en que estén redactadas las instrucciones.
  // Sin esto, un prompt en español arrastra la respuesta al español aunque se
  // pida "en English". Se aplica a TODA llamada al modelo de forma centralizada.
  const langDirective = llm.getLang() === 'en'
    ? 'CRITICAL: Write your ENTIRE response in English, regardless of the language of the instructions or the sources. Output language: English.'
    : 'CRÍTICO: Escribe TODA tu respuesta en español, sin importar el idioma de las instrucciones o las fuentes. Idioma de salida: español.';
  const finalMessages = [{ role: 'system', content: langDirective }, ...messages];

  const tier = tierOf(model);
  let lastErr = null;

  for (const provider of runtime) {
    const cfg = PROVIDER_CONFIG[provider.config];
    if (!cfg) continue;
    const attempts = Math.max(provider.keys.length, 1);
    for (let a = 0; a < attempts; a++) {
      const idx = nextKeyIndex(provider, Date.now());
      if (idx < 0) break;
      const key = provider.keys[idx];

      try {
        const { data } = await axios.post(
          cfg.url,
          { model: cfg.modelFor(tier), messages: finalMessages, max_tokens, temperature },
          {
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...cfg.headers() },
            timeout,
          }
        );
        let content = data?.choices?.[0]?.message?.content?.trim() ?? '';
        if (content.includes('</think>')) content = content.split('</think>').pop().trim();
        recordKeyUpdate(store, provider, idx, 'active', null);
        return content;
      } catch (err) {
        lastErr = err;
        const status = err.response?.status;
        if (status === 429 || status === 401 || status === 403) {
          const retryAfter = parseInt(err.response?.headers?.['retry-after'], 10);
          const cooldownMs = (Number.isFinite(retryAfter) ? retryAfter : 30) * 1000;
          cooldownUntil.set(key, Date.now() + cooldownMs);
          recordKeyUpdate(store, provider, idx, status === 429 ? 'exhausted' : 'invalid', `HTTP ${status}`);
          continue;
        }
        continue;
      }
    }
  }

  if (lastErr) throw lastErr;
  return null;
}

// Valida una clave contra su proveedor con una llamada mínima.
async function validateKey({ provider, key }) {
  const cfg = PROVIDER_CONFIG[provider];
  if (!cfg) return { ok: false, reason: 'proveedor no soportado' };
  try {
    await axios.post(
      cfg.url,
      { model: cfg.modelFor('fast'), messages: [{ role: 'user', content: 'ping' }], max_tokens: 1, temperature: 0 },
      { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...cfg.headers() }, timeout: 10000 }
    );
    return { ok: true };
  } catch (err) {
    const status = err.response?.status;
    if (status === 401 || status === 403) return { ok: false, reason: 'clave invalida o sin permisos' };
    if (status === 429) return { ok: true, reason: 'valida (con limite momentaneo)' };
    return { ok: false, reason: err.response?.data?.error?.message || err.message || 'no se pudo validar' };
  }
}

module.exports = { groqChat, hasKeys, keyCount, providerSummary, validateKey, PROVIDER_CONFIG };
