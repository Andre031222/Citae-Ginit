import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, FileText, ImageIcon, Loader, ArrowUp, Filter } from '../Icons';

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp';
const isImage = (f) => f && f.type.startsWith('image/');

const ChatInput = ({ onSend, onSendPDF, loading }) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo,   setYearTo]   = useState('');
  const [minCites, setMinCites] = useState('');
  const [type,     setType]     = useState('');
  const fileRef = useRef(null);
  const taRef   = useRef(null);

  const autoResize = () => {
    const ta = taRef.current;
    if (!ta) return;
    const maxH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--max-input-height')) || 160;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, maxH) + 'px';
  };

  const buildFilters = () => {
    const f = {};
    const yf = parseInt(yearFrom, 10);
    const yt = parseInt(yearTo, 10);
    const mc = parseInt(minCites, 10);
    if (!Number.isNaN(yf)) f.yearFrom = yf;
    if (!Number.isNaN(yt)) f.yearTo = yt;
    if (!Number.isNaN(mc)) f.minCitations = mc;
    if (type) f.type = type;
    return f;
  };

  const activeCount = [yearFrom, yearTo, minCites, type].filter(Boolean).length;

  const clearFilters = () => { setYearFrom(''); setYearTo(''); setMinCites(''); setType(''); };

  const canSend = !loading && (file || text.trim());

  const send = () => {
    if (!canSend) return;
    if (file) { onSendPDF(file); setFile(null); }
    else {
      onSend(text.trim(), buildFilters());
      setText('');
      if (taRef.current) taRef.current.style.height = 'auto';
    }
  };

  const keyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const ok = f.type === 'application/pdf' || f.type.startsWith('image/');
    if (ok) setFile(f);
    e.target.value = '';
  };

  return (
    <div className="ci-wrap">
      {file && (
        <div className={`ci-file-pill${isImage(file) ? ' ci-file-pill--img' : ''}`}>
          {isImage(file) ? <ImageIcon size={13} /> : <FileText size={13} />}
          <span>{file.name}</span>
          <button onClick={() => setFile(null)}><X size={11} /></button>
        </div>
      )}

      {showFilters && !file && (
        <div className="ci-filters">
          <div className="ci-filter-field">
            <label>{t('chatview.input.yearFrom')}</label>
            <input type="number" inputMode="numeric" placeholder="2018"
              value={yearFrom} onChange={e => setYearFrom(e.target.value)} />
          </div>
          <div className="ci-filter-field">
            <label>{t('chatview.input.yearTo')}</label>
            <input type="number" inputMode="numeric" placeholder="2026"
              value={yearTo} onChange={e => setYearTo(e.target.value)} />
          </div>
          <div className="ci-filter-field">
            <label>{t('chatview.input.minCites')}</label>
            <input type="number" inputMode="numeric" placeholder="50"
              value={minCites} onChange={e => setMinCites(e.target.value)} />
          </div>
          <div className="ci-filter-field">
            <label>{t('chatview.input.type')}</label>
            <select value={type} onChange={e => setType(e.target.value)}>
              <option value="">{t('chatview.input.typeAll')}</option>
              <option value="article">{t('chatview.input.typeArticle')}</option>
              <option value="preprint">{t('chatview.input.typePreprint')}</option>
            </select>
          </div>
          {activeCount > 0 && (
            <button className="ci-filter-clear" onClick={clearFilters} title={t('chatview.input.clearFilters')}>
              <X size={12} /> {t('chatview.input.clear')}
            </button>
          )}
        </div>
      )}

      <div className="ci-row">
        <button
          className="ci-attach"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          title={t('chatview.input.attach')}
        >
          <Upload size={16} />
        </button>
        <button
          className={`ci-attach ci-filter-toggle${activeCount > 0 ? ' is-active' : ''}`}
          onClick={() => setShowFilters(v => !v)}
          disabled={loading || !!file}
          title={t('chatview.input.filtersToggle')}
        >
          <Filter size={15} />
          {activeCount > 0 && <span className="ci-filter-badge">{activeCount}</span>}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          style={{ display: 'none' }}
          onChange={handleFile}
        />
        <textarea
          ref={taRef}
          className="ci-textarea"
          placeholder={t('chatview.input.placeholder')}
          value={text}
          onChange={(e) => { setText(e.target.value); autoResize(); }}
          onKeyDown={keyDown}
          disabled={loading || !!file}
          rows={1}
        />
        <button className="ci-send" onClick={send} disabled={!canSend}>
          {loading
            ? <Loader size={16} className="spinning" />
            : <ArrowUp size={16} />
          }
        </button>
      </div>
      <p className="ci-hint">{t('chatview.input.hint')}</p>
    </div>
  );
};

export default ChatInput;
