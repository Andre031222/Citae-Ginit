import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import citoLogo from '../assets/citae-logo-v2.png';
import { Sun, Moon, Copy, Sparkles, X, ArrowRight, Bot, GoogleIcon, Home, Info, Quote } from './Icons';
import { useBranding } from '../context/BrandingContext';
import { googleAuthUrl } from '../services/apiBase';
import LogoLoop from './LogoLoop';
import LanguageSwitcher from './common/LanguageSwitcher';

function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function useReveal(threshold = 0.10) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function Reveal({ children, className = '', delay = 0, tag: Tag = 'div' }) {
  const [ref, visible] = useReveal();
  return (
    <Tag ref={ref}
      className={`lp-reveal ${className} ${visible ? 'lp-reveal-in' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >{children}</Tag>
  );
}

const FEATURES = [
  {
    illo: (
      <svg viewBox="0 0 76 68" fill="none" aria-hidden="true" className="lp-feature-svg">
        <circle cx="36" cy="35" r="21" stroke="var(--accent)" strokeWidth="2.5"/>
        <path d="M51 50 L63 62" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="11" cy="11" r="6" fill="#EF4444"/>
        <circle cx="63" cy="11" r="6" fill="#3B82F6"/>
        <circle cx="11" cy="59" r="6" fill="#0EA5E9"/>
        <circle cx="63" cy="59" r="6" fill="#8B5CF6"/>
        <path d="M16 16 L22 22" stroke="var(--accent)" strokeWidth="1" strokeOpacity=".32" strokeDasharray="2.5 2"/>
        <path d="M57 16 L50 23" stroke="var(--accent)" strokeWidth="1" strokeOpacity=".32" strokeDasharray="2.5 2"/>
        <path d="M16 54 L22 48" stroke="var(--accent)" strokeWidth="1" strokeOpacity=".32" strokeDasharray="2.5 2"/>
        <path d="M57 54 L50 47" stroke="var(--accent)" strokeWidth="1" strokeOpacity=".32" strokeDasharray="2.5 2"/>
      </svg>
    ),
    titleKey: 'features.multiSource.title',
    descKey: 'features.multiSource.desc',
  },
  {
    illo: (
      <svg viewBox="0 0 76 68" fill="none" aria-hidden="true" className="lp-feature-svg">
        <rect x="20" y="5" width="40" height="55" rx="5" fill="var(--accent)" fillOpacity=".07" stroke="var(--accent)" strokeWidth="1.5" strokeOpacity=".4"/>
        <rect x="14" y="9" width="40" height="55" rx="5" fill="var(--accent)" fillOpacity=".07" stroke="var(--accent)" strokeWidth="2"/>
        <path d="M44 9 L44 19 L54 19" stroke="var(--accent)" strokeWidth="1.5"/>
        <path d="M44 9 L54 19" stroke="var(--accent)" strokeWidth="1.5"/>
        <rect x="22" y="14" width="20" height="7" rx="3.5" fill="var(--accent)"/>
        <rect x="22" y="28" width="24" height="2.5" rx="1.25" fill="var(--accent)" fillOpacity=".55"/>
        <rect x="22" y="35" width="18" height="2.5" rx="1.25" fill="var(--accent)" fillOpacity=".38"/>
        <rect x="22" y="42" width="22" height="2.5" rx="1.25" fill="var(--accent)" fillOpacity=".38"/>
        <rect x="22" y="49" width="14" height="2.5" rx="1.25" fill="var(--accent)" fillOpacity=".28"/>
      </svg>
    ),
    titleKey: 'features.formats.title',
    descKey: 'features.formats.desc',
  },
  {
    illo: (
      <svg viewBox="0 0 76 68" fill="none" aria-hidden="true" className="lp-feature-svg">
        <rect x="8" y="12" width="60" height="3" rx="1.5" fill="var(--accent)" fillOpacity=".15"/>
        <rect x="8" y="11" width="30" height="5" rx="2" fill="#FBE34D" fillOpacity=".68"/>
        <rect x="8" y="22" width="56" height="3" rx="1.5" fill="var(--accent)" fillOpacity=".15"/>
        <rect x="31" y="21" width="22" height="5" rx="2" fill="var(--accent)" fillOpacity=".38"/>
        <rect x="8" y="32" width="50" height="3" rx="1.5" fill="var(--accent)" fillOpacity=".15"/>
        <rect x="8" y="31" width="17" height="5" rx="2" fill="#EF4444" fillOpacity=".32"/>
        <rect x="8" y="42" width="58" height="3" rx="1.5" fill="var(--accent)" fillOpacity=".15"/>
        <rect x="36" y="41" width="24" height="5" rx="2" fill="#22C55E" fillOpacity=".32"/>
        <rect x="8" y="52" width="46" height="3" rx="1.5" fill="var(--accent)" fillOpacity=".15"/>
        <rect x="8" y="51" width="20" height="5" rx="2" fill="#A78BFA" fillOpacity=".32"/>
        <rect x="16" y="60" width="44" height="7" rx="3.5" fill="var(--accent)" fillOpacity=".1" stroke="var(--accent)" strokeWidth="1" strokeOpacity=".3"/>
        <circle cx="28" cy="63.5" r="2.5" fill="#FBE34D"/>
        <circle cx="37" cy="63.5" r="2.5" fill="var(--accent)"/>
        <circle cx="46" cy="63.5" r="2.5" fill="#EF4444"/>
        <circle cx="55" cy="63.5" r="2.5" fill="#22C55E"/>
      </svg>
    ),
    titleKey: 'features.highlight.title',
    descKey: 'features.highlight.desc',
  },
  {
    illo: (
      <svg viewBox="0 0 76 68" fill="none" aria-hidden="true" className="lp-feature-svg">
        <rect x="6" y="8" width="42" height="22" rx="8" fill="var(--accent)" fillOpacity=".12" stroke="var(--accent)" strokeWidth="1.5"/>
        <path d="M12 30 L8 39 L22 30" fill="var(--accent)" fillOpacity=".12" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round"/>
        <rect x="14" y="16" width="26" height="2.5" rx="1.25" fill="var(--accent)" fillOpacity=".5"/>
        <rect x="14" y="22" width="18" height="2.5" rx="1.25" fill="var(--accent)" fillOpacity=".3"/>
        <rect x="28" y="42" width="42" height="20" rx="8" fill="var(--accent)" fillOpacity=".07" stroke="var(--accent)" strokeWidth="1.5"/>
        <path d="M64 42 L70 35 L55 42" fill="var(--accent)" fillOpacity=".07" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round"/>
        <circle cx="40" cy="52" r="2.5" fill="var(--accent)" fillOpacity=".6"/>
        <circle cx="50" cy="52" r="2.5" fill="var(--accent)" fillOpacity=".45"/>
        <circle cx="60" cy="52" r="2.5" fill="var(--accent)" fillOpacity=".3"/>
        <path d="M62 10 L64 16 L70 18 L64 20 L62 26 L60 20 L54 18 L60 16 Z" fill="var(--accent)" fillOpacity=".65"/>
      </svg>
    ),
    titleKey: 'features.assistant.title',
    descKey: 'features.assistant.desc',
  },
  {
    illo: (
      <svg viewBox="0 0 76 68" fill="none" aria-hidden="true" className="lp-feature-svg">
        <path d="M14 6 L48 6 L60 18 L60 62 L14 62 Z" fill="var(--accent)" fillOpacity=".08" stroke="var(--accent)" strokeWidth="2"/>
        <path d="M48 6 L48 18 L60 18" stroke="var(--accent)" strokeWidth="2"/>
        <rect x="22" y="24" width="28" height="2.5" rx="1.25" fill="var(--accent)" fillOpacity=".45"/>
        <rect x="22" y="31" width="22" height="2.5" rx="1.25" fill="var(--accent)" fillOpacity=".38"/>
        <rect x="22" y="38" width="30" height="7" rx="2.5" fill="#FBE34D" fillOpacity=".5"/>
        <rect x="22" y="39" width="24" height="2.5" rx="1.25" fill="var(--accent)" fillOpacity=".55"/>
        <rect x="22" y="50" width="26" height="2.5" rx="1.25" fill="var(--accent)" fillOpacity=".32"/>
        <rect x="22" y="57" width="18" height="2.5" rx="1.25" fill="var(--accent)" fillOpacity=".22"/>
      </svg>
    ),
    titleKey: 'features.pdf.title',
    descKey: 'features.pdf.desc',
  },
  {
    illo: (
      <svg viewBox="0 0 76 68" fill="none" aria-hidden="true" className="lp-feature-svg">
        <rect x="6" y="14" width="28" height="38" rx="5" fill="var(--accent)" fillOpacity=".1" stroke="var(--accent)" strokeWidth="2"/>
        <rect x="12" y="22" width="16" height="2.5" rx="1.25" fill="var(--accent)" fillOpacity=".5"/>
        <rect x="12" y="29" width="12" height="2.5" rx="1.25" fill="var(--accent)" fillOpacity=".35"/>
        <rect x="12" y="36" width="14" height="2.5" rx="1.25" fill="var(--accent)" fillOpacity=".35"/>
        <rect x="12" y="43" width="10" height="2.5" rx="1.25" fill="var(--accent)" fillOpacity=".25"/>
        <path d="M38 33 L52 33 M46 26 L54 33 L46 40" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="56" y="10" width="14" height="14" rx="4" fill="var(--accent)" fillOpacity=".28" stroke="var(--accent)" strokeWidth="1.5"/>
        <rect x="56" y="27" width="14" height="14" rx="4" fill="var(--accent)" fillOpacity=".18" stroke="var(--accent)" strokeWidth="1.5"/>
        <rect x="56" y="44" width="14" height="14" rx="4" fill="var(--accent)" fillOpacity=".1" stroke="var(--accent)" strokeWidth="1.5"/>
      </svg>
    ),
    titleKey: 'features.export.title',
    descKey: 'features.export.desc',
  },
];

const FORMAT_CARDS = [
  {
    name: 'APA',
    fieldKey: 'formats.apa.field',
    sampleKey: 'formats.apa.sample',
  },
  {
    name: 'MLA',
    fieldKey: 'formats.mla.field',
    sampleKey: 'formats.mla.sample',
  },
  {
    name: 'Chicago',
    fieldKey: 'formats.chicago.field',
    sampleKey: 'formats.chicago.sample',
  },
  {
    name: 'Harvard',
    fieldKey: 'formats.harvard.field',
    sampleKey: 'formats.harvard.sample',
  },
  {
    name: 'IEEE',
    fieldKey: 'formats.ieee.field',
    sampleKey: 'formats.ieee.sample',
  },
  {
    name: 'Vancouver',
    fieldKey: 'formats.vancouver.field',
    sampleKey: 'formats.vancouver.sample',
  },
  {
    name: 'BibTeX',
    fieldKey: 'formats.bibtex.field',
    sampleKey: 'formats.bibtex.sample',
  },
];

const GOOGLE_AUTH_URL = googleAuthUrl();

const SOURCES = [
  { name: 'CrossRef', color: '#B91C1C' },
  { name: 'Semantic Scholar', color: '#1D4ED8' },
  { name: 'OpenAlex', color: '#0369A1' },
  { name: 'arXiv', color: '#7C3AED' },
];

const makeSource = (name, color) => ({
  node: (
    <span className="lp-logo-source">
      <span className="lp-logo-dot" style={{ background: color }} />
      {name}
    </span>
  ),
  title: name,
});
const makeFormat = (name) => ({
  node: <span className="lp-logo-format">{name}</span>,
  title: name,
});

const LOOP_LOGOS = [
  makeSource('CrossRef',         '#B91C1C'),
  makeFormat('APA 7ª ed.'),
  makeSource('Semantic Scholar', '#1D4ED8'),
  makeFormat('MLA 9ª ed.'),
  makeSource('OpenAlex',         '#0369A1'),
  makeFormat('Chicago 17ª'),
  makeSource('arXiv',            '#7C3AED'),
  makeFormat('IEEE'),
  makeFormat('Harvard'),
  makeFormat('Vancouver'),
  makeFormat('BibTeX'),
];

const STEPS = [
  {
    n: '01',
    titleKey: 'steps.search.title',
    descKey: 'steps.search.desc',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="lp-how-svg" aria-hidden>
        <circle cx="11" cy="11" r="6" stroke="var(--accent)" strokeWidth="1.8"/>
        <path d="M16 16 L21 21" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
        <path d="M8.5 11 h5 M11 8.5 v5" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    n: '02',
    titleKey: 'steps.select.title',
    descKey: 'steps.select.desc',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="lp-how-svg" aria-hidden>
        <rect x="3" y="3" width="13" height="4" rx="2" fill="var(--accent)" fillOpacity=".12" stroke="var(--accent)" strokeWidth="1.4"/>
        <rect x="3" y="10" width="13" height="4" rx="2" fill="var(--accent)" fillOpacity=".06" stroke="var(--accent)" strokeWidth="1.1" strokeOpacity=".4"/>
        <rect x="3" y="17" width="13" height="4" rx="2" fill="var(--accent)" fillOpacity=".06" stroke="var(--accent)" strokeWidth="1.1" strokeOpacity=".4"/>
        <circle cx="20" cy="5" r="3" fill="var(--accent)"/>
        <path d="M18.6 5 l1.2 1.2 1.8-1.8" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    n: '03',
    titleKey: 'steps.cite.title',
    descKey: 'steps.cite.desc',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="lp-how-svg" aria-hidden>
        <rect x="2" y="5" width="14" height="3" rx="1.5" fill="#FBE34D" fillOpacity=".85"/>
        <rect x="2" y="10" width="17" height="2" rx="1" fill="var(--accent)" fillOpacity=".2"/>
        <rect x="2" y="14" width="12" height="2" rx="1" fill="var(--accent)" fillOpacity=".2"/>
        <rect x="11" y="15.5" width="11" height="7" rx="3" fill="var(--accent)" fillOpacity=".1" stroke="var(--accent)" strokeWidth="1.2"/>
        <path d="M13.5 19 h6 M13.5 17.5 h4" stroke="var(--accent)" strokeWidth="1.1" strokeLinecap="round" strokeOpacity=".7"/>
      </svg>
    ),
  },
  {
    n: '04',
    titleKey: 'steps.export.title',
    descKey: 'steps.export.desc',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="lp-how-svg" aria-hidden>
        <rect x="2" y="2" width="14" height="18" rx="2.5" fill="var(--accent)" fillOpacity=".08" stroke="var(--accent)" strokeWidth="1.4"/>
        <path d="M5 8 h8 M5 12 h5 M5 16 h7" stroke="var(--accent)" strokeWidth="1.3" strokeLinecap="round" strokeOpacity=".5"/>
        <path d="M17 12 L22 12" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M19.5 9.5 L22.5 12 L19.5 14.5" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export default function LandingPage({ theme, onToggleTheme }) {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const { branding } = useBranding();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const navTo = useCallback((id) => {
    scrollTo(id);
  }, []);

  return (
    <div className="lp">

      {/* NAV */}
      <header className={`lp-nav ${scrolled ? 'lp-nav-scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <Link to="/" className="lp-nav-logo">
            <img src={branding.logo_url || citoLogo} alt={branding.site_name || 'Citae'} width={40} height={40} />
            <span>{branding.site_name || 'Citae'}</span>
          </Link>

          <nav className="lp-nav-links">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>{t('landing.nav.home')}</button>
            <button onClick={() => navTo('features')}>{t('landing.nav.features')}</button>
            <button onClick={() => navTo('how')}>{t('landing.nav.how')}</button>
            <button onClick={() => navTo('formats')}>{t('landing.nav.formats')}</button>
          </nav>

          <div className="lp-nav-actions">
            <LanguageSwitcher className="lp-nav-lang" />
            <button className="lp-nav-theme" onClick={onToggleTheme} title={t('landing.nav.toggleTheme')}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a href={GOOGLE_AUTH_URL} className="lp-nav-btn-google">
              <GoogleIcon size={15} />
              <span className="lp-google-txt">{t('landing.nav.continueGoogle')}</span>
            </a>
            <Link to="/login" className="lp-nav-btn-ghost">{t('landing.nav.login')}</Link>
            <Link to="/register" className="lp-nav-btn-cta">{t('landing.nav.startFree')}</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero-bg" aria-hidden>
          <div className="lp-hero-blob lp-hero-blob-1" />
          <div className="lp-hero-blob lp-hero-blob-2" />
          <div className="lp-hero-grid" />
        </div>

        <div className="lp-container lp-hero-inner">
          <div className="lp-hero-text">
            <h1 className="lp-hero-h1">
              {branding.hero_title_1 && <>{branding.hero_title_1}<br /></>}
              {branding.hero_title_em && <em>{branding.hero_title_em}</em>}
              {branding.hero_title_2 && <> {branding.hero_title_2}</>}
            </h1>
            <p className="lp-hero-sub">
              {branding.hero_subtitle}
            </p>
            <div className="lp-hero-actions">
              <Link to="/register" className="lp-btn-primary">
                {t('landing.nav.startFree')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
              <button className="lp-btn-ghost" onClick={() => navTo('how')}>{t('landing.hero.seeHow')}</button>
            </div>
            <div className="lp-trust-row">
              <span className="lp-trust-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {t('landing.hero.badgeDoi')}
              </span>
              <span className="lp-trust-sep" aria-hidden />
              <span className="lp-trust-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {t('landing.hero.badgePeerReview')}
              </span>
              <span className="lp-trust-sep" aria-hidden />
              <span className="lp-trust-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h4"/></svg>
                {t('landing.hero.badgeFormats')}
              </span>
              <span className="lp-trust-sep" aria-hidden />
              <span className="lp-trust-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                {t('landing.hero.badgeFree')}
              </span>
            </div>
          </div>

          <div className="lp-hero-visual">
            {/* Zona de imagen hero — configurable por super admin via BrandingContext */}
            <div className="lp-hero-img-zone" aria-hidden />
            <div className="lp-app-mockup">
              <div className="lp-mockup-bar">
                <div className="lp-mockup-dots"><span/><span/><span/></div>
                <div className="lp-mockup-url">citae.app/search</div>
              </div>
              <div className="lp-mockup-body">
                <div className="lp-mockup-search">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <span>deep learning image segmentation</span>
                </div>
                <div className="lp-mockup-result">
                  <div className="lp-mockup-score">98</div>
                  <div className="lp-mockup-meta">
                    <div className="lp-mockup-title">Segment Anything Model</div>
                    <div className="lp-mockup-authors">Kirillov et al. · 2023 · arXiv</div>
                  </div>
                </div>
                <div className="lp-mockup-result lp-mockup-result-2">
                  <div className="lp-mockup-score lp-mockup-score-2">91</div>
                  <div className="lp-mockup-meta">
                    <div className="lp-mockup-title">U-Net: Convolutional Networks</div>
                    <div className="lp-mockup-authors">Ronneberger et al. · 2015 · MICCAI</div>
                  </div>
                </div>
                <div className="lp-mockup-cite">
                  <span className="lp-mockup-cite-label">APA</span>
                  <span className="lp-mockup-cite-text">Kirillov, A., et al. (2023). Segment anything. <em>arXiv</em>.</span>
                  <button className="lp-mockup-copy"><Copy size={13} /></button>
                </div>
                <div className="lp-mockup-hl">
                  <span className="lp-mockup-hl-yellow">SAM achieves zero-shot generalization</span>
                  {' '}to unseen objects and images without any additional training.
                </div>
              </div>
            </div>

            <div className="lp-hero-float lp-hero-float-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              {t('landing.hero.floatCite')}
            </div>
            <div className="lp-hero-float lp-hero-float-2">
              <Bot size={14} /> {t('landing.hero.floatAi')}
            </div>
          </div>
        </div>
      </section>

      {/* SOURCES STRIP */}
      <section className="lp-sources-strip">
        <div className="lp-container lp-sources-inner">
          <span className="lp-sources-label">{t('landing.sources.label')}</span>
          {SOURCES.map(s => (
            <div key={s.name} className="lp-source-chip" style={{ '--source-color': s.color }}>
              {s.name}
            </div>
          ))}
        </div>
      </section>

      {/* LOGO LOOP — fuentes + formatos */}
      <section className="lp-loop-strip">
        <LogoLoop
          logos={LOOP_LOGOS}
          speed={48}
          direction="left"
          logoHeight={38}
          gap={36}
          hoverSpeed={0}
          fadeOut
          scaleOnHover
          style={{ '--logoloop-fadeColorAuto': 'var(--surface-0)' }}
          ariaLabel={t('landing.loop.ariaLabel')}
        />
      </section>

      {/* FEATURES */}
      <section className="lp-section lp-features-section" id="features">
        <div className="lp-container">
          <Reveal>
            <h2 className="lp-section-h2">{t('landing.features.heading')}</h2>
            <p className="lp-section-sub">{t('landing.features.subheading')}</p>
          </Reveal>
          <div className="lp-features-grid">
            {FEATURES.map((f, i) => {
              const fd = branding.features_data?.[i];
              const title    = fd?.title    || t(`landing.${f.titleKey}`);
              const desc     = fd?.desc     || t(`landing.${f.descKey}`);
              const imageUrl = fd?.image_url;
              return (
                <Reveal key={f.titleKey} delay={i * 60}>
                  <div className="lp-feature-card">
                    <div className="lp-feature-illo">
                      {imageUrl
                        ? <img src={imageUrl} alt={title} className="lp-feature-illo-img" />
                        : f.illo
                      }
                    </div>
                    <h3 className="lp-feature-title">{title}</h3>
                    <p className="lp-feature-desc">{desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="lp-section lp-how-section" id="how">
        <div className="lp-container">
          <Reveal>
            <h2 className="lp-section-h2">{t('landing.how.heading')}</h2>
          </Reveal>
          <div className="lp-how-grid">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 70} className="lp-how-card">
                <div className="lp-how-card-head">
                  <span className="lp-how-num">{s.n}</span>
                  <div className="lp-how-icon">{s.icon}</div>
                </div>
                <h3 className="lp-how-card-title">{t(`landing.${s.titleKey}`)}</h3>
                <p className="lp-how-card-desc">{t(`landing.${s.descKey}`)}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* AI READING ASSISTANT */}
      <section className="lp-section lp-ai-section">
        <div className="lp-container lp-ai-inner">
          <Reveal className="lp-ai-text">
            <div className="lp-section-label">Reading Assistant</div>
            <h2 className="lp-section-h2">{t('landing.ai.heading')}</h2>
            <p className="lp-section-sub">
              {t('landing.ai.subheading')}
            </p>
            <ul className="lp-ai-perks">
              <li><span className="lp-perk-dot" style={{ '--c': '#0056D6' }} />{t('landing.ai.perkHistory')}</li>
              <li><span className="lp-perk-dot" style={{ '--c': '#16A34A' }} />{t('landing.ai.perkSuggested')}</li>
              <li><span className="lp-perk-dot" style={{ '--c': '#3B82F6' }} />{t('landing.ai.perkTrust')}</li>
              <li><span className="lp-perk-dot" style={{ '--c': '#FBE34D' }} />{t('landing.ai.perkPdf')}</li>
            </ul>
            <Link to="/register" className="lp-btn-primary lp-btn-sm">
              {t('landing.ai.tryFree')}
            </Link>
          </Reveal>

          <Reveal delay={120} className="lp-ai-demo">
            <div className="lp-chat-mockup">
              <div className="lp-chat-header">
                <span className="lp-ai-badge"><Sparkles size={13} /> Reading Assistant</span>
                <button className="lp-chat-close"><X size={13} /></button>
              </div>
              <div className="lp-chat-hl-ctx">
                <span className="lp-hl-mark lp-hl-blue">"SAM achieves zero-shot generalization to unseen objects and images without any additional training."</span>
              </div>
              <div className="lp-chat-thread">
                <div className="lp-chat-msg lp-chat-user">{t('landing.ai.demoQuestion')}</div>
                <div className="lp-chat-msg lp-chat-ai">
                  {t('landing.ai.demoAnswerPre')}<strong>{t('landing.ai.demoAnswerStrong')}</strong>{t('landing.ai.demoAnswerPost')}
                  <div className="lp-chat-trust">↳ {t('landing.ai.demoTrust')}</div>
                </div>
                <div className="lp-chat-suggestions">
                  <button className="lp-chat-chip">{t('landing.ai.demoChip1')}</button>
                  <button className="lp-chat-chip">{t('landing.ai.demoChip2')}</button>
                </div>
              </div>
              <div className="lp-chat-input">
                <input placeholder={t('landing.ai.inputPlaceholder')} readOnly />
                <button className="lp-chat-send"><ArrowRight size={14} /></button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FORMATS */}
      <section className="lp-section lp-formats-section" id="formats">
        <div className="lp-container lp-formats-inner">
          <Reveal>
            <h2 className="lp-section-h2">{t('landing.formatsSection.heading')}</h2>
            <p className="lp-section-sub">{t('landing.formatsSection.subheading')}</p>
          </Reveal>
          <div className="lp-format-grid">
            {FORMAT_CARDS.map((f, i) => (
              <Reveal key={f.name} delay={i * 50} className="lp-format-card">
                <div className="lp-format-card-head">
                  <span className="lp-format-name">{f.name}</span>
                  <span className="lp-format-field">{t(`landing.${f.fieldKey}`)}</span>
                </div>
                <pre className="lp-format-sample">{t(`landing.${f.sampleKey}`)}</pre>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="lp-stats-section">
        <div className="lp-container lp-stats-inner">
          {[
            { n: '7',    label: t('landing.stats.formats'),  cls: 'lp-stat-n-blue' },
            { n: '4',    label: t('landing.stats.sources'),  cls: '' },
            { n: '3',    label: t('landing.stats.exports'),  cls: 'lp-stat-n-blue' },
            { n: '100%', label: t('landing.stats.free'),     cls: 'lp-stat-n-gold' },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 60} className="lp-stat">
              <div className={`lp-stat-n ${s.cls}`}>{s.n}</div>
              <div className="lp-stat-label">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="lp-cta-section">
        <div className="lp-container lp-cta-inner">
          <Reveal>
            <p className="lp-cta-eyebrow">{t('landing.cta.eyebrow')}</p>
            <h2 className="lp-cta-h2">{t('landing.cta.headingLine1')}<br /><span>{t('landing.cta.headingLine2')}</span></h2>
            <p className="lp-cta-sub">{t('landing.cta.sub')}</p>
            <div className="lp-cta-actions">
              <Link to="/register" className="lp-btn-primary lp-btn-lg">
                {t('landing.cta.createAccount')}
              </Link>
              <Link to="/login" className="lp-btn-ghost">{t('landing.cta.haveAccount')}</Link>
            </div>
            <p className="lp-cta-trust">{t('landing.cta.trust')}</p>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-grid">
          {/* Marca */}
          <div className="lp-footer-col lp-footer-col--brand">
            <div className="lp-footer-brand">
              <img src={branding.logo_url || citoLogo} alt={branding.site_name || 'Citae'} width={36} height={36} />
              <span>{branding.site_name || 'Citae'}</span>
            </div>
            <p className="lp-footer-tagline">
              {t('landing.footer.tagline')}
            </p>
          </div>

          {/* Producto */}
          <div className="lp-footer-col">
            <h4 className="lp-footer-col-title">{t('landing.footer.productTitle')}</h4>
            <ul className="lp-footer-list">
              <li><Link to="/register">{t('landing.footer.productSearch')}</Link></li>
              <li><Link to="/register">{t('landing.footer.productCite')}</Link></li>
              <li><Link to="/register">{t('landing.footer.productReader')}</Link></li>
              <li><Link to="/register">{t('landing.footer.productExport')}</Link></li>
            </ul>
          </div>

          {/* Formatos */}
          <div className="lp-footer-col">
            <h4 className="lp-footer-col-title">{t('landing.footer.formatsTitle')}</h4>
            <ul className="lp-footer-list lp-footer-list--plain">
              <li>APA</li>
              <li>MLA</li>
              <li>Chicago</li>
              <li>Harvard</li>
              <li>IEEE · Vancouver · Nature</li>
            </ul>
          </div>

          {/* Cuenta */}
          <div className="lp-footer-col">
            <h4 className="lp-footer-col-title">{t('landing.footer.accountTitle')}</h4>
            <ul className="lp-footer-list">
              <li><Link to="/login">{t('landing.footer.accountLogin')}</Link></li>
              <li><Link to="/register">{t('landing.footer.accountRegister')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="lp-footer-bottom">
          <div className="lp-container lp-footer-bottom-inner">
            <p className="lp-footer-copy">{t('landing.footer.copy', { year: new Date().getFullYear() })}</p>
            <p className="lp-footer-made">{t('landing.footer.madeBy', { name: 'Richar Andre Vilca Solorzano' })}</p>
          </div>
        </div>
      </footer>

      {/* Barra inferior flotante de navegación (solo móvil) */}
      <nav className="lp-mobile-bar" aria-label={t('landing.mobile.ariaLabel')}>
        <button className="lp-mb-item" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <Home size={20} />
          <span>{t('landing.nav.home')}</span>
        </button>
        <button className="lp-mb-item" onClick={() => navTo('features')}>
          <Sparkles size={20} />
          <span>{t('landing.nav.features')}</span>
        </button>
        <button className="lp-mb-item" onClick={() => navTo('how')}>
          <Info size={20} />
          <span>{t('landing.nav.how')}</span>
        </button>
        <button className="lp-mb-item" onClick={() => navTo('formats')}>
          <Quote size={20} />
          <span>{t('landing.nav.formats')}</span>
        </button>
      </nav>
    </div>
  );
}
