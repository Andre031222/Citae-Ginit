import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff,
  Library, Radar, Sparkles, Users, PenLine, BookOpen,
} from '../Icons';
import ThemeBtn from './ThemeBtn';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { useBranding } from '../../context/BrandingContext';

// Herramientas mostradas en la barra superior (antes en el sidebar).
// El texto (label/title) se resuelve por i18n con la clave chat.tools.<key>.
const TOOLS = [
  { view: 'radar',   key: 'radar',   Icon: Radar },
  { view: 'ask',     key: 'ask',     Icon: Sparkles },
  { view: 'authors', key: 'authors', Icon: Users },
  { view: 'write',   key: 'write',   Icon: PenLine },
  { view: 'review',  key: 'review',  Icon: BookOpen },
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
  const { t } = useTranslation();
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
          title={isSidebarOpen ? t('chat.hidePanel') : t('chat.showPanel')}
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
        <nav className="chat-topbar-tools" aria-label={t('chat.toolsAria')}>
          <a
            href="/library"
            className={`chat-tool-btn ${activeView === 'library' ? 'is-active' : ''}`}
            title={t('chat.libraryTitle')}
          >
            <Library size={16} />
            <span>{t('chat.library')}</span>
          </a>
          {TOOLS.map(({ view, key, Icon }) => (
            <button
              key={view}
              className={`chat-tool-btn ${activeView === view ? 'is-active' : ''}`}
              onClick={() => onOpenView?.(view)}
              title={t(`chat.tools.${key}Title`)}
            >
              <Icon size={16} />
              <span>{t(`chat.tools.${key}`)}</span>
            </button>
          ))}
        </nav>
      )}

      <div className="chat-topbar-actions">
        <button className="chat-topbar-new" onClick={onNewChat} title={t('chat.newTitle')}>
          <Plus size={14} />
          <span>{t('chat.newLabel')}</span>
        </button>

        <div className="chat-topbar-cluster">
          {user && onToggleIncognito && (
            <button
              className={`chat-incognito-btn ${incognito ? 'is-on' : ''}`}
              onClick={onToggleIncognito}
              title={incognito ? t('chat.incognitoOn') : t('chat.incognitoOff')}
              aria-pressed={incognito}
            >
              {incognito ? <EyeOff size={16} /> : <Eye size={16} />}
              {incognito && <span className="chat-incognito-label">{t('chat.incognitoLabel')}</span>}
            </button>
          )}

          <LanguageSwitcher />

          <ThemeBtn theme={theme} onToggle={onToggleTheme} />

          <div className="chat-topbar-divider" aria-hidden="true" />

          {user ? (
            <button
              className="chat-user-btn"
              onClick={onOpenProfile}
              title={t('chat.profileTitle')}
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
            <a href="/login" className="btn-primary-small">{t('chat.login')}</a>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatTopbar;
