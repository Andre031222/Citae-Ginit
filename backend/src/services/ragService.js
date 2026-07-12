// Los modelos (capa con SQL) se cargan de forma perezosa dentro de buildCorpus
// para que retrieve/tokenize/buildIndex —funciones puras— puedan usarse en
// pruebas y benchmarks sin abrir conexión a la base de datos.

const STOPWORDS = new Set([
  'el','la','los','las','un','una','unos','unas','de','del','al','a','ante','con','en','para','por',
  'sobre','tras','y','o','u','e','que','qué','cual','cuál','como','cómo','cuando','cuándo','donde','dónde',
  'es','son','ser','está','están','fue','fueron','ha','han','hay','su','sus','se','lo','le','les','me','te',
  'mi','tu','nos','este','esta','estos','estas','ese','esa','eso','esto','aquel','no','sí','si','ni','pero',
  'más','menos','muy','también','entre','desde','hasta','según','cada','todo','toda','todos','todas','otro',
  'otra','this','that','the','and','or','of','in','on','for','with','to','is','are','be','from','by','as','an',
]);

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOPWORDS.has(t));
}

async function buildCorpus(userId) {
  const Library   = require('../models/Library');
  const Highlight = require('../models/Highlight');
  const [papers, highlights] = await Promise.all([
    Library.listPapers(userId, {}),
    Highlight.listByUser(userId, {}),
  ]);

  const chunks = [];

  for (const p of papers) {
    const text = [p.title, p.abstract].filter(Boolean).join('. ');
    if (!text.trim()) continue;
    chunks.push({
      id:    `paper-${p.id}`,
      kind:  'paper',
      refId: p.id,
      title: p.title,
      text,
      meta: {
        authors: p.authors,
        year:    p.publication_year,
        journal: p.journal,
        doi:     p.doi,
        url:     p.url,
      },
    });
  }

  for (const h of highlights) {
    const text = [h.quote, h.note].filter(Boolean).join(' — ');
    if (!text.trim()) continue;
    chunks.push({
      id:    `hl-${h.id}`,
      kind:  'highlight',
      refId: h.id,
      title: h.paper_title || 'Resaltado',
      text,
      meta: {
        authors:    h.paper_authors,
        year:       h.paper_year,
        color:      h.color,
        paperTitle: h.paper_title,
        doi:        h.paper_doi,
        url:        h.paper_url,
      },
    });
  }

  return chunks;
}

function buildIndex(chunks) {
  const docs = chunks.map(c => ({ chunk: c, tokens: tokenize(c.text) }));
  const N = docs.length || 1;
  const df = new Map();

  for (const d of docs) {
    const unique = new Set(d.tokens);
    for (const t of unique) df.set(t, (df.get(t) || 0) + 1);
  }

  const avgdl = docs.reduce((s, d) => s + d.tokens.length, 0) / N;

  const idf = (t) => {
    const n = df.get(t) || 0;
    return Math.log(1 + (N - n + 0.5) / (n + 0.5));
  };

  return { docs, avgdl: avgdl || 1, idf };
}

function retrieve(chunks, query, k = 6) {
  if (!chunks.length) return [];
  const { docs, avgdl, idf } = buildIndex(chunks);
  const qTokens = [...new Set(tokenize(query))];
  if (!qTokens.length) return [];

  const k1 = 1.5, b = 0.75;

  const scored = docs.map(d => {
    const tf = new Map();
    for (const t of d.tokens) tf.set(t, (tf.get(t) || 0) + 1);
    let score = 0;
    for (const qt of qTokens) {
      const f = tf.get(qt);
      if (!f) continue;
      const denom = f + k1 * (1 - b + b * (d.tokens.length / avgdl));
      score += idf(qt) * (f * (k1 + 1)) / denom;
    }
    return { chunk: d.chunk, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(s => s.chunk);
}

module.exports = { buildCorpus, retrieve, tokenize };
