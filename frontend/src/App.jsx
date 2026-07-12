import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { askAssistant } from './services/highlightService';

import { useTheme }      from './hooks/useTheme';
import { useAuth }       from './hooks/useAuth';
import { useUserData }   from './hooks/useUserData';
import { useChat }       from './hooks/useChat';
import { useMediaQuery } from './hooks/useMediaQuery';

import Sidebar          from './components/Sidebar';
import { ReferenceDrawer } from './components/CandidateComparison';
import { X, EyeOff } from './components/Icons';

import ChatTopbar   from './components/chat/ChatTopbar';
import UserMsg      from './components/chat/UserMsg';
import AssistantMsg from './components/chat/AssistantMsg';
import BiblioPanel  from './components/chat/BiblioPanel';
import ChatInput    from './components/chat/ChatInput';
import ChatWelcome  from './components/chat/ChatWelcome';
import AppLoader    from './components/chat/AppLoader';

const Login          = React.lazy(() => import('./components/Login'));
const Register       = React.lazy(() => import('./components/Register'));
const Profile        = React.lazy(() => import('./components/Profile'));
const LandingPage    = React.lazy(() => import('./components/LandingPage'));
const AdminBranding  = React.lazy(() => import('./components/admin/AdminBranding'));
const LibraryPage    = React.lazy(() => import('./components/library/LibraryPage'));
const ClaimRadar     = React.lazy(() => import('./components/claim/ClaimRadar'));
const AskLibrary     = React.lazy(() => import('./components/rag/AskLibrary'));
const DeepResearch   = React.lazy(() => import('./components/rag/DeepResearch'));
const ReviewPage       = React.lazy(() => import('./components/review/ReviewPage'));
const WritePage        = React.lazy(() => import('./components/write/WritePage'));
const AuthorSearch     = React.lazy(() => import('./components/authors/AuthorSearch'));
const PublicCollection = React.lazy(() => import('./components/public/PublicCollection'));
const PublicProfile    = React.lazy(() => import('./components/public/PublicProfile'));

function App() {
  const { t } = useTranslation();
  const { theme, toggleTheme }                          = useTheme();
  const { user, setUser, loading, handleLogin,
          handleUserUpdate }                            = useAuth();
  const userData                                        = useUserData(user);
  const chat                                            = useChat({
    user,
    loadHistory:   userData.loadHistory,
    loadFavorites: userData.loadFavorites,
  });

  const currentPaper = useMemo(() => {
    for (let i = chat.messages.length - 1; i >= 0; i--) {
      const t = chat.messages[i].paper?.title;
      if (t) return t;
    }
    return null;
  }, [chat.messages]);

  const isMobile = useMediaQuery('(max-width: 768px)');

  const [profileOpen,     setProfileOpen]     = useState(false);
  const [isSidebarOpen,   setIsSidebarOpen]   = useState(() => window.innerWidth > 768);
  const [drawerPanel,     setDrawerPanel]     = useState(null);
  const [choosingDrawer,  setChoosingDrawer]  = useState(false);
  const [appView,         setAppView]         = useState('chat');

  const openView = useCallback((view) => {
    setAppView(view);
    setDrawerPanel(null);
    if (isMobile) setIsSidebarOpen(false);
  }, [isMobile]);
  const messagesEndRef = useRef(null);
  const lastQueryRef   = useRef(null);

  const lastUserIndex = useMemo(() => {
    for (let i = chat.messages.length - 1; i >= 0; i--) {
      if (chat.messages[i].role === 'user') return i;
    }
    return -1;
  }, [chat.messages]);

  // Sincroniza el sidebar al cruzar el breakpoint móvil/desktop (resize, rotación)
  useEffect(() => { setIsSidebarOpen(!isMobile); }, [isMobile]);

  useEffect(() => {
    const last = chat.messages[chat.messages.length - 1];
    // Al llegar resultados de búsqueda: ir al inicio (la query) para leer desde arriba
    if (last?.role === 'assistant' && last.candidates && !last.loading && lastQueryRef.current) {
      lastQueryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chat.messages]);

  const openDrawer  = useCallback((candidate, messageId) => {
    if (isMobile) setIsSidebarOpen(false);
    setDrawerPanel(prev => prev?.candidate === candidate ? null : { candidate, messageId });
  }, [isMobile]);
  const closeDrawer = useCallback(() => setDrawerPanel(null), []);

  // En móvil sidebar y drawer son overlays excluyentes: abrir uno cierra el otro
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(open => {
      if (!open && isMobile) setDrawerPanel(null);
      return !open;
    });
  }, [isMobile]);

  // Escape centralizado: cierra el overlay superior (Profile → drawer → sidebar móvil)
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Escape') return;
      if (profileOpen)                    setProfileOpen(false);
      else if (drawerPanel)               setDrawerPanel(null);
      else if (isMobile && isSidebarOpen) setIsSidebarOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [profileOpen, drawerPanel, isMobile, isSidebarOpen]);

  const handleDrawerChoose = async (candidate) => {
    if (!drawerPanel) return;
    setChoosingDrawer(true);
    try {
      await chat.handleChooseCandidate(candidate, drawerPanel.messageId);
      setDrawerPanel(null);
    } catch (_) {}
    finally { setChoosingDrawer(false); }
  };

  const handleLogout = () => {
    setUser(null);
    chat.setMessages([]);
    setProfileOpen(false);
    window.location.href = '/';
  };

  // Nueva búsqueda: limpia el chat, vuelve a la vista de chat y cierra paneles
  const handleNewChat = useCallback(() => {
    chat.handleNewChat();
    setDrawerPanel(null);
    setProfileOpen(false);
    setAppView('chat');
  }, [chat]);

  const handleOpenHighlightPaper = useCallback((highlight) => {
    if (isMobile) setIsSidebarOpen(false);
    setDrawerPanel({
      candidate: {
        title:            highlight.paper_title,
        authors:          highlight.paper_authors,
        publication_year: highlight.paper_year,
        journal:          highlight.paper_journal,
        doi:              highlight.paper_doi,
        url:              highlight.paper_url,
        sources:          highlight.paper_source ? [highlight.paper_source] : [],
        score:            0,
      },
      messageId: null,
    });
  }, [isMobile]);

  const handleAskAssistant = async (payload) => {
    try { return await askAssistant(payload); }
    catch { return { available: false }; }
  };

  if (loading) return <AppLoader theme={theme} />;

  return (
    <Router>
      <div className="App">
        <Routes>

          <Route path="/" element={
            <React.Suspense fallback={null}>
              <LandingPage theme={theme} onToggleTheme={toggleTheme} />
            </React.Suspense>
          } />

          <Route path="/c/:slug" element={
            <React.Suspense fallback={null}>
              <PublicCollection />
            </React.Suspense>
          } />

          <Route path="/u/:username" element={
            <React.Suspense fallback={null}>
              <PublicProfile />
            </React.Suspense>
          } />

          <Route path="/login" element={
            <React.Suspense fallback={null}>
              {user ? <Navigate to="/app" /> : <Login onLogin={handleLogin} />}
            </React.Suspense>
          } />

          <Route path="/register" element={
            <React.Suspense fallback={null}>
              {user ? <Navigate to="/app" /> : <Register onLogin={handleLogin} />}
            </React.Suspense>
          } />

          <Route path="/profile" element={<Navigate to="/app" />} />

          <Route path="/admin" element={
            !user
              ? <Navigate to="/login" />
              : user.role !== 'super_admin'
                ? <Navigate to="/app" />
                : (
                  <React.Suspense fallback={null}>
                    <AdminBranding user={user} />
                  </React.Suspense>
                )
          } />

          <Route path="/library" element={
            !user
              ? <Navigate to="/login" />
              : (
                <React.Suspense fallback={null}>
                  <LibraryPage user={user} />
                </React.Suspense>
              )
          } />

          <Route path="/radar" element={
            !user
              ? <Navigate to="/login" />
              : (
                <React.Suspense fallback={null}>
                  <ClaimRadar />
                </React.Suspense>
              )
          } />

          <Route path="/ask" element={
            !user
              ? <Navigate to="/login" />
              : (
                <React.Suspense fallback={null}>
                  <AskLibrary />
                </React.Suspense>
              )
          } />

          <Route path="/research" element={
            !user
              ? <Navigate to="/login" />
              : (
                <React.Suspense fallback={null}>
                  <DeepResearch />
                </React.Suspense>
              )
          } />

          <Route path="/review" element={
            !user
              ? <Navigate to="/login" />
              : (
                <React.Suspense fallback={null}>
                  <ReviewPage />
                </React.Suspense>
              )
          } />

          {/* App — interfaz de chat */}
          <Route path="/app" element={
            <div className="chat-layout">
              {isMobile && isSidebarOpen && (
                <div
                  className="cs-backdrop"
                  onClick={() => setIsSidebarOpen(false)}
                  aria-hidden="true"
                />
              )}

              <Sidebar
                user={user}
                isOpen={isSidebarOpen}
                onLogout={handleLogout}
                onSelectPaper={chat.handleSelectPaper}
                onToggle={toggleSidebar}
                onSearchFromHistory={chat.handleHistorySearch}
                history={userData.userHistory}
                favorites={userData.userFavorites}
                onRemoveFavorite={userData.handleRemoveFavorite}
                onClearHistory={userData.handleClearHistory}
                theme={theme}
                onToggleTheme={toggleTheme}
                onNewChat={handleNewChat}
                onOpenProfile={() => setProfileOpen(true)}
                highlights={userData.userHighlights}
                onUpdateHighlight={userData.handleUpdateHighlight}
                onDeleteHighlight={userData.handleDeleteHighlight}
                onClearHighlights={userData.handleClearHighlights}
                onOpenHighlightPaper={handleOpenHighlightPaper}
                onUploadFile={chat.handleUploadPDF}
                activeView={appView}
                onOpenView={openView}
              />

              <div className="chat-main">
                <ChatTopbar
                  isSidebarOpen={isSidebarOpen}
                  onToggleSidebar={toggleSidebar}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  user={user}
                  onOpenProfile={() => setProfileOpen(true)}
                  onNewChat={handleNewChat}
                  currentPaper={currentPaper}
                  incognito={chat.incognito}
                  onToggleIncognito={() => chat.setIncognito(v => !v)}
                  activeView={appView}
                  onOpenView={openView}
                />

                {appView === 'chat' ? (
                  <>
                    {chat.incognito && (
                      <div className="chat-incognito-bar">
                        <EyeOff size={13} />
                        {t('shell.incognitoBar')}
                      </div>
                    )}
                    <div className="chat-messages-area">
                      {chat.messages.length === 0 ? (
                        <ChatWelcome user={user} onExample={chat.handleExtract} />
                      ) : (
                        <div className="chat-thread">
                          {chat.messages.map((msg, i) =>
                            msg.role === 'user'
                              ? <div key={msg.id} ref={i === lastUserIndex ? lastQueryRef : undefined}>
                                  <UserMsg msg={msg} />
                                </div>
                              : <AssistantMsg
                                  key={msg.id}
                                  msg={msg}
                                  onExport={chat.handleExport}
                                  onFavorite={chat.handleFavorite}
                                  onChooseCandidate={chat.handleChooseCandidate}
                                  onOpenDrawer={(c) => openDrawer(c, msg.id)}
                                  activeCandidate={
                                    drawerPanel?.messageId === msg.id ? drawerPanel.candidate : null
                                  }
                                  user={user}
                                  onMetaUpdate={chat.handleMetaUpdate}
                                  onAddToBiblio={chat.handleAddToBiblio}
                                  inBiblio={chat.biblioItems.some(b => b.msgId === msg.id)}
                                />
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </div>

                    {chat.biblioItems.length > 0 && (
                      <BiblioPanel
                        items={chat.biblioItems}
                        onRemove={(msgId) => chat.setBiblioItems(prev => prev.filter(b => b.msgId !== msgId))}
                        onClear={() => chat.setBiblioItems([])}
                      />
                    )}

                    <div className="chat-input-dock">
                      <ChatInput
                        onSend={chat.handleExtract}
                        onSendPDF={chat.handleUploadPDF}
                        loading={chat.extracting}
                      />
                    </div>
                  </>
                ) : (
                  <div className="chat-embed">
                    <React.Suspense fallback={null}>
                      {appView === 'radar'  && <ClaimRadar  embedded />}
                      {appView === 'ask'    && <AskLibrary  embedded />}
                      {appView === 'review' && <ReviewPage  embedded />}
                      {appView === 'write'  && <WritePage   embedded />}
                      {appView === 'authors' && (
                        <AuthorSearch
                          embedded
                          onCite={(work) => { setAppView('chat'); chat.handleCiteCandidate(work); }}
                        />
                      )}
                      {appView === 'admin'  && user?.role === 'super_admin' && <AdminBranding embedded user={user} />}
                    </React.Suspense>
                  </div>
                )}
              </div>

              {drawerPanel && (
                <ReferenceDrawer
                  candidate={drawerPanel.candidate}
                  onChoose={handleDrawerChoose}
                  onClose={closeDrawer}
                  choosing={choosingDrawer}
                  user={user}
                  userHighlights={userData.userHighlights}
                  onCreateHighlight={userData.handleCreateHighlight}
                  onUpdateHighlight={userData.handleUpdateHighlight}
                  onDeleteHighlight={userData.handleDeleteHighlight}
                  onAskAssistant={handleAskAssistant}
                />
              )}

              {profileOpen && (
                <>
                  <div
                    className="profile-overlay-backdrop"
                    onClick={() => setProfileOpen(false)}
                  />
                  <div className="profile-overlay-panel">
                    <div className="profile-overlay-header">
                      <span className="profile-overlay-header-title">{t('shell.settings')}</span>
                      <button
                        className="profile-overlay-close"
                        onClick={() => setProfileOpen(false)}
                        title={t('shell.close')}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="profile-overlay-body">
                      <React.Suspense fallback={null}>
                        <Profile
                          user={user}
                          onUpdate={handleUserUpdate}
                          onClose={() => setProfileOpen(false)}
                        />
                      </React.Suspense>
                    </div>
                  </div>
                </>
              )}
            </div>
          } />

        </Routes>
      </div>
    </Router>
  );
}

export default App;
