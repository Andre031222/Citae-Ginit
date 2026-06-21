import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBranding } from '../../context/BrandingContext';
import { updateBranding, uploadBrandingAsset, uploadFeatureImage, deleteFeatureImage } from '../../services/brandingService';
import { listUsers, setUserRole, setUserActive } from '../../services/adminService';
import notify from '../../services/swal';
import { Palette, Upload, ImageIcon, Settings, Check, FileText, ChevronLeft, X, Users, Shield, Search } from '../Icons';

const ASSET_SLOTS = [
  { key: 'logo',    label: 'Logo',    hint: 'PNG, SVG recomendados', urlKey: 'logo_url' },
  { key: 'favicon', label: 'Favicon', hint: 'ICO o PNG 32×32',      urlKey: 'favicon_url' },
  { key: 'hero',    label: 'Hero',    hint: 'JPG o PNG, 1280px+',   urlKey: 'hero_image_url' },
];

const DEFAULT_FEATURES = [
  { title: 'Búsqueda multi-fuente', desc: 'CrossRef, Semantic Scholar, OpenAlex y arXiv simultáneamente con scoring de relevancia.' },
  { title: '7 formatos de cita',    desc: 'APA, MLA, Chicago, Harvard, IEEE, Vancouver y BibTeX generados al instante.' },
  { title: 'Resaltado semántico',   desc: '5 colores con significado académico: citas clave, evidencia, insights, dudas y más.' },
  { title: 'Reading Assistant IA',  desc: 'Conversación multi-turno sobre el paper. Preguntas sugeridas, historial y Trust Cards.' },
  { title: 'PDF completo',          desc: 'Sube el PDF y resalta cualquier sección del texto completo, no solo el abstract.' },
  { title: 'Export flexible',       desc: 'Exporta tus apuntes en Markdown, JSON estructurado o tabla para Notion.' },
];

const FEATURE_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml';

const HERO_FONT_GROUPS = [
  {
    group: 'Sans-serif modernas',
    fonts: [
      { value: 'Inter',             label: 'Inter' },
      { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans' },
      { value: 'Space Grotesk',     label: 'Space Grotesk' },
      { value: 'DM Sans',           label: 'DM Sans' },
      { value: 'Sora',              label: 'Sora' },
      { value: 'Outfit',            label: 'Outfit' },
      { value: 'Nunito',            label: 'Nunito' },
      { value: 'Raleway',           label: 'Raleway' },
      { value: 'Quicksand',         label: 'Quicksand' },
    ],
  },
  {
    group: 'Serif editorial (estilo revista)',
    fonts: [
      { value: 'Source Serif 4',     label: 'Source Serif 4' },
      { value: 'Crimson Pro',        label: 'Crimson Pro' },
      { value: 'Cormorant Garamond', label: 'Cormorant Garamond' },
      { value: 'Cormorant',          label: 'Cormorant' },
      { value: 'Fraunces',           label: 'Fraunces' },
      { value: 'Spectral',           label: 'Spectral' },
      { value: 'Bodoni Moda',        label: 'Bodoni Moda' },
    ],
  },
  {
    group: 'Serif académica clásica',
    fonts: [
      { value: 'Merriweather',      label: 'Merriweather' },
      { value: 'Playfair Display',  label: 'Playfair Display' },
      { value: 'Lora',              label: 'Lora' },
      { value: 'EB Garamond',       label: 'EB Garamond' },
      { value: 'Libre Baskerville', label: 'Libre Baskerville' },
      { value: 'PT Serif',          label: 'PT Serif' },
      { value: 'Bitter',            label: 'Bitter' },
      { value: 'Cardo',             label: 'Cardo' },
    ],
  },
  {
    group: 'Cursivas / caligráficas',
    fonts: [
      { value: 'Dancing Script', label: 'Dancing Script' },
      { value: 'Great Vibes',    label: 'Great Vibes' },
      { value: 'Satisfy',        label: 'Satisfy' },
      { value: 'Caveat',         label: 'Caveat' },
      { value: 'Pacifico',       label: 'Pacifico' },
    ],
  },
  {
    group: 'Display / decorativas',
    fonts: [
      { value: 'Righteous', label: 'Righteous' },
      { value: 'Fredoka',   label: 'Fredoka' },
    ],
  },
];

export default function AdminBranding({ user, onClose, embedded = false }) {
  const { branding, refresh } = useBranding();
  const navigate = useNavigate();

  const [colors, setColors] = useState({
    primary_color: branding.primary_color,
    accent_color:  branding.accent_color,
    site_name:     branding.site_name,
  });

  const [hero, setHero] = useState({
    hero_title_1:  branding.hero_title_1,
    hero_title_em: branding.hero_title_em,
    hero_title_2:  branding.hero_title_2,
    hero_subtitle: branding.hero_subtitle,
    hero_font:     branding.hero_font,
  });

  const [features, setFeatures] = useState(
    () => Array(6).fill(null).map((_, i) => branding.features_data?.[i] || {})
  );
  const [savingColors,   setSavingColors]   = useState(false);
  const [savingHero,     setSavingHero]     = useState(false);
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [uploading,      setUploading]      = useState({});

  // Gestión de usuarios
  const [users,        setUsers]        = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch,   setUserSearch]   = useState('');
  const [userBusy,     setUserBusy]     = useState(null);

  useEffect(() => {
    let active = true;
    setUsersLoading(true);
    const t = setTimeout(async () => {
      try {
        const { users: list } = await listUsers({ search: userSearch, limit: 200 });
        if (active) setUsers(list);
      } catch {
        if (active) notify.error('Error al cargar usuarios');
      } finally {
        if (active) setUsersLoading(false);
      }
    }, 250);
    return () => { active = false; clearTimeout(t); };
  }, [userSearch]);

  const handleToggleRole = async (u) => {
    const newRole = u.role === 'super_admin' ? 'user' : 'super_admin';
    setUserBusy(u.id);
    try {
      await setUserRole(u.id, newRole);
      setUsers(prev => prev.map(x => (x.id === u.id ? { ...x, role: newRole } : x)));
      notify.success(newRole === 'super_admin' ? 'Ahora es administrador' : 'Permiso de administrador retirado');
    } catch (e) {
      notify.error(e.response?.data?.message || 'No se pudo cambiar el rol');
    } finally { setUserBusy(null); }
  };

  const handleToggleActive = async (u) => {
    setUserBusy(u.id);
    try {
      await setUserActive(u.id, !u.is_active);
      setUsers(prev => prev.map(x => (x.id === u.id ? { ...x, is_active: !u.is_active } : x)));
      notify.success(!u.is_active ? 'Cuenta activada' : 'Cuenta desactivada');
    } catch (e) {
      notify.error(e.response?.data?.message || 'No se pudo cambiar el estado');
    } finally { setUserBusy(null); }
  };

  useEffect(() => {
    setFeatures(Array(6).fill(null).map((_, i) => branding.features_data?.[i] || {}));
  }, [branding.features_data]);

  const handleColorSave = async () => {
    setSavingColors(true);
    try {
      await updateBranding(colors);
      await refresh();
      notify.success('Colores actualizados');
    } catch {
      notify.error('Error al guardar');
    } finally { setSavingColors(false); }
  };

  const handleHeroSave = async () => {
    setSavingHero(true);
    try {
      await updateBranding(hero);
      await refresh();
      notify.success('Hero actualizado');
    } catch {
      notify.error('Error al guardar');
    } finally { setSavingHero(false); }
  };

  const handleAssetUpload = async (slot, file) => {
    if (!file) return;
    setUploading(u => ({ ...u, [slot]: true }));
    try {
      await uploadBrandingAsset(slot, file);
      await refresh();
      notify.success(`${slot} actualizado`);
    } catch {
      notify.error('Error al subir el archivo');
    } finally { setUploading(u => ({ ...u, [slot]: false })); }
  };

  const handleFeaturesSave = async () => {
    setSavingFeatures(true);
    try {
      await updateBranding({ features_data: features });
      await refresh();
      notify.success('Funciones actualizadas');
    } catch { notify.error('Error al guardar'); }
    finally { setSavingFeatures(false); }
  };

  const handleFeatureImageUpload = async (index, file) => {
    if (!file) return;
    const key = `feat_${index}`;
    setUploading(u => ({ ...u, [key]: true }));
    try {
      const newBranding = await uploadFeatureImage(index, file);
      await refresh();
      if (Array.isArray(newBranding?.features_data)) {
        setFeatures(Array(6).fill(null).map((_, i) => newBranding.features_data[i] || {}));
      }
      notify.success('Imagen actualizada');
    } catch { notify.error('Error al subir imagen'); }
    finally { setUploading(u => ({ ...u, [key]: false })); }
  };

  const handleFeatureImageDelete = async (index) => {
    const key = `feat_${index}`;
    setUploading(u => ({ ...u, [key]: true }));
    try {
      const newBranding = await deleteFeatureImage(index);
      await refresh();
      if (Array.isArray(newBranding?.features_data)) {
        setFeatures(Array(6).fill(null).map((_, i) => newBranding.features_data[i] || {}));
      }
      notify.success('Imagen eliminada');
    } catch { notify.error('Error al eliminar'); }
    finally { setUploading(u => ({ ...u, [key]: false })); }
  };

  const updateFeatureField = (index, field, value) => {
    setFeatures(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  return (
    <div className={`admin-branding ${embedded ? 'is-embedded' : ''}`}>
      {!embedded && (
        <div className="admin-branding-header">
          <button className="admin-back-btn" onClick={() => navigate('/app')}>
            <ChevronLeft size={15} />
            Volver a la app
          </button>
          <div className="admin-branding-title">
            <Settings size={18} />
            <span>Super Admin — Identidad visual</span>
          </div>
          {onClose && (
            <button className="admin-branding-close" onClick={onClose} title="Cerrar">✕</button>
          )}
        </div>
      )}

      <section className="admin-section">
        <h2 className="admin-section-title">
          <Palette size={15} /> Colores del sitio
        </h2>
        <div className="admin-field-row">
          <label className="admin-label">
            Nombre del sitio
            <input
              className="admin-input"
              value={colors.site_name}
              onChange={e => setColors(c => ({ ...c, site_name: e.target.value }))}
              maxLength={60}
            />
          </label>
        </div>
        <div className="admin-field-row admin-field-row--colors">
          <label className="admin-label">
            Color primario
            <div className="admin-color-wrap">
              <input type="color" className="admin-color-swatch"
                value={colors.primary_color}
                onChange={e => setColors(c => ({ ...c, primary_color: e.target.value }))} />
              <input className="admin-input admin-input--hex"
                value={colors.primary_color}
                onChange={e => setColors(c => ({ ...c, primary_color: e.target.value }))}
                maxLength={7} />
            </div>
          </label>
          <label className="admin-label">
            Color acento (gold)
            <div className="admin-color-wrap">
              <input type="color" className="admin-color-swatch"
                value={colors.accent_color}
                onChange={e => setColors(c => ({ ...c, accent_color: e.target.value }))} />
              <input className="admin-input admin-input--hex"
                value={colors.accent_color}
                onChange={e => setColors(c => ({ ...c, accent_color: e.target.value }))}
                maxLength={7} />
            </div>
          </label>
        </div>
        <button className="admin-btn-primary" onClick={handleColorSave} disabled={savingColors}>
          {savingColors ? 'Guardando…' : <><Check size={13} /> Guardar colores</>}
        </button>
      </section>

      <section className="admin-section admin-section--hero">
        <h2 className="admin-section-title">
          <FileText size={15} /> Contenido del hero
        </h2>

        <div className="admin-hero-layout">

          <div className="admin-font-panel">
            <p className="admin-font-panel-title">Tipografía</p>
            <div className="admin-font-list">
              {HERO_FONT_GROUPS.map(({ group, fonts }) => (
                <div key={group} className="admin-font-list-group">
                  <p className="admin-font-list-group-label">{group}</p>
                  {fonts.map(f => (
                    <button
                      key={f.value}
                      type="button"
                      className={`admin-font-row ${hero.hero_font === f.value ? 'admin-font-row--active' : ''}`}
                      onClick={() => setHero(h => ({ ...h, hero_font: f.value }))}
                    >
                      <span className="admin-font-row-sample" style={{ fontFamily: `'${f.value}', serif` }}>
                        Ag
                      </span>
                      <span className="admin-font-row-name">{f.label}</span>
                      {hero.hero_font === f.value && (
                        <span className="admin-font-row-check"><Check size={11} /></span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="admin-hero-fields">

            <div className="admin-hero-preview">
              <p className="admin-hero-preview-label">Vista previa</p>
              <h3 className="admin-hero-preview-title" style={{ fontFamily: `'${hero.hero_font}', serif` }}>
                {hero.hero_title_1 && <>{hero.hero_title_1}<br /></>}
                {hero.hero_title_em && <em style={{ color: 'var(--gold-hover)' }}>{hero.hero_title_em}</em>}
                {hero.hero_title_2 && <> {hero.hero_title_2}</>}
              </h3>
              <p className="admin-hero-preview-sub">{hero.hero_subtitle}</p>
              <p className="admin-hero-preview-font-tag">{hero.hero_font}</p>
            </div>

            <div className="admin-field-row">
              <label className="admin-label">
                Línea 1 del título
                <input className="admin-input"
                  value={hero.hero_title_1}
                  onChange={e => setHero(h => ({ ...h, hero_title_1: e.target.value }))}
                  placeholder="Cita, resalta y" maxLength={120} />
              </label>
            </div>
            <div className="admin-field-row admin-field-row--cols2">
              <label className="admin-label">
                Palabra resaltada
                <input className="admin-input admin-input--em"
                  value={hero.hero_title_em}
                  onChange={e => setHero(h => ({ ...h, hero_title_em: e.target.value }))}
                  placeholder="comprende" maxLength={60} />
              </label>
              <label className="admin-label">
                Texto después
                <input className="admin-input"
                  value={hero.hero_title_2}
                  onChange={e => setHero(h => ({ ...h, hero_title_2: e.target.value }))}
                  placeholder="tus papers" maxLength={120} />
              </label>
            </div>
            <div className="admin-field-row">
              <label className="admin-label">
                Subtítulo
                <textarea className="admin-textarea"
                  value={hero.hero_subtitle}
                  onChange={e => setHero(h => ({ ...h, hero_subtitle: e.target.value }))}
                  rows={3} maxLength={320} />
              </label>
            </div>

            <button className="admin-btn-primary" onClick={handleHeroSave} disabled={savingHero}>
              {savingHero ? 'Guardando…' : <><Check size={13} /> Guardar hero</>}
            </button>
          </div>
        </div>
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">
          <ImageIcon size={15} /> Imágenes del sitio
        </h2>
        <div className="admin-assets-grid">
          {ASSET_SLOTS.map(({ key, label, hint, urlKey }) => (
            <div key={key} className="admin-asset-card">
              <div className="admin-asset-preview">
                {branding[urlKey]
                  ? <img src={branding[urlKey]} alt={label} className="admin-asset-img" />
                  : <span className="admin-asset-empty"><ImageIcon size={24} /></span>
                }
              </div>
              <div className="admin-asset-info">
                <span className="admin-asset-label">{label}</span>
                <span className="admin-asset-hint">{hint}</span>
              </div>
              <label className={`admin-btn-upload ${uploading[key] ? 'admin-btn-upload--busy' : ''}`}>
                <Upload size={13} />
                {uploading[key] ? 'Subiendo…' : 'Subir'}
                <input type="file" accept="image/*,.ico,.svg" style={{ display: 'none' }}
                  disabled={uploading[key]}
                  onChange={e => handleAssetUpload(key, e.target.files[0])} />
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">
          <ImageIcon size={15} /> Funciones
        </h2>
        <p className="admin-section-hint">
          Personaliza título, descripción e imagen de cada función.
          Formatos: JPG, PNG, WebP, AVIF, GIF, SVG — se optimizan automáticamente a WebP.
        </p>
        <div className="admin-features-grid">
          {DEFAULT_FEATURES.map((def, i) => {
            const fd  = features[i] || {};
            const key = `feat_${i}`;
            return (
              <div key={i} className="admin-feature-item">
                <div className="admin-feature-item-num">Función {i + 1}</div>

                <div className="admin-feature-img-wrap">
                  {fd.image_url
                    ? <img src={fd.image_url} alt="" className="admin-feature-img-preview" />
                    : <div className="admin-feature-img-empty"><ImageIcon size={22} /></div>
                  }
                  <div className="admin-feature-img-actions">
                    <label className={`admin-btn-upload admin-btn-upload--sm ${uploading[key] ? 'admin-btn-upload--busy' : ''}`}>
                      <Upload size={11} />
                      {uploading[key] ? 'Subiendo…' : 'Subir imagen'}
                      <input
                        type="file"
                        accept={FEATURE_ACCEPT}
                        style={{ display: 'none' }}
                        disabled={!!uploading[key]}
                        onChange={e => handleFeatureImageUpload(i, e.target.files[0])}
                      />
                    </label>
                    {fd.image_url && (
                      <button
                        className="admin-btn-icon-sm"
                        title="Quitar imagen"
                        onClick={() => handleFeatureImageDelete(i)}
                        disabled={!!uploading[key]}
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                </div>

                <label className="admin-label">
                  Título
                  <input
                    className="admin-input"
                    value={fd.title ?? def.title}
                    onChange={e => updateFeatureField(i, 'title', e.target.value)}
                    maxLength={80}
                    placeholder={def.title}
                  />
                </label>

                <label className="admin-label">
                  Descripción
                  <textarea
                    className="admin-textarea"
                    rows={2}
                    value={fd.desc ?? def.desc}
                    onChange={e => updateFeatureField(i, 'desc', e.target.value)}
                    maxLength={220}
                    placeholder={def.desc}
                  />
                </label>
              </div>
            );
          })}
        </div>
        <button className="admin-btn-primary" onClick={handleFeaturesSave} disabled={savingFeatures}>
          {savingFeatures ? 'Guardando…' : <><Check size={13} /> Guardar funciones</>}
        </button>
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">
          <Users size={15} /> Usuarios registrados
        </h2>
        <p className="admin-section-hint">
          Gestiona los usuarios que se han registrado: concede o retira permisos de
          administrador y activa o desactiva cuentas. Los cambios de rol se aplican
          cuando el usuario recarga su sesión.
        </p>

        <div className="admin-users-search">
          <Search size={14} />
          <input
            className="admin-input"
            placeholder="Buscar por nombre, usuario o email…"
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
          />
        </div>

        {usersLoading ? (
          <p className="admin-users-empty">Cargando usuarios…</p>
        ) : users.length === 0 ? (
          <p className="admin-users-empty">No hay usuarios que coincidan.</p>
        ) : (
          <div className="admin-users-list">
            {users.map(u => {
              const isSelf  = u.id === user?.id;
              const isAdmin = u.role === 'super_admin';
              const busy    = userBusy === u.id;
              return (
                <div key={u.id} className={`admin-user-row ${!u.is_active ? 'admin-user-row--off' : ''}`}>
                  <div className="admin-user-avatar">
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt="" />
                      : <span>{(u.full_name || u.username || '?').charAt(0).toUpperCase()}</span>}
                  </div>
                  <div className="admin-user-meta">
                    <span className="admin-user-name">
                      {u.full_name || u.username}
                      {isSelf  && <span className="admin-user-tag">tú</span>}
                      {isAdmin && <span className="admin-user-tag admin-user-tag--admin"><Shield size={10} /> Admin</span>}
                      {!u.is_active && <span className="admin-user-tag admin-user-tag--off">Inactivo</span>}
                    </span>
                    <span className="admin-user-email">{u.email}</span>
                  </div>
                  <div className="admin-user-actions">
                    <button
                      className="admin-user-btn"
                      disabled={isSelf || busy}
                      title={isSelf ? 'No puedes cambiar tu propio rol' : ''}
                      onClick={() => handleToggleRole(u)}
                    >
                      {isAdmin ? 'Quitar admin' : 'Hacer admin'}
                    </button>
                    <button
                      className={`admin-user-btn ${u.is_active ? 'admin-user-btn--danger' : ''}`}
                      disabled={isSelf || busy}
                      title={isSelf ? 'No puedes desactivar tu propia cuenta' : ''}
                      onClick={() => handleToggleActive(u)}
                    >
                      {u.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
