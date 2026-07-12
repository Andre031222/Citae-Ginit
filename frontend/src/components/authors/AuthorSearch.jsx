import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Users, User, Loader, ChevronLeft, Search, AlertCircle,
  ExternalLink, Award, TrendingUp, Quote, BookOpen, Globe,
} from '../Icons';
import { searchAuthors, getAuthorWorks } from '../../services/authorService';
import notify from '../../services/swal';

function compact(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n || 0);
}

function AuthorCard({ author, active, onSelect }) {
  const { t } = useTranslation();
  const meta = [author.institution, author.institutionCountry].filter(Boolean).join(' · ');
  return (
    <button
      className={`au-card ${active ? 'au-card-active' : ''}`}
      onClick={() => onSelect(author)}
    >
      <span className="au-avatar"><User size={18} /></span>
      <span className="au-card-body">
        <span className="au-card-name">{author.name}</span>
        {meta && <span className="au-card-inst">{meta}</span>}
        <span className="au-card-stats">
          <span title={t('tools.author.tPublications')}><BookOpen size={12} /> {compact(author.worksCount)}</span>
          <span title={t('tools.author.tCitations')}><Quote size={12} /> {compact(author.citationCount)}</span>
          {author.hIndex > 0 && <span title={t('tools.author.tHIndex')}><Award size={12} /> h{author.hIndex}</span>}
        </span>
        {author.topics?.length > 0 && (
          <span className="au-card-topics">
            {author.topics.slice(0, 3).map((t, i) => <span key={i} className="au-topic">{t}</span>)}
          </span>
        )}
      </span>
    </button>
  );
}

function WorkRow({ work, onCite }) {
  const { t } = useTranslation();
  const meta = [work.publication_year, work.journal].filter(Boolean).join(' · ');
  return (
    <div className="au-work">
      <div className="au-work-main">
        <p className="au-work-title">{work.title}</p>
        <p className="au-work-meta">
          {meta}
          {work.citationCount > 0 && (
            <span className="au-work-cites"><Quote size={11} /> {t('tools.author.citationsCount', { count: compact(work.citationCount) })}</span>
          )}
        </p>
      </div>
      <div className="au-work-actions">
        {work.url && (
          <a href={work.url} target="_blank" rel="noopener noreferrer" className="au-work-link" title={t('tools.author.openPublication')}>
            <ExternalLink size={13} />
          </a>
        )}
        {onCite && (
          <button className="au-work-cite" onClick={() => onCite(work)} title={t('tools.author.generateCitation')}>
            <Quote size={13} /> {t('tools.author.cite')}
          </button>
        )}
      </div>
    </div>
  );
}

const AuthorSearch = ({ embedded = false, onCite }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query,    setQuery]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [authors,  setAuthors]  = useState(null);
  const [selected, setSelected] = useState(null);
  const [works,    setWorks]    = useState([]);
  const [worksLoading, setWorksLoading] = useState(false);
  const [sort,     setSort]     = useState('cited');
  const inputRef = useRef(null);

  const handleSearch = async () => {
    const q = query.trim();
    if (q.length < 2) { inputRef.current?.focus(); return; }
    setLoading(true);
    setAuthors(null);
    setSelected(null);
    setWorks([]);
    try {
      const list = await searchAuthors(q);
      setAuthors(list);
    } catch (err) {
      notify.error(t('tools.author.errorTitle'), err.response?.data?.error || t('tools.author.searchError'));
    } finally {
      setLoading(false);
    }
  };

  const loadWorks = async (author, nextSort = sort) => {
    setSelected(author);
    setSort(nextSort);
    setWorksLoading(true);
    setWorks([]);
    try {
      const list = await getAuthorWorks(author.id, nextSort);
      setWorks(list);
    } catch (err) {
      notify.error(t('tools.author.errorTitle'), err.response?.data?.error || t('tools.author.worksError'));
    } finally {
      setWorksLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className={`au-page ${embedded ? 'is-embedded' : ''}`}>
      {!embedded && (
        <header className="au-topbar">
          <button className="lib-back" onClick={() => navigate('/app')} title={t('tools.author.back')}>
            <ChevronLeft size={16} /> {t('tools.author.back')}
          </button>
          <div className="au-brand">
            <Users size={18} />
            <h1 className="au-title">{t('tools.author.heading')}</h1>
          </div>
        </header>
      )}

      <div className="au-body">
        <div className="au-search-section">
          <p className="au-subtitle">
            {t('tools.author.subtitle')}
          </p>
          <div className="au-search-wrap">
            <Search size={16} className="au-search-ic" />
            <input
              ref={inputRef}
              className="au-search-input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('tools.author.searchPlaceholder')}
              disabled={loading}
            />
            <button className="au-search-btn" onClick={handleSearch} disabled={loading || query.trim().length < 2}>
              {loading ? <Loader size={14} className="lib-spin" /> : t('tools.author.search')}
            </button>
          </div>
        </div>

        {authors && authors.length === 0 && (
          <div className="au-empty">
            <AlertCircle size={15} /> {t('tools.author.noResults', { query })}
          </div>
        )}

        {authors && authors.length > 0 && (
          <div className="au-layout">
            <div className="au-list">
              {authors.map(a => (
                <AuthorCard
                  key={a.id}
                  author={a}
                  active={selected?.id === a.id}
                  onSelect={(au) => loadWorks(au, 'cited')}
                />
              ))}
            </div>

            <div className="au-detail">
              {!selected ? (
                <div className="au-detail-empty">
                  <Users size={28} />
                  <p>{t('tools.author.selectPrompt')}</p>
                </div>
              ) : (
                <>
                  <div className="au-detail-head">
                    <div className="au-detail-id">
                      <h2 className="au-detail-name">{selected.name}</h2>
                      {selected.institution && (
                        <p className="au-detail-inst"><Globe size={12} /> {selected.institution}</p>
                      )}
                      <div className="au-detail-metrics">
                        <span><BookOpen size={13} /> {t('tools.author.worksCount', { count: compact(selected.worksCount) })}</span>
                        <span><Quote size={13} /> {t('tools.author.citationsCount', { count: compact(selected.citationCount) })}</span>
                        {selected.hIndex > 0 && <span><Award size={13} /> {t('tools.author.hIndexLabel', { count: selected.hIndex })}</span>}
                        {selected.orcid && (
                          <a href={`https://orcid.org/${selected.orcid}`} target="_blank" rel="noopener noreferrer" className="au-orcid">
                            ORCID <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="au-sort">
                      <button
                        className={sort === 'cited' ? 'au-sort-active' : ''}
                        onClick={() => loadWorks(selected, 'cited')}
                        disabled={worksLoading}
                      >
                        <TrendingUp size={12} /> {t('tools.author.mostCited')}
                      </button>
                      <button
                        className={sort === 'recent' ? 'au-sort-active' : ''}
                        onClick={() => loadWorks(selected, 'recent')}
                        disabled={worksLoading}
                      >
                        {t('tools.author.recent')}
                      </button>
                    </div>
                  </div>

                  <div className="au-works">
                    {worksLoading ? (
                      <div className="au-works-loading"><Loader size={16} className="lib-spin" /> {t('tools.author.loadingWorks')}</div>
                    ) : works.length === 0 ? (
                      <p className="au-works-empty">{t('tools.author.noWorks')}</p>
                    ) : (
                      works.map((w, i) => <WorkRow key={w.sourceId || i} work={w} onCite={onCite} />)
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthorSearch;
