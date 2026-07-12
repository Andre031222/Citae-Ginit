import React from 'react';
import i18n from '../../i18n';

export function renderCited(text, { sources = [], onCite } = {}) {
  return String(text).split(/(\[\d+\])/g).map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    if (!m) return <span key={i}>{part}</span>;
    const n = parseInt(m[1], 10);
    const src = sources.find(s => s.n === n);
    return (
      <button
        key={i}
        type="button"
        className="cite-chip"
        title={src ? src.title : i18n.t('paperui.citeText.source', { n })}
        onClick={onCite ? () => onCite(n) : undefined}
        tabIndex={onCite ? 0 : -1}
      >
        {n}
      </button>
    );
  });
}
