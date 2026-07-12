const { groqChat, hasKeys } = require('./groqClient');
const llm = require('./llmContext');

const MODEL_SMART = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const MAX_PAPERS  = 15;

async function analyzeCollection(papers, collectionName) {
  if (!hasKeys()) return { available: false };
  if (!papers || papers.length < 2) {
    return { available: true, insufficient: true };
  }

  const used = papers.slice(0, MAX_PAPERS);

  const list = used.map((p, i) => {
    const meta = [p.authors?.split(',')[0], p.publication_year].filter(Boolean).join(', ');
    const ab = p.abstract ? String(p.abstract).slice(0, 600) : '(sin abstract)';
    return `[${i + 1}] "${p.title}"${meta ? ` — ${meta}` : ''}\n${ab}`;
  }).join('\n\n');

  const prompt =
    `Eres un investigador senior. Analiza en profundidad esta colección de ${used.length} papers` +
    `${collectionName ? ` titulada "${collectionName}"` : ''} y produce una revisión de literatura estructurada.\n\n` +
    `PAPERS:\n${list}\n\n` +
    `Responde ÚNICAMENTE con JSON válido, en ${llm.outputLanguage()}, con esta forma exacta:\n` +
    `{\n` +
    `  "summary": "síntesis ejecutiva en 3-4 oraciones",\n` +
    `  "themes": [{"title": "tema/cluster", "detail": "qué lo une", "papers": [1,2]}],\n` +
    `  "methods": ["metodología observada con [n] de referencia"],\n` +
    `  "findings": ["hallazgo o consenso clave con [n]"],\n` +
    `  "contradictions": ["tensión o desacuerdo entre fuentes citando [n] y [m]"],\n` +
    `  "gaps": ["vacío o pregunta abierta no cubierta por la colección"]\n` +
    `}\n` +
    `Usa los números [n] de los papers para referenciar. Si alguna sección no aplica, devuélvela como lista vacía. ` +
    `Sé concreto y crítico, especialmente en contradictions y gaps.`;

  try {
    const raw = await groqChat({
      model: MODEL_SMART,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2200,
      temperature: 0.3,
      timeout: 30000,
    }) || '';

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { available: false };

    const report = JSON.parse(match[0]);

    const sources = used.map((p, i) => ({
      n:       i + 1,
      title:   p.title,
      authors: p.authors,
      year:    p.publication_year,
      doi:     p.doi,
      url:     p.url || (p.doi ? `https://doi.org/${p.doi}` : null),
    }));

    return {
      available: true,
      report: {
        summary:        report.summary || '',
        themes:         Array.isArray(report.themes)         ? report.themes         : [],
        methods:        Array.isArray(report.methods)        ? report.methods        : [],
        findings:       Array.isArray(report.findings)       ? report.findings       : [],
        contradictions: Array.isArray(report.contradictions) ? report.contradictions : [],
        gaps:           Array.isArray(report.gaps)           ? report.gaps           : [],
      },
      sources,
      analyzed: used.length,
      total:    papers.length,
    };
  } catch (err) {
    console.warn('analyzeCollection (Groq):', err.message);
    return { available: false };
  }
}

module.exports = { analyzeCollection };
