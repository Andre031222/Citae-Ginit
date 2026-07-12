import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, ChevronLeft, ArrowRight, Loader, Library,
  FileText, Highlighter, ExternalLink, Bot,
} from '../Icons';
import { askLibrary } from '../../services/libraryService';
import { renderCited } from '../common/CiteText';
import notify from '../../services/swal';

function CitationCard({ cite }) {
  const { t } = useTranslation();
  const isHighlight = cite.kind === 'highlight';
  const meta = [cite.meta?.authors?.split(',')[0], cite.meta?.year].filter(Boolean).join(', ');
  const url = cite.meta?.url || (cite.meta?.doi ? `https://doi.org/${cite.meta.doi}` : null);

  return (
    <div className="ask-source-card">
      <div className="ask-source-head">
        <span className={`ask-source-kind ask-kind-${cite.kind}`}>
          {isHighlight ? <Highlighter size={11} /> : <FileText size={11} />}
          {isHighlight ? t('rag.ask.kindHighlight') : t('rag.ask.kindPaper')}
        </span>
        <span className="ask-source-n">[{cite.n}]</span>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="ask-source-link" title={t('rag.ask.openSource')}>
            <ExternalLink size={12} />
          </a>
        )}
      </div>
      <p className="ask-source-title">{cite.title}</p>
      {meta && <p className="ask-source-meta">{meta}</p>}
      <p className="ask-source-snippet">{cite.snippet}</p>
    </div>
  );
}

const AskLibrary = ({ embedded = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const EXAMPLES = t('rag.ask.examples', { returnObjects: true });
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [corpusSize, setCorpusSize] = useState(null);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const send = useCallback(async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;

    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setInput('');
    setLoading(true);

    try {
      const res = await askLibrary(q, history);
      if (typeof res.corpusSize === 'number') setCorpusSize(res.corpusSize);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.available ? res.answer : t('rag.ask.unavailable'),
        citations: res.citations || [],
      }]);
    } catch {
      notify.error(t('rag.ask.errorToast'));
      setMessages(prev => [...prev, { role: 'assistant', content: t('rag.ask.error'), citations: [] }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, t]);

  const empty = messages.length === 0;

  return (
    <div className={`ask-page ${embedded ? 'is-embedded' : ''}`}>
      {!embedded && (
        <header className="ask-topbar">
          <button className="lib-back" onClick={() => navigate('/library')} title={t('rag.backTitle')}>
            <ChevronLeft size={16} />
            {t('rag.back')}
          </button>
          <div className="ask-brand">
            <Sparkles size={18} />
            <h1 className="ask-title">{t('rag.ask.title')}</h1>
          </div>
          {corpusSize !== null && (
            <span className="ask-corpus" title={t('rag.ask.corpusTitle')}>
              <Library size={13} /> {corpusSize}
            </span>
          )}
        </header>
      )}

      <div className="ask-thread">
        {empty && !loading && (
          <div className="ask-welcome">
            <div className="ask-welcome-icon"><Bot size={32} /></div>
            <h2>{t('rag.ask.welcomeTitle')}</h2>
            <p>{t('rag.ask.welcomeText')}</p>
            <div className="ask-examples">
              {EXAMPLES.map(ex => (
                <button key={ex} className="ask-example" onClick={() => send(ex)}>{ex}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`ask-msg ask-msg-${m.role}`}>
            {m.role === 'assistant' && (
              <span className="ask-ai-badge"><Sparkles size={11} /> {t('rag.ask.aiBadge')}</span>
            )}
            <div className="ask-msg-body">
              <p className="ask-msg-text">
                {m.role === 'assistant' ? renderCited(m.content, { sources: m.citations }) : m.content}
              </p>
              {m.citations?.length > 0 && (
                <div className="ask-sources">
                  {m.citations.map(c => <CitationCard key={c.n} cite={c} />)}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="ask-msg ask-msg-assistant">
            <span className="ask-ai-badge"><Sparkles size={11} /> IA</span>
            <div className="ask-msg-body">
              <div className="ask-loading">
                <Loader size={15} className="lib-spin" />
                {t('rag.ask.searching')}
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="ask-input-dock">
        <div className="ask-input-wrap">
          <input
            className="ask-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) send(); }}
            placeholder={t('rag.ask.placeholder')}
            disabled={loading}
          />
          <button className="ask-send" onClick={() => send()} disabled={loading || !input.trim()}>
            {loading ? <Loader size={15} className="lib-spin" /> : <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AskLibrary;
