import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Library, Loader, FileText, AlertCircle, ArrowRight,
} from '../Icons';
import { getPublicProfile } from '../../services/publicService';
import { colorHex } from '../../constants/highlightColors';

const PublicProfile = () => {
  const { t } = useTranslation();
  const { username } = useParams();
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    let active = true;
    getPublicProfile(username)
      .then(d => { if (active) setData(d); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [username]);

  if (loading) {
    return <div className="pub-page"><div className="pub-loading"><Loader size={24} className="lib-spin" /> {t('publicview.loading')}</div></div>;
  }

  if (error || !data) {
    return (
      <div className="pub-page">
        <div className="pub-error">
          <AlertCircle size={36} />
          <h2>{t('publicview.profileNotFound.title')}</h2>
          <p>{t('publicview.profileNotFound.desc')}</p>
          <button className="lib-btn-primary" onClick={() => navigate('/')}>{t('publicview.goToCitae')}</button>
        </div>
      </div>
    );
  }

  const { profile, stats, collections } = data;
  const initial = (profile.full_name || profile.username || '?').charAt(0).toUpperCase();

  return (
    <div className="pub-page">
      <header className="pub-topbar">
        <Link to="/" className="pub-logo"><Library size={18} /> Citae</Link>
        <span className="pub-badge">{t('publicview.badgeProfile')}</span>
      </header>

      <div className="pub-body">
        <div className="pub-profile-head">
          <div className="pub-avatar">{initial}</div>
          <div className="pub-profile-info">
            <h1 className="pub-profile-name">{profile.full_name || profile.username}</h1>
            <span className="pub-profile-handle">@{profile.username}</span>
            {profile.bio && <p className="pub-profile-bio">{profile.bio}</p>}
          </div>
        </div>

        <div className="pub-profile-stats">
          <div className="pub-stat"><span className="pub-stat-num">{stats.collections}</span><span className="pub-stat-label">{t('publicview.statCollections')}</span></div>
          <div className="pub-stat"><span className="pub-stat-num">{stats.papers}</span><span className="pub-stat-label">{t('publicview.statPapers')}</span></div>
        </div>

        <h2 className="pub-section-title">{t('publicview.sectionCollections')}</h2>
        {collections.length === 0 ? (
          <p className="pub-empty">{t('publicview.emptyCollections')}</p>
        ) : (
          <div className="pub-collections">
            {collections.map(c => (
              <Link key={c.id} to={`/c/${c.public_slug}`} className="pub-collection-card" style={{ '--pub-accent': colorHex(c.color) }}>
                <span className="pub-collection-dot" style={{ background: colorHex(c.color) }} />
                <div className="pub-collection-body">
                  <span className="pub-collection-name">{c.name}</span>
                  {c.description && <span className="pub-collection-desc">{c.description}</span>}
                  <span className="pub-collection-count"><FileText size={12} /> {t('publicview.papersCount', { count: c.paper_count })}</span>
                </div>
                <ArrowRight size={15} className="pub-collection-arrow" />
              </Link>
            ))}
          </div>
        )}

        <footer className="pub-footer">
          <p>{t('publicview.footer.prefix')}<Link to="/" className="pub-footer-link">Citae</Link>{t('publicview.footer.suffix')}</p>
        </footer>
      </div>
    </div>
  );
};

export default PublicProfile;
