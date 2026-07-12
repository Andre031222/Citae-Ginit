import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Radar, Loader, ChevronLeft, Search, AlertCircle, ExternalLink } from '../Icons';
import { verifyClaimRadar } from '../../services/libraryService';
import notify from '../../services/swal';

const VERDICT_CONFIG = {
  APOYA:      { cls: 'cr-v-apoya'      },
  CONTRADICE: { cls: 'cr-v-contradice' },
  MIXTO:      { cls: 'cr-v-mixto'      },
  NEUTRO:     { cls: 'cr-v-neutro'     },
};

const VERDICT_ORDER = ['APOYA', 'MIXTO', 'CONTRADICE', 'NEUTRO'];

// Resuelve la etiqueta visible de un veredicto (el codigo se mantiene en la logica).
const verdictLabel = (t, code) => t(`tools.claim.verdict.${String(code).toLowerCase()}`);

function DistributionBar({ stats, total }) {
  const { t } = useTranslation();
  if (!total) return null;
  const segments = [
    { key: 'apoya',      cls: 'cr-seg-apoya',      label: verdictLabel(t, 'apoya')      },
    { key: 'mixto',      cls: 'cr-seg-mixto',       label: verdictLabel(t, 'mixto')      },
    { key: 'contradice', cls: 'cr-seg-contradice',  label: verdictLabel(t, 'contradice') },
    { key: 'neutro',     cls: 'cr-seg-neutro',       label: verdictLabel(t, 'neutro')    },
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
  const { t } = useTranslation();
  const code = VERDICT_CONFIG[paper.verdict] ? paper.verdict : 'NEUTRO';
  const cfg = VERDICT_CONFIG[code];
  const meta = [paper.authors?.split(',')[0], paper.publication_year, paper.journal]
    .filter(Boolean).join(' · ');

  return (
    <div className="cr-card">
      <div className="cr-card-top">
        <span className={`cr-badge ${cfg.cls}`}>{verdictLabel(t, code)}</span>
        {paper.url && (
          <a href={paper.url} target="_blank" rel="noopener noreferrer" className="cr-ext-link" title={t('tools.claim.openPaper')}>
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
  const { t } = useTranslation();
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
    setPhase(t('tools.claim.phase'));
    try {
      const data = await verifyClaimRadar(q);
      setResult(data);
    } catch (err) {
      notify.error(err.response?.data?.error || t('tools.claim.verifyError'));
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
          <button className="lib-back" onClick={() => navigate('/library')} title={t('tools.claim.backTitle')}>
            <ChevronLeft size={16} />
            {t('tools.claim.back')}
          </button>
          <div className="cr-brand">
            <Radar size={18} />
            <h1 className="cr-title">{t('tools.claim.heading')}</h1>
          </div>
        </header>
      )}

      <div className="cr-body">
        <div className="cr-input-section">
          <p className="cr-subtitle">
            {t('tools.claim.subtitle')}
          </p>
          <div className="cr-input-wrap">
            <textarea
              ref={inputRef}
              className="cr-claim-input"
              value={claim}
              onChange={e => setClaim(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('tools.claim.placeholder')}
              rows={3}
              disabled={loading}
            />
            <button
              className="cr-submit"
              onClick={handleVerify}
              disabled={loading || !claim.trim()}
            >
              {loading
                ? <><Loader size={14} className="lib-spin" /> {t('tools.claim.verifying')}</>
                : <><Search size={14} /> {t('tools.claim.verify')}</>
              }
            </button>
          </div>
          {loading && <p className="cr-phase">{phase}</p>}
          {result && !result.available && (
            <div className="cr-warning">
              <AlertCircle size={14} />
              {t('tools.claim.aiUnavailable')}
            </div>
          )}
        </div>

        {result && (
          <div className="cr-results">
            <div className="cr-results-header">
              <span className="cr-results-count">{t('tools.claim.papersAnalyzed', { count: result.papers.length })}</span>
              <DistributionBar stats={result.stats} total={total} />
            </div>

            {grouped.map(group => (
              <div key={group.verdict} className="cr-group">
                <h3 className={`cr-group-title ${VERDICT_CONFIG[group.verdict]?.cls || ''}`}>
                  {VERDICT_CONFIG[group.verdict] ? verdictLabel(t, group.verdict) : group.verdict}
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
