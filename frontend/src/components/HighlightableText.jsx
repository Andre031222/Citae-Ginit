import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HIGHLIGHT_COLORS } from '../constants/highlightColors';
import CopyButton from './common/CopyButton';
import { Edit, Sparkles, Trash2, X, Copy, ArrowRight, Shield, ChevronDown } from './Icons';

export { HIGHLIGHT_COLORS };

/* TRUST CARDS — pasajes literales del paper que respaldan la respuesta */
function TrustSources({ sources }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!sources?.length) return null;

  return (
    <div className={`cc-trust ${open ? 'is-open' : ''}`}>
      <button className="cc-trust-toggle" onClick={() => setOpen(o => !o)}>
        <Shield size={12} />
        <span>{t('paperui.highlight.trustSources', { count: sources.length })}</span>
        <ChevronDown size={13} className="cc-trust-caret" />
      </button>
      {open && (
        <div className="cc-trust-list">
          {sources.map((s, i) => (
            <blockquote key={i} className="cc-trust-card">"{s}"</blockquote>
          ))}
        </div>
      )}
    </div>
  );
}

/* TOOLBAR FLOTANTE — aparece sobre la selección con swatches, nota y copiar.
   Para un resaltado existente añade cambiar color y eliminar. */
function HighlightToolbar({
  pos,          // { top, left }
  selectedText, // texto seleccionado (nueva selección)
  highlight,    // highlight existente (para editar)
  onColor,      // (colorKey) → crear o cambiar color
  onNote,       // () → abrir input de nota
  onDelete,     // () → eliminar
  onAskIA,      // () → abrir assistant
  onClose,
}) {
  const { t } = useTranslation();
  if (!pos) return null;
  const text = selectedText || highlight?.quote || '';

  return (
    <div
      className="hl-toolbar"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={e => e.preventDefault()} // evitar perder selección
    >
      {/* Swatches de color */}
      <div className="hl-toolbar-swatches">
        {HIGHLIGHT_COLORS.map(c => (
          <button
            key={c.key}
            className={`hl-swatch hl-swatch-${c.key} ${highlight?.color === c.key ? 'hl-swatch-active' : ''}`}
            title={t(`paperui.colors.${c.key}`)}
            onClick={() => onColor(c.key)}
          />
        ))}
      </div>
      <div className="hl-toolbar-divider" />
      {/* Acciones */}
      <button className="hl-toolbar-btn" title={t('paperui.highlight.addNote')} onClick={onNote}><Edit size={13} /></button>
      <CopyButton text={text} className="hl-toolbar-btn" iconOnly size={14} resetMs={1800} />
      <button className="hl-toolbar-btn hl-toolbar-ai" title={t('paperui.highlight.askAi')} onClick={onAskIA}><Sparkles size={13} /></button>
      {highlight && (
        <button className="hl-toolbar-btn hl-toolbar-del" title={t('paperui.highlight.deleteHighlight')} onClick={onDelete}><Trash2 size={13} /></button>
      )}
      <button className="hl-toolbar-btn hl-toolbar-close" title={t('paperui.highlight.close')} onClick={onClose}><X size={13} /></button>
    </div>
  );
}

function renderMarkdown(text) {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    const parts = [];
    let rest = line;
    let key = 0;
    while (rest.length) {
      const boldIdx = rest.indexOf('**');
      if (boldIdx === -1) { parts.push(rest); break; }
      if (boldIdx > 0) parts.push(rest.slice(0, boldIdx));
      const closeIdx = rest.indexOf('**', boldIdx + 2);
      if (closeIdx === -1) { parts.push(rest.slice(boldIdx)); break; }
      parts.push(<strong key={key++}>{rest.slice(boldIdx + 2, closeIdx)}</strong>);
      rest = rest.slice(closeIdx + 2);
    }
    return <span key={i}>{parts}{i < text.split('\n').length - 1 && <br />}</span>;
  });
}

export default function HighlightableText({
  text,
  field = 'abstract',
  highlights = [],
  user,
  onCreateHighlight,  // (payload) → void
  onUpdateHighlight,  // (id, changes) → void
  onDeleteHighlight,  // (id) → void
  onAskAssistant,     // (payload) → { available, answer }
  paperMeta = {},     // { doi, title, authors, year, journal, source, url, paper_id }
}) {
  const { t } = useTranslation();
  const containerRef   = useRef(null);
  const threadRef      = useRef(null);
  const [toolbar, setToolbar] = useState(null);
  const [noteInput, setNoteInput] = useState({ open: false, value: '' });
  const [aiState, setAiState]     = useState({ open: false, question: '', loading: false, history: [] });

  // Cerrar toolbar al hacer clic fuera del contenedor
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setToolbar(null);
        setNoteInput({ open: false, value: '' });
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-scroll del hilo al agregar mensajes
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [aiState.history, aiState.loading]);

  // Calcular offset dentro del contenedor
  function getTextOffset(node, offset, container) {
    let total = 0;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let current;
    while ((current = walker.nextNode())) {
      if (current === node) return total + offset;
      total += current.textContent.length;
    }
    return total + offset;
  }

  // Posición del toolbar sobre la selección
  function getToolbarPos(range) {
    const rect     = range.getBoundingClientRect();
    const contRect = containerRef.current.getBoundingClientRect();
    return {
      // Si la selección está en la primera línea, mostrar debajo en vez de encima
      top:  Math.max(4, rect.top - contRect.top - 44),
      left: Math.max(0, rect.left - contRect.left + rect.width / 2 - 130),
    };
  }

  // onMouseUp: detectar selección nueva
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!containerRef.current?.contains(range.commonAncestorContainer)) return;

    const selectedText = sel.toString().trim();
    if (selectedText.length < 3) return;

    const startOffset = getTextOffset(range.startContainer, range.startOffset, containerRef.current);
    const endOffset   = getTextOffset(range.endContainer,   range.endOffset,   containerRef.current);

    setToolbar({
      pos: getToolbarPos(range),
      selectedText,
      startOffset,
      endOffset,
      highlight: null,
    });
    setNoteInput({ open: false, value: '' });
  }, []);

  // Clic en un mark existente
  const handleMarkClick = useCallback((e, hl) => {
    e.stopPropagation();
    const rect     = e.currentTarget.getBoundingClientRect();
    const contRect = containerRef.current.getBoundingClientRect();
    setToolbar({
      pos: { top: rect.top - contRect.top - 44, left: Math.max(0, rect.left - contRect.left + rect.width / 2 - 130) },
      selectedText: null,
      highlight: hl,
    });
    setNoteInput({ open: false, value: hl.note || '' });
  }, []);

  // Crear resaltado
  const handleColor = useCallback((colorKey) => {
    if (!toolbar) return;
    if (toolbar.highlight) {
      // Cambiar color de uno existente
      onUpdateHighlight?.(toolbar.highlight.id, { color: colorKey });
      setToolbar(null);
      return;
    }
    // Nuevo resaltado
    const payload = {
      ...paperMeta,
      quote:        toolbar.selectedText,
      color:        colorKey,
      field,
      start_offset: toolbar.startOffset,
      end_offset:   toolbar.endOffset,
      note:         noteInput.value || null,
    };
    onCreateHighlight?.(payload);
    window.getSelection()?.removeAllRanges();
    setToolbar(null);
    setNoteInput({ open: false, value: '' });
  }, [toolbar, noteInput, field, paperMeta, onCreateHighlight, onUpdateHighlight]);

  // Guardar nota
  const handleSaveNote = useCallback(() => {
    if (!toolbar) return;
    if (toolbar.highlight) {
      onUpdateHighlight?.(toolbar.highlight.id, { note: noteInput.value });
    }
    // Si es nueva selección, la nota se guardará al elegir el color
    setNoteInput(prev => ({ ...prev, open: false }));
  }, [toolbar, noteInput, onUpdateHighlight]);

  const handleDelete = useCallback(() => {
    if (toolbar?.highlight) {
      onDeleteHighlight?.(toolbar.highlight.id);
      setToolbar(null);
    }
  }, [toolbar, onDeleteHighlight]);

  const handleAskIA = useCallback(() => {
    setAiState(prev => ({ ...prev, open: true, question: '' }));
  }, []);

  const handleAskSubmit = useCallback(async (question) => {
    const q = question.trim();
    if (!q) return;

    const userMsg = { role: 'user', content: q };
    setAiState(prev => ({
      ...prev,
      loading: true,
      question: '',
      history: [...prev.history, userMsg],
    }));

    const historyForApi = aiState.history.map(h => ({ role: h.role, content: h.content }));

    const result = await onAskAssistant?.({
      question: q,
      quote:    toolbar?.selectedText || toolbar?.highlight?.quote || '',
      abstract: text,
      field,
      title:    paperMeta.paper_title,
      authors:  paperMeta.paper_authors,
      year:     paperMeta.paper_year,
      history:  historyForApi,
    }) || { available: false };

    const assistantMsg = {
      role: 'assistant',
      content: result.available
        ? result.answer
        : t('paperui.assistant.aiUnavailable'),
      suggestions: result.suggestions || [],
      sources: result.sources || [],
    };

    setAiState(prev => ({
      ...prev,
      loading: false,
      history: [...prev.history, assistantMsg],
    }));
  }, [toolbar, text, field, paperMeta, onAskAssistant, aiState.history]);

  // Render del texto segmentado
  function renderSegments() {
    if (!highlights.length) return <span>{text}</span>;

    const resolved = highlights
      .map(hl => {
        let s = hl.start_offset;
        let e = hl.end_offset;

        // Si hay offsets, verificar que aún coincidan con el quote guardado
        // (el abstract generado por IA puede cambiar entre sesiones)
        if (s !== null && e !== null && text.slice(s, e) !== hl.quote) {
          // Los offsets apuntan a texto distinto — re-anclar por contenido
          s = null; e = null;
        }

        // Fallback: buscar el quote literalmente en el texto actual
        if (s == null || e == null) {
          const idx = text.indexOf(hl.quote);
          if (idx === -1) return null; // quote no encontrado: no resaltar
          s = idx; e = idx + hl.quote.length;
        }

        return { ...hl, s, e };
      })
      .filter(Boolean)
      .sort((a, b) => a.s - b.s);

    const segments = [];
    let cursor = 0;
    resolved.forEach(hl => {
      // Ignorar highlights que comienzan antes del cursor (solapamiento)
      if (hl.s < cursor) return;
      if (hl.s > cursor) segments.push({ type: 'text', text: text.slice(cursor, hl.s) });
      segments.push({ type: 'mark', hl, text: text.slice(hl.s, hl.e) });
      cursor = hl.e;
    });
    if (cursor < text.length) segments.push({ type: 'text', text: text.slice(cursor) });

    return segments.map((seg, i) => {
      if (seg.type === 'text') return <span key={i}>{seg.text}</span>;
      return (
        <mark
          key={i}
          className={`hl hl-${seg.hl.color}`}
          title={seg.hl.note || t(`paperui.colors.${seg.hl.color}`)}
          onClick={(e) => handleMarkClick(e, seg.hl)}
        >
          {seg.text}
          {seg.hl.note && <span className="hl-note-dot" title={seg.hl.note}>•</span>}
        </mark>
      );
    });
  }

  return (
    <div className="hl-root" ref={containerRef} onMouseUp={handleMouseUp} style={{ position: 'relative' }}>
      <p className="cc-drawer-abstract">{renderSegments()}</p>

      {/* Toolbar flotante */}
      {toolbar && (
        <HighlightToolbar
          pos={toolbar.pos}
          selectedText={toolbar.selectedText}
          highlight={toolbar.highlight}
          onColor={handleColor}
          onNote={() => setNoteInput(prev => ({ open: !prev.open, value: toolbar.highlight?.note || prev.value }))}
          onDelete={handleDelete}
          onAskIA={handleAskIA}
          onClose={() => { setToolbar(null); window.getSelection()?.removeAllRanges(); }}
        />
      )}

      {/* Input de nota (debajo del toolbar) */}
      {toolbar && noteInput.open && (
        <div className="hl-note-input-wrap" style={{ top: (toolbar.pos?.top || 0) + 50, left: toolbar.pos?.left || 0 }}>
          <textarea
            className="hl-note-input"
            placeholder={t('paperui.highlight.notePlaceholder')}
            value={noteInput.value}
            rows={3}
            onChange={e => setNoteInput(prev => ({ ...prev, value: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSaveNote(); }}
            autoFocus
          />
          <div className="hl-note-input-actions">
            <button className="hl-note-save" onClick={handleSaveNote}>{t('paperui.highlight.saveNote')}</button>
            <button className="hl-note-cancel" onClick={() => setNoteInput(prev => ({ ...prev, open: false }))}>{t('paperui.highlight.cancel')}</button>
          </div>
          <span className="hl-note-hint">{t('paperui.highlight.saveHint')}</span>
        </div>
      )}

      {/* Reading Assistant — panel conversacional */}
      {aiState.open && (
        <div className="cc-assistant">
          <div className="cc-assistant-header">
            <span className="cc-assistant-title"><Sparkles size={12} /> Reading Assistant</span>
            <button
              className="cc-assistant-close"
              onClick={() => setAiState({ open: false, question: '', loading: false, history: [] })}
            ><X size={13} /></button>
          </div>

          {/* Chips rápidos — solo si no hay historial ni loading */}
          {aiState.history.length === 0 && !aiState.loading && (
            <div className="cc-assistant-chips">
              {[
                t('paperui.assistant.chipExplain'),
                t('paperui.assistant.chipSummarize'),
                t('paperui.assistant.chipWhy'),
                t('paperui.assistant.chipMethod'),
              ].map(q => (
                <button key={q} className="cc-assistant-chip" onClick={() => handleAskSubmit(q)}>{q}</button>
              ))}
            </div>
          )}

          {/* Loading del primer turno (antes de que llegue la respuesta) */}
          {aiState.loading && aiState.history.length === 0 && (
            <div className="cc-assistant-loading" style={{ padding: '10px 12px' }}>
              <span className="cc-abs-loading-dot"/><span className="cc-abs-loading-dot"/><span className="cc-abs-loading-dot"/>
              <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 8 }}>{t('paperui.assistant.thinking')}</span>
            </div>
          )}

          {/* Hilo de conversación */}
          {aiState.history.length > 0 && (
            <div className="cc-assistant-thread" ref={threadRef}>
              {aiState.history.map((msg, i) => (
                <div key={i} className={`cc-msg cc-msg-${msg.role}`}>
                  {msg.role === 'assistant' && (
                    <div className="cc-msg-header">
                      <span className="cc-ai-summary-badge"><Sparkles size={11} /> IA</span>
                      <button
                        className="cc-msg-copy"
                        title={t('paperui.assistant.copyAnswer')}
                        onClick={() => navigator.clipboard.writeText(msg.content).catch(() => {})}
                      ><Copy size={13} /></button>
                    </div>
                  )}
                  <p className="cc-msg-text">{renderMarkdown(msg.content)}</p>
                  {msg.role === 'assistant' && (
                    <p className="cc-msg-attribution">
                      {t('paperui.assistant.basedOnPrefix', {
                        source: field === 'fulltext'
                          ? t('paperui.assistant.basedOnFulltext')
                          : t('paperui.assistant.basedOnAbstract'),
                      })}
                    </p>
                  )}
                  {msg.role === 'assistant' && <TrustSources sources={msg.sources} />}
                  {msg.suggestions?.length > 0 && i === aiState.history.length - 1 && (
                    <div className="cc-assistant-chips cc-assistant-chips-follow">
                      {msg.suggestions.map(s => (
                        <button key={s} className="cc-assistant-chip" onClick={() => handleAskSubmit(s)}>{s}</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {aiState.loading && (
                <div className="cc-assistant-loading">
                  <span className="cc-abs-loading-dot"/><span className="cc-abs-loading-dot"/><span className="cc-abs-loading-dot"/>
                </div>
              )}
            </div>
          )}

          {/* Input */}
          <div className="cc-assistant-input-row">
            <input
              className="cc-assistant-input"
              placeholder={aiState.history.length ? t('paperui.assistant.followupPlaceholder') : t('paperui.assistant.askPlaceholder')}
              value={aiState.question}
              onChange={e => setAiState(prev => ({ ...prev, question: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleAskSubmit(aiState.question); }}
              disabled={aiState.loading}
              autoFocus
            />
            <button
              className="cc-assistant-send"
              onClick={() => handleAskSubmit(aiState.question)}
              disabled={aiState.loading || !aiState.question.trim()}
            >{aiState.loading ? '…' : <ArrowRight size={14} />}</button>
          </div>
        </div>
      )}
    </div>
  );
}
