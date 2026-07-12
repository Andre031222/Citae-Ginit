import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  PenLine, ChevronLeft, Search, Quote, Copy, Download, Check, X, Loader,
} from '../Icons';
import { getLibraryPapers } from '../../services/libraryService';
import { formatCitation, CITATION_FORMATS } from '../../services/citationFormatter';
import PaperCover from '../common/PaperCover';
import notify from '../../services/swal';

const STORE_KEY = 'citae-draft';

function htmlToPlain(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .trim();
}

const WritePage = ({ embedded = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [title,  setTitle]  = useState('');
  const [text,   setText]   = useState('');
  const [cited,  setCited]  = useState([]);
  const [format, setFormat] = useState('APA');

  const [libPapers, setLibPapers] = useState([]);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [copied,    setCopied]    = useState(false);

  const textRef = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (saved) { setTitle(saved.title || ''); setText(saved.text || ''); setCited(saved.cited || []); setFormat(saved.format || 'APA'); }
    } catch {}
    getLibraryPapers().then(p => setLibPapers(p)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      localStorage.setItem(STORE_KEY, JSON.stringify({ title, text, cited, format }));
    }, 600);
    return () => clearTimeout(t);
  }, [title, text, cited, format]);

  const insertCite = useCallback((paper) => {
    let idx = cited.findIndex(p => p.id === paper.id);
    let list = cited;
    if (idx === -1) { list = [...cited, paper]; setCited(list); idx = list.length - 1; }
    const n = idx + 1;

    const ta = textRef.current;
    const pos = ta ? ta.selectionStart : text.length;
    const mark = `[${n}]`;
    const next = text.slice(0, pos) + mark + text.slice(pos);
    setText(next);
    requestAnimationFrame(() => {
      if (ta) { ta.focus(); ta.selectionStart = ta.selectionEnd = pos + mark.length; }
    });
  }, [cited, text]);

  const removeCite = (paperId) => {
    setCited(prev => prev.filter(p => p.id !== paperId));
  };

  const filtered = libPapers.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (p.title || '').toLowerCase().includes(q) || (p.authors || '').toLowerCase().includes(q);
  });

  const biblio = cited.map((p, i) => `[${i + 1}] ${htmlToPlain(formatCitation(p, format))}`);

  const buildDoc = () => {
    const parts = [];
    if (title.trim()) parts.push(title.trim(), '');
    parts.push(text.trim());
    if (biblio.length) { parts.push('', t('adminwrite.write.references'), ...biblio); }
    return parts.join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildDoc()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const handleDownload = () => {
    const blob = new Blob([buildDoc()], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title.trim() || t('adminwrite.write.defaultFilename')).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = async () => {
    const r = await notify.confirm({ title: t('adminwrite.write.confirmClearTitle'), text: t('adminwrite.write.confirmClearText'), confirmText: t('adminwrite.write.clear') });
    if (!r.isConfirmed) return;
    setTitle(''); setText(''); setCited([]);
  };

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className={`wr-page ${embedded ? 'is-embedded' : ''}`}>
      {!embedded && (
        <header className="wr-topbar">
          <button className="lib-back" onClick={() => navigate('/library')}>
            <ChevronLeft size={16} /> {t('adminwrite.write.back')}
          </button>
          <div className="wr-brand"><PenLine size={18} /><h1 className="wr-title-h">{t('adminwrite.write.title')}</h1></div>
        </header>
      )}

      <div className="wr-body">
        <div className="wr-editor-col">
          <div className="wr-toolbar">
            <select className="wr-format" value={format} onChange={e => setFormat(e.target.value)} title={t('adminwrite.write.formatTitle')}>
              {CITATION_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <span className="wr-words">{t('adminwrite.write.stats', { words, count: cited.length })}</span>
            <div className="wr-toolbar-actions">
              <button className="lib-btn-ghost" onClick={handleClear} title={t('adminwrite.write.clear')}><X size={14} /></button>
              <button className="lib-btn-ghost" onClick={handleCopy}>
                {copied ? <><Check size={14} /> {t('adminwrite.write.copied')}</> : <><Copy size={14} /> {t('adminwrite.write.copy')}</>}
              </button>
              <button className="lib-btn-primary" onClick={handleDownload}><Download size={14} /> {t('adminwrite.write.download')}</button>
            </div>
          </div>

          <div className="wr-sheet">
            <input
              className="wr-title-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('adminwrite.write.titlePh')}
            />
            <textarea
              ref={textRef}
              className="wr-textarea"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={t('adminwrite.write.bodyPh')}
            />

            {biblio.length > 0 && (
              <div className="wr-biblio">
                <h3 className="wr-biblio-title">{t('adminwrite.write.references')}</h3>
                {cited.map((p, i) => (
                  <p key={p.id} className="wr-ref">
                    <span className="wr-ref-n">[{i + 1}]</span>
                    <span className="wr-ref-text">{htmlToPlain(formatCitation(p, format))}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="wr-cite-panel">
          <div className="wr-panel-head"><Quote size={15} /> {t('adminwrite.write.insertCite')}</div>
          <div className="wr-panel-search">
            <Search size={13} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('adminwrite.write.searchPh')} />
          </div>

          {loading ? (
            <div className="wr-panel-loading"><Loader size={18} className="lib-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="wr-panel-empty">
              {libPapers.length === 0 ? t('adminwrite.write.emptyLib') : t('adminwrite.write.noResults')}
            </p>
          ) : (
            <div className="wr-panel-list">
              {filtered.map(p => {
                const citedIdx = cited.findIndex(c => c.id === p.id);
                return (
                  <button key={p.id} className="wr-cite-item" onClick={() => insertCite(p)} title={t('adminwrite.write.insertAtCursor')}>
                    <PaperCover paper={p} size={38} className="wr-cite-cover" />
                    <span className="wr-cite-body">
                      <span className="wr-cite-title">{p.title}</span>
                      <span className="wr-cite-meta">{[p.authors?.split(',')[0], p.publication_year].filter(Boolean).join(' · ')}</span>
                    </span>
                    {citedIdx >= 0
                      ? <span className="wr-cite-num">[{citedIdx + 1}]</span>
                      : <span className="wr-cite-plus">+</span>}
                  </button>
                );
              })}
            </div>
          )}

          {cited.length > 0 && (
            <div className="wr-used">
              <span className="wr-used-head">{t('adminwrite.write.cited', { count: cited.length })}</span>
              {cited.map((p, i) => (
                <div key={p.id} className="wr-used-item">
                  <span className="wr-used-n">[{i + 1}]</span>
                  <span className="wr-used-title">{p.title}</span>
                  <button className="wr-used-x" onClick={() => removeCite(p.id)} title={t('adminwrite.write.removeFromRefs')}><X size={11} /></button>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default WritePage;
