import paramiko, os, posixpath, subprocess, sys, getpass

HOST = "149.34.48.20"
USER = "root"
# Lee la contraseña SSH de la variable de entorno CITAE_DEPLOY_PASS
# Si no está definida, la pide de forma interactiva (nunca en texto plano en el código).
# Para automatizar: set CITAE_DEPLOY_PASS=tu_password antes de correr.
PASS = os.environ.get("CITAE_DEPLOY_PASS") or getpass.getpass(f"Contraseña SSH de {USER}@{HOST}: ")

BASE     = os.path.dirname(os.path.abspath(__file__))
BACKEND  = os.path.join(BASE, "backend")
FRONTEND = os.path.join(BASE, "frontend", "build")
SRV_BE   = "/var/www/node-apps/citae"
SRV_FE   = "/var/www/html/citae"
SKIP_DIR = {"node_modules", ".git", "__tests__"}
SKIP_FILE= {".env", ".env.example"}

def run(ssh, cmd, label=""):
    print(f"\n>>> {label or cmd[:72]}")
    _, out, err = ssh.exec_command(cmd)
    o = out.read().decode().strip()
    e = err.read().decode().strip()
    if o: print(o)
    if e: print("[e]", e[:300])
    return o

def mkdirs(sftp, path):
    parts = [p for p in path.split("/") if p]
    cur = ""
    for p in parts:
        cur += "/" + p
        try: sftp.stat(cur)
        except FileNotFoundError: sftp.mkdir(cur)

def upload(sftp, src, dst, skip_d=None, skip_f=None):
    skip_d = skip_d or set(); skip_f = skip_f or set()
    n = 0
    for root, dirs, files in os.walk(src):
        dirs[:] = [d for d in dirs if d not in skip_d]
        rel = os.path.relpath(root, src).replace("\\", "/")
        rpath = dst if rel == "." else posixpath.join(dst, rel)
        mkdirs(sftp, rpath)
        for f in files:
            if f in skip_f: continue
            sftp.put(os.path.join(root, f), posixpath.join(rpath, f))
            n += 1
            if n % 30 == 0: print(f"  {n} archivos...")
    print(f"  DONE: {n} archivos -> {dst}")

FRONTEND_SRC = os.path.join(BASE, "frontend")

print("="*55)
print("DEPLOY Citae -> citae.andre.net.pe")
print("="*55)

# 0. Build del frontend (local)
# REACT_APP_API_URL=/api -> el bundle usa API relativa al dominio de producción
# (si no, hornearía http://localhost:5000 y rompería el OAuth de Google / las llamadas API).
print("\n[BUILD] Compilando frontend React...")
build_result = subprocess.run(
    ["npm", "run", "build"],
    cwd=FRONTEND_SRC,
    shell=True,
    env={**os.environ, "REACT_APP_API_URL": "/api"},
)
if build_result.returncode != 0:
    print("[ERROR] npm run build fallo. Abortando deploy.")
    sys.exit(1)
print("  OK: Build completado ->", FRONTEND)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=22, username=USER, password=PASS, timeout=20)
print("OK SSH conectado")

run(ssh, "node -v && pm2 -v", "node + pm2")

# 1. Crear DB
run(ssh,
    "psql -U postgres -tc \"SELECT 1 FROM pg_database WHERE datname='citae'\" | grep -q 1 "
    "|| psql -U postgres -c \"CREATE DATABASE citae;\"",
    "Crear DB citae")

# 2. Upload backend
sftp = ssh.open_sftp()
print("\n[SFTP] Subiendo backend...")
upload(sftp, BACKEND, SRV_BE, skip_d=SKIP_DIR, skip_f=SKIP_FILE)

# 3. Upload frontend build
print("\n[SFTP] Subiendo frontend build...")
upload(sftp, FRONTEND, SRV_FE)
sftp.close()

# 4. Activar .env produccion
run(ssh, f"cp {SRV_BE}/.env.production {SRV_BE}/.env", "Activar .env produccion")

# 5. npm install
run(ssh, f"cd {SRV_BE} && npm install --production 2>&1 | tail -3", "npm install")

# 6. Migrate
run(ssh, f"cd {SRV_BE} && node migrate.js 2>&1", "node migrate.js")

# 7. PM2
run(ssh, "mkdir -p /var/log/citae", "Crear directorio de logs")
run(ssh, "pm2 delete citae-api 2>/dev/null; echo ok", "PM2 limpiar anterior")
run(ssh, f"cd {SRV_BE} && pm2 start ecosystem.config.js --env production", "PM2 start")
run(ssh, "pm2 save && pm2 status", "PM2 save + status")

# 8. Apache VirtualHost
vhost = r"""<VirtualHost *:80>
    ServerName citae.andre.net.pe
    DocumentRoot /var/www/html/citae
    <Directory /var/www/html/citae>
        Options -Indexes
        AllowOverride None
        Require all granted
        FallbackResource /index.html
    </Directory>
    ProxyPreserveHost On
    ProxyPass        /api/     http://127.0.0.1:5000/api/
    ProxyPassReverse /api/     http://127.0.0.1:5000/api/
    ProxyPass        /uploads/ http://127.0.0.1:5000/uploads/
    ProxyPassReverse /uploads/ http://127.0.0.1:5000/uploads/
</VirtualHost>"""

run(ssh, f"cat > /etc/apache2/sites-available/citae.conf << 'APEOF'\n{vhost}\nAPEOF",
    "VirtualHost Apache")
run(ssh, "a2enmod proxy proxy_http 2>&1 | tail -2", "a2enmod proxy")
run(ssh, "a2ensite citae.conf && apache2ctl configtest 2>&1", "a2ensite + configtest")
run(ssh, "systemctl reload apache2", "reload apache2")

# 9. SSL
run(ssh,
    "certbot --apache -d citae.andre.net.pe --non-interactive --agree-tos "
    "-m night.fury.oi.ma@gmail.com --redirect 2>&1 | tail -10",
    "Certbot SSL")

# 10. Check final
run(ssh, "pm2 status", "Estado PM2 final")
code = run(ssh,
    "curl -sk -o /dev/null -w '%{http_code}' https://citae.andre.net.pe/",
    "HTTP check")

ssh.close()
print("\n" + "="*55)
print(f"DEPLOY OK -- https://citae.andre.net.pe  [{code}]")
print("="*55)
