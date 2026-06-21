const axios   = require('axios');
const cheerio = require('cheerio');

const TIMEOUT = 6000;
const TTL_MS  = 24 * 60 * 60 * 1000;
const cache   = new Map();

function getCache(key) {
  const e = cache.get(key);
  if (!e) return undefined;
  if (Date.now() > e.expiresAt) { cache.delete(key); return undefined; }
  return e.value;
}

function setCache(key, value) {
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

function isSafeUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') return false;
  if (/^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  return true;
}

function absolutize(src, base) {
  if (!src) return null;
  try { return new URL(src, base).href; } catch { return null; }
}

const GENERIC_RE = /(logo|sprite|placeholder|default[-_]?(image|cover)|favicon|icon[-_.]|banner[-_]?ad|social[-_]?share)/i;

function looksGeneric(url) {
  return GENERIC_RE.test(url);
}

async function fetchPreviewImage({ doi, url }) {
  const target = url || (doi ? `https://doi.org/${doi}` : null);
  if (!target || !isSafeUrl(target)) return { image: null };

  const key = `prev:${target.toLowerCase()}`;
  const cached = getCache(key);
  if (cached !== undefined) return cached;

  try {
    const res = await axios.get(target, {
      timeout: TIMEOUT,
      maxRedirects: 5,
      maxContentLength: 3 * 1024 * 1024,
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CitaeBot/1.0; +https://citae.local)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      validateStatus: s => s >= 200 && s < 400,
    });

    const finalUrl = res.request?.res?.responseUrl || target;
    const $ = cheerio.load(res.data);

    const candidates = [
      $('meta[property="og:image:secure_url"]').attr('content'),
      $('meta[property="og:image"]').attr('content'),
      $('meta[name="og:image"]').attr('content'),
      $('meta[name="twitter:image"]').attr('content'),
      $('meta[name="twitter:image:src"]').attr('content'),
      $('meta[name="citation_image"]').attr('content'),
      $('link[rel="image_src"]').attr('href'),
    ].filter(Boolean);

    let image = null;
    for (const c of candidates) {
      const abs = absolutize(c.trim(), finalUrl);
      if (abs && isSafeUrl(abs) && !looksGeneric(abs)) { image = abs; break; }
    }

    let result;
    if (image) {
      result = { image, kind: 'figure' };
    } else {
      // Sin figura: usar el logo del editor/revista por su dominio
      let host = '';
      try { host = new URL(finalUrl).hostname.replace(/^www\./, ''); } catch {}
      result = host
        ? { image: `https://logo.clearbit.com/${host}?size=256`, kind: 'logo' }
        : { image: null };
    }

    setCache(key, result);
    return result;
  } catch (err) {
    const r = { image: null };
    setCache(key, r);
    return r;
  }
}

const MAILTO = process.env.UNPAYWALL_EMAIL || 'support@citae.app';

function arxivId({ doi, url }) {
  if (url) {
    const m = url.match(/arxiv\.org\/(?:abs|pdf)\/([0-9]{4}\.[0-9]{4,5}(?:v\d+)?)/i);
    if (m) return m[1];
  }
  if (doi) {
    const m = doi.match(/(?:arxiv[.:/]?)([0-9]{4}\.[0-9]{4,5}(?:v\d+)?)/i);
    if (m) return m[1];
  }
  return null;
}

async function fetchPdfUrl({ doi, url }) {
  const key = `pdfurl:${(doi || url || '').toLowerCase()}`;
  const cached = getCache(key);
  if (cached !== undefined) return { pdfUrl: cached };

  const aid = arxivId({ doi, url });
  if (aid) {
    const pdfUrl = `https://arxiv.org/pdf/${aid}.pdf`;
    setCache(key, pdfUrl);
    return { pdfUrl };
  }

  if (doi) {
    try {
      const { data } = await axios.get(
        `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}`,
        { params: { email: MAILTO }, timeout: TIMEOUT }
      );
      const loc = data?.best_oa_location || (data?.oa_locations || []).find(l => l.url_for_pdf);
      const pdfUrl = loc?.url_for_pdf || null;
      if (pdfUrl && isSafeUrl(pdfUrl)) {
        setCache(key, pdfUrl);
        return { pdfUrl };
      }
    } catch {}
  }

  setCache(key, null);
  return { pdfUrl: null };
}

module.exports = { fetchPreviewImage, fetchPdfUrl };
