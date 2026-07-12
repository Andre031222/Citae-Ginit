import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Highlighter, ChevronLeft, Check, ArrowRight, Loader, Award, BookOpen, ImageIcon,
} from '../Icons';
import { getDailyReview, markReviewed } from '../../services/highlightService';
import { colorHex } from '../../constants/highlightColors';
import QuoteshotModal from '../share/QuoteshotModal';
import notify from '../../services/swal';

const ReviewPage = ({ embedded = false }) => {
  const { t } = useTranslation();
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
      notify.error(t('tools.review.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
          <button className="lib-back" onClick={() => navigate('/library')} title={t('tools.review.backTitle')}>
            <ChevronLeft size={16} />
            {t('tools.review.back')}
          </button>
          <div className="rv-brand">
            <BookOpen size={18} />
            <h1 className="rv-title">{t('tools.review.heading')}</h1>
          </div>
          {stats && (
            <span className="rv-stats" title={t('tools.review.statsTitle')}>
              {t('tools.review.statsCount', { done: stats.done_today, total: stats.total })}
            </span>
          )}
        </header>
      )}

      <div className="rv-body">
        {loading ? (
          <div className="rv-loading">
            <Loader size={22} className="lib-spin" />
            {t('tools.review.preparing')}
          </div>
        ) : finished ? (
          <div className="rv-finished">
            <div className="rv-finished-icon"><Award size={40} /></div>
            <h2>{done > 0 ? t('tools.review.completed') : t('tools.review.nothing')}</h2>
            <p>
              {done > 0
                ? t('tools.review.reviewedSummary', { count: done })
                : t('tools.review.nothingHint')}
            </p>
            <div className="rv-finished-actions">
              <button className="lib-btn-ghost" onClick={load}>{t('tools.review.reviewAgain')}</button>
              <button className="lib-btn-primary" onClick={() => navigate('/library')}>{t('tools.review.goLibrary')}</button>
            </div>
          </div>
        ) : (
          <>
            <div className="rv-progress">
              <div className="rv-progress-bar" style={{ width: `${(index / cards.length) * 100}%` }} />
            </div>
            <span className="rv-counter">{t('tools.review.counter', { current: index + 1, total: cards.length })}</span>

            <div className="rv-card" style={{ '--card-accent': colorHex(current.color) }}>
              <div className="rv-card-mark"><Highlighter size={15} /></div>
              <button className="rv-share" onClick={() => setShareCard(current)} title={t('tools.review.shareTitle')}>
                <ImageIcon size={15} />
              </button>
              <blockquote className="rv-quote">"{current.quote}"</blockquote>
              {current.note && (
                <p className="rv-note"><span>{t('tools.review.yourNote')}</span> {current.note}</p>
              )}
              <div className="rv-source">
                {current.paper_title && <span className="rv-source-title">{current.paper_title}</span>}
                <span className="rv-source-meta">
                  {[current.paper_authors?.split(',')[0], current.paper_year].filter(Boolean).join(' · ')}
                </span>
              </div>
              {current.review_count > 0 && (
                <span className="rv-review-count">{t('tools.review.reviewCount', { count: current.review_count })}</span>
              )}
            </div>

            <div className="rv-actions">
              <button className="rv-skip" onClick={advance}>
                {t('tools.review.skip')} <ArrowRight size={14} />
              </button>
              <button className="rv-done" onClick={handleReviewed}>
                <Check size={15} /> {t('tools.review.done')}
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
