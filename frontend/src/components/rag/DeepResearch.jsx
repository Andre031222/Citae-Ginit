import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText, ChevronLeft, Loader, Sparkles, ExternalLink,
  Zap, AlertCircle, Award, Search,
} from '../Icons';
import { getCollections, deepResearch } from '../../services/libraryService';
import { renderCited } from '../common/CiteText';
import notify from '../../services/swal';

const SECTIONS = [
  { key: 'themes',         label: 'Temas y clusters',  icon: Search,      kind: 'themes' },
  { key: 'methods',        label: 'Metodologías',       icon: FileText,    kind: 'list'  },
  { key: 'findings',       label: 'Hallazgos clave',    icon: Award,       kind: 'list'  },
  { key: 'contradictions', label: 'Contradicciones',    icon: Zap,         kind: 'list'  },
  { key: 'gaps',           label: 'Vacíos de investigación', icon: AlertCircle, kind: 'list' },
];

const renderRefs = (text, sources) => renderCited(text, { sources });

const DeepResearch = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [collections, setCollections] = useState([]);
  const [selected,    setSelected]    = useState(params.get('collection') || '');
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState(null);

  useEffect(() => {
    getCollections().then(setCollections).catch(() => {});
  }, []);

  const run = useCallback(async (collectionId) => {
    if (!collectionId) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await deepResearch(collectionId);
      setResult(r);
    } catch (err) {
      notify.error(err.response?.data?.error || 'No se pudo generar el análisis');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGenerate = () => {
    if (!selected) { notify.info('Elige una colección'); return; }
    run(selected);
  };

  const report = result?.report;

  return (
    <div className="dr-page">
      <header className="dr-topbar">
        <button className="lib-back" onClick={() => navigate('/library')} title="Volver a la biblioteca">
          <ChevronLeft size={16} />
          Biblioteca
        </button>
        <div className="dr-brand">
          <FileText size={18} />
          <h1 className="dr-title">Deep Research</h1>
        </div>
      </header>

      <div className="dr-body">
        <div className="dr-controls">
          <p className="dr-subtitle">
            Elige una colección y la IA generará una revisión de literatura: temas, metodologías, hallazgos, contradicciones y vacíos.
          </p>
          <div className="dr-picker">
            <select
              className="dr-select"
              value={selected}
              onChange={e => setSelected(e.target.value)}
              disabled={loading}
            >
              <option value="">Selecciona una colección…</option>
              {collections.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.paper_count})</option>
              ))}
            </select>
            <button className="dr-generate" onClick={handleGenerate} disabled={loading || !selected}>
              {loading
                ? <><Loader size={14} className="lib-spin" /> Analizando…</>
                : <><Sparkles size={14} /> Generar informe</>}
            </button>
          </div>
          {loading && <p className="dr-phase">Leyendo los papers y sintetizando patrones… puede tardar unos segundos.</p>}
        </div>

        {result && result.insufficient && (
          <div className="dr-warning">
            <AlertCircle size={15} />
            Esta colección necesita al menos 2 papers para analizar.
          </div>
        )}

        {result && result.available === false && (
          <div className="dr-warning">
            <AlertCircle size={15} />
            La IA no está disponible. Configura GROQ_API_KEY en el servidor.
          </div>
        )}

        {report && (
          <div className="dr-report">
            <div className="dr-report-head">
              <span className="dr-analyzed">
                {result.analyzed} de {result.total} papers analizados
              </span>
            </div>

            {report.summary && (
              <section className="dr-summary">
                <h2 className="dr-summary-title"><Sparkles size={14} /> Síntesis</h2>
                <p>{renderRefs(report.summary, result.sources)}</p>
              </section>
            )}

            {SECTIONS.map(sec => {
              const items = report[sec.key];
              if (!items?.length) return null;
              const Icon = sec.icon;
              return (
                <section key={sec.key} className={`dr-section dr-section-${sec.key}`}>
                  <h3 className="dr-section-title"><Icon size={14} /> {sec.label}</h3>
                  {sec.kind === 'themes' ? (
                    <div className="dr-themes">
                      {items.map((t, i) => (
                        <div key={i} className="dr-theme-card">
                          <p className="dr-theme-title">{t.title}</p>
                          {t.detail && <p className="dr-theme-detail">{renderRefs(t.detail, result.sources)}</p>}
                          {t.papers?.length > 0 && (
                            <div className="dr-theme-refs">
                              {t.papers.map(n => <span key={n} className="dr-chip">[{n}]</span>)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ul className="dr-list">
                      {items.map((it, i) => <li key={i}>{renderRefs(it, result.sources)}</li>)}
                    </ul>
                  )}
                </section>
              );
            })}

            <section className="dr-section dr-sources-section">
              <h3 className="dr-section-title"><FileText size={14} /> Papers analizados</h3>
              <ol className="dr-sources">
                {result.sources.map(s => (
                  <li key={s.n} className="dr-source">
                    <span className="dr-source-n">[{s.n}]</span>
                    <span className="dr-source-body">
                      <span className="dr-source-title">{s.title}</span>
                      <span className="dr-source-meta">
                        {[s.authors?.split(',')[0], s.year].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    {s.url && (
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="dr-source-link" title="Abrir">
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeepResearch;
