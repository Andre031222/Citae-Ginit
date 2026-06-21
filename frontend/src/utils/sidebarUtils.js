export function formatTime(ds) {
  const d    = new Date(ds);
  const diff = Math.floor((Date.now() - d) / 60000);
  if (diff < 1)    return 'ahora';
  if (diff < 60)   return `${diff}m`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h`;
  if (diff < 2880) return 'ayer';
  return `${Math.floor(diff / 1440)}d`;
}

export function formatDate(ds) {
  const d = new Date(ds);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function groupByDate(items) {
  const now       = new Date();
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today - 86400000);
  const weekAgo   = new Date(today - 6 * 86400000);
  const monthAgo  = new Date(today - 29 * 86400000);

  const groups = {
    'Hoy': [], 'Ayer': [], 'Esta semana': [], 'Este mes': [], 'Más antiguo': [],
  };

  items.forEach(item => {
    const d       = new Date(item.created_at);
    const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if      (itemDay >= today)     groups['Hoy'].push(item);
    else if (itemDay >= yesterday) groups['Ayer'].push(item);
    else if (itemDay >= weekAgo)   groups['Esta semana'].push(item);
    else if (itemDay >= monthAgo)  groups['Este mes'].push(item);
    else                           groups['Más antiguo'].push(item);
  });

  return Object.entries(groups).filter(([, arr]) => arr.length > 0);
}

export function groupHighlightsByPaper(highlights) {
  const map = new Map();
  highlights.forEach(hl => {
    const key = hl.paper_doi || hl.paper_title || 'sin-paper';
    if (!map.has(key)) {
      map.set(key, {
        key,
        title:   hl.paper_title   || 'Paper sin título',
        authors: hl.paper_authors || '',
        year:    hl.paper_year    || null,
        journal: hl.paper_journal || '',
        doi:     hl.paper_doi     || '',
        source:  hl.paper_source  || null,
        items:   [],
      });
    }
    map.get(key).items.push(hl);
  });
  return [...map.values()];
}
