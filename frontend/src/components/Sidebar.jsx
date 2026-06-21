import React, { useState, useMemo, useRef } from 'react';
import {
  Edit, LogOut, Upload,
  Sun, Moon, Settings, Trash2, Star, Clock, Search, X, Filter, Highlighter, ChevronRight,
  ImageIcon, Palette, Library, Radar, Sparkles, BookOpen, PenLine, Users,
} from './Icons';
import authService from '../services/authService';
import notify from '../services/swal';
import citoLogo from '../assets/citae-logo-v2.png';
import { useBranding } from '../context/BrandingContext';
import { HIGHLIGHT_COLORS, colorHex, colorName } from '../constants/highlightColors';
import { formatTime, groupByDate, groupHighlightsByPaper } from '../utils/sidebarUtils';
import HighlightDetail from './sidebar/HighlightDetail';

const Sidebar = ({
  user,
  isOpen,
  onToggle,
  onLogout,
  onSelectPaper,
  onSearchFromHistory,
  history = [],
  favorites = [],
  onRemoveFavorite,
  onClearHistory,
  theme,
  onToggleTheme,
  onNewChat,
  onOpenProfile,
  highlights = [],
  onUpdateHighlight,
  onDeleteHighlight,
  onClearHighlights,
  onOpenHighlightPaper,
  onUploadFile,
  activeView = 'chat',
  onOpenView,
}) => {
  const { branding } = useBranding();
  const [tab,            setTab]           = useState('history');
  const [searchQuery,    setSearchQuery]   = useState('');
  const [histFilter,     setHistFilter]    = useState('all');
  const [showFilters,    setShowFilters]   = useState(false);
  const [hlColorFilter,  setHlColorFilter] = useState('all');
  const [hlFavFilter,    setHlFavFilter]   = useState(false);
  const [hlDetail,       setHlDetail]      = useState(null);
  const [dragOver,       setDragOver]      = useState(false);
  const uploadRef = useRef(null);

  const handleLogout = async () => {
    try { await authService.logout(); } catch (_) {}
    onLogout();
  };

  const filteredHistory = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return history.filter(item => {
      const text = (item.display_title || item.search_query || '').toLowerCase();
      return (!q || text.includes(q)) && (histFilter === 'all' || item.type === histFilter);
    });
  }, [history, searchQuery, histFilter]);

  const filteredFavorites = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return favorites;
    return favorites.filter(item =>
      [(item.title || ''), (item.authors || '')].join(' ').toLowerCase().includes(q)
    );
  }, [favorites, searchQuery]);

  const groupedHistory = useMemo(() => groupByDate(filteredHistory), [filteredHistory]);

  const filteredHighlights = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return highlights.filter(hl => {
      const matchColor = hlColorFilter === 'all' || hl.color === hlColorFilter;
      const matchFav   = !hlFavFilter || hl.is_favorite;
      const matchText  = !q || [hl.quote, hl.note || '', hl.paper_title || ''].join(' ').toLowerCase().includes(q);
      return matchColor && matchFav && matchText;
    });
  }, [highlights, hlColorFilter, hlFavFilter, searchQuery]);

  const groupedHighlights = useMemo(() => groupHighlightsByPaper(filteredHighlights), [filteredHighlights]);

  const exportHighlights = (format) => {
    if (!filteredHighlights.length) return;
    const grouped = groupHighlightsByPaper(filteredHighlights);
    let text = '';
    let successMsg = '';

    if (format === 'md') {
      const lines = [];
      grouped.forEach(g => {
        lines.push(`## ${g.title}`);
        if (g.authors) lines.push(`*${g.authors}${g.year ? ` · ${g.year}` : ''}*`);
        if (g.journal) lines.push(`*${g.journal}*`);
        lines.push('');
        g.items.forEach(hl => {
          lines.push(`> ${hl.quote}`);
          if (hl.note) lines.push(`> 📝 ${hl.note}`);
          lines.push('');
        });
      });
      text = lines.join('\n');
      successMsg = 'Apuntes copiados en Markdown';
    } else if (format === 'json') {
      const data = grouped.map(g => ({
        title: g.title, authors: g.authors, year: g.year, journal: g.journal, doi: g.doi,
        highlights: g.items.map(hl => ({
          quote: hl.quote, color: hl.color, note: hl.note || null,
          field: hl.field || 'abstract', is_favorite: hl.is_favorite, created_at: hl.created_at,
        })),
      }));
      text = JSON.stringify(data, null, 2);
      successMsg = 'Exportado como JSON';
    } else if (format === 'notion') {
      const COLORS = { yellow: '🟡', green: '🟢', blue: '🔵', pink: '🩷', navy: '🔷' };
      const lines = ['| Paper | Fragmento | Color | Nota |', '|---|---|---|---|'];
      filteredHighlights.forEach(hl => {
        const title = (hl.paper_title || '').substring(0, 60).replace(/\|/g, '\\|');
        const quote = hl.quote.substring(0, 120).replace(/\|/g, '\\|');
        const note  = (hl.note || '').replace(/\|/g, '\\|');
        lines.push(`| ${title} | ${quote} | ${COLORS[hl.color] || hl.color} | ${note} |`);
      });
      text = lines.join('\n');
      successMsg = 'Tabla Notion copiada';
    }

    navigator.clipboard.writeText(text)
      .then(() => notify.success(successMsg))
      .catch(() => notify.error('No se pudo copiar al portapapeles'));
  };

  const avatarLetter = (user?.full_name || user?.username || 'U').charAt(0).toUpperCase();
  const avatarImg    = user?.profile_image_url || user?.avatar_url || null;
  const histTotal    = history.length;
  const favTotal     = favorites.length;
  const hlTotal      = highlights.length;
  const hasFiltersActive = searchQuery || histFilter !== 'all';

  // Actualiza el highlight y refresca el detalle abierto si coincide
  const handleUpdateHl = (id, changes) => {
    onUpdateHighlight?.(id, changes);
    if (hlDetail?.id === id) {
      setHlDetail(prev => ({ ...prev, ...changes }));
    }
  };

  // Upload desde sidebar
  const handleSidebarFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const ok = f.type === 'application/pdf' || f.type.startsWith('image/');
    if (ok && onUploadFile) onUploadFile(f);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (!f) return;
    const ok = f.type === 'application/pdf' || f.type.startsWith('image/');
    if (ok && onUploadFile) onUploadFile(f);
  };

  return (
    <aside className={`cs ${isOpen ? 'cs-open' : 'cs-closed'}`}>

      {/* HEADER */}
      <div className="cs-header">
        <div className="cs-brand">
          <img src={branding.logo_url || citoLogo} alt={branding.site_name || 'Citae'} className="cs-brand-logo" />
          <span className="cs-brand-name">{branding.site_name || 'Citae'}</span>
        </div>
        <button className="cs-new-btn" onClick={onNewChat} title="Nueva búsqueda (Ctrl+Shift+N)">
          <Edit size={13} />
          <span className="cs-new-btn-label">Nuevo</span>
        </button>
        <button className="cs-close-mobile" onClick={onToggle} title="Cerrar panel" aria-label="Cerrar panel">
          <X size={18} />
        </button>
      </div>

      {/* TABS */}
      <div className="cs-tabs cs-tabs-3">
        <button
          className={`cs-tab ${tab === 'history' ? 'cs-tab-active' : ''}`}
          onClick={() => { setTab('history'); setHlDetail(null); }}
          title="Historial de búsquedas"
        >
          <Clock size={13} className="cs-tab-ic" />
          <span>Historial</span>
          {histTotal > 0 && <span className="cs-badge">{histTotal}</span>}
        </button>
        <button
          className={`cs-tab ${tab === 'favorites' ? 'cs-tab-active' : ''}`}
          onClick={() => { setTab('favorites'); setHlDetail(null); }}
          title="Papers guardados"
        >
          <Star size={13} className="cs-tab-ic" />
          <span>Guardados</span>
          {favTotal > 0 && <span className="cs-badge">{favTotal}</span>}
        </button>
        <button
          className={`cs-tab ${tab === 'highlights' ? 'cs-tab-active' : ''}`}
          onClick={() => { setTab('highlights'); setHlDetail(null); }}
          title="Tus apuntes y resaltados"
        >
          <Highlighter size={13} className="cs-tab-ic" />
          <span>Apuntes</span>
          {hlTotal > 0 && <span className="cs-badge">{hlTotal}</span>}
        </button>
      </div>

      {/* ZONA DE CARGA (PDF / imagen) */}
      {onUploadFile && (
        <>
          <input
            ref={uploadRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            style={{ display: 'none' }}
            onChange={handleSidebarFile}
          />
          <div
            className={`cs-upload-zone${dragOver ? ' cs-upload-zone--over' : ''}`}
            onClick={() => uploadRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <span className="cs-upload-icon">
              {dragOver ? <ImageIcon size={15} /> : <Upload size={15} />}
            </span>
            <span className="cs-upload-label">
              {dragOver ? 'Suelta aquí' : 'Importar PDF o imagen'}
            </span>
          </div>
        </>
      )}

      {/* BARRA DE BÚSQUEDA */}
      {!hlDetail && (
        <div className="cs-search-wrap">
          <div className="cs-search-row">
            <div className="cs-search-input-wrap">
              <Search size={13} className="cs-search-icon" />
              <input
                className="cs-search-input"
                type="text"
                placeholder={
                  tab === 'history'    ? 'Buscar en historial…'
                  : tab === 'favorites' ? 'Buscar guardados…'
                  : 'Buscar apuntes…'
                }
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="cs-search-clear" onClick={() => setSearchQuery('')} title="Limpiar">
                  <X size={11} />
                </button>
              )}
            </div>
            {tab === 'history' && (
              <button
                className={`cs-filter-btn ${showFilters || histFilter !== 'all' ? 'cs-filter-btn-active' : ''}`}
                onClick={() => setShowFilters(v => !v)}
                title="Filtros"
              >
                <Filter size={13} />
              </button>
            )}
          </div>

          {tab === 'history' && showFilters && (
            <div className="cs-filter-row">
              {[
                { key: 'all',      label: 'Todos' },
                { key: 'citation', label: 'Cita' },
                { key: 'pdf',      label: 'PDF',    icon: <Upload size={10} /> },
                { key: 'image',    label: 'Imagen', icon: <ImageIcon size={10} /> },
              ].map(f => (
                <button
                  key={f.key}
                  className={`cs-filter-pill ${histFilter === f.key ? 'cs-filter-pill-active' : ''}`}
                  onClick={() => setHistFilter(f.key)}
                >
                  {f.icon}{f.label}
                </button>
              ))}
            </div>
          )}

          {/* Filtros de color para apuntes */}
          {tab === 'highlights' && highlights.length > 0 && (
            <div className="cs-hl-color-bar">
              <button
                className={`cs-hl-color-all ${hlColorFilter === 'all' ? 'active' : ''}`}
                onClick={() => setHlColorFilter('all')}
              >Todos</button>
              {HIGHLIGHT_COLORS.map(c => (
                <button
                  key={c.key}
                  className={`cs-hl-swatch cs-hl-swatch-${c.key} ${hlColorFilter === c.key ? 'cs-hl-swatch-active' : ''}`}
                  title={colorName(c.key)}
                  style={{ '--sw-color': colorHex(c.key) }}
                  onClick={() => setHlColorFilter(hlColorFilter === c.key ? 'all' : c.key)}
                />
              ))}
              <button
                className={`cs-hl-fav-btn ${hlFavFilter ? 'cs-hl-fav-active' : ''}`}
                title="Solo favoritos"
                onClick={() => setHlFavFilter(v => !v)}
              ><Star size={13} /></button>
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO */}
      <div className="cs-list">

        {/* Panel detalle de apunte */}
        {hlDetail && (
          <HighlightDetail
            hl={hlDetail}
            onBack={() => setHlDetail(null)}
            onUpdate={handleUpdateHl}
            onDelete={onDeleteHighlight}
            onOpenPaper={onOpenHighlightPaper}
          />
        )}

        {/* Historial */}
        {!hlDetail && tab === 'history' && (
          <>
            {history.length === 0 ? (
              <div className="cs-empty">
                <Clock size={28} />
                <span className="cs-empty-title">Sin historial aún</span>
                <span className="cs-empty-sub">
                  {user ? 'Busca un paper para empezar.' : 'Inicia sesión para guardar tu historial.'}
                </span>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="cs-empty cs-empty-sm">
                <Search size={22} />
                <span>Sin resultados para "{searchQuery}"</span>
              </div>
            ) : (
              <>
                <div className="cs-list-actions">
                  {hasFiltersActive && (
                    <span className="cs-filter-info">{filteredHistory.length} de {histTotal}</span>
                  )}
                  <button className="cs-clear-btn" onClick={onClearHistory} title="Limpiar todo">
                    <Trash2 size={11} /> Limpiar todo
                  </button>
                </div>
                {groupedHistory.map(([group, items]) => (
                  <div key={group} className="cs-date-group">
                    <span className="cs-date-group-label">{group}</span>
                    {items.map(item => (
                      <button
                        key={item.id}
                        className="cs-item cs-item-hist"
                        onClick={() => onSearchFromHistory(item)}
                        title={item.display_title || item.search_query}
                      >
                        <div className="cs-item-body">
                          <span className="cs-item-title">
                            {item.display_title || item.search_query}
                          </span>
                          {item.type === 'pdf' && (
                            <span className="cs-item-meta">
                              <span className="cs-item-type-badge">PDF</span>
                            </span>
                          )}
                        </div>
                        <span className="cs-item-time">{formatTime(item.created_at)}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* Apuntes / highlights */}
        {!hlDetail && tab === 'highlights' && (
          <>
            {!user ? (
              <div className="cs-empty">
                <Highlighter size={28} />
                <span className="cs-empty-title">Inicia sesión</span>
                <span className="cs-empty-sub">Inicia sesión para guardar tus apuntes.</span>
              </div>
            ) : highlights.length === 0 ? (
              <div className="cs-empty">
                <Highlighter size={28} />
                <span className="cs-empty-title">Sin apuntes aún</span>
                <span className="cs-empty-sub">Selecciona texto en el abstract de un paper y elige un color.</span>
              </div>
            ) : (
              <>
                <div className="cs-hl-toolbar-row">
                  <span className="cs-filter-info">
                    {filteredHighlights.length} apunte{filteredHighlights.length !== 1 ? 's' : ''}
                  </span>
                  <div className="cs-hl-toolbar-actions">
                    <button className="cs-hl-export-btn" onClick={() => exportHighlights('md')} title="Copiar como Markdown">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      MD
                    </button>
                    <button className="cs-hl-export-btn" onClick={() => exportHighlights('json')} title="Copiar como JSON">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                      JSON
                    </button>
                    <button className="cs-hl-export-btn" onClick={() => exportHighlights('notion')} title="Copiar tabla para Notion">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                      Notion
                    </button>
                    <button className="cs-clear-btn" onClick={onClearHighlights} title="Eliminar todos">
                      <Trash2 size={11} /> Limpiar
                    </button>
                  </div>
                </div>

                {filteredHighlights.length === 0 ? (
                  <div className="cs-empty cs-empty-sm">
                    <Search size={22} />
                    <span>Sin resultados</span>
                  </div>
                ) : (
                  <div className="cs-hl-list">
                    {groupedHighlights.map(group => (
                      <div key={group.key} className="cs-hl-paper-group">
                        {/* Card de paper — abre detalle del primero */}
                        <div className="cs-hl-paper-card">
                          <div className="cs-hl-paper-card-body" onClick={() => onOpenHighlightPaper?.(group.items[0])}>
                            <span className="cs-hl-paper-title">{group.title}</span>
                            {group.authors && (
                              <span className="cs-hl-paper-meta">
                                {group.authors.split(',')[0].trim()}
                                {group.year ? ` · ${group.year}` : ''}
                              </span>
                            )}
                          </div>
                          <div className="cs-hl-paper-card-right">
                            <div className="cs-hl-color-dots">
                              {[...new Set(group.items.map(h => h.color))].map(col => (
                                <span key={col} className="cs-hl-dot" style={{ background: colorHex(col) }} />
                              ))}
                            </div>
                            <span className="cs-hl-count-badge">{group.items.length}</span>
                          </div>
                        </div>

                        {/* Resaltados del paper — clic → panel detalle */}
                        {group.items.map(hl => (
                          <button
                            key={hl.id}
                            className={`cs-hl-item cs-hl-item-${hl.color}`}
                            onClick={() => setHlDetail(hl)}
                          >
                            <div className={`cs-hl-color-stripe cs-hl-stripe-${hl.color}`}
                              style={{ background: colorHex(hl.color) }} />
                            <div className="cs-hl-item-body">
                              <p className="cs-hl-quote">"{hl.quote}"</p>
                              {hl.note && <p className="cs-hl-note">{hl.note}</p>}
                              <div className="cs-hl-item-footer">
                                <span className="cs-hl-date">{formatTime(hl.created_at)}</span>
                                {hl.is_favorite && <span className="cs-hl-fav-dot"><Star size={10} /></span>}
                              </div>
                            </div>
                            <ChevronRight size={12} className="cs-hl-chevron" />
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Favoritos */}
        {!hlDetail && tab === 'favorites' && (
          <>
            {favorites.length === 0 ? (
              <div className="cs-empty">
                <Star size={28} />
                <span className="cs-empty-title">Sin guardados</span>
                <span className="cs-empty-sub">Marca papers con <Star size={11} /> para guardarlos aquí.</span>
              </div>
            ) : filteredFavorites.length === 0 ? (
              <div className="cs-empty cs-empty-sm">
                <Search size={22} />
                <span>Sin resultados para "{searchQuery}"</span>
              </div>
            ) : (
              <div style={{ paddingTop: '6px' }}>
                {filteredFavorites.map(item => (
                  <div key={item.id} className="cs-item cs-item-fav">
                    <Star size={12} className="cs-item-icon cs-item-icon-star" />
                    <div
                      className="cs-item-body"
                      onClick={() => onSelectPaper(item)}
                      style={{ cursor: 'pointer' }}
                    >
                      <span className="cs-item-title">{item.title}</span>
                      <span className="cs-item-meta">
                        {item.authors ? item.authors.split(',')[0].trim() : 'Autor desconocido'}
                        {item.publication_year ? ` · ${item.publication_year}` : ''}
                        {item.journal ? ` · ${item.journal}` : ''}
                      </span>
                    </div>
                    <button
                      className="cs-item-del"
                      onClick={() => onRemoveFavorite(item.id)}
                      title="Quitar de guardados"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* FOOTER */}
      <div className="cs-footer">
        {user && (
          <div className="cs-footer-group">
            <span className="cs-footer-heading">Herramientas</span>
            <a href="/library" className="cs-footer-btn" title="Biblioteca — colecciones, etiquetas y exportación">
              <span className="cs-footer-ic"><Library size={15} /></span>
              <span>Biblioteca</span>
            </a>
            <button
              className={`cs-footer-btn ${activeView === 'radar' ? 'cs-footer-btn-active' : ''}`}
              onClick={() => onOpenView?.('radar')}
              title="Radar de Afirmaciones — verifica evidencia académica"
            >
              <span className="cs-footer-ic"><Radar size={15} /></span>
              <span>Radar</span>
            </button>
            <button
              className={`cs-footer-btn ${activeView === 'ask' ? 'cs-footer-btn-active' : ''}`}
              onClick={() => onOpenView?.('ask')}
              title="Pregunta a tu biblioteca — chat con IA sobre tus papers y resaltados"
            >
              <span className="cs-footer-ic"><Sparkles size={15} /></span>
              <span>Preguntar</span>
            </button>
            <button
              className={`cs-footer-btn ${activeView === 'authors' ? 'cs-footer-btn-active' : ''}`}
              onClick={() => onOpenView?.('authors')}
              title="Descubrir autores — busca investigadores y sus publicaciones"
            >
              <span className="cs-footer-ic"><Users size={15} /></span>
              <span>Autores</span>
            </button>
            <button
              className={`cs-footer-btn ${activeView === 'write' ? 'cs-footer-btn-active' : ''}`}
              onClick={() => onOpenView?.('write')}
              title="Redactar — escribe e inserta citas de tu biblioteca"
            >
              <span className="cs-footer-ic"><PenLine size={15} /></span>
              <span>Redactar</span>
            </button>
            <button
              className={`cs-footer-btn ${activeView === 'review' ? 'cs-footer-btn-active' : ''}`}
              onClick={() => onOpenView?.('review')}
              title="Repaso del día — refuerza tus resaltados con repaso espaciado"
            >
              <span className="cs-footer-ic"><BookOpen size={15} /></span>
              <span>Repaso</span>
            </button>
          </div>
        )}

        <div className="cs-footer-divider" aria-hidden="true" />

        <div className="cs-footer-group">
          <button className="cs-footer-btn" onClick={onToggleTheme}>
            <span className="cs-footer-ic">{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}</span>
            <span>{theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}</span>
          </button>
          <button className="cs-footer-btn" onClick={onOpenProfile}>
            <span className="cs-footer-ic"><Settings size={15} /></span>
            <span>Configuración</span>
          </button>
          {user?.role === 'super_admin' && (
            <button
              className={`cs-footer-btn cs-footer-btn--admin ${activeView === 'admin' ? 'cs-footer-btn-active' : ''}`}
              onClick={() => onOpenView?.('admin')}
              title="Admin — Identidad visual del sitio"
            >
              <span className="cs-footer-ic"><Palette size={15} /></span>
              <span>Admin — Branding</span>
            </button>
          )}
        </div>

        {user ? (
          <div className="cs-user" onClick={onOpenProfile} title="Perfil y configuración">
            <div className="cs-user-avatar">
              {avatarImg
                ? <img src={avatarImg} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : avatarLetter
              }
            </div>
            <div className="cs-user-info">
              <span className="cs-user-name">{user.full_name || user.username}</span>
              <span className="cs-user-email">{user.email}</span>
            </div>
            <button
              className="cs-icon-btn cs-logout"
              onClick={(e) => { e.stopPropagation(); handleLogout(); }}
              title="Cerrar sesión"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="cs-guest-actions">
            <a href="/login"    className="cs-guest-btn cs-guest-login">Iniciar sesión</a>
            <a href="/register" className="cs-guest-btn cs-guest-register">Crear cuenta</a>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
