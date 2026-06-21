// Google Fonts — parámetros por nombre de familia
export const GF_MAP = {
  'Inter':             'Inter:wght@700;800;900',
  'Plus Jakarta Sans': 'Plus+Jakarta+Sans:wght@700;800',
  'Space Grotesk':     'Space+Grotesk:wght@600;700',
  'DM Sans':           'DM+Sans:ital,wght@0,700;0,800;1,700',
  'Sora':              'Sora:wght@700;800',
  'Outfit':            'Outfit:wght@700;800;900',
  'Nunito':            'Nunito:ital,wght@0,700;0,800;0,900;1,700',
  'Merriweather':      'Merriweather:ital,wght@0,700;0,900;1,700',
  'Playfair Display':  'Playfair+Display:ital,wght@0,700;0,800;1,700',
  'Lora':              'Lora:ital,wght@0,600;0,700;1,600;1,700',
  'EB Garamond':       'EB+Garamond:ital,wght@0,700;0,800;1,700',
  'Source Serif 4':    'Source+Serif+4:ital,wght@0,600;0,700;1,600;1,700',
  'Crimson Pro':       'Crimson+Pro:ital,wght@0,600;0,700;1,600;1,700',
  'Cormorant Garamond':'Cormorant+Garamond:ital,wght@0,600;0,700;1,600;1,700',
  'Cormorant':         'Cormorant:ital,wght@0,600;0,700;1,600;1,700',
  'Libre Baskerville': 'Libre+Baskerville:ital,wght@0,400;0,700;1,400',
  'Spectral':          'Spectral:ital,wght@0,600;0,700;1,600;1,700',
  'Bitter':            'Bitter:ital,wght@0,600;0,700;1,600',
  'PT Serif':          'PT+Serif:ital,wght@0,400;0,700;1,400;1,700',
  'Fraunces':          'Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,600;1,9..144,700',
  'Bodoni Moda':       'Bodoni+Moda:ital,opsz,wght@0,6..96,700;0,6..96,800;1,6..96,700',
  'Cardo':             'Cardo:ital,wght@0,400;1,400',
  'Pacifico':          'Pacifico',
  'Dancing Script':    'Dancing+Script:wght@600;700',
  'Caveat':            'Caveat:wght@600;700',
  'Satisfy':           'Satisfy',
  'Great Vibes':       'Great+Vibes',
  'Righteous':         'Righteous',
  'Fredoka':           'Fredoka:wght@600;700',
  'Quicksand':         'Quicksand:wght@600;700',
  'Raleway':           'Raleway:ital,wght@0,700;0,800;1,700',
};

/**
 * Inyecta una hoja de estilos de Google Fonts para la familia dada.
 * Inter se omite porque está cargada en index.html.
 */
export function loadGoogleFont(fontName) {
  if (!fontName || fontName === 'Inter') return;
  const gf = GF_MAP[fontName];
  if (!gf) return;
  const id = `gf-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id   = id;
  link.rel  = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${gf}&display=swap`;
  document.head.appendChild(link);
}

/**
 * Oscurece un color hex en ~50 puntos por canal.
 */
export function darken(hex) {
  try {
    const n  = parseInt(hex.replace('#', ''), 16);
    const r  = Math.max(0, (n >> 16) - 50);
    const g  = Math.max(0, ((n >> 8) & 0xff) - 50);
    const bv = Math.max(0, (n & 0xff) - 50);
    return `#${((r << 16) | (g << 8) | bv).toString(16).padStart(6, '0')}`;
  } catch { return hex; }
}
