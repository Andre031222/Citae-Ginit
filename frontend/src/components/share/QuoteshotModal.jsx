import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Download, Copy, Check } from '../Icons';
import { colorHex } from '../../constants/highlightColors';
import notify from '../../services/swal';

const SIZE = 1080;

function buildThemes(accentHex) {
  return [
    { name: 'Azul',   bg: ['#0056D6', '#0042A8'], text: '#ffffff', mark: 'rgba(255,255,255,0.22)', muted: 'rgba(255,255,255,0.72)', rule: 'rgba(255,255,255,0.25)' },
    { name: 'Dorado', bg: ['#FBE34D', '#F5C800'], text: '#0C0F12', mark: 'rgba(12,15,18,0.16)',  muted: 'rgba(12,15,18,0.62)',   rule: 'rgba(12,15,18,0.18)' },
    { name: 'Noche',  bg: ['#161B26', '#0E1117'], text: '#EDE8DF', mark: 'rgba(123,167,232,0.32)', muted: 'rgba(237,232,223,0.58)', rule: 'rgba(237,232,223,0.16)' },
    { name: 'Claro',  bg: ['#FFFFFF', '#F1F5F9'], text: '#0C0F12', mark: hexA(accentHex, 0.20),    muted: '#64748b',               rule: hexA(accentHex, 0.5) },
  ];
}

function hexA(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function draw(canvas, highlight, theme, accentHex) {
  const ctx = canvas.getContext('2d');
  const pad = 110;
  const innerW = SIZE - pad * 2;

  const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  grad.addColorStop(0, theme.bg[0]);
  grad.addColorStop(1, theme.bg[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.fillStyle = theme.mark;
  ctx.font = '900 240px Georgia, serif';
  ctx.textBaseline = 'top';
  ctx.fillText('“', pad - 14, pad - 40);

  const quote = String(highlight.quote || '').trim();
  let fontSize = 58;
  let lines = [];
  ctx.textBaseline = 'alphabetic';
  for (; fontSize >= 30; fontSize -= 2) {
    ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
    lines = wrapText(ctx, `“${quote}”`, innerW);
    const lineH = fontSize * 1.4;
    if (lines.length * lineH <= 560) break;
  }
  const lineH = fontSize * 1.4;
  const blockH = lines.length * lineH;
  let y = 300 + Math.max(0, (520 - blockH) / 2);

  ctx.fillStyle = theme.text;
  ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
  for (const ln of lines) {
    ctx.fillText(ln, pad, y);
    y += lineH;
  }

  const footY = SIZE - 230;
  ctx.strokeStyle = theme.rule;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pad, footY);
  ctx.lineTo(pad + 70, footY);
  ctx.stroke();

  const title = String(highlight.paper_title || '').trim();
  if (title) {
    ctx.fillStyle = theme.text;
    ctx.font = '700 30px Inter, system-ui, sans-serif';
    const tLines = wrapText(ctx, title, innerW).slice(0, 2);
    let ty = footY + 44;
    for (const ln of tLines) { ctx.fillText(ln, pad, ty); ty += 40; }

    const meta = [highlight.paper_authors?.split(',')[0], highlight.paper_year].filter(Boolean).join(' · ');
    if (meta) {
      ctx.fillStyle = theme.muted;
      ctx.font = '400 26px Inter, system-ui, sans-serif';
      ctx.fillText(meta, pad, ty + 4);
    }
  }

  ctx.fillStyle = theme.muted;
  ctx.font = '800 24px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('C I T A E', SIZE - pad, SIZE - pad + 6);
  ctx.textAlign = 'left';
}

const QuoteshotModal = ({ highlight, onClose }) => {
  const canvasRef = useRef(null);
  const [themeIdx, setThemeIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const accentHex = colorHex(highlight.color) || '#0056D6';
  const themes = buildThemes(accentHex);

  const render = useCallback(() => {
    if (canvasRef.current) draw(canvasRef.current, highlight, themes[themeIdx], accentHex);
  }, [highlight, themeIdx, accentHex, themes]);

  useEffect(() => {
    if (document.fonts?.ready) document.fonts.ready.then(render);
    render();
  }, [render]);

  const filename = () => {
    const base = (highlight.paper_title || 'cita').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'cita';
    return `quoteshot-${base}.png`;
  };

  const handleDownload = () => {
    canvasRef.current.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename();
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const handleCopy = () => {
    canvasRef.current.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {
        notify.info('Tu navegador no permite copiar la imagen', 'Usa el botón Descargar');
      }
    }, 'image/png');
  };

  return (
    <div className="qs-backdrop" onClick={onClose}>
      <div className="qs-modal" onClick={e => e.stopPropagation()}>
        <div className="qs-header">
          <span className="qs-title">Crear Quoteshot</span>
          <button className="lib-icon-btn" onClick={onClose} title="Cerrar"><X size={15} /></button>
        </div>

        <div className="qs-preview">
          <canvas ref={canvasRef} width={SIZE} height={SIZE} className="qs-canvas" />
        </div>

        <div className="qs-themes">
          {themes.map((t, i) => (
            <button
              key={t.name}
              className={`qs-theme ${i === themeIdx ? 'is-active' : ''}`}
              onClick={() => setThemeIdx(i)}
              style={{ background: t.bg[0], color: t.text }}
            >
              {t.name}
            </button>
          ))}
        </div>

        <div className="qs-actions">
          <button className="lib-btn-ghost" onClick={handleCopy}>
            {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar imagen</>}
          </button>
          <button className="lib-btn-primary" onClick={handleDownload}>
            <Download size={14} /> Descargar PNG
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuoteshotModal;
