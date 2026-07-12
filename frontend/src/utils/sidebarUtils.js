// `t` es opcional (la función de i18n). Sin ella, cae al español (para tests y
// llamadas fuera de React). Los sufijos m/h/d son neutros en ambos idiomas.
export function formatTime(ds, t) {
  const tr = (key, fallback) => (t ? t(key) : fallback);
  const d    = new Date(ds);
  const diff = Math.floor((Date.now() - d) / 60000);
  if (diff < 1)    return tr('shell.time.now', 'ahora');
  if (diff < 60)   return `${diff}m`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h`;
  if (diff < 2880) return tr('shell.time.yesterday', 'ayer');
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

  // Claves estables e independientes del idioma; el componente las traduce
  // con t('shell.sidebar.dateGroups.<key>').
  const groups = {
    today: [], yesterday: [], week: [], month: [], older: [],
  };

  items.forEach(item => {
    const d       = new Date(item.created_at);
    const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if      (itemDay >= today)     groups.today.push(item);
    else if (itemDay >= yesterday) groups.yesterday.push(item);
    else if (itemDay >= weekAgo)   groups.week.push(item);
    else if (itemDay >= monthAgo)  groups.month.push(item);
    else                           groups.older.push(item);
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
