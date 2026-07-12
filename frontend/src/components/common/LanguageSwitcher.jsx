import React from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../../i18n';

// Boton que alterna el idioma de toda la aplicacion (ES <-> EN).
// El idioma se persiste en localStorage (clave citae_lang).
const LanguageSwitcher = ({ className = '' }) => {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language || 'es').slice(0, 2);
  const next = current === 'es' ? 'en' : 'es';
  const nextShort = LANGUAGES.find((l) => l.code === next)?.short || next.toUpperCase();

  // Cambio suave: atenua la interfaz, intercambia los textos mientras esta
  // atenuada y vuelve a aparecer. Respeta prefers-reduced-motion.
  const switchLanguage = () => {
    const root = typeof document !== 'undefined' && document.getElementById('root');
    const reduce = typeof window !== 'undefined'
      && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!root || reduce) {
      i18n.changeLanguage(next);
      return;
    }

    root.classList.add('lang-switching');
    window.setTimeout(() => {
      i18n.changeLanguage(next);
      window.setTimeout(() => root.classList.remove('lang-switching'), 240);
    }, 150);
  };

  return (
    <button
      type="button"
      className={`lang-switch ${className}`}
      onClick={switchLanguage}
      title={t('lang.switchTitle')}
      aria-label={t('lang.switchTitle')}
    >
      <span className="lang-switch-current">{current.toUpperCase()}</span>
      <span className="lang-switch-sep" aria-hidden="true">/</span>
      <span className="lang-switch-next">{nextShort}</span>
    </button>
  );
};

export default LanguageSwitcher;
