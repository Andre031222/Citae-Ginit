import React from 'react';
import { Search, Upload, BookOpen, Star } from '../Icons';
import citoLogo from '../../assets/citae-logo-v2.png';
import { useBranding } from '../../context/BrandingContext';

const CW_EXAMPLES = [
  { text: '10.1038/nature12373',              badge: 'DOI' },
  { text: 'Attention Is All You Need',         badge: 'Título' },
  { text: 'https://arxiv.org/abs/2005.14165', badge: 'URL' },
  { text: 'The CRISPR-Cas9 System',           badge: 'Título' },
];

const CW_FEATURES = [
  { icon: <Search size={13} />,   text: 'DOI, URL o título' },
  { icon: <Upload size={13} />,   text: 'Sube un PDF' },
  { icon: <BookOpen size={13} />, text: '7 formatos de cita' },
  { icon: <Star size={13} />,     text: 'Guarda favoritos' },
];

const ChatWelcome = ({ user, onExample }) => {
  const { branding } = useBranding();
  const siteName = branding.site_name || 'Citae';

  return (
    <div className="chat-welcome">
      <div className="cw-brand">
        <img src={branding.logo_url || citoLogo} alt={siteName} className="cw-logo" />
        <span className="cw-brand-name">{siteName}</span>
      </div>

      <h2 className="cw-title">
        {user
          ? <>Hola{user.full_name
              ? <>, <em className="cw-name">{user.full_name.split(' ')[0]}</em></>
              : ''}!</>
          : '¿Qué quieres investigar hoy?'}
      </h2>
      <p className="cw-sub">
        Pega un DOI, una URL o un título para obtener la cita al instante. También puedes subir el PDF directamente.
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
        <span className="cw-examples-label">Prueba con un ejemplo</span>
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
          <a href="/login">Inicia sesión</a> para guardar historial y favoritos
        </p>
      )}
    </div>
  );
};

export default ChatWelcome;
