import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Highlighter, ChevronLeft, Check, ArrowRight, Loader, Award, BookOpen, ImageIcon,
} from '../Icons';
import { getDailyReview, markReviewed } from '../../services/highlightService';
import { colorHex } from '../../constants/highlightColors';
import QuoteshotModal from '../share/QuoteshotModal';
import notify from '../../services/swal';

const ReviewPage = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [cards,   setCards]   = useState([]);
  const [stats,   setStats]   = useState(null);
  const [index,   setIndex]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [done,    setDone]    = useState(0);
  const [shareCard, setShareCard] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDailyReview(8);
      setCards(data.highlights || []);
      setStats(data.stats || null);
      setIndex(0);
      setDone(0);
    } catch {
      notify.error('No se pudo cargar el repaso');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const current = cards[index];
  const finished = !loading && (cards.length === 0 || index >= cards.length);

  const advance = () => setIndex(i => i + 1);

  const handleReviewed = async () => {
    if (!current) return;
    try {
      await markReviewed(current.id);
      setDone(d => d + 1);
    } catch {}
    advance();
  };

  return (
    <div className={`rv-page ${embedded ? 'is-embedded' : ''}`}>
      {!embedded && (
        <header className="rv-topbar">
          <button className="lib-back" onClick={() => navigate('/library')} title="Volver a la biblioteca">
            <ChevronLeft size={16} />
            Biblioteca
          </button>
          <div className="rv-brand">
            <BookOpen size={18} />
            <h1 className="rv-title">Repaso del día</h1>
          </div>
          {stats && (
            <span className="rv-stats" title="Pendientes de repasar hoy">
              {stats.done_today} / {stats.total} repasados
            </span>
          )}
        </header>
      )}

      <div className="rv-body">
        {loading ? (
          <div className="rv-loading">
            <Loader size={22} className="lib-spin" />
            Preparando tu repaso…
          </div>
        ) : finished ? (
          <div className="rv-finished">
            <div className="rv-finished-icon"><Award size={40} /></div>
            <h2>{done > 0 ? '¡Repaso completado!' : 'Nada que repasar por ahora'}</h2>
            <p>
              {done > 0
                ? `Repasaste ${done} resaltado${done === 1 ? '' : 's'}. Vuelve mañana para reforzar lo que guardas.`
                : 'Cuando resaltes pasajes en tus papers, aparecerán aquí para un repaso diario espaciado.'}
            </p>
            <div className="rv-finished-actions">
              <button className="lib-btn-ghost" onClick={load}>Repasar de nuevo</button>
              <button className="lib-btn-primary" onClick={() => navigate('/library')}>Ir a la biblioteca</button>
            </div>
          </div>
        ) : (
          <>
            <div className="rv-progress">
              <div className="rv-progress-bar" style={{ width: `${(index / cards.length) * 100}%` }} />
            </div>
            <span className="rv-counter">{index + 1} de {cards.length}</span>

            <div className="rv-card" style={{ '--card-accent': colorHex(current.color) }}>
              <div className="rv-card-mark"><Highlighter size={15} /></div>
              <button className="rv-share" onClick={() => setShareCard(current)} title="Crear imagen compartible">
                <ImageIcon size={15} />
              </button>
              <blockquote className="rv-quote">"{current.quote}"</blockquote>
              {current.note && (
                <p className="rv-note"><span>Tu nota:</span> {current.note}</p>
              )}
              <div className="rv-source">
                {current.paper_title && <span className="rv-source-title">{current.paper_title}</span>}
                <span className="rv-source-meta">
                  {[current.paper_authors?.split(',')[0], current.paper_year].filter(Boolean).join(' · ')}
                </span>
              </div>
              {current.review_count > 0 && (
                <span className="rv-review-count">Repasado {current.review_count} vez(es)</span>
              )}
            </div>

            <div className="rv-actions">
              <button className="rv-skip" onClick={advance}>
                Saltar <ArrowRight size={14} />
              </button>
              <button className="rv-done" onClick={handleReviewed}>
                <Check size={15} /> Repasado
              </button>
            </div>
          </>
        )}
      </div>

      {shareCard && (
        <QuoteshotModal highlight={shareCard} onClose={() => setShareCard(null)} />
      )}
    </div>
  );
};

export default ReviewPage;
