import React from 'react';
import {
  Plus, ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff,
  Library, Radar, Sparkles, Users, PenLine, BookOpen,
} from '../Icons';
import ThemeBtn from './ThemeBtn';
import { useBranding } from '../../context/BrandingContext';

// Herramientas mostradas en la barra superior (antes en el sidebar).
const TOOLS = [
  { view: 'radar',   label: 'Radar',      Icon: Radar,    title: 'Radar de Afirmaciones — verifica evidencia académica' },
  { view: 'ask',     label: 'Preguntar',  Icon: Sparkles, title: 'Pregunta a tu biblioteca — chat con IA sobre tus papers y resaltados' },
  { view: 'authors', label: 'Autores',    Icon: Users,    title: 'Descubrir autores — busca investigadores y sus publicaciones' },
  { view: 'write',   label: 'Redactar',   Icon: PenLine,  title: 'Redactar — escribe e inserta citas de tu biblioteca' },
  { view: 'review',  label: 'Repaso',     Icon: BookOpen, title: 'Repaso del día — refuerza tus resaltados con repaso espaciado' },
];

const CitaeMark = () => (
  <svg className="chat-brand-mark" width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect width="40" height="40" rx="10" fill="var(--accent)" />
    <path d="M11 13h18M11 20h14M11 27h10"
      stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="33" cy="7" r="4" fill="var(--gold)" />
  </svg>
);

const ChatTopbar = ({
  isSidebarOpen, onToggleSidebar,
  theme, onToggleTheme,
  user, onOpenProfile, onNewChat,
  currentPaper,
  incognito, onToggleIncognito,
  activeView, onOpenView,
}) => {
  const { branding } = useBranding();
  const siteName = branding.site_name || 'Citae';

  const firstName = user
    ? (user.full_name || user.username || '').split(' ')[0]
    : null;
  const initial = user
    ? (user.full_name || user.username || 'U').charAt(0).toUpperCase()
    : 'U';

  return (
    <div className="chat-topbar">
      <div className="chat-topbar-left">
        <button
          className="chat-sidebar-toggle"
          onClick={onToggleSidebar}
          title={isSidebarOpen ? 'Ocultar panel' : 'Mostrar panel'}
        >
          {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>

        {!isSidebarOpen && (
          <div className="chat-brand">
            {branding.logo_url
              ? <img
                  className="chat-brand-logo"
                  src={branding.logo_url}
                  alt={siteName}
                />
              : <CitaeMark />
            }
            <span className="chat-brand-name">{siteName}</span>
          </div>
        )}

        {currentPaper && (
          <div className="chat-topbar-crumb">
            <span className="chat-topbar-sep" aria-hidden="true">/</span>
            <span className="chat-topbar-paper" title={currentPaper}>
              {currentPaper}
            </span>
          </div>
        )}
      </div>

      {user && (
        <nav className="chat-topbar-tools" aria-label="Herramientas">
          <a
            href="/library"
            className={`chat-tool-btn ${activeView === 'library' ? 'is-active' : ''}`}
            title="Biblioteca — colecciones, etiquetas y exportación"
          >
            <Library size={16} />
            <span>Biblioteca</span>
          </a>
          {TOOLS.map(({ view, label, Icon, title }) => (
            <button
              key={view}
              className={`chat-tool-btn ${activeView === view ? 'is-active' : ''}`}
              onClick={() => onOpenView?.(view)}
              title={title}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}

      <div className="chat-topbar-actions">
        <button className="chat-topbar-new" onClick={onNewChat} title="Nueva búsqueda">
          <Plus size={14} />
          <span>Nueva</span>
        </button>

        <div className="chat-topbar-cluster">
          {user && onToggleIncognito && (
            <button
              className={`chat-incognito-btn ${incognito ? 'is-on' : ''}`}
              onClick={onToggleIncognito}
              title={incognito
                ? 'Modo incógnito activo — esta conversación no se guarda en el historial'
                : 'Activar modo incógnito (no guardar en el historial)'}
              aria-pressed={incognito}
            >
              {incognito ? <EyeOff size={16} /> : <Eye size={16} />}
              {incognito && <span className="chat-incognito-label">Incógnito</span>}
            </button>
          )}

          <ThemeBtn theme={theme} onToggle={onToggleTheme} />

          <div className="chat-topbar-divider" aria-hidden="true" />

          {user ? (
            <button
              className="chat-user-btn"
              onClick={onOpenProfile}
              title="Perfil y ajustes"
            >
              <div className="chat-user-avatar">
                {user.avatar_url
                  ? <img src={user.avatar_url} alt={firstName || 'avatar'} />
                  : <span>{initial}</span>
                }
              </div>
              {firstName && <span className="chat-user-name">{firstName}</span>}
              <ChevronDown size={11} className="chat-user-chevron" />
            </button>
          ) : (
            <a href="/login" className="btn-primary-small">Iniciar sesión</a>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatTopbar;
