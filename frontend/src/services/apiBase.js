// Resuelve la base de la API de forma robusta.
// - Si REACT_APP_API_URL está definido, se usa tal cual.
// - En producción cae a `/api` (relativo al dominio, servido por Nginx).
// - En desarrollo cae al backend local absoluto.
// Además, si la base es relativa (/api) y la página se sirve por http(s),
// la convierte a absoluta contra el origen actual. Esto evita que un
// <a href="/api/..."> se interprete como recurso local (file://) cuando el
// build se abre/sirve fuera del dominio esperado.
export function getApiBase() {
  const raw = process.env.REACT_APP_API_URL
    || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

  if (/^https?:\/\//i.test(raw)) return raw;            // ya es absoluta

  if (typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol)) {
    return window.location.origin + raw;                // relativa -> absoluta (origen http/https)
  }
  return raw;                                            // file:// u otro: no hay mejor opción
}

// URL completa para iniciar el flujo de Google OAuth.
export function googleAuthUrl() {
  return `${getApiBase()}/auth/google`;
}
