import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, ChevronDown, ChevronRight, X, Check } from '../Icons';
import { CITATION_FORMATS } from '../../constants/citationFormats';

const BIBLIO_FORMATS = CITATION_FORMATS;

function BiblioPanel({ items, onRemove, onClear }) {
  const { t } = useTranslation();
  const [fmt, setFmt]       = useState('APA');
  const [copied, setCopied] = useState(false);
  const [open, setOpen]     = useState(false);

  const buildText = () =>
    items.map((b, i) => {
      const raw = b.citations[fmt] || '';
      const plain = raw.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'").replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      return fmt === 'IEEE' ? plain.replace(/^\[1\]/, `[${i + 1}]`) : plain;
    }).join('\n\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(buildText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  return (
    <div className={`biblio-bar ${open ? 'biblio-bar-open' : ''}`}>
      <div className="biblio-bar-header" onClick={() => setOpen(v => !v)}>
        <span className="biblio-bar-icon"><BookOpen size={15} /></span>
        <span className="biblio-bar-count">{t('chatview.biblio.title', { count: items.length })}</span>
        <span className="biblio-bar-chevron">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
      </div>
      {open && (
        <div className="biblio-bar-body">
          <ol className="biblio-list">
            {items.map((b, i) => (
              <li key={b.msgId} className="biblio-list-item">
                <span className="biblio-list-num">{i + 1}.</span>
                <span className="biblio-list-title">{b.paper.title}</span>
                <button className="biblio-list-remove" onClick={() => onRemove(b.msgId)} title={t('chatview.biblio.remove')}>
                  <X size={11} />
                </button>
              </li>
            ))}
          </ol>
          <div className="biblio-bar-actions">
            <select className="biblio-fmt-select" value={fmt} onChange={e => setFmt(e.target.value)}>
              {BIBLIO_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <button className={`biblio-copy-btn ${copied ? 'biblio-copy-ok' : ''}`} onClick={handleCopy}>
              {copied ? <><Check size={13} /> {t('chatview.biblio.copied')}</> : t('chatview.biblio.copy', { count: items.length })}
            </button>
            <button className="biblio-clear-btn" onClick={onClear} title={t('chatview.biblio.clearTitle')}>
              {t('chatview.biblio.clear')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BiblioPanel;
