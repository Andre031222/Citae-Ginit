# Despliegue de CITAE

Guía de despliegue en producción. CITAE corre en un VPS Debian 12 detrás de **Nginx**, con el backend Node como servicio **systemd** y el frontend servido como estáticos. Patrón replicable para cualquier subdominio `*.ginit.dev`.

- **URL de producción:** https://citae.ginit.dev
- **Backend:** servicio systemd `citae.service` en `127.0.0.1:3001`
- **Frontend:** build estático servido por Nginx
- **Base de datos:** PostgreSQL 17 (`citae_db`)
- **SSL:** Let's Encrypt (certbot, auto-renovación)

## Arquitectura en el servidor

```
/opt/apps/node/citae/              Backend Express (server.js, src/, .env)
/opt/apps/static/citae.ginit.dev/  Frontend (build de React, sin source maps)
/opt/apps/uploads/citae/           Archivos subidos
/etc/systemd/system/citae.service  Servicio del backend
/etc/nginx/sites-available/citae.ginit.dev  Server block
```

Nginx sirve el frontend y hace `proxy_pass` de `/api/` y `/uploads/` al backend en `:3001`.

## Requisitos del servidor (una sola vez)

Node 22, pnpm, PostgreSQL 17, Nginx y certbot. En este VPS ya están instalados (ver `scripts/` del repo de infraestructura). El DNS usa **wildcard** `*.ginit.dev`, por lo que cada subdominio nuevo resuelve sin tocar DNS.

## Despliegue inicial

1. **Base de datos** (PostgreSQL):
   ```sql
   CREATE ROLE citae_user LOGIN PASSWORD '<generada>';
   CREATE DATABASE citae_db OWNER citae_user;
   GRANT ALL PRIVILEGES ON DATABASE citae_db TO citae_user;
   \c citae_db
   GRANT ALL ON SCHEMA public TO citae_user;
   ALTER SCHEMA public OWNER TO citae_user;
   ```

2. **Backend** → `/opt/apps/node/citae/`:
   ```bash
   pnpm install --prod      # construye sharp/tesseract (ver pnpm.onlyBuiltDependencies)
   node migrate.js          # aplica el schema + migraciones (no usar 'pnpm migrate' en el server)
   ```

3. **`.env` de producción** en `/opt/apps/node/citae/.env` (permisos `600`):
   ```
   NODE_ENV=production
   PORT=3001
   CLIENT_URL=https://citae.ginit.dev
   API_PUBLIC_URL=https://citae.ginit.dev
   DB_HOST=localhost  DB_PORT=5432  DB_NAME=citae_db  DB_USER=citae_user  DB_PASSWORD=...
   JWT_SECRET=...      # 96 hex aleatorios, exclusivo de producción
   JWT_EXPIRES_IN=7d
   GOOGLE_CLIENT_ID=...  GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=https://citae.ginit.dev/api/auth/google/callback
   GROQ_API_KEY=...  (+ GROQ_API_KEY_2..5, GROQ_MODEL, GROQ_MODEL_FAST)
   OPENROUTER_API_KEY=...  OPENROUTER_MODEL=...  OPENROUTER_MODEL_FAST=...
   ```

4. **Frontend** — build y subir:
   ```bash
   pnpm --filter @citae/frontend run build
   # subir frontend/build/* a /opt/apps/static/citae.ginit.dev/ y borrar los *.map
   ```

   > El build de producción usa API relativa (`/api`) por defecto — no hace falta pasar
   > `REACT_APP_API_URL`. **No** lo pases desde Git Bash/MSYS: convierte `/api` en una ruta
   > Windows (`C:/Program Files/Git/api`) y rompe el OAuth. Si necesitas fijarlo, usa
   > PowerShell o `frontend/.env.production` (un archivo no sufre ese mangling).

5. **Servicio systemd** `citae.service` → `ExecStart=/usr/bin/node server.js`, `User=andre`, `WorkingDirectory=/opt/apps/node/citae`:
   ```bash
   systemctl daemon-reload && systemctl enable --now citae.service
   ```

6. **Nginx + SSL**:
   ```bash
   ln -sf /etc/nginx/sites-available/citae.ginit.dev /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx
   certbot --nginx -d citae.ginit.dev --agree-tos -m <correo> --redirect
   ```

> El server block: `root /opt/apps/static/citae.ginit.dev`, `try_files $uri /index.html`, y `location /api/` + `/uploads/` con `proxy_pass http://127.0.0.1:3001`.

## Actualizar (redeploy)

**Backend:**
```bash
# subir cambios a /opt/apps/node/citae/, luego:
pnpm install --prod        # solo si cambiaron dependencias
node migrate.js            # solo si hay migraciones nuevas
systemctl restart citae.service
```

**Frontend:**
```bash
pnpm --filter @citae/frontend run build
# reemplazar el contenido de /opt/apps/static/citae.ginit.dev/ y borrar *.map
```

> El build usa `/api` relativo por defecto. No pases `REACT_APP_API_URL=/api` desde Git Bash
> (MSYS lo convierte en `C:/Program Files/Git/api` y rompe el OAuth de Google).

## Comandos útiles

```bash
systemctl status citae.service        # estado del backend
journalctl -u citae.service -f        # logs en vivo
ss -ltnp | grep 3001                  # ¿escucha el backend?
nginx -t && systemctl reload nginx    # validar y recargar Nginx
certbot certificates                  # estado de los certificados SSL
curl https://citae.ginit.dev/api/health
```

## Notas

- En el servidor, **migrar con `node migrate.js`** (no `pnpm migrate`): el wrapper de pnpm ejecuta una verificación de dependencias que choca con los build scripts.
- Los **source maps** (`*.map`) no se publican en producción (exponen el código fuente).
- El `.env` nunca se versiona ni se sube desde el repo; se crea directamente en el servidor con permisos `600`.
- Branding (logo, colores, nombre) se gestiona en runtime desde `/admin` (rol `super_admin`); no requiere redeploy.
