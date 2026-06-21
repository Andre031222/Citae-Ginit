# Guía de trabajo, versionado y publicación

Cómo clonar el proyecto en otra máquina, trabajar el día a día, **subir cambios a GitHub**, publicar una **nueva versión** y **desplegar a producción**.

- **Repositorio:** `Andre031222/01.Soft_Citae` (privado)
- **Producción:** <https://citae.ginit.dev>
- **Rama principal:** `main`
- **Versionado:** Semántico (`MAJOR.MINOR.PATCH`) con tags `vX.Y.Z`

---

## 1. Entorno

| Requisito | Versión |
|-----------|---------|
| Node.js   | ≥ 18 |
| pnpm      | ≥ 9 (`npm i -g pnpm`) |
| PostgreSQL| ≥ 13 |
| Git       | cualquiera reciente |

---

## 2. Clonar y correr en otra laptop

```bash
# 1. Clonar (requiere acceso al repo privado: gh auth login o token)
git clone https://github.com/Andre031222/01.Soft_Citae.git
cd 01.Soft_Citae

# 2. Instalar dependencias del workspace (backend + frontend)
pnpm install

# 3. Variables de entorno (NUNCA se versionan)
cp backend/.env.example backend/.env
#    editar backend/.env: DB_*, JWT_SECRET y (opcional) GROQ_*, GOOGLE_*

# 4. Base de datos
createdb citae           # o el nombre que pongas en DB_NAME
pnpm migrate             # aplica schema + migraciones (idempotente)

# 5. Arrancar
pnpm dev                 # backend :5000 + frontend :3000
```

> El `.env` está en `.gitignore`: cada máquina tiene el suyo. Si falta, copia `backend/.env.example`.

---

## 3. Flujo de trabajo Git (día a día)

```bash
git pull origin main            # traer lo último antes de empezar

# ...hacer cambios...

pnpm test                       # 1) verificar que pasa todo (109 tests)
pnpm build                      # 2) verificar que el frontend compila

git add -A
git commit -m "tipo(scope): descripción breve en presente"
git push origin main
```

**Convención de mensajes** (Conventional Commits):

| Tipo | Cuándo |
|------|--------|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `docs` | Solo documentación |
| `refactor` | Reestructura sin cambiar comportamiento |
| `chore` | Tareas varias (build, deps, limpieza) |
| `test` | Tests |

Ejemplo: `feat(library): exportar colección a CSV`.

---

## 4. Publicar una nueva versión (release)

El proyecto usa **versionado semántico**:

- `PATCH` (1.0.0 → 1.0.1): correcciones que no cambian la API ni el comportamiento esperado.
- `MINOR` (1.0.0 → 1.1.0): funcionalidad nueva compatible hacia atrás.
- `MAJOR` (1.0.0 → 2.0.0): cambios incompatibles.

```bash
# 1. Asegurar main al día y verde
git checkout main && git pull origin main
pnpm test && pnpm build

# 2. Crear el tag de versión (anotado)
git tag -a v1.1.0 -m "v1.1.0 — resumen de los cambios"

# 3. Subir commits y tag
git push origin main
git push origin v1.1.0
```

Para ver versiones publicadas: `git tag` · para ver una: `git show v1.0.0`.

> Mantén la tabla **Versionado** del [README](README.md#versionado) con una línea por versión.

---

## 5. Desplegar a producción

Resumen (guía completa en **[DEPLOY.md](DEPLOY.md)**):

```bash
# Frontend: build (usa /api relativo por defecto) y subir estáticos
pnpm --filter @citae/frontend run build
#   subir frontend/build/* al directorio estático del servidor y borrar los *.map

# Backend (en el servidor):
node migrate.js              # solo si hay migraciones nuevas
systemctl restart citae.service
```

> No pasar `REACT_APP_API_URL=/api` desde Git Bash (MSYS lo convierte en una ruta Windows y rompe el build). El build de producción ya usa `/api` por defecto.

Comprobación rápida tras desplegar:

```bash
curl -sk -o /dev/null -w '%{http_code}\n' https://citae.ginit.dev/api/health   # 200
```

---

## 6. Convención de repos por número

Los proyectos se nombran con prefijo numérico para ordenarlos: `01.Soft_Citae`, `02.*`, … Cada repo es privado y sigue esta misma guía de versionado y publicación.

---

## 7. Estructura y arquitectura

Para entender el código antes de tocarlo, lee **[ARCHITECTURE.md](ARCHITECTURE.md)**: flujo del backend (`routes → controllers → services/models`), estado por hooks del frontend, sistema de diseño por tokens y notas operativas (pnpm + CRA, multi-key LLM, etc.).
