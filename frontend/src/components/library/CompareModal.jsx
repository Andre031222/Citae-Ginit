import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Download } from '../Icons';

function exportCsv(papers, dimensions, dimensionLabel) {
  const headers = [`"${dimensionLabel}"`, ...papers.map(p => `"${p.title?.replace(/"/g, '""') || ''}"`)]
    .join(',');
  const rows = dimensions.map(d =>
    [`"${d.label}"`, ...d.values.map(v => `"${String(v || '').replace(/"/g, '""')}"`)].join(',')
  );
  const csv  = [headers, ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'comparacion.csv';
  a.click();
  URL.revokeObjectURL(url);
}

const CompareModal = ({ result, onClose }) => {
  const { t } = useTranslation();
  const { papers, dimensions, available } = result;

  return (
    <div className="lib-modal-backdrop" onClick={onClose}>
      <div className="cmp-modal" onClick={e => e.stopPropagation()}>
        <div className="cmp-header">
          <span className="cmp-title">{t('library.compare.title')}</span>
          <div className="cmp-actions">
            {available && (
              <button
                className="lib-btn-ghost cmp-export-btn"
                onClick={() => exportCsv(papers, dimensions, t('library.compare.dimension'))}
                title={t('library.compare.exportCsvTitle')}
              >
                <Download size={13} />
                CSV
              </button>
            )}
            <button className="lib-icon-btn" onClick={onClose} title={t('library.close')}>
              <X size={15} />
            </button>
          </div>
        </div>

        {!available ? (
          <div className="cmp-unavailable">
            {t('library.compare.unavailable')}
          </div>
        ) : (
          <div className="cmp-table-wrap">
            <table className="cmp-table">
              <thead>
                <tr>
                  <th className="cmp-th-dim">{t('library.compare.dimension')}</th>
                  {papers.map((p, i) => (
                    <th key={i} className="cmp-th-paper">
                      <span className="cmp-paper-title">{p.title}</span>
                      <span className="cmp-paper-meta">
                        {[p.authors?.split(',')[0], p.publication_year].filter(Boolean).join(' · ')}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dimensions.map((dim, di) => (
                  <tr key={di} className={di % 2 === 0 ? 'cmp-row-even' : ''}>
                    <td className="cmp-td-label">{dim.label}</td>
                    {dim.values.map((v, vi) => (
                      <td key={vi} className="cmp-td-value">{v || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompareModal;
