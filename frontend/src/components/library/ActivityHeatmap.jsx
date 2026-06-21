import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Loader } from '../Icons';
import { getActivity } from '../../services/libraryService';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function buildGrid() {
  const today   = new Date();
  const start   = new Date(today);
  start.setDate(today.getDate() - 51 * 7 - today.getDay());

  const weeks = [];
  let cursor  = new Date(start);

  for (let w = 0; w < 53; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      if (cursor > today) { cursor.setDate(cursor.getDate() + 1); continue; }
      const y   = cursor.getFullYear();
      const m   = String(cursor.getMonth() + 1).padStart(2, '0');
      const day = String(cursor.getDate()).padStart(2, '0');
      week.push({ date: `${y}-${m}-${day}`, month: cursor.getMonth(), dayOfWeek: d });
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + 1);
    }
    if (week.length) weeks.push(week);
  }
  return weeks;
}

function getLevel(count) {
  if (!count) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  return 3;
}

const STAT_LABELS = [
  { key: 'papers',      label: 'Papers'      },
  { key: 'highlights',  label: 'Resaltados'  },
  { key: 'collections', label: 'Colecciones' },
  { key: 'tags',        label: 'Etiquetas'   },
];

const ActivityHeatmap = () => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const result = await getActivity();
      setData(result);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="hm-loading">
        <Loader size={16} className="lib-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { stats, activity } = data;
  const dateMap = {};
  activity.forEach(a => { dateMap[a.date] = a.count; });

  const weeks    = buildGrid();
  const total    = activity.reduce((s, a) => s + a.count, 0);

  const monthLabels = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const first = week[0];
    if (first && first.month !== lastMonth) {
      monthLabels.push({ wi, label: MONTHS[first.month] });
      lastMonth = first.month;
    }
  });

  const activeDays  = activity.filter(a => a.count > 0).length;
  const activeWeeks = weeks.filter(week => week.some(c => (dateMap[c.date] || 0) > 0)).length;
  const DAY_LABELS  = ['', 'L', '', 'X', '', 'V', ''];

  return (
    <div className="hm-wrap">
      <div className="hm-header">
        <Activity size={13} />
        <span>Actividad</span>
        <em className="hm-total">{total} este año</em>
      </div>

      <div className="hm-stats">
        {STAT_LABELS.map(s => (
          <div key={s.key} className="hm-stat">
            <span className="hm-stat-num">{stats[s.key] || 0}</span>
            <span className="hm-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="hm-grid-wrap">
        <div className="hm-month-row">
          {monthLabels.map((ml, i) => (
            <span key={i} className="hm-month-label" style={{ gridColumn: ml.wi + 2 }}>
              {ml.label}
            </span>
          ))}
        </div>

        <div className="hm-grid-area">
          <div className="hm-daylabels">
            {DAY_LABELS.map((d, i) => <span key={i} className="hm-daylabel">{d}</span>)}
          </div>
          <div className="hm-grid">
            {weeks.map((week, wi) => (
              <div key={wi} className="hm-col">
                {Array.from({ length: 7 }, (_, di) => {
                  const cell = week.find(c => c.dayOfWeek === di);
                  if (!cell) return <div key={di} className="hm-cell hm-empty-cell" />;
                  const count = dateMap[cell.date] || 0;
                  return (
                    <div
                      key={di}
                      className={`hm-cell hm-lv${getLevel(count)}`}
                      title={count > 0 ? `${cell.date} · ${count} actividad(es)` : cell.date}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="hm-totals">
        <span><strong>{activeDays}</strong> días activos</span>
        <span><strong>{activeWeeks}</strong> semanas</span>
      </div>
    </div>
  );
};

export default ActivityHeatmap;
