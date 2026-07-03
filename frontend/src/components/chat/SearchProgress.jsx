import React, { useState, useEffect, useRef } from 'react';
import { Check } from '../Icons';
import citoLogo from '../../assets/citae-logo-v2.png';

// Pasos "agénticos" que se revelan mientras la búsqueda está en vuelo.
// La última etapa (ordenar) queda pulsando hasta que llegan los resultados
// y el componente se desmonta.
const STEPS = [
  'Analizando tu consulta',
  'Consultando CrossRef',
  'Consultando Semantic Scholar',
  'Consultando OpenAlex',
  'Consultando arXiv',
  'Ordenando por relevancia',
];

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function SearchProgress({ query }) {
  const clean = (query || 'tu consulta').trim();
  const reduced = prefersReduced();

  const [typed, setTyped] = useState(reduced ? clean : '');
  const [step, setStep]   = useState(reduced ? STEPS.length - 1 : 0);
  const timers = useRef([]);

  useEffect(() => {
    if (reduced) return;
    const push = (t) => timers.current.push(t);

    // 1) Teclea la consulta.
    let i = 0;
    const typer = setInterval(() => {
      i += 1;
      setTyped(clean.slice(0, i));
      if (i >= clean.length) {
        clearInterval(typer);
        // 2) Avanza los pasos con una cadencia natural; el último se queda.
        STEPS.forEach((_, idx) => {
          if (idx === 0) return;
          push(setTimeout(() => setStep(idx), 260 + idx * 620));
        });
      }
    }, 26);
    timers.current.push(typer);

    return () => {
      clearInterval(typer);
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [clean, reduced]);

  const lastIndex = STEPS.length - 1;

  return (
    <div className="sp-card" role="status" aria-live="polite" aria-label={`Buscando ${clean}`}>
      <div className="sp-head">
        <span className="sp-orb">
          <img src={citoLogo} alt="" aria-hidden="true" />
        </span>
        <div className="sp-head-text">
          <span className="sp-title">Investigando</span>
          <span className="sp-query">
            {typed}
            {!reduced && <span className="sp-caret" aria-hidden="true" />}
          </span>
        </div>
      </div>

      <ol className="sp-steps">
        {STEPS.map((label, idx) => {
          const done   = idx < step;
          const active = idx === step;
          // El último paso nunca se marca "hecho": pulsa hasta que hay resultados.
          const state  = done ? 'done' : active ? 'active' : 'pending';
          const visible = reduced || idx <= step;
          return (
            <li
              key={label}
              className={`sp-step sp-${state} ${visible ? 'sp-in' : ''}`}
              style={{ '--sp-i': idx }}
            >
              <span className="sp-dot">
                {done && idx !== lastIndex
                  ? <Check size={12} strokeWidth={3} />
                  : <span className="sp-dot-inner" />}
              </span>
              <span className="sp-label">{label}</span>
            </li>
          );
        })}
      </ol>

      <div className="sp-bar" aria-hidden="true"><span /></div>
    </div>
  );
}

export default SearchProgress;
