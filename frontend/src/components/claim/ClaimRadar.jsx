import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radar, Loader, ChevronLeft, Search, AlertCircle, ExternalLink } from '../Icons';
import { verifyClaimRadar } from '../../services/libraryService';
import notify from '../../services/swal';

const VERDICT_CONFIG = {
  APOYA:      { label: 'Apoya',      cls: 'cr-v-apoya'      },
  CONTRADICE: { label: 'Contradice', cls: 'cr-v-contradice'  },
  MIXTO:      { label: 'Mixto',      cls: 'cr-v-mixto'       },
  NEUTRO:     { label: 'Neutro',     cls: 'cr-v-neutro'      },
};

const VERDICT_ORDER = ['APOYA', 'MIXTO', 'CONTRADICE', 'NEUTRO'];

function DistributionBar({ stats, total }) {
  if (!total) return null;
  const segments = [
    { key: 'apoya',      cls: 'cr-seg-apoya',      label: 'Apoya'      },
    { key: 'mixto',      cls: 'cr-seg-mixto',       label: 'Mixto'      },
    { key: 'contradice', cls: 'cr-seg-contradice',  label: 'Contradice' },
    { key: 'neutro',     cls: 'cr-seg-neutro',       label: 'Neutro'    },
  ].filter(s => stats[s.key] > 0);

  return (
    <div className="cr-distribution">
      <div className="cr-dist-bar">
        {segments.map(s => (
          <div
            key={s.key}
            className={`cr-dist-seg ${s.cls}`}
            style={{ width: `${(stats[s.key] / total) * 100}%` }}
            title={`${s.label}: ${stats[s.key]}`}
          />
        ))}
      </div>
      <div className="cr-dist-legend">
        {segments.map(s => (
          <span key={s.key} className="cr-legend-item">
            <span className={`cr-legend-dot ${s.cls}`} />
            {s.label} {stats[s.key]}
          </span>
        ))}
      </div>
    </div>
  );
}

function PaperCard({ paper }) {
  const cfg = VERDICT_CONFIG[paper.verdict] || VERDICT_CONFIG.NEUTRO;
  const meta = [paper.authors?.split(',')[0], paper.publication_year, paper.journal]
    .filter(Boolean).join(' · ');

  return (
    <div className="cr-card">
      <div className="cr-card-top">
        <span className={`cr-badge ${cfg.cls}`}>{cfg.label}</span>
        {paper.url && (
          <a href={paper.url} target="_blank" rel="noopener noreferrer" className="cr-ext-link" title="Abrir paper">
            <ExternalLink size={12} />
          </a>
        )}
      </div>
      <p className="cr-card-title">{paper.title}</p>
      {meta && <p className="cr-card-meta">{meta}</p>}
      {paper.evidence && (
        <blockquote className="cr-evidence">"{paper.evidence}"</blockquote>
      )}
    </div>
  );
}

const ClaimRadar = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [claim,   setClaim]   = useState('');
  const [loading, setLoading] = useState(false);
  const [phase,   setPhase]   = useState('');
  const [result,  setResult]  = useState(null);
  const inputRef = useRef(null);

  const handleVerify = async () => {
    const q = claim.trim();
    if (!q) { inputRef.current?.focus(); return; }
    setLoading(true);
    setResult(null);
    setPhase('Buscando en 4 fuentes académicas…');
    try {
      const data = await verifyClaimRadar(q);
      setResult(data);
    } catch (err) {
      notify.error(err.response?.data?.error || 'No se pudo verificar la afirmación');
    } finally {
      setLoading(false);
      setPhase('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleVerify();
  };

  const total = result ? Object.values(result.stats).reduce((s, v) => s + v, 0) : 0;

  const grouped = result
    ? VERDICT_ORDER.reduce((acc, v) => {
        const papers = result.papers.filter(p => p.verdict === v);
        if (papers.length) acc.push({ verdict: v, papers });
        return acc;
      }, [])
    : [];

  return (
    <div className={`cr-page ${embedded ? 'is-embedded' : ''}`}>
      {!embedded && (
        <header className="cr-topbar">
          <button className="lib-back" onClick={() => navigate('/library')} title="Volver a la biblioteca">
            <ChevronLeft size={16} />
            Biblioteca
          </button>
          <div className="cr-brand">
            <Radar size={18} />
            <h1 className="cr-title">Radar de Afirmaciones</h1>
          </div>
        </header>
      )}

      <div className="cr-body">
        <div className="cr-input-section">
          <p className="cr-subtitle">
            Escribe una afirmación académica y Citae buscará en la literatura evidencia que la apoya, contradice o tiene resultados mixtos.
          </p>
          <div className="cr-input-wrap">
            <textarea
              ref={inputRef}
              className="cr-claim-input"
              value={claim}
              onChange={e => setClaim(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ej: Los modelos de lenguaje grandes reducen la creatividad en tareas de escritura…"
              rows={3}
              disabled={loading}
            />
            <button
              className="cr-submit"
              onClick={handleVerify}
              disabled={loading || !claim.trim()}
            >
              {loading
                ? <><Loader size={14} className="lib-spin" /> Verificando…</>
                : <><Search size={14} /> Verificar</>
              }
            </button>
          </div>
          {loading && <p className="cr-phase">{phase}</p>}
          {result && !result.available && (
            <div className="cr-warning">
              <AlertCircle size={14} />
              IA no disponible — configura GROQ_API_KEY para clasificar la evidencia
            </div>
          )}
        </div>

        {result && (
          <div className="cr-results">
            <div className="cr-results-header">
              <span className="cr-results-count">{result.papers.length} papers analizados</span>
              <DistributionBar stats={result.stats} total={total} />
            </div>

            {grouped.map(group => (
              <div key={group.verdict} className="cr-group">
                <h3 className={`cr-group-title ${VERDICT_CONFIG[group.verdict]?.cls || ''}`}>
                  {VERDICT_CONFIG[group.verdict]?.label || group.verdict}
                  <span className="cr-group-count">{group.papers.length}</span>
                </h3>
                <div className="cr-cards">
                  {group.papers.map((p, i) => <PaperCard key={i} paper={p} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClaimRadar;
