const axios = require('axios');

const GROQ_SMART = process.env.GROQ_MODEL      || 'llama-3.3-70b-versatile';
const GROQ_FAST  = process.env.GROQ_MODEL_FAST || 'llama-3.1-8b-instant';

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

const PROVIDERS = [];

const groqKeys = collectKeys('GROQ_API_KEY');
if (groqKeys.length) {
  PROVIDERS.push({
    name:    'groq',
    url:     'https://api.groq.com/openai/v1/chat/completions',
    keys:    groqKeys,
    headers: () => ({}),
    modelFor: (tier) => (tier === 'fast' ? GROQ_FAST : GROQ_SMART),
  });
}

const orKeys = collectKeys('OPENROUTER_API_KEY');
if (orKeys.length) {
  PROVIDERS.push({
    name:    'openrouter',
    url:     'https://openrouter.ai/api/v1/chat/completions',
    keys:    orKeys,
    headers: () => ({ 'HTTP-Referer': 'https://citae.local', 'X-Title': 'Citae' }),
    modelFor: (tier) => (tier === 'fast'
      ? (process.env.OPENROUTER_MODEL_FAST || 'meta-llama/llama-3.3-70b-instruct:free')
      : (process.env.OPENROUTER_MODEL || 'deepseek/deepseek-r1:free')),
  });
}

const cooldownUntil = new Map();
const cursors = new Map();

function hasKeys() {
  return PROVIDERS.length > 0;
}

function keyCount() {
  return PROVIDERS.reduce((s, p) => s + p.keys.length, 0);
}

function providerSummary() {
  return PROVIDERS.map(p => `${p.name}:${p.keys.length}`).join(', ') || 'ninguno';
}

function tierOf(model) {
  if (model === 'fast' || model === 'smart') return model;
  return model === GROQ_FAST ? 'fast' : 'smart';
}

function nextKey(provider, now) {
  const cur = cursors.get(provider.name) || 0;
  for (let i = 0; i < provider.keys.length; i++) {
    const key = provider.keys[(cur + i) % provider.keys.length];
    const until = cooldownUntil.get(key) || 0;
    if (until < now) {
      cursors.set(provider.name, (cur + i + 1) % provider.keys.length);
      return key;
    }
  }
  return null;
}

async function groqChat({ model, messages, max_tokens, temperature = 0.4, timeout = 12000 }) {
  if (!hasKeys()) return null;

  const tier = tierOf(model);
  let lastErr = null;

  for (const provider of PROVIDERS) {
    const attempts = Math.max(provider.keys.length, 1);
    for (let a = 0; a < attempts; a++) {
      const key = nextKey(provider, Date.now());
      if (!key) break;

      try {
        const { data } = await axios.post(
          provider.url,
          { model: provider.modelFor(tier), messages, max_tokens, temperature },
          {
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...provider.headers() },
            timeout,
          }
        );
        let content = data?.choices?.[0]?.message?.content?.trim() ?? '';
        if (content.includes('</think>')) content = content.split('</think>').pop().trim();
        return content;
      } catch (err) {
        lastErr = err;
        const status = err.response?.status;
        if (status === 429 || status === 401 || status === 403) {
          const retryAfter = parseInt(err.response?.headers?.['retry-after'], 10);
          const cooldownMs = (Number.isFinite(retryAfter) ? retryAfter : 30) * 1000;
          cooldownUntil.set(key, Date.now() + cooldownMs);
          continue;
        }
        continue;
      }
    }
  }

  if (lastErr) throw lastErr;
  return null;
}

module.exports = { groqChat, hasKeys, keyCount, providerSummary };
