const SOURCE_PRIORITY = ['crossref', 'openalex', 'semanticscholar', 'arxiv'];

// Palabras tan comunes que no aportan discriminación semántica.
// Un título que solo comparte stopwords con la query NO debe puntuar alto.
const STOPWORDS = new Set([
  'a','an','the','and','or','of','in','on','at','to','for','with',
  'is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','could','should','may','might','can',
  'from','by','as','its','it','this','that','these','those','not','no',
  'but','if','then','than','so','via','into','using','based','new',
  'large','scale','novel','approach','method','model','system','paper',
  'study','analysis','review','survey','towards','toward',
]);

function normalizeString(s) {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDoi(doi) {
  return (doi || '').toLowerCase().trim().replace(/^https?:\/\/doi\.org\//i, '');
}

/**
 * Peso semántico de un token: las palabras raras (no-stopword) pesan 1.0,
 * las palabras comunes pesan 0.1. Esto es IDF simplificado sin corpus externo.
 */
function tokenWeight(t) {
  return STOPWORDS.has(t) ? 0.1 : 1.0;
}

/**
 * Dice coefficient sobre bigramas de caracteres.
 * Robusto a variaciones ortográficas y reordenamiento leve.
 */
function bigrams(str) {
  const s = str.replace(/\s/g, '');
  if (s.length < 2) return new Set();
  const bg = new Set();
  for (let i = 0; i < s.length - 1; i++) bg.add(s.slice(i, i + 2));
  return bg;
}

function charDice(a, b) {
  const bgA = bigrams(a), bgB = bigrams(b);
  if (bgA.size === 0 && bgB.size === 0) return 1;
  if (bgA.size === 0 || bgB.size === 0) return 0;
  let inter = 0;
  for (const bg of bgA) { if (bgB.has(bg)) inter++; }
  return (2 * inter) / (bgA.size + bgB.size);
}

/**
 * Similitud de tokens ponderada por IDF simplificado.
 * Calcula una F1 ponderada: tokens raros tienen más peso.
 * Ejemplo: "attention is all you need" vs "all you need is love"
 *   → "attention" y "need" pesan 1.0, "is/all/you" pesan 0.1
 *   → la coincidencia de "all you need is" no sube el score si falta "attention"
 */
function weightedTokenSim(qNorm, cNorm) {
  const qToks = qNorm.split(' ').filter(t => t.length > 1);
  const cToks = cNorm.split(' ').filter(t => t.length > 1);
  if (qToks.length === 0 || cToks.length === 0) return 0;

  const cSet = new Set(cToks);
  let qW = 0, cW = 0, interW = 0;

  for (const t of qToks) {
    const w = tokenWeight(t);
    qW += w;
    if (cSet.has(t)) interW += w;
  }
  for (const t of cToks) cW += tokenWeight(t);

  return (qW + cW) > 0 ? (2 * interW) / (qW + cW) : 0;
}

/**
 * Detecta si la query es una subcadena del candidato (o viceversa).
 * Normalizado. Señal muy fuerte: la query completa está dentro del título.
 */
function exactPhraseScore(qNorm, cNorm) {
  if (qNorm.length < 6) return 0;
  if (cNorm === qNorm) return 1.0;
  // Query dentro del candidato (query es parte del título largo)
  if (cNorm.includes(qNorm)) return 0.95;
  // Candidato dentro de la query (título más corto que la query)
  if (qNorm.includes(cNorm) && cNorm.split(' ').length >= 4) return 0.88;
  return 0;
}

/**
 * Token bigrams (palabras como unidades, no caracteres).
 * "attention is all" contiene el bigram "attention-is", "is-all".
 * Útil para detectar frases completas aunque haya variación al final.
 */
function wordBigrams(normStr) {
  const toks = normStr.split(' ').filter(t => t.length > 1);
  const bgs = new Set();
  for (let i = 0; i < toks.length - 1; i++) {
    bgs.add(`${toks[i]}|${toks[i + 1]}`);
  }
  return bgs;
}

function wordBigramSim(qNorm, cNorm) {
  const qBg = wordBigrams(qNorm);
  const cBg = wordBigrams(cNorm);
  if (qBg.size === 0 || cBg.size === 0) return 0;
  let inter = 0;
  for (const bg of qBg) { if (cBg.has(bg)) inter++; }
  return (2 * inter) / (qBg.size + cBg.size);
}

/**
 * Agrupa por DOI normalizado (si existe) o por título normalizado.
 * NUNCA agrupa por doi vacío — evita colapsar papers distintos.
 * Merge con prioridad de fuente; preserva el mayor citationCount.
 */
function dedupeAndMerge(candidates) {
  const groups = new Map();

  for (const cand of candidates) {
    if (!cand || !cand.title) continue;
    const doiKey   = normalizeDoi(cand.doi);
    const titleKey = normalizeString(cand.title);
    const key      = doiKey || (titleKey ? 'T:' + titleKey : '');
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(cand);
  }

  const merged = [];

  for (const group of groups.values()) {
    group.sort((a, b) => {
      const pa = SOURCE_PRIORITY.indexOf(a.source);
      const pb = SOURCE_PRIORITY.indexOf(b.source);
      return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
    });

    const base = { ...group[0] };

    // Merge campo a campo: primer valor no-vacío
    for (const field of ['title', 'authors', 'journal', 'doi', 'url', 'publisher', 'volume', 'issue', 'pages']) {
      if (!base[field]) {
        const found = group.find(c => c[field]);
        if (found) base[field] = found[field];
      }
    }
    if (!base.publication_year) {
      const found = group.find(c => c.publication_year);
      if (found) base.publication_year = found.publication_year;
    }

    // Abstract: primer no-vacío (SS/OpenAlex/arXiv tienen los mejores)
    base.abstract = group.find(c => c.abstract)?.abstract || '';

    // CitationCount: el máximo entre todas las fuentes (SS y OpenAlex lo tienen)
    base.citationCount = Math.max(...group.map(c => c.citationCount || 0));

    // Procedencia: array de fuentes únicas
    base.sources = [...new Set(group.map(c => c.source))];
    delete base.sourceId;

    merged.push(base);
  }

  return merged;
}

/**
 * Extrae año y tokens que podrían ser autores (tokens fuera del título
 * normalizado que no son stopwords y tienen 3+ chars).
 */
function parseQuery(rawInput) {
  const s = (rawInput || '').trim();

  const yearMatch = s.match(/\b((19|20)\d{2})\b/);
  const year      = yearMatch ? parseInt(yearMatch[1]) : null;
  const withoutYear = yearMatch ? s.replace(yearMatch[0], '').replace(/\s+/g, ' ').trim() : s;

  const titleClean = withoutYear;

  // Tokens potencialmente autores (apellidos): se usan en scoreCandidate para el author boost
  const allToks = normalizeString(withoutYear).split(' ').filter(t => t.length >= 3 && !STOPWORDS.has(t));

  return { title: titleClean, year, rawTokens: allToks };
}

/**
 * Puntúa un candidato contra la query con múltiples señales.
 *
 * Señales de similitud de título (combinadas):
 *   1. Stopword-weighted token similarity (IDF-style)
 *   2. Character bigram Dice (robusto a variantes)
 *   3. Word bigram similarity (detecta frases)
 *   4. Exact phrase / substring match (señal muy fuerte)
 *   5. Containment boost proporcional a longitud
 *
 * Señales de verificación y calidad:
 *   6. Multi-source corroboration (aparece en 2-4 fuentes)
 *   7. Citation count (log scale — papers citados son más "reales")
 *   8. Author mention in query (el usuario incluyó apellido del autor)
 *   9. DOI presence (el paper existe en el registro CrossRef/DOI)
 *  10. Year match
 */
function scoreCandidate(queryParsed, candidate) {
  const qNorm = normalizeString(queryParsed.title);
  const cNorm = normalizeString(candidate.title);

  const tokSim = weightedTokenSim(qNorm, cNorm);
  const cDice  = charDice(qNorm, cNorm);
  const wbSim  = wordBigramSim(qNorm, cNorm);
  const exactSc = exactPhraseScore(qNorm, cNorm);

  // tokSim es el más discriminativo; charDice es el más robusto a typos;
  // wbSim es bueno para frases ordenadas; exactSc es señal directa.
  let titleScore = Math.max(
    0.55 * tokSim + 0.30 * cDice + 0.15 * wbSim,
    exactSc
  );

  // Containment boost: si TODOS los tokens de la query están en el candidato
  const qTokens = qNorm.split(' ').filter(Boolean);
  if (qTokens.length > 0) {
    const cWords = new Set(cNorm.split(' ').filter(Boolean));
    const allPresent = qTokens.every(t => cWords.has(t) || cNorm.includes(t));
    if (allPresent) {
      const cLen     = cNorm.split(' ').filter(Boolean).length;
      const lenRatio = Math.min(1, qTokens.length / Math.max(cLen, qTokens.length));
      // Containment boost: 0.55 (título muy largo) → 0.88 (casi idéntico)
      const containBoost = 0.55 + 0.33 * lenRatio;
      titleScore = Math.max(titleScore, containBoost);
    }
  }

  let base = titleScore * 100;

  // Multi-source corroboration — la señal de "es real" más fuerte.
  // Un paper en 2 fuentes independientes casi seguro existe; en 3-4 es definitivamente el correcto.
  const srcCount     = (candidate.sources || []).length;
  const sourceBoost  = srcCount >= 4 ? 22
                     : srcCount === 3 ? 16
                     : srcCount === 2 ? 10
                     : 0;

  // Citation count — log scale para no favorecer solo papers famosos.
  // Papers con 0 citas aún pueden ser correctos (preprints, recientes); 10,000+ citas → boost máx 12 pts.
  const citations    = candidate.citationCount || 0;
  const citationBoost = citations > 0
    ? Math.min(12, Math.log10(citations + 1) * 5)
    : 0;

  // Author mention in query: si el usuario escribió "attention all you need vaswani",
  // "vaswani" no está en el título pero sí en los autores → señal directa.
  let authorBoost = 0;
  if (queryParsed.rawTokens && candidate.authors) {
    const authNorm   = normalizeString(candidate.authors);
    // Comparar contra el título del CANDIDATO (no la query) para encontrar
    // tokens que el usuario añadió como apellido de autor.
    const candidateTitleToks = new Set(cNorm.split(' ').filter(Boolean));
    // Tokens del query que NO están en el título del candidato → candidatos a ser autores
    const nonTitleToks = queryParsed.rawTokens.filter(t => !candidateTitleToks.has(t) && t.length >= 4);
    if (nonTitleToks.some(t => authNorm.includes(t))) {
      authorBoost = 9;
    }
  }

  // DOI presence — el paper existe en el registro oficial
  const doiBoost = candidate.doi ? 4 : 0;

  let yearBoost = 0;
  if (queryParsed.year && candidate.publication_year) {
    const diff = Math.abs(queryParsed.year - candidate.publication_year);
    if (diff === 0)      yearBoost = +6;
    else if (diff === 1) yearBoost =  0;
    else                 yearBoost = -12;
  }

  const score = Math.min(100, Math.max(0, Math.round(
    base + sourceBoost + citationBoost + authorBoost + doiBoost + yearBoost
  )));

  return {
    score,
    breakdown: {
      titleSim:      Math.round(base),
      sourceBoost,
      citationBoost: Math.round(citationBoost),
      authorBoost,
      doiBoost,
      yearBoost,
    },
  };
}

const AUTO_SELECT = 90;
const MARGIN      = 15;
const COMPARE_MIN = 35;
const SHOW_MIN    = 18;
const MAX_SHOW    = 12;

/**
 * Dado el array rankeado (desc por score) y forceCompare flag,
 * decide la acción: exact | compare | refine.
 *
 * Con las nuevas señales (corroboración + citaciones) los scores son más
 * discriminativos — un paper muy citado y en 3 fuentes puede llegar a 95+.
 */
function classify(ranked, forceCompare = false) {
  if (!ranked || ranked.length === 0) {
    return {
      action:  'refine',
      message: 'No encontramos resultados. Prueba con el DOI o añade autor y año al título.',
    };
  }

  const top    = ranked[0];
  const second = ranked[1];
  const margin = second ? top.score - second.score : 100;

  // Exact: reservado para flujos con DOI/URL confirmado (forceCompare=false).
  // El controller llama classify con forceCompare=true para búsquedas por título,
  // por lo que en la práctica esta rama solo es alcanzable desde tests o futuros flujos.
  if (!forceCompare && top.score >= AUTO_SELECT && (top.doi || margin >= MARGIN)) {
    return { action: 'exact', best: top };
  }

  const showable = ranked.filter(c => c.score >= SHOW_MIN).slice(0, MAX_SHOW);

  if (showable.length > 0 && top.score >= COMPARE_MIN) {
    const reasons = [];
    if (top.score >= 85)                reasons.push(`${top.score}% de coincidencia`);
    if ((top.sources || []).length >= 2) reasons.push(`${top.sources.length} fuentes`);
    if (top.citationCount > 100)        reasons.push(`${top.citationCount.toLocaleString()} citas`);
    const reason = reasons.length > 0
      ? reasons.join(' · ')
      : `${top.score}% de coincidencia`;

    return {
      action:         'compare',
      candidates:     showable,
      recommendation: { index: 0, reason },
    };
  }

  return {
    action:     'refine',
    candidates: ranked.slice(0, 5),
    message:    'No encontramos una coincidencia clara. Intenta añadir el DOI, autor o año junto al título.',
  };
}

module.exports = {
  normalizeString,
  dedupeAndMerge,
  parseQuery,
  scoreCandidate,
  classify,
};
