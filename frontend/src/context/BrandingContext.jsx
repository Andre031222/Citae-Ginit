import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getBranding } from '../services/brandingService';
import { darken, loadGoogleFont } from '../utils/colorUtils';

const BrandingContext = createContext(null);

const BACKEND = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');

function resolveUrl(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${BACKEND}${url}`;
}

const DEFAULTS = {
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

function applyBranding(b) {
  const root = document.documentElement;

  root.style.setProperty('--accent',       b.primary_color || DEFAULTS.primary_color);
  root.style.setProperty('--accent-hover', darken(b.primary_color || DEFAULTS.primary_color));
  root.style.setProperty('--gold',         b.accent_color  || DEFAULTS.accent_color);

  const font = b.hero_font || 'Inter';
  loadGoogleFont(font);
  root.style.setProperty('--hero-font', `'${font}', var(--font)`);

  if (b.favicon_url) {
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    const ext = b.favicon_url.split('.').pop().toLowerCase();
    link.type  = ext === 'ico' ? 'image/x-icon' : ext === 'svg' ? 'image/svg+xml' : 'image/png';
    link.sizes = '32x32';
    link.href  = b.favicon_url;
  }

  if (b.site_name) document.title = b.site_name;
}

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const b = await getBranding();
      const resolved = {
        ...DEFAULTS,
        ...b,
        logo_url:       resolveUrl(b.logo_url),
        favicon_url:    resolveUrl(b.favicon_url),
        hero_image_url: resolveUrl(b.hero_image_url),
      };
      setBranding(resolved);
      applyBranding(resolved);
    } catch {
      applyBranding(DEFAULTS);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <BrandingContext.Provider value={{ branding, refresh, loaded }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
