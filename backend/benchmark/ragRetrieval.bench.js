/**
 * Benchmark del RECUPERADOR BM25 en memoria (src/services/ragService.js).
 *
 * Mide el coste de construir el índice y rankear (top-6) sobre corpus de
 * distinto tamaño, con el MISMO código que usa el asistente de biblioteca.
 * No abre conexión a la base de datos (retrieve es una función pura).
 *
 * Uso: node backend/benchmark/ragRetrieval.bench.js
 */
const { performance } = require('perf_hooks');
const { retrieve } = require('../src/services/ragService');

const WORDS = ('deep learning neural network attention transformer graph reinforcement ' +
  'model language vision generative diffusion embedding retrieval augmented education ' +
  'literacy hallucination grounding citation semantic scholar corpus passage evidence ' +
  'ranking lexical').split(' ');

function makeChunk(i) {
  const n = 20 + (i % 40);
  const text = Array.from({ length: n }, (_, k) => WORDS[(i * 7 + k * 3) % WORDS.length]).join(' ');
  return { id: `c${i}`, kind: i % 3 ? 'paper' : 'highlight', refId: i, title: `Doc ${i}`, text, meta: { year: 2000 + (i % 25) } };
}

function bench(n, iters) {
  const corpus = Array.from({ length: n }, (_, i) => makeChunk(i));
  const q = 'retrieval augmented generation grounding hallucination';
  retrieve(corpus, q, 6); // warm-up (JIT)
  const t0 = performance.now();
  for (let i = 0; i < iters; i++) retrieve(corpus, q, 6);
  const ms = (performance.now() - t0) / iters;
  console.log(`  corpus=${String(n).padStart(4)} passages   ${ms.toFixed(3).padStart(8)} ms/query`);
}

console.log('\n  CITAE — BM25 in-memory retriever (index build + score, top-6)\n  ' + '─'.repeat(52));
for (const n of [10, 50, 100, 200, 500, 1000]) bench(n, 2000);
console.log('  ' + '─'.repeat(52) + '\n');
