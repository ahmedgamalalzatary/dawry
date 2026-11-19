# Deploying with Docker

Dawry runs in production as one Docker Compose stack (`docker-compose.yml`, compose name `dawry`) behind nginx on the host. Deploys are manual: pull on the server, rebuild, restart.

## The stack

| Service | Image | What it does |
|---|---|---|
| `mysql` | `mysql:8.4` | Database, data kept in the `mysql-data` volume |
| `migrate` | `dawry-api` (`Dockerfile.api`) | Applies Drizzle migrations, then exits. Runs on every `up` |
| `api` | `dawry-api` | Express API on container port 4000. Starts only after `migrate` succeeds |
| `web` | built from `Dockerfile.web` | Next.js standalone server on container port 3000 |

```
browser ── https ──> nginx (host) ──> 127.0.0.1:WEB_HOST_PORT ──> web
                                                                   │  /api/*  (Next.js rewrite)
                                                                   └──> api:4000 ──> mysql:3306
```

- The browser only ever talks to the web app. `/api/*` is proxied by Next.js to the `api` container, so cookies stay first-party and nginx needs a single `location /`.
- The proxy target (`API_INTERNAL_URL=http://api:4000`) is fixed at **build** time, as a build arg in the compose file.
- Both host ports are published on `127.0.0.1` only. Nothing is reachable from outside except through nginx.
- The server is shared with other projects, so every service has a `mem_limit` (mysql 768 MB with a 256 MB InnoDB buffer pool, api and migrate 384 MB, web 512 MB) and Docker logs rotate (3 × 10 MB).

## Requirements on the server

- Docker Engine with the Compose plugin (`docker compose`), and git.
- nginx and certbot on the host.
- A DNS **A record** for the domain pointing to the server.
- Memory: the stack uses about 600 MB at rest. Building the web image needs well over 1 GB, so on a small server add swap before the first build (see below).

## First deploy

### 1. Get the code

```bash
git clone https://github.com/ahmedgamalalzatary/dawry.git /root/dawry
cd /root/dawry
```

### 2. Create `.env`

Compose reads the root `.env`. Generate the secrets on the server and keep the file root-only:

```bash
umask 077
cat > .env <<EOF
MYSQL_DATABASE=dawry
MYSQL_USER=dawry
MYSQL_PASSWORD=$(openssl rand -hex 24)
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 24)
BETTER_AUTH_SECRET=$(openssl rand -hex 32)
BETTER_AUTH_URL=https://your.domain
WEB_ORIGIN=https://your.domain
APP_TIME_ZONE=Africa/Cairo
WEB_HOST_PORT=3020
API_HOST_PORT=4020
EOF
```

| Variable | Notes |
|---|---|
| `MYSQL_*` | Used by the `mysql` service; `DATABASE_URL` is built from them in the compose file |
| `BETTER_AUTH_SECRET` | Signs sessions. Changing it signs everyone out |
| `BETTER_AUTH_URL`, `WEB_ORIGIN` | The public `https://` URL people open. Must match exactly, or sign-in is refused |
| `APP_TIME_ZONE` | Business-day boundary and report hours |
| `WEB_HOST_PORT`, `API_HOST_PORT` | Host ports (default 3000 / 4000). Pick free ones: check with `ss -tlnp` |

Never commit `.env` and never print it in logs or chat.

### 3. Swap (small servers only)

If the server has no swap and less than about 2 GB free, add some first, or the Next.js build can run out of memory and the kernel may kill another process:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo "/swapfile none swap sw 0 0" >> /etc/fstab
echo "vm.swappiness=10" > /etc/sysctl.d/99-swappiness.conf && sysctl -p /etc/sysctl.d/99-swappiness.conf
```

### 4. Build and start

Build one image at a time (it keeps peak memory down on a small server), in the background so a dropped SSH session doesn't stop it:

```bash
nohup sh -c "docker compose build migrate && docker compose build web && docker compose up -d && echo DEPLOY_DONE || echo DEPLOY_FAILED" > deploy.log 2>&1 &
tail -f deploy.log
```

Then check:

```bash
docker compose ps -a        # migrate: Exited (0); mysql healthy; api and web Up
curl -s http://127.0.0.1:4020/health        # {"status":"ok"}
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3020/   # 200
```

### 5. nginx site

`/etc/nginx/sites-available/dawry`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your.domain;
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3020;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/dawry /etc/nginx/sites-enabled/dawry
nginx -t && systemctl reload nginx     # always test first: a broken config takes down every site
```

### 6. HTTPS

Once DNS resolves to the server:

```bash
certbot --nginx -d your.domain --redirect
```

Certbot adds the `443` server block and the HTTP → HTTPS redirect, and renews automatically. Session cookies are `Secure` in production, so sign-in only works over HTTPS.

### 7. Super-admin account

A fresh database is empty. Create the first super-admin with the API image:

```bash
docker compose run --rm \
  -e ADMIN_NAME="المدير" -e ADMIN_USERNAME=admin -e ADMIN_PASSWORD='a-long-random-password' \
  api node dist/cli/create-admin.js
```

Sign in at `https://your.domain/super-admin`, then create restaurants and their owners from the admin panel.

### Demo data (optional)

For a demo or staging server, the dev seed can fill a database that has no restaurants yet. It adds 4 restaurants (one suspended), their owners, staff, menus, orders across the past days, and a customer with saved orders and favourites. If the database has no users yet it also creates the super-admin `admin`; an existing one is left alone.

The seed's default password is public in this repo, so on a live server it refuses to run unless you give it your own (12+ characters), which every demo account then uses:

```bash
docker compose run --rm -e SEED_PASSWORD='a-long-random-password' api node dist/cli/seed-dev.js
```

| Role | Username |
|---|---|
| Owner, بيتزا روما | `01001234567` (staff `mona`, `karim`) |
| Owner, برجر هاوس | `01112223333` (staff `tamer`) |
| Customer | `01009998888` |

## Redeploying

```bash
cd /root/dawry
git pull --ff-only
nohup sh -c "docker compose build migrate && docker compose build web && docker compose up -d && echo DEPLOY_DONE || echo DEPLOY_FAILED" > deploy.log 2>&1 &
```

- New migrations are applied automatically by `migrate` before the new API starts. If a migration fails, `up` stops before starting the new API, `docker compose ps -a` shows `migrate` as `Exited (1)`, and `docker compose logs migrate` says why.
- If only the web app changed, `docker compose build web && docker compose up -d` is enough.
- Containers restart on their own after a crash or a reboot (`restart: unless-stopped`).

## Day-to-day

| Task | Command |
|---|---|
| Status | `docker compose ps -a` |
| Logs | `docker compose logs -f --tail 100 api web` |
| Memory use | `docker stats --no-stream` |
| Restart one service | `docker compose restart web` |
| MySQL shell | `docker compose exec mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"'` |
| Stop the stack (data kept) | `docker compose down` |

Never run `docker compose down -v` (it deletes the database volume), and never `docker system prune` or `docker builder prune` on a shared server (it touches other projects' images and caches).

## Backups

Dump the database from the `mysql` container:

```bash
mkdir -p /root/backups
docker compose exec -T mysql sh -c 'mysqldump --single-transaction -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  | gzip > /root/backups/dawry-$(date +%F-%H%M).sql.gz
```

Restore into a running stack:

```bash
gunzip -c /root/backups/dawry-YYYY-MM-DD-HHMM.sql.gz \
  | docker compose exec -T mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"'
```

Take a backup before any deploy that adds migrations.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Build stops with `Killed` or the server freezes | Out of memory during the web build. Add swap (step 3) and build one image at a time |
| `"/repo/apps/web/public": not found` | Old `Dockerfile.web`; pull the current one (it creates the folder) |
| nginx `502 Bad Gateway` | `web` isn't running or the port in the nginx site doesn't match `WEB_HOST_PORT`. Check `docker compose ps` and `ss -tlnp` |
| Sign-in fails or the session doesn't stick | `BETTER_AUTH_URL` / `WEB_ORIGIN` don't match the URL in the browser, or the site is served over plain HTTP |
| API exits right after start | Usually a bad `.env` value (the env schema is validated at startup): `docker compose logs api` |
| Times or business days look off | `APP_TIME_ZONE` is wrong; fix `.env` and `docker compose up -d` |
