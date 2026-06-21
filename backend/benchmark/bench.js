/**
 * Benchmark de las funciones CPU-bound del backend.
 * Mide rendimiento sin dependencias externas (performance.now()).
 * Uso: pnpm --filter @citae/backend run bench
 */
const { performance } = require('perf_hooks');
const matcher = require('../src/services/candidateMatcher');
const citationFormatter = require('../src/services/citationFormatter');
const queryFilters = require('../src/services/queryFilters');
const exportFormatter = require('../src/services/exportFormatter');

function bench(name, fn, iterations) {
  fn(); // warm-up (JIT)
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const totalMs = performance.now() - start;
  const opsPerSec = Math.round(iterations / (totalMs / 1000));
  const usPerOp = (totalMs * 1000) / iterations;
  console.log(
    `  ${name.padEnd(38)} ${opsPerSec.toLocaleString().padStart(12)} ops/s  ` +
    `${usPerOp.toFixed(2).padStart(9)} µs/op`
  );
}

const SOURCES = ['crossref', 'openalex', 'semanticscholar', 'arxiv'];
const WORDS = ('deep learning neural network attention transformer graph ' +
  'reinforcement model language vision generative diffusion embedding').split(' ');

function makeCandidate(i) {
  const n = 3 + (i % 6);
  const title = Array.from({ length: n }, (_, k) => WORDS[(i + k) % WORDS.length]).join(' ');
  return {
    title,
    authors: `Author ${i % 50}, Coauthor ${(i * 7) % 50}`,
    publication_year: 2000 + (i % 25),
    journal: `Journal of ${WORDS[i % WORDS.length]}`,
    doi: i % 3 === 0 ? `10.1000/bench.${i}` : '',
    url: '', volume: `${i % 40}`, issue: `${i % 12}`, pages: `${i}-${i + 10}`,
    publisher: 'Bench Press',
    abstract: title + ' abstract text repeated for size. '.repeat(3),
    citationCount: (i * 13) % 5000,
    source: SOURCES[i % SOURCES.length],
    sources: SOURCES.slice(0, 1 + (i % 4)),
  };
}

const candidates = Array.from({ length: 200 }, (_, i) => makeCandidate(i));
const queryParsed = matcher.parseQuery('attention transformer language model 2017');
const paper = candidates[0];

console.log('\n  CITAE — Benchmark de funciones CPU-bound\n  ' + '─'.repeat(62));

console.log('\n  candidateMatcher');
bench('scoreCandidate (1 candidato)', () => matcher.scoreCandidate(queryParsed, paper), 200_000);
bench('dedupeAndMerge (200 candidatos)', () => matcher.dedupeAndMerge(candidates), 2_000);
bench('rank+classify (200 candidatos)', () => {
  const ranked = candidates
    .map(c => ({ ...c, score: matcher.scoreCandidate(queryParsed, c).score }))
    .sort((a, b) => b.score - a.score);
  matcher.classify(ranked, true);
}, 2_000);

console.log('\n  citationFormatter');
for (const fmt of ['APA', 'BibTeX', 'IEEE']) {
  bench(`format ${fmt}`, () => citationFormatter.format(paper, fmt), 100_000);
}

console.log('\n  queryFilters');
bench('parseNaturalFilters', () =>
  queryFilters.parseNaturalFilters('redes neuronales desde 2018 con más de 100 citas'), 100_000);

console.log('\n  exportFormatter (50 papers)');
const fifty = candidates.slice(0, 50);
bench('toBibTeX', () => exportFormatter.toBibTeX(fifty), 5_000);
bench('toRIS', () => exportFormatter.toRIS(fifty), 5_000);
bench('toCSV', () => exportFormatter.toCSV(fifty), 5_000);
bench('toMarkdown', () => exportFormatter.toMarkdown(fifty), 5_000);

console.log('\n  ' + '─'.repeat(62));
console.log('  Benchmark completado.\n');
