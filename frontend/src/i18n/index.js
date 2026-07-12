import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Idiomas soportados. El espanol es el idioma por defecto (diseno "espanol-first",
// orientado a la equidad); el ingles se ofrece para alcance internacional.
export const LANGUAGES = [
  { code: 'es', label: 'Espanol', short: 'ES' },
  { code: 'en', label: 'English', short: 'EN' },
];

// Carga automatica de todos los modulos de traduccion. Cada archivo
// locales/<lng>/<modulo>.json se registra como el namespace <modulo>,
// de modo que t('modulo.clave') funciona sin cablear nada a mano.
function loadResources(ctx) {
  const out = {};
  ctx.keys().forEach((key) => {
    const ns = key.replace(/^\.\//, '').replace(/\.json$/, '');
    out[ns] = ctx(key);
  });
  return out;
}

const esResources = loadResources(require.context('./locales/es', false, /\.json$/));
const enResources = loadResources(require.context('./locales/en', false, /\.json$/));

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: esResources },
      en: { translation: enResources },
    },
    fallbackLng: 'es',
    supportedLngs: ['es', 'en'],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'citae_lang',
      caches: ['localStorage'],
    },
    returnEmptyString: false,
  });

export default i18n;
