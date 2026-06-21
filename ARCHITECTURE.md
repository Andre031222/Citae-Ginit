# Arquitectura de CITAE

Guía técnica del código para contribuir o retomar el proyecto en otra máquina.

## Qué es CITAE

Plataforma académica todo-en-uno: descubrir → leer/resaltar → verificar → organizar → citar → compartir literatura científica. Monorepo **pnpm** con `frontend/` (React CRA) y `backend/` (Express + PostgreSQL). El idioma del producto y de los comentarios es **español**.

## Comandos

Gestor de paquetes: **pnpm** (workspace). No usar npm/yarn. Todos los comandos desde la raíz.

```bash
pnpm install                 # instala backend + frontend (workspace)

pnpm dev                     # backend y frontend en paralelo
pnpm dev:backend             # solo API   -> http://localhost:5000
pnpm dev:frontend            # solo web    -> http://localhost:3000 (proxy a :5000)
./start-local.ps1            # Windows: abre ambos en ventanas separadas

pnpm migrate                 # aplica schema + migraciones idempotentes
pnpm build                   # build de producción del frontend
pnpm test                    # tests de todos los paquetes
```

### Tests

```bash
pnpm --filter @citae/backend run test                 # jest, backend
pnpm --filter @citae/backend exec jest queryFilters   # un archivo (backend)
pnpm --filter @citae/backend run bench                # benchmark CPU-bound (backend/benchmark/bench.js)
pnpm --filter @citae/frontend run test                # jest CRA (CI=true, sin watch)
pnpm --filter @citae/frontend run test:watch          # modo watch
```

Backend: jest en `backend/__tests__/`. Frontend: runner de CRA; los tests de utilidades puras usan `/** @jest-environment node */` para evitar cargar jsdom (ver nota de `canvas` abajo).

## Backend — Express en capas (`backend/src/`)

Flujo estricto **routes → controllers → services/models**:

- `routes/` — endpoints, `authMiddleware` y `express-rate-limit` por feature. Montaje en `server.js`: `/api/auth`, `/api/papers`, `/api/citations`, `/api/highlights`, `/api/library`, `/api/claim`, `/api/rag`, `/api/public`, `/api/branding`, `/api/admin`, y `profileRoutes` en la raíz `/api`.
- `controllers/` — orquestan; **sin SQL directo** (todo el SQL vive en `models/`).
- `models/` — única capa con SQL (pool `pg` desde `src/config/database.js`, que traduce placeholders `?`→`$1`). Los papers son **globales por DOI** (sin `user_id` al crearse); la biblioteca de un usuario = favoritos ∪ papers en colecciones ∪ papers etiquetados ∪ papers resaltados.
- `services/` — lógica de dominio sin Express. Núcleos:
  - **Búsqueda/citas:** `searchSources.js` (CrossRef, Semantic Scholar, OpenAlex, arXiv + author discovery), `candidateMatcher.js` (ranking), `citationFormatter.js` (7 formatos), `queryFilters.js` (filtros en lenguaje natural ES/EN), `previewService.js` (og:image + PDF open-access; anti-SSRF vía `utils/urlGuard.js`).
  - **Documentos:** `pdfService.js` (pdf-parse), `ocrService.js` (tesseract.js, worker singleton spa+eng), `exportFormatter.js` (BibTeX/RIS/CSV/Markdown).
  - **IA:** `groqClient.js` es el **único** punto de llamada a LLMs — abstrae proveedores (Groq multi-key + OpenRouter fallback), round-robin con failover y cooldown por key en 429/401/403. **Nunca llamar a Groq/OpenRouter con axios directo; usar `groqChat({model|tier, messages})`.** `aiComparator.js`, `ragService.js` (RAG sin pgvector: BM25 en memoria), `deepResearchService.js`.

Autenticación: JWT (`authService`/`User` incluyen `role`); `authMiddleware` protege rutas, `requireSuperAdmin` para `/admin`; Google OAuth en `googleAuthController` (state JWT anti-CSRF, payload incluye `role`). Errores: los controllers delegan con `next(err)` al `middleware/errorHandler.js` central. Detrás de Nginx se usa `app.set('trust proxy', 1)`.

Migraciones: `migrate.js` aplica `database/schema_postgres.sql` y luego `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` incrementales — **idempotente; añadir columnas nuevas ahí**, no editar el schema base para cambios sobre tablas existentes.

## Frontend — React CRA, sin Tailwind ni librerías UI (`frontend/src/`)

- `App.jsx` compone hooks + router. Páginas pesadas con `React.lazy`. Distingue **rutas públicas** (`/`, `/c/:slug`, `/u/:username`, `/login`, `/register`) de las protegidas (redirigen a `/login` sin `user`; `/admin` exige `role === 'super_admin'`).
- `/app` es un layout chat con **dos modos**: vista chat normal y `chat-embed` que monta radar/ask/review/write/authors/admin como vistas embebidas (`appView`). En móvil, el sidebar es un drawer por encima de la topbar con backdrop y botón de cierre; profile es overlay con Escape centralizado.
- **Estado vía hooks** (no Redux): `useAuth`, `useUserData`, `useChat`, `useSearch`, `useBibliography`, `useTheme`, `useMediaQuery`.
- `context/BrandingContext.jsx` es el único Context (root en `index.js`): carga `GET /api/branding` y sobreescribe CSS vars (`--accent`, `--accent-hover`, `--gold`) en runtime.
- API base: `services/apiBase.js::getApiBase()` — en producción usa `/api` relativo y lo vuelve absoluto contra el origen http(s).

### Sistema de diseño — "Academic Blue + Gold"

CSS plano por tokens, importado desde `styles/App.css`: `tokens.css` (`:root` + `[data-theme="dark"]` negro real), `base.css`, y `styles/components/*.css` (un archivo por feature, **prefijo de clase por archivo**: `lib-`, `cc-`, `ask-`, `dr-`, `rv-`, `qs-`, `pub-`, `au-`, `lp-`, `cs-`…).

**Convenciones de estilo (obligatorias):**
- Usar siempre `var(--token)` — nunca colores hardcodeados.
- Iconos: SVG inline desde `components/Icons.jsx` — nunca librerías de iconos, emojis ni glifos Unicode como UI.
- `transition: all` está prohibido — declarar propiedades específicas. Easing: `var(--ease-ui)`.
- Notificaciones vía `services/swal.js` (SweetAlert2).

## Notas operativas

- **pnpm + CRA:** el workspace usa `node-linker=hoisted`/`shamefully-hoist` (`.npmrc`) porque CRA asume node_modules planos. Las dependencias nativas a construir se declaran en `pnpm-workspace.yaml` (`onlyBuiltDependencies`: sharp, tesseract.js, puppeteer, unrs-resolver). `canvas` (opcional de jsdom, no usada) está en `ignoredOptionalDependencies`.
- **Build del frontend:** corre con `DISABLE_ESLINT_PLUGIN=true` (el plugin ESLint de react-app entra en conflicto consigo mismo bajo el hoisting de pnpm; Babel sigue validando el JSX). Variables Node legacy (`--openssl-legacy-provider`) van vía `cross-env` en los scripts. Usa `/api` relativo por defecto en producción; **no** pasar `REACT_APP_API_URL=/api` desde Git Bash (MSYS lo convierte en una ruta Windows).
- BD: PostgreSQL, default `citae` (`DB_NAME`). Variables del backend: `DB_*`, `JWT_SECRET`/`JWT_EXPIRES_IN`, `GROQ_API_KEY`/`GROQ_API_KEY_2..5`/`GROQ_MODEL`/`GROQ_MODEL_FAST`, `OPENROUTER_*`, `GOOGLE_CLIENT_*`, `CLIENT_URL`, `PORT`. Ver `backend/.env.example`.
- Multi-key LLM: keys de la **misma** cuenta Groq comparten rate limit; para escalar usar keys de cuentas distintas en `GROQ_API_KEY_2..5`.
- Producción: VPS Debian, Nginx + systemd (`citae.service`), PostgreSQL 17. Guía en `DEPLOY.md`.

## Deuda técnica conocida

- CSS: aún hay valores de espaciado y algunos colores hardcodeados (los `border-radius` de valor único ya están tokenizados). Los breakpoints de `@media` no se pueden tokenizar (CSS no admite `var()` en media queries).
- Frontend: los tests que requieran DOM (jsdom) necesitan resolver la dependencia opcional `canvas`; los tests de utilidades puras usan `@jest-environment node` como solución.
