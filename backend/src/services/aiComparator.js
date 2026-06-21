// GRACEFUL DEGRADATION: sin keys Groq → { available: false }, sin error.
// Las llamadas pasan por groqClient (rotación de múltiples keys + failover en 429).

const { groqChat, hasKeys } = require('./groqClient');

const MODEL_SMART   = process.env.GROQ_MODEL      || 'llama-3.3-70b-versatile';
const MODEL_FAST    = process.env.GROQ_MODEL_FAST || 'llama-3.1-8b-instant';
const TIMEOUT       = 12000;

/**
 * Genera un análisis de la relación entre la query y los candidatos encontrados.
 * Responde en español, explicando qué aporta cada resultado y cómo se relacionan.
 *
 * @param {string} query         - Título/término buscado por el usuario
 * @param {Array}  candidates    - Candidatos rankeados (con .title, .score, .authors, .year)
 * @returns {{ available: boolean, narrative?: string }}
 */
async function summarizeCandidates(query, candidates) {
  if (!hasKeys() || !candidates?.length) {
    return { available: false };
  }

  try {
    const topN = candidates.slice(0, 6);
    const paperList = topN.map((c, i) => {
      const meta = [
        c.authors && `Autores: ${c.authors.split(',').slice(0, 2).join(',')}`,
        c.publication_year && `Año: ${c.publication_year}`,
        c.journal && `En: ${c.journal}`,
      ].filter(Boolean).join(' · ');
      return `${i + 1}. "${c.title}"${meta ? ' — ' + meta : ''}`;
    }).join('\n');

    const prompt =
      `El usuario buscó: "${query}"\n\n` +
      `Papers encontrados:\n${paperList}\n\n` +
      `Escribe un resumen en español (3 oraciones cortas y directas). Sé natural, como si le explicaras a un colega:\n` +
      `1. Qué área o tema cubren estos papers en relación a la búsqueda.\n` +
      `2. Qué hace especialmente relevante al resultado principal.\n` +
      `3. Qué variaciones de enfoque o aplicación hay entre los demás.\n\n` +
      `Reglas: sin listas, sin números, sin porcentajes. Directo al punto, lenguaje claro.`;

    const narrative = await groqChat({
      model:       MODEL_SMART,
      messages:    [{ role: 'user', content: prompt }],
      max_tokens:  450,
      temperature: 0.35,
      timeout:     TIMEOUT,
    }) || '';

    return narrative ? { available: true, narrative } : { available: false };

  } catch (err) {
    console.warn('aiComparator (Groq):', err.message);
    return { available: false };
  }
}

/**
 * Genera un resumen de un paper usando su título y metadatos.
 * Usado como fallback cuando no hay abstract disponible en las fuentes.
 *
 * @param {{ title, authors, year, journal }} meta
 * @returns {string} Resumen generado o '' si falla
 */
async function generateAbstractFallback({ title, authors, year, journal }) {
  if (!hasKeys() || !title) return '';

  try {
    const metaStr = [
      `Título: ${title}`,
      authors  && `Autores: ${authors}`,
      year     && `Año: ${year}`,
      journal  && `Revista/Fuente: ${journal}`,
    ].filter(Boolean).join('\n');

    const prompt =
      `Eres un asistente académico. Basándote SOLO en el título y metadatos del paper, ` +
      `genera un resumen académico breve (2-3 oraciones) que explique de qué trata, ` +
      `su aporte principal y área de estudio. No inventes datos específicos. Responde en español.\n\n` +
      `${metaStr}\n\nResumen:`;

    return await groqChat({
      model:       MODEL_FAST,
      messages:    [{ role: 'user', content: prompt }],
      max_tokens:  300,
      temperature: 0.3,
      timeout:     8000,
    }) || '';
  } catch (err) {
    console.warn('generateAbstractFallback (Groq):', err.message);
    return '';
  }
}

function normalizeForMatch(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function verifyPassages(passages, source) {
  const ns = normalizeForMatch(source);
  if (!ns) return [];
  const seen = new Set();
  const verified = [];
  for (const p of passages) {
    const clean = String(p || '').trim().replace(/^["“]|["”]$/g, '').slice(0, 280);
    if (!clean) continue;
    const np = normalizeForMatch(clean);
    if (np.length < 12) continue;
    let ok = ns.includes(np);
    if (!ok) {
      const words = np.split(' ').filter(Boolean);
      if (words.length >= 6) ok = ns.includes(words.slice(0, 8).join(' '));
    }
    if (ok && !seen.has(np)) {
      seen.add(np);
      verified.push(clean);
    }
  }
  return verified.slice(0, 3);
}

/**
 * Reading Assistant — responde preguntas sobre un fragmento de texto / paper.
 * Devuelve answer + suggestions + sources (Trust Cards: pasajes literales
 * verificados contra el texto fuente, descartando alucinaciones).
 *
 * @param {{ question, quote?, abstract?, title?, authors?, year? }} opts
 * @returns {{ available: boolean, answer?: string, suggestions?: string[], sources?: string[] }}
 */
async function askAboutText({ question, quote, abstract, field = 'abstract', title, authors, year, history = [] }) {
  if (!hasKeys()) return { available: false };

  try {
    const isFullText = field === 'fulltext';
    const maxLen = isFullText ? 8000 : 2000;
    const sourceText = abstract ? String(abstract).slice(0, maxLen) : '';

    const contextParts = [];
    if (title)    contextParts.push(`Título: "${title}"`);
    if (authors)  contextParts.push(`Autores: ${authors}`);
    if (year)     contextParts.push(`Año: ${year}`);
    if (sourceText) {
      const label = isFullText
        ? 'Texto completo del paper (fuente de información):'
        : 'Abstract (fuente única de información):';
      contextParts.push(`${label}\n${sourceText}`);
    }
    if (quote)    contextParts.push(`Fragmento seleccionado:\n"${quote}"`);

    const systemContent =
      `Eres un asistente de lectura académica. Responde SOLO en base al contexto dado.\n\n` +
      `${contextParts.join('\n\n')}\n\n` +
      `Reglas: responde en español, conciso (máx. 4 oraciones). Si no puedes responder con este contexto, dilo.\n` +
      `Después de tu respuesta añade DOS líneas nuevas con este formato exacto:\n` +
      `FUENTES: [frase copiada TEXTUALMENTE del texto fuente que respalda tu respuesta] ||| [otra frase textual, opcional]\n` +
      `SUGERENCIAS: [primera pregunta corta] | [segunda pregunta corta]\n` +
      `En FUENTES copia frases EXACTAS del texto fuente, sin parafrasear ni traducir. ` +
      `Si tu respuesta no se apoya en el texto, escribe: FUENTES: (ninguna)`;

    const messages = [
      { role: 'system', content: systemContent },
      ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: question },
    ];

    const raw = await groqChat({
      model: MODEL_FAST, messages, max_tokens: 600, temperature: 0.4, timeout: TIMEOUT,
    }) || '';
    if (!raw) return { available: false };

    const suggMatch = raw.match(/SUGERENCIAS:\s*(.+?)\s*\|\s*(.+?)$/m);
    const suggestions = suggMatch ? [suggMatch[1].trim(), suggMatch[2].trim()] : [];

    const sourceMatch = raw.match(/FUENTES:\s*(.+?)(?:\n|$)/m);
    let sources = [];
    if (sourceMatch && !/\(?\s*ninguna\s*\)?/i.test(sourceMatch[1])) {
      const candidates = sourceMatch[1].split('|||').map(s => s.trim()).filter(Boolean);
      sources = verifyPassages(candidates, `${sourceText}\n${quote || ''}`);
    }

    let answer = raw;
    const cutAt = Math.min(
      ...[raw.indexOf('FUENTES:'), raw.lastIndexOf('SUGERENCIAS:')].filter(i => i >= 0)
    );
    if (cutAt >= 0 && cutAt !== Infinity) answer = raw.slice(0, cutAt).trim();

    return { available: true, answer, suggestions, sources };

  } catch (err) {
    console.warn('askAboutText (Groq):', err.message);
    return { available: false };
  }
}

async function suggestTags({ title, abstract, journal }) {
  if (!hasKeys() || !title) return { available: false };

  try {
    const metaStr = [
      `Título: ${title}`,
      journal  && `Revista: ${journal}`,
      abstract && `Abstract: ${String(abstract).slice(0, 1200)}`,
    ].filter(Boolean).join('\n');

    const prompt =
      `Genera entre 3 y 5 etiquetas temáticas para clasificar este paper académico.\n\n` +
      `${metaStr}\n\n` +
      `Reglas: etiquetas en español, en minúsculas, de 1 a 3 palabras, específicas del tema ` +
      `(disciplina, método, objeto de estudio). Responde SOLO con las etiquetas separadas por coma, ` +
      `sin numeración ni texto adicional.`;

    const raw = await groqChat({
      model:       MODEL_FAST,
      messages:    [{ role: 'user', content: prompt }],
      max_tokens:  120,
      temperature: 0.2,
      timeout:     8000,
    }) || '';
    const tags = raw
      .replace(/^etiquetas?:/i, '')
      .split(',')
      .map(t => t.trim().toLowerCase().replace(/^#/, '').replace(/\.$/, ''))
      .filter(t => t && t.length <= 60)
      .slice(0, 5);

    return tags.length ? { available: true, tags } : { available: false };
  } catch (err) {
    console.warn('suggestTags (Groq):', err.message);
    return { available: false };
  }
}

async function classifyEvidence(claim, papers) {
  if (!hasKeys() || !papers?.length || !claim) return { available: false };
  try {
    const list = papers.slice(0, 12).map((p, i) => {
      const ab = p.abstract ? String(p.abstract).slice(0, 500) : '(sin abstract)';
      return `${i}. "${p.title}" (${p.publication_year || '?'}) — ${ab}`;
    }).join('\n\n');

    const prompt =
      `Evalúa qué evidencia aporta cada paper respecto a esta afirmación:\n\n` +
      `AFIRMACIÓN: "${claim}"\n\n` +
      `Para cada paper asigna un veredicto: APOYA, CONTRADICE, MIXTO o NEUTRO.\n` +
      `Responde ÚNICAMENTE con JSON válido, sin texto adicional:\n` +
      `[{"idx":0,"verdict":"APOYA","evidence":"fragmento clave en español (máx 100 chars)"},{"idx":1,...}]\n\n` +
      `Papers:\n${list}`;

    const raw = await groqChat({
      model: MODEL_SMART, messages: [{ role: 'user', content: prompt }], max_tokens: 1600, temperature: 0.1, timeout: 22000,
    }) || '';
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return { available: false };
    const verdicts = JSON.parse(match[0]);
    return { available: true, verdicts };
  } catch (err) {
    console.warn('classifyEvidence (Groq):', err.message);
    return { available: false };
  }
}

async function comparePapers(papers) {
  if (!hasKeys() || !papers || papers.length < 2) return { available: false };
  try {
    const list = papers.map((p, i) => {
      const ab = p.abstract ? String(p.abstract).slice(0, 700) : '(sin abstract)';
      return `### Paper ${i + 1}: "${p.title}" (${p.publication_year || '?'})\n${ab}`;
    }).join('\n\n');

    const prompt =
      `Compara estos ${papers.length} papers académicos de forma estructurada.\n\n${list}\n\n` +
      `Responde ÚNICAMENTE con JSON válido:\n` +
      `{"dimensions":[{"label":"Objetivo","values":["resumen paper 1 (máx 80 chars)","resumen paper 2",...]}` +
      `,{"label":"Metodología","values":[...]},{"label":"Resultados clave","values":[...]}` +
      `,{"label":"Limitaciones","values":[...]},{"label":"Área temática","values":[...]}]}\n\n` +
      `Sé conciso y responde en español.`;

    const raw = await groqChat({
      model: MODEL_SMART, messages: [{ role: 'user', content: prompt }], max_tokens: 1800, temperature: 0.2, timeout: 25000,
    }) || '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { available: false };
    const result = JSON.parse(match[0]);
    return { available: true, dimensions: result.dimensions || [] };
  } catch (err) {
    console.warn('comparePapers (Groq):', err.message);
    return { available: false };
  }
}

async function expandQuery(question) {
  if (!hasKeys() || !question) return '';
  try {
    const prompt =
      `Extrae 6-10 términos clave de búsqueda para esta pregunta, incluyendo sus equivalentes en inglés ` +
      `(la literatura académica suele estar en inglés). Responde SOLO con los términos separados por coma, sin texto adicional.\n\n` +
      `Pregunta: "${question}"`;
    return await groqChat({
      model: MODEL_FAST, messages: [{ role: 'user', content: prompt }], max_tokens: 80, temperature: 0.2, timeout: 7000,
    }) || '';
  } catch (err) {
    console.warn('expandQuery (Groq):', err.message);
    return '';
  }
}

async function answerFromLibrary({ question, chunks, history = [] }) {
  if (!hasKeys()) return { available: false };
  if (!chunks?.length) {
    return { available: true, answer: 'No encontré nada en tu biblioteca relacionado con esa pregunta. Prueba con otros términos o añade más papers y resaltados.', citations: [] };
  }

  try {
    const context = chunks.map((c, i) => {
      const tag = c.kind === 'highlight' ? 'RESALTADO' : 'PAPER';
      const meta = [c.meta?.authors?.split(',')[0], c.meta?.year].filter(Boolean).join(', ');
      return `[${i + 1}] (${tag}) "${c.title}"${meta ? ` — ${meta}` : ''}\n${String(c.text).slice(0, 900)}`;
    }).join('\n\n');

    const systemContent =
      `Eres el asistente de la biblioteca académica del usuario. Responde su pregunta usando SOLO las fuentes numeradas de su biblioteca.\n\n` +
      `FUENTES:\n${context}\n\n` +
      `Reglas: responde en español, claro y conciso (máx. 6 oraciones). Sintetiza entre fuentes cuando aplique. ` +
      `Cita SIEMPRE el número de la fuente entre corchetes [n] justo después de cada afirmación que provenga de ella. ` +
      `Si las fuentes no bastan para responder, dilo con honestidad. No inventes datos fuera de las fuentes.`;

    const messages = [
      { role: 'system', content: systemContent },
      ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: question },
    ];

    const answer = await groqChat({
      model: MODEL_SMART, messages, max_tokens: 700, temperature: 0.35, timeout: TIMEOUT,
    }) || '';
    if (!answer) return { available: false };

    const cited = new Set();
    const re = /\[(\d+)\]/g;
    let m;
    while ((m = re.exec(answer)) !== null) {
      const idx = parseInt(m[1], 10) - 1;
      if (idx >= 0 && idx < chunks.length) cited.add(idx);
    }

    const citations = (cited.size ? [...cited] : chunks.map((_, i) => i))
      .sort((a, b) => a - b)
      .map(i => {
        const c = chunks[i];
        return {
          n:     i + 1,
          kind:  c.kind,
          refId: c.refId,
          title: c.title,
          snippet: String(c.text).slice(0, 240),
          meta:  c.meta,
        };
      });

    return { available: true, answer, citations };

  } catch (err) {
    console.warn('answerFromLibrary (Groq):', err.message);
    return { available: false };
  }
}

module.exports = { summarizeCandidates, generateAbstractFallback, askAboutText, suggestTags, classifyEvidence, comparePapers, answerFromLibrary, expandQuery };
