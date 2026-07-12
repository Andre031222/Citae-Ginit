import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Library, Loader, ExternalLink, User, FileText, AlertCircle,
} from '../Icons';
import { getPublicCollection } from '../../services/publicService';
import { colorHex } from '../../constants/highlightColors';

const PublicCollection = () => {
  const { t } = useTranslation();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    let active = true;
    getPublicCollection(slug)
      .then(d => { if (active) setData(d); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  if (loading) {
    return <div className="pub-page"><div className="pub-loading"><Loader size={24} className="lib-spin" /> {t('publicview.loading')}</div></div>;
  }

  if (error || !data) {
    return (
      <div className="pub-page">
        <div className="pub-error">
          <AlertCircle size={36} />
          <h2>{t('publicview.collectionNotFound.title')}</h2>
          <p>{t('publicview.collectionNotFound.desc')}</p>
          <button className="lib-btn-primary" onClick={() => navigate('/')}>{t('publicview.goToCitae')}</button>
        </div>
      </div>
    );
  }

  const { collection, owner, papers } = data;
  const accent = colorHex(collection.color);

  return (
    <div className="pub-page">
      <header className="pub-topbar">
        <Link to="/" className="pub-logo"><Library size={18} /> Citae</Link>
        <span className="pub-badge">{t('publicview.badgeCollection')}</span>
      </header>

      <div className="pub-body">
        <div className="pub-hero" style={{ '--pub-accent': accent }}>
          <span className="pub-hero-dot" style={{ background: accent }} />
          <h1 className="pub-hero-title">{collection.name}</h1>
          {collection.description && <p className="pub-hero-desc">{collection.description}</p>}
          <div className="pub-hero-meta">
            {owner.profile ? (
              <Link to={`/u/${owner.profile}`} className="pub-owner">
                <User size={13} /> {owner.full_name || owner.username}
              </Link>
            ) : (
              <span className="pub-owner"><User size={13} /> {owner.full_name || owner.username}</span>
            )}
            <span className="pub-count"><FileText size={13} /> {t('publicview.papersCount', { count: papers.length })}</span>
          </div>
        </div>

        <div className="pub-papers">
          {papers.map(p => (
            <article key={p.id} className="pub-paper">
              <h3 className="pub-paper-title">{p.title}</h3>
              <p className="pub-paper-meta">
                {[p.authors?.split(',').slice(0, 3).join(', '), p.publication_year, p.journal].filter(Boolean).join(' · ')}
              </p>
              {p.abstract && <p className="pub-paper-abstract">{p.abstract.slice(0, 280)}{p.abstract.length > 280 ? '…' : ''}</p>}
              {(p.url || p.doi) && (
                <a
                  href={p.url || `https://doi.org/${p.doi}`}
                  target="_blank" rel="noopener noreferrer"
                  className="pub-paper-link"
                >
                  {t('publicview.viewPaper')} <ExternalLink size={12} />
                </a>
              )}
            </article>
          ))}
        </div>

        <footer className="pub-footer">
          <p>{t('publicview.footer.prefix')}<Link to="/" className="pub-footer-link">Citae</Link>{t('publicview.footer.suffix')}</p>
        </footer>
      </div>
    </div>
  );
};

export default PublicCollection;
