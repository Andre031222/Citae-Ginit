const db   = require('../config/database');
const path = require('path');
const fs   = require('fs');

const ORIGIN     = process.env.API_PUBLIC_URL || 'http://localhost:5000';
const UPLOAD_DIR = path.join(__dirname, '../../uploads/branding');

function toUrl(p) { return p ? `${ORIGIN}${p}` : null; }

function parseFeatures(raw) {
  try {
    const arr = Array.isArray(raw) ? raw : JSON.parse(raw || '[]');
    return Array.isArray(arr)
      ? arr.map(f => ({ ...f, image_url: f.image_path ? toUrl(f.image_path) : null }))
      : [];
  } catch { return []; }
}

class SiteSettings {
  static async get() {
    const [rows] = await db.execute('SELECT * FROM site_settings WHERE id = 1');
    const row = rows[0];
    if (!row) return SiteSettings.defaults();
    return {
      site_name:      row.site_name      || 'Citae',
      primary_color:  row.primary_color  || '#0056D6',
      accent_color:   row.accent_color   || '#FBE34D',
      logo_url:       toUrl(row.logo_path),
      favicon_url:    toUrl(row.favicon_path),
      hero_image_url: toUrl(row.hero_image_path),
      hero_title_1:   row.hero_title_1   || 'Cita, resalta y',
      hero_title_em:  row.hero_title_em  || 'comprende',
      hero_title_2:   row.hero_title_2   || 'tus papers',
      hero_subtitle:  row.hero_subtitle  || 'Busca en 4 fuentes académicas, genera citas en 7 formatos y conversa con la IA sobre cualquier fragmento. Sin extensiones, sin suscripción.',
      hero_font:      row.hero_font      || 'Inter',
      features_data:  parseFeatures(row.features_data),
    };
  }

  static defaults() {
    return {
      site_name:      'Citae',
      primary_color:  '#0056D6',
      accent_color:   '#FBE34D',
      logo_url:       null,
      favicon_url:    null,
      hero_image_url: null,
      hero_title_1:   'Cita, resalta y',
      hero_title_em:  'comprende',
      hero_title_2:   'tus papers',
      hero_subtitle:  'Busca en 4 fuentes académicas, genera citas en 7 formatos y conversa con la IA sobre cualquier fragmento. Sin extensiones, sin suscripción.',
      hero_font:      'Inter',
      features_data:  [],
    };
  }

  static async update(fields, updatedBy) {
    const ALLOWED = new Set([
      'primary_color', 'accent_color', 'site_name',
      'hero_title_1', 'hero_title_em', 'hero_title_2', 'hero_subtitle', 'hero_font',
      'features_data',
    ]);
    const cols = [];
    const vals = [];
    Object.entries(fields).forEach(([k, v]) => {
      if (!ALLOWED.has(k) || v === undefined) return;
      cols.push(`${k} = ?`);
      vals.push(k === 'features_data' ? (typeof v === 'string' ? v : JSON.stringify(v)) : v);
    });
    if (!cols.length) return false;
    cols.push('updated_by = ?', 'updated_at = NOW()');
    vals.push(updatedBy, 1);
    await db.execute(`UPDATE site_settings SET ${cols.join(', ')} WHERE id = ?`, vals);
    return true;
  }

  static async setAsset(slot, filePath, updatedBy) {
    const colMap = { logo: 'logo_path', favicon: 'favicon_path', hero: 'hero_image_path' };
    const col = colMap[slot];
    if (!col) throw new Error('Slot de asset inválido');
    await db.execute(
      `UPDATE site_settings SET ${col} = ?, updated_by = ?, updated_at = NOW() WHERE id = 1`,
      [filePath, updatedBy]
    );
  }

  static async setFeatureImage(index, filePath, updatedBy) {
    const [rows] = await db.execute('SELECT features_data FROM site_settings WHERE id = 1');
    const raw = rows[0]?.features_data;
    let data = [];
    try { data = Array.isArray(raw) ? raw : JSON.parse(raw || '[]'); } catch {}
    if (!Array.isArray(data)) data = [];

    const oldPath = data[index]?.image_path;
    if (oldPath) {
      try { fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(oldPath))); } catch {}
    }

    while (data.length <= index) data.push({});
    data[index] = { ...data[index], image_path: filePath };

    await db.execute(
      'UPDATE site_settings SET features_data = ?, updated_by = ?, updated_at = NOW() WHERE id = 1',
      [JSON.stringify(data), updatedBy]
    );
  }

  static async clearFeatureImage(index, updatedBy) {
    const [rows] = await db.execute('SELECT features_data FROM site_settings WHERE id = 1');
    const raw = rows[0]?.features_data;
    let data = [];
    try { data = Array.isArray(raw) ? raw : JSON.parse(raw || '[]'); } catch {}
    if (!Array.isArray(data)) data = [];

    const oldPath = data[index]?.image_path;
    if (oldPath) {
      try { fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(oldPath))); } catch {}
    }

    if (data[index]) {
      const { image_path, ...rest } = data[index];
      data[index] = rest;
    }

    await db.execute(
      'UPDATE site_settings SET features_data = ?, updated_by = ?, updated_at = NOW() WHERE id = 1',
      [JSON.stringify(data), updatedBy]
    );
  }
}

module.exports = SiteSettings;
