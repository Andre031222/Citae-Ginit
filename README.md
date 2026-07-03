<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:0056D6,100:0F2444&height=190&section=header&text=CITAE&fontColor=ffffff&fontSize=58&desc=Plataforma%20acad%C3%A9mica%20todo-en-uno&descAlignY=74&descSize=18" width="100%">
</p>

<!-- ============================================================
     CITAE · README oficial
     ============================================================ -->

<div align="center">

<img src="frontend/src/assets/citae-logo-v2.png" width="92" alt="Citae" />

# CITAE

### Plataforma académica todo-en-uno · descubre · lee · verifica · organiza · cita · comparte

<p>
  <a href="https://citae.ginit.dev"><img src="https://img.shields.io/badge/Demo-citae.ginit.dev-0056D6?style=for-the-badge&logo=googlechrome&logoColor=white"></a>
  <img src="https://img.shields.io/badge/Versión-1.1.0-1565C0?style=for-the-badge">
  <img src="https://img.shields.io/badge/Estado-Producción-2E7D32?style=for-the-badge">
  <img src="https://img.shields.io/badge/Licencia-Propietaria-616161?style=for-the-badge">
</p>

<p>
  <img alt="React"      src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black">
  <img alt="Node"       src="https://img.shields.io/badge/Node-%E2%89%A518-339933?style=flat-square&logo=node.js&logoColor=white">
  <img alt="Express"    src="https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-17-336791?style=flat-square&logo=postgresql&logoColor=white">
  <img alt="pnpm"       src="https://img.shields.io/badge/pnpm-workspace-F69220?style=flat-square&logo=pnpm&logoColor=white">
  <img alt="Jest"       src="https://img.shields.io/badge/Tests-109%20passing-C21325?style=flat-square&logo=jest&logoColor=white">
</p>

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=600&size=18&duration=2800&pause=900&color=0056D6&center=true&vCenter=true&width=820&lines=%24+citae+--buscar+%22deep+learning%22+-%3E+CrossRef+%7C+S2+%7C+OpenAlex+%7C+arXiv;%24+citae+--citar+-%3E+APA+%7C+MLA+%7C+Chicago+%7C+IEEE+%7C+Vancouver+%7C+BibTeX;%24+citae+--resaltar+-%3E+5+colores+con+significado+acad%C3%A9mico;%24+citae+--ia+-%3E+conversa+con+el+paper+y+exporta+tus+apuntes">
</p>

</div>

---

## Tabla de contenidos

- [Qué es CITAE](#qué-es-citae)
- [Demo](#demo)
- [Características](#características)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Requisitos previos](#requisitos-previos)
- [Puesta en marcha](#puesta-en-marcha)
- [Variables de entorno](#variables-de-entorno)
- [Comandos](#comandos)
- [Tests y benchmark](#tests-y-benchmark)
- [Roles y administración](#roles-y-administración)
- [Despliegue](#despliegue)
- [Versionado](#versionado)
- [Autor](#autor)
- [Licencia](#licencia)

---

## Qué es CITAE

**CITAE** acompaña todo el ciclo de trabajo con literatura científica desde un único lugar:

<div align="center">

**descubrir → leer / resaltar → verificar → organizar → citar → compartir**

</div>

Busca un paper por **DOI, URL, título o subiendo el PDF**; CITAE consulta varias fuentes académicas a la vez, puntúa la relevancia de cada resultado, genera la cita en el formato que necesites, te deja resaltar el texto con significado académico y conversar con un asistente de IA sobre el contenido — **sin extensiones de navegador y sin suscripción**. El producto y todo el código están en **español**.

---

## Demo

<div align="center">

| | |
|---|---|
| **Producción** | <https://citae.ginit.dev> |
| **Estado** | En vivo · HTTPS · Nginx + systemd |
| **Base de datos** | PostgreSQL 17 |

</div>

---

## Características

| Área | Qué hace |
|------|----------|
| **Búsqueda** | Multi-fuente simultánea (CrossRef, Semantic Scholar, OpenAlex, arXiv) por DOI / URL / título, con *scoring* de relevancia, filtros en lenguaje natural (años, citas, tipo) y descubrimiento por autor. |
| **Citas** | 7 formatos al instante: APA, MLA, Chicago, Harvard, IEEE, Vancouver y BibTeX. Exportación de la biblioteca a BibTeX / RIS / CSV / Markdown. |
| **Lectura** | Resaltado semántico en 5 colores con notas, asistente de lectura con IA (*Trust Cards* con pasaje literal anti-alucinación), PDF completo y OCR de documentos e imágenes (es + en). |
| **Biblioteca** | Favoritos, colecciones y etiquetas (con *auto-tagging* por IA), búsqueda *full-text*, *heatmap* de actividad. Los papers resaltados entran solos a la biblioteca. |
| **Rigor** | *Claim Radar* (afirmación → fuentes que apoyan/contradicen), *Compare* (tabla comparativa de papers) y *Deep Research* (informe de literatura). |
| **Conocimiento** | RAG «Pregunta a tu biblioteca» (BM25), repaso espaciado (*Daily Review*) y *Quoteshots* compartibles. |
| **Social** | Colecciones y perfiles públicos (`/c/:slug`, `/u/:username`). |
| **Cuenta** | Email/contraseña (JWT) y Google OAuth (*state* firmado anti-CSRF). |
| **Admin** | Panel `/admin` para `super_admin`: *branding* dinámico (logo, colores, nombre) y gestión de usuarios (roles y activación). |
| **UI** | Tema claro/oscuro (oscuro en negro real), responsive con drawer en móvil, diseño *Academic Blue + Gold*. |

---

## Stack tecnológico

<div align="center">

**Lenguajes y librerías**

<p>
  <img height="44" alt="JavaScript" src="https://raw.githubusercontent.com/devicons/devicon/master/icons/javascript/javascript-original.svg">
  <img height="44" alt="React"      src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original.svg">
  <img height="44" alt="Node.js"    src="https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original.svg">
  <img height="44" alt="Express"    src="https://raw.githubusercontent.com/devicons/devicon/master/icons/express/express-original.svg">
  <img height="44" alt="PostgreSQL" src="https://raw.githubusercontent.com/devicons/devicon/master/icons/postgresql/postgresql-original.svg">
  <img height="44" alt="HTML5"      src="https://raw.githubusercontent.com/devicons/devicon/master/icons/html5/html5-original.svg">
  <img height="44" alt="CSS3"       src="https://raw.githubusercontent.com/devicons/devicon/master/icons/css3/css3-original.svg">
</p>

**Infraestructura y herramientas**

<p>
  <img height="44" alt="pnpm"   src="https://raw.githubusercontent.com/devicons/devicon/master/icons/pnpm/pnpm-original.svg">
  <img height="44" alt="Jest"   src="https://raw.githubusercontent.com/devicons/devicon/master/icons/jest/jest-plain.svg">
  <img height="44" alt="Nginx"  src="https://raw.githubusercontent.com/devicons/devicon/master/icons/nginx/nginx-original.svg">
  <img height="44" alt="Linux"  src="https://raw.githubusercontent.com/devicons/devicon/master/icons/linux/linux-original.svg">
  <img height="44" alt="Git"    src="https://raw.githubusercontent.com/devicons/devicon/master/icons/git/git-original.svg">
</p>

</div>

- **Frontend:** React (Create React App) + React Router. CSS plano por *design tokens* (sin Tailwind ni librerías de UI). Iconos SVG *inline*. SweetAlert2.
- **Backend:** Node.js + Express en capas. PostgreSQL (`pg`).
- **IA / LLM:** Groq (multi-key con *failover*) y OpenRouter como *fallback*, vía un único cliente (`groqClient`).
- **Documentos:** `pdf-parse` (PDF) y `tesseract.js` (OCR).
- **Tooling:** pnpm *workspace*, Jest.

---

## Arquitectura

Monorepo **pnpm** con dos paquetes que se comunican por una API REST.

```mermaid
flowchart LR
  subgraph FE["frontend · React CRA"]
    UI["Páginas + hooks"] --> CTX["BrandingContext"]
    UI --> SVC["services (axios)"]
  end
  subgraph BE["backend · Express en capas"]
    R["routes"] --> C["controllers"] --> M["models (SQL)"]
    C --> S["services (búsqueda · citas · IA · OCR)"]
    S --> LLM["groqClient · Groq/OpenRouter"]
  end
  SVC -->|"/api"| R
  M --> DB[("PostgreSQL")]
  S -->|HTTP| EXT["CrossRef · Semantic Scholar · OpenAlex · arXiv"]
```

**Backend — flujo estricto `routes → controllers → services / models`:**

- **`routes/`** — *endpoints*, `authMiddleware` y *rate limiting* por *feature*.
- **`controllers/`** — orquestan; **sin SQL directo**.
- **`models/`** — única capa con SQL. Los papers son **globales por DOI**; la biblioteca de un usuario = favoritos ∪ colecciones ∪ etiquetados ∪ **resaltados**.
- **`services/`** — lógica de dominio. Toda llamada a LLM pasa por un **único** cliente con *round-robin*, *failover* y *cooldown* por clave. Anti-SSRF en `utils/urlGuard.js`.

**Frontend:** estado por *hooks* (sin Redux); páginas pesadas con `React.lazy`; rutas públicas vs. protegidas (`/admin` exige `super_admin`); `BrandingContext` sobreescribe variables CSS en *runtime*.

> Detalle ampliado en **[ARCHITECTURE.md](ARCHITECTURE.md)**.

---

## Estructura del proyecto

```text
01.Soft_Citae/
├─ backend/                 @citae/backend — Express + PostgreSQL
│  ├─ src/
│  │  ├─ routes/            endpoints + rate limiting
│  │  ├─ controllers/       orquestación (sin SQL)
│  │  ├─ models/            única capa con SQL
│  │  ├─ services/          búsqueda, citas, IA, OCR, export…
│  │  ├─ middleware/        auth, errores
│  │  ├─ utils/             urlGuard (anti-SSRF), validadores
│  │  └─ config/            conexión a la base de datos
│  ├─ database/             schema base
│  ├─ migrations/           migraciones incrementales
│  ├─ benchmark/            rendimiento CPU-bound
│  ├─ __tests__/            tests (Jest)
│  ├─ server.js             arranque de Express
│  └─ migrate.js            schema + migraciones idempotentes
├─ frontend/                @citae/frontend — React CRA
│  ├─ public/
│  └─ src/
│     ├─ components/        UI por feature
│     ├─ hooks/             estado de la aplicación
│     ├─ services/          cliente de la API + utilidades
│     ├─ context/           BrandingContext
│     └─ styles/            tokens + CSS por componente
├─ pnpm-workspace.yaml
├─ ARCHITECTURE.md
├─ DEPLOY.md
└─ README.md
```

---

## Requisitos previos

| Requisito | Versión |
|-----------|---------|
| Node.js   | ≥ 18 |
| pnpm      | ≥ 9 (`npm i -g pnpm`) — gestor del *workspace*, no usar npm/yarn |
| PostgreSQL| ≥ 13 |

---

## Puesta en marcha

```bash
# 1. Instalar dependencias del workspace (backend + frontend)
pnpm install

# 2. Configurar variables de entorno
cp backend/.env.example backend/.env
#    edita backend/.env con tu BD, JWT_SECRET y (opcional) claves de IA / Google

# 3. Crear y migrar la base de datos
createdb citae          # o el nombre que pongas en DB_NAME
pnpm migrate

# 4. Arrancar en desarrollo
pnpm dev                 # backend (:5000) + frontend (:3000) en paralelo
```

- API: `http://localhost:5000`
- Web: `http://localhost:3000` (con *proxy* a la API)

En Windows también puedes usar `./start-local.ps1` (abre ambos servicios en ventanas separadas).

---

## Variables de entorno

Configura `backend/.env` a partir de [`backend/.env.example`](backend/.env.example):

| Variable | Descripción |
| -------- | ----------- |
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` `DB_PASSWORD` | Conexión a PostgreSQL (`DB_NAME` por defecto `citae`). |
| `JWT_SECRET` `JWT_EXPIRES_IN` | Firma y caducidad de los tokens JWT. |
| `GROQ_API_KEY` … `GROQ_API_KEY_5` `GROQ_MODEL` `GROQ_MODEL_FAST` | LLM de Groq (rotación multi-key; claves de cuentas distintas para más límite). |
| `OPENROUTER_API_KEY` `OPENROUTER_MODEL*` | *Fallback* de IA (opcional). |
| `GOOGLE_CLIENT_ID` `GOOGLE_CLIENT_SECRET` `GOOGLE_REDIRECT_URI` | Google OAuth (opcional). |
| `CLIENT_URL` `API_PUBLIC_URL` `PORT` | URLs del frontend / API y puerto del servidor. |

> El frontend usa API relativa (`/api`) por defecto en producción. Los secretos nunca se versionan (`.env` está en `.gitignore`).

---

## Comandos

| Comando | Descripción |
| ------- | ----------- |
| `pnpm install` | Instala backend + frontend (*workspace*). |
| `pnpm dev` | Backend y frontend en paralelo. |
| `pnpm dev:backend` | Solo la API → `http://localhost:5000` |
| `pnpm dev:frontend` | Solo la web → `http://localhost:3000` |
| `pnpm migrate` | Aplica el *schema* + migraciones idempotentes. |
| `pnpm build` | *Build* de producción del frontend. |
| `pnpm test` | Tests de todos los paquetes. |

---

## Tests y benchmark

```bash
pnpm test                                 # backend + frontend
pnpm --filter @citae/backend run test     # solo backend (Jest)
pnpm --filter @citae/frontend run test    # solo frontend (Jest / CRA)
pnpm --filter @citae/backend run bench    # benchmark CPU-bound
```

**109 tests** cubren las piezas puras y críticas: *matcher* de candidatos (ranking, *dedup*), los 7 formateadores de cita (backend y frontend), filtros en lenguaje natural, *guard* anti-SSRF, validadores, exportadores y utilidades del frontend.

---

## Roles y administración

| Rol | Acceso |
|-----|--------|
| `user` *(por defecto)* | Todas las funciones de la plataforma. |
| `super_admin` | Además el panel `/admin`: *branding* en *runtime* y gestión de usuarios (roles, activar/desactivar). |

El primer administrador se crea en la base de datos; luego un `super_admin` puede promover a otros desde el panel:

```sql
UPDATE users SET role = 'super_admin' WHERE email = 'correo@ejemplo.com';
```

El rol se lee fresco desde la base de datos en cada petición.

---

## Despliegue

CITAE corre en producción sobre un VPS Debian detrás de **Nginx**, con el backend como servicio **systemd** y el frontend servido como estáticos.

```bash
# Frontend (usa /api relativo por defecto)
pnpm --filter @citae/frontend run build
# subir frontend/build/* al directorio estático y borrar los *.map

# Backend
node migrate.js            # solo si hay migraciones nuevas
systemctl restart citae.service
```

Guía completa (Nginx, systemd, PostgreSQL, SSL con certbot, variables) en **[DEPLOY.md](DEPLOY.md)**.

---

## Versionado

Versionado semántico (`MAJOR.MINOR.PATCH`). Esta es la **primera versión oficial**. El flujo de trabajo, cómo subir cambios y cómo publicar una nueva versión están en **[CONTRIBUTING.md](CONTRIBUTING.md)**.

| Versión | Fecha | Notas |
|---------|-------|-------|
| **1.1.0** | 2026-07 | Claves de IA propias por usuario (BYOK): cada usuario puede añadir su clave de Groq, Google Gemini u OpenRouter. Se usa primero la suya y, si se agota, el servicio por defecto como respaldo. Claves cifradas en reposo. |
| **1.0.1** | 2026-07 | Limpieza de archivos sin uso, endurecimiento del límite de intentos de inicio de sesión y correcciones menores de interfaz. |
| **1.0.0** | 2026-06 | Versión oficial inicial: búsqueda multi-fuente, 7 formatos de cita, resaltado semántico + biblioteca, Reading Assistant IA, RAG, panel de administración (branding + usuarios), Google OAuth y despliegue en producción. |

---

## Autor

Desarrollado por **Richar Andre Vilca Solórzano** — Universidad Nacional del Altiplano (FINESI), Puno, Perú.

---

## Licencia

Proyecto **propietario** — todos los derechos reservados. El uso, copia o distribución requiere autorización expresa del autor.

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:0F2444,100:0056D6&height=120&section=footer&text=CITAE%20%C2%B7%20v1.0.0&fontColor=ffffff&fontSize=20&fontAlignY=70" width="100%">
</p>
