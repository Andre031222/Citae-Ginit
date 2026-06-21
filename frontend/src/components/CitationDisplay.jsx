import React, { useState } from 'react';
import { Copy, Download, Check } from './Icons';
import { CITATION_FORMATS } from '../constants/citationFormats';

const CitationDisplay = ({ citations, onExport }) => {
  const [copiedFormat, setCopiedFormat] = useState(null);
  const [activeFormat, setActiveFormat] = useState('APA');

  const formats = CITATION_FORMATS;

  const handleCopy = (format, text) => {
    // Eliminar etiquetas HTML para el portapapeles
    const cleanText = text.replace(/<\/?[^>]+(>|$)/g, '');
    navigator.clipboard.writeText(cleanText);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  return (
    <div className="citation-display">
      <div className="citation-header">
        <h3>Citaciones Generadas</h3>
        <button className="export-button" onClick={onExport}>
          <Download size={16} />
          Exportar Todo
        </button>
      </div>

      <div className="format-tabs">
        {formats.map(format => (
          <button
            key={format}
            className={`format-tab ${activeFormat === format ? 'active' : ''}`}
            onClick={() => setActiveFormat(format)}
          >
            {format}
          </button>
        ))}
      </div>

      <div className="citation-content">
        {citations[activeFormat] && (
          <div className="citation-box">
            {activeFormat === 'BibTeX' ? (
              <pre className="citation-text citation-bibtex">{citations[activeFormat]}</pre>
            ) : (
              <div
                className="citation-text"
                dangerouslySetInnerHTML={{ __html: citations[activeFormat] }}
              />
            )}
            <button
              className="copy-button"
              onClick={() => handleCopy(activeFormat, citations[activeFormat])}
            >
              {copiedFormat === activeFormat ? (
                <><Check size={16} />Copiado</>
              ) : (
                <><Copy size={16} />Copiar</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CitationDisplay;