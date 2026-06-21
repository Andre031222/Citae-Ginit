import React, { useState } from 'react';
import { Copy, Check } from '../Icons';

/** Limpia etiquetas HTML y entidades para el portapapeles */
function stripHtml(html = '') {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * @param {string}  text          - Texto a copiar (acepta HTML: se limpia automáticamente)
 * @param {string}  [label]       - Etiqueta del botón (default "Copiar")
 * @param {boolean} [iconOnly]    - Solo icono, sin texto (default false)
 * @param {string}  [className]   - Clase CSS en estado normal
 * @param {string}  [classNameOk] - Clase CSS adicional cuando se ha copiado
 * @param {number}  [size]        - Tamaño del icono en px (default 16)
 * @param {number}  [resetMs]     - Ms antes de resetear estado copiado (default 2000)
 */
export default function CopyButton({
  text,
  label     = 'Copiar',
  iconOnly  = false,
  className = '',
  classNameOk = '',
  size      = 16,
  resetMs   = 2000,
}) {
  const [ok, setOk] = useState(false);

  const handleClick = () => {
    const clean = stripHtml(text);
    navigator.clipboard.writeText(clean).then(() => {
      setOk(true);
      setTimeout(() => setOk(false), resetMs);
    }).catch(() => {});
  };

  const cls = ok && classNameOk
    ? `${className} ${classNameOk}`.trim()
    : className;

  return (
    <button
      className={cls}
      onClick={handleClick}
      title={ok ? 'Copiado' : label}
      aria-label={label}
    >
      {ok ? <Check size={size} /> : <Copy size={size} />}
      {!iconOnly && <span>{ok ? 'Copiado' : label}</span>}
    </button>
  );
}
