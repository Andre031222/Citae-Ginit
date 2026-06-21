import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { renderPdfFirstPage } from '../../services/pdfThumbnail';

function hashStr(s) {
  let h = 0;
  const str = String(s || '');
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

const PALETTES = [
  ['#0056D6', '#3B82F6'],
  ['#0F766E', '#14B8A6'],
  ['#7C3AED', '#A78BFA'],
  ['#B45309', '#F59E0B'],
  ['#BE185D', '#F472B6'],
  ['#1E3A8A', '#3B82F6'],
  ['#065F46', '#10B981'],
  ['#9A3412', '#FB923C'],
];

const previewCache = new Map();

/* Cola de concurrencia: máx 2 previews a la vez para no saturar las ~6
   conexiones del navegador y dejar libres las peticiones críticas (abstract). */
const MAX_CONCURRENT = 2;
let activeCount = 0;
const waitQueue = [];

function release() {
  activeCount--;
  pump();
}

function pump() {
  while (activeCount < MAX_CONCURRENT && waitQueue.length) {
    const { run, resolve } = waitQueue.shift();
    activeCount++;
    run().then(resolve).finally(release);
  }
}

function schedule(run) {
  return new Promise(resolve => { waitQueue.push({ run, resolve }); pump(); });
}

function buildParams(paper) {
  const params = new URLSearchParams();
  if (paper.doi) params.set('doi', paper.doi);
  else if (paper.url) params.set('url', paper.url);
  else return null;
  return params;
}

async function loadPreview(paper) {
  const key = paper?.doi || paper?.url || paper?.title;
  if (!key) return null;
  if (previewCache.has(key)) return previewCache.get(key);

  const params = buildParams(paper);
  if (!params) return null;

  const promise = schedule(() =>
    api.get(`/papers/preview?${params.toString()}`)
      .then(res => res.data?.image ? { url: res.data.image, kind: res.data.kind || 'figure' } : null)
      .catch(() => null)
  );
  previewCache.set(key, promise);
  const img = await promise;
  previewCache.set(key, img);
  return img;
}

/* Portada del PDF — sólo PDFs con CORS abierto (arXiv). Render pesado: de 1 en 1. */
const pdfCache = new Map();
let pdfBusy = false;
const pdfQueue = [];

function pdfPump() {
  if (pdfBusy || !pdfQueue.length) return;
  pdfBusy = true;
  const { run, resolve } = pdfQueue.shift();
  run().then(resolve).finally(() => { pdfBusy = false; pdfPump(); });
}
function pdfSchedule(run) {
  return new Promise(resolve => { pdfQueue.push({ run, resolve }); pdfPump(); });
}

async function loadPdfCover(paper) {
  const key = paper?.doi || paper?.url || paper?.title;
  if (!key) return null;
  if (pdfCache.has(key)) return pdfCache.get(key);

  const params = buildParams(paper);
  if (!params) return null;

  const promise = (async () => {
    try {
      const res = await schedule(() => api.get(`/papers/pdf-url?${params.toString()}`));
      const pdfUrl = res.data?.pdfUrl;
      if (!pdfUrl || !/^https:\/\/arxiv\.org\//i.test(pdfUrl)) return null;
      return await pdfSchedule(() => renderPdfFirstPage(pdfUrl).catch(() => null));
    } catch {
      return null;
    }
  })();

  pdfCache.set(key, promise);
  const img = await promise;
  pdfCache.set(key, img);
  return img;
}

const PaperCover = ({ paper, size = 92, className = '' }) => {
  const seed = paper?.doi || paper?.title || 'paper';
  const palette = PALETTES[hashStr(seed) % PALETTES.length];
  const angle = (hashStr(seed.split('').reverse().join('')) % 90) + 30;

  const letter = (paper?.title || paper?.journal || '?').trim().charAt(0).toUpperCase() || '?';
  const year = paper?.publication_year || '';

  const [img, setImg]       = useState(null);
  const [failed, setFailed] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!(paper?.doi || paper?.url)) return;
    const el = ref.current;
    if (!el) return;

    let active = true;
    setImg(null);
    setFailed(false);

    const start = () => {
      // Espera a que el navegador esté libre para no competir con el abstract
      const fire = async () => {
        if (!active) return;
        const og = await loadPreview(paper);
        if (!active) return;
        if (og) { setImg(og); return; }
        const pdfThumb = await loadPdfCover(paper);
        if (active && pdfThumb) setImg({ url: pdfThumb, kind: 'figure' });
      };
      if (window.requestIdleCallback) window.requestIdleCallback(fire, { timeout: 1500 });
      else setTimeout(fire, 400);
    };

    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        io.disconnect();
        start();
      }
    }, { rootMargin: '200px' });

    io.observe(el);
    return () => { active = false; io.disconnect(); };
  }, [paper]);

  const showImage = img && !failed;

  return (
    <div
      ref={ref}
      className={`pcover ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(${angle}deg, ${palette[0]}, ${palette[1]})`,
      }}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          src={img.url}
          alt=""
          className={img.kind === 'logo' ? 'pcover-logo' : 'pcover-img'}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          <svg className="pcover-pattern" viewBox="0 0 100 100" preserveAspectRatio="none">
            <circle cx="78" cy="22" r="30" fill="rgba(255,255,255,0.10)" />
            <circle cx="20" cy="84" r="20" fill="rgba(255,255,255,0.08)" />
          </svg>
          <span className="pcover-letter">{letter}</span>
          {year && <span className="pcover-year">{year}</span>}
        </>
      )}
    </div>
  );
};

export default PaperCover;
