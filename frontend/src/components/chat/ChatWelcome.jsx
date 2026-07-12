import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Upload, BookOpen, Star } from '../Icons';
import citoLogo from '../../assets/citae-logo-v2.png';
import { useBranding } from '../../context/BrandingContext';

const ChatWelcome = ({ user, onExample }) => {
  const { t } = useTranslation();
  const { branding } = useBranding();
  const siteName = branding.site_name || 'Citae';

  const CW_EXAMPLES = [
    { text: '10.1038/nature12373',              badge: t('chatview.welcome.badgeDoi') },
    { text: 'Attention Is All You Need',         badge: t('chatview.welcome.badgeTitle') },
    { text: 'https://arxiv.org/abs/2005.14165', badge: t('chatview.welcome.badgeUrl') },
    { text: 'The CRISPR-Cas9 System',           badge: t('chatview.welcome.badgeTitle') },
  ];

  const CW_FEATURES = [
    { icon: <Search size={13} />,   text: t('chatview.welcome.featSearch') },
    { icon: <Upload size={13} />,   text: t('chatview.welcome.featUpload') },
    { icon: <BookOpen size={13} />, text: t('chatview.welcome.featFormats') },
    { icon: <Star size={13} />,     text: t('chatview.welcome.featFavorites') },
  ];

  return (
    <div className="chat-welcome">
      <div className="cw-brand">
        <img src={branding.logo_url || citoLogo} alt={siteName} className="cw-logo" />
        <span className="cw-brand-name">{siteName}</span>
      </div>

      <h2 className="cw-title">
        {user
          ? <>{t('chatview.welcome.hello')}{user.full_name
              ? <>, <em className="cw-name">{user.full_name.split(' ')[0]}</em></>
              : ''}!</>
          : t('chatview.welcome.title')}
      </h2>
      <p className="cw-sub">
        {t('chatview.welcome.sub')}
      </p>

      <div className="cw-features">
        {CW_FEATURES.map(f => (
          <div key={f.text} className="cw-feature">
            <span className="cw-feature-icon">{f.icon}</span>
            <span>{f.text}</span>
          </div>
        ))}
      </div>

      <div className="cw-examples-section">
        <span className="cw-examples-label">{t('chatview.welcome.tryExample')}</span>
        <div className="cw-examples">
          {CW_EXAMPLES.map((ex, i) => (
            <button key={i} className="cw-example-btn" onClick={() => onExample(ex.text)}>
              <span className="cw-example-badge">{ex.badge}</span>
              <span className="cw-example-text">{ex.text.length > 38 ? ex.text.slice(0, 35) + '…' : ex.text}</span>
            </button>
          ))}
        </div>
      </div>

      {!user && (
        <p className="cw-login-hint">
          <a href="/login">{t('chatview.welcome.loginLink')}</a> {t('chatview.welcome.loginHint')}
        </p>
      )}
    </div>
  );
};

export default ChatWelcome;
