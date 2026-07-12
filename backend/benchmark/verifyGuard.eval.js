/**
 * Evaluación reproducible del GUARD DE VERIFICACIÓN DE PASAJES.
 *
 * El asistente de documento único pide al modelo que copie, textualmente, las
 * frases del texto fuente que respaldan su respuesta. Antes de mostrarlas como
 * "trust cards", `verifyPassages` (en src/services/aiComparator.js) comprueba
 * que cada frase aparezca de verdad en la fuente (coincidencia por subcadena
 * normalizada, con respaldo por las primeras 8 palabras) y DESCARTA las que no.
 *
 * Este script mide, de forma 100% determinista y sin claves de IA, la capacidad
 * del guard para (a) conservar citas genuinas y (b) rechazar paráfrasis y citas
 * fabricadas. Incluye a propósito un caso adversario (prefijo genuino + cola
 * inventada) para exponer el límite conocido del guard.
 *
 * Uso: node backend/benchmark/verifyGuard.eval.js
 */
const { verifyPassages } = require('../src/services/aiComparator');

// --- Textos fuente (fixtures académicos sintéticos) -----------------------
const SRC = {
  rag: `Retrieval-augmented generation grounds a language model in passages retrieved
from an external corpus, reducing hallucination on knowledge-intensive tasks.
The retriever selects the most relevant documents and the generator conditions
its answer on them, so factual claims can be traced back to the retrieved evidence.`,
  edu: `La alfabetización informacional es un determinante del éxito académico en la
educación superior y a distancia, donde el estudiante dirige buena parte de su
propio estudio. Integrar el descubrimiento, la lectura y la citación en un mismo
entorno reduce el cambio de contexto entre herramientas fragmentadas.`,
  bm25: `Okapi BM25 ranks documents by a term-frequency saturation function with
parameters k1 and b that control frequency scaling and length normalization.
It remains a strong, transparent lexical baseline that needs no training data
and no vector index, which makes it cheap to deploy for small personal corpora.`,
};

// --- Sondas etiquetadas ---------------------------------------------------
// category: verbatim | paraphrase | fabricated | adversarial | tooShort
// ideal:    true = debería CONSERVARSE, false = debería DESCARTARSE
const PROBES = [
  // verbatim (misma frase; variaciones de mayúsculas/acentos/comillas)
  { src: 'rag',  cat: 'verbatim', ideal: true,  q: 'the retriever selects the most relevant documents' },
  { src: 'rag',  cat: 'verbatim', ideal: true,  q: 'Retrieval-augmented generation grounds a language model in passages' },
  { src: 'rag',  cat: 'verbatim', ideal: true,  q: '"so factual claims can be traced back to the retrieved evidence"' },
  { src: 'edu',  cat: 'verbatim', ideal: true,  q: 'La alfabetizacion informacional es un determinante del exito academico' },
  { src: 'edu',  cat: 'verbatim', ideal: true,  q: 'reduce el cambio de contexto entre herramientas fragmentadas' },
  { src: 'bm25', cat: 'verbatim', ideal: true,  q: 'It remains a strong, transparent lexical baseline' },
  { src: 'bm25', cat: 'verbatim', ideal: true,  q: 'parameters k1 and b that control frequency scaling and length normalization' },
  { src: 'rag',  cat: 'verbatim', ideal: true,  q: 'the generator conditions its answer on them' },

  // paraphrase (mismo sentido, otras palabras: NO es cita literal)
  { src: 'rag',  cat: 'paraphrase', ideal: false, q: 'the system picks the documents that matter most for the query' },
  { src: 'rag',  cat: 'paraphrase', ideal: false, q: 'grounding the model in evidence makes it hallucinate less' },
  { src: 'edu',  cat: 'paraphrase', ideal: false, q: 'saber buscar informacion predice el rendimiento de los alumnos' },
  { src: 'edu',  cat: 'paraphrase', ideal: false, q: 'unificar las tareas en una sola plataforma evita saltar de app en app' },
  { src: 'bm25', cat: 'paraphrase', ideal: false, q: 'this ranking method works well without needing to be trained' },
  { src: 'bm25', cat: 'paraphrase', ideal: false, q: 'it scores texts using how often the query words appear' },

  // fabricated (inventado; no está en la fuente)
  { src: 'rag',  cat: 'fabricated', ideal: false, q: 'retrieval-augmented generation improved accuracy by 42 percent on TriviaQA' },
  { src: 'rag',  cat: 'fabricated', ideal: false, q: 'the corpus was indexed with a transformer cross-encoder reranker' },
  { src: 'edu',  cat: 'fabricated', ideal: false, q: 'el 87 por ciento de los estudiantes prefiere leer en papel impreso' },
  { src: 'edu',  cat: 'fabricated', ideal: false, q: 'la plataforma fue evaluada con doscientos usuarios durante seis meses' },
  { src: 'bm25', cat: 'fabricated', ideal: false, q: 'BM25 outperforms dense retrieval on every benchmark ever published' },
  { src: 'bm25', cat: 'fabricated', ideal: false, q: 'the optimal value of b is always exactly 0.9 for scientific text' },

  // adversarial (prefijo genuino de 8+ palabras + cola inventada) -> límite conocido
  { src: 'rag',  cat: 'adversarial', ideal: false, q: 'the retriever selects the most relevant documents using a proprietary neural ranker trained on ten billion pairs' },
  { src: 'bm25', cat: 'adversarial', ideal: false, q: 'Okapi BM25 ranks documents by a term-frequency saturation function that guarantees state-of-the-art recall in all domains' },

  // demasiado corto (por diseño el guard ignora frases triviales < 12 chars)
  { src: 'rag',  cat: 'tooShort', ideal: false, q: 'retriever' },
  { src: 'edu',  cat: 'tooShort', ideal: false, q: 'lectura' },
];

// --- Ejecución ------------------------------------------------------------
function run() {
  const cats = {};
  let advKept = 0, advTotal = 0;
  const rows = [];

  for (const p of PROBES) {
    const kept = verifyPassages([p.q], SRC[p.src]).length > 0;
    const correct = kept === p.ideal;
    (cats[p.cat] ||= { kept: 0, dropped: 0, correct: 0, total: 0 });
    cats[p.cat].total++;
    if (kept) cats[p.cat].kept++; else cats[p.cat].dropped++;
    if (correct) cats[p.cat].correct++;
    if (p.cat === 'adversarial') { advTotal++; if (kept) advKept++; }
    rows.push({ cat: p.cat, kept, ideal: p.ideal, correct, q: p.q.slice(0, 46) });
  }

  console.log('\n  CITAE — Evaluación del guard de verificación de pasajes');
  console.log('  (verifyPassages sobre un conjunto etiquetado; determinista)\n  ' + '─'.repeat(64));
  console.log('  ' + 'categoría'.padEnd(14) + 'n'.padStart(4) + 'conservadas'.padStart(13) + 'descartadas'.padStart(13) + 'acierto'.padStart(10));
  for (const [c, s] of Object.entries(cats)) {
    const acc = (100 * s.correct / s.total).toFixed(0) + '%';
    console.log('  ' + c.padEnd(14) + String(s.total).padStart(4) + String(s.kept).padStart(13) + String(s.dropped).padStart(13) + acc.padStart(10));
  }

  const verbatim = cats.verbatim || { kept: 0, total: 0 };
  const nonverb = ['paraphrase', 'fabricated'].reduce((a, c) => {
    a.dropped += cats[c]?.dropped || 0; a.total += cats[c]?.total || 0; return a;
  }, { dropped: 0, total: 0 });

  console.log('  ' + '─'.repeat(64));
  console.log(`  Retención de citas genuinas (verbatim):  ${verbatim.kept}/${verbatim.total}` +
    `  = ${(100 * verbatim.kept / verbatim.total).toFixed(1)}%`);
  console.log(`  Rechazo de no-literales (paráfrasis+fab): ${nonverb.dropped}/${nonverb.total}` +
    ` = ${(100 * nonverb.dropped / nonverb.total).toFixed(1)}%`);
  console.log(`  Falsos aceptados adversarios (prefijo genuino + cola falsa): ${advKept}/${advTotal}` +
    `  (límite conocido)`);
  console.log('  ' + '─'.repeat(64) + '\n');
}

run();
