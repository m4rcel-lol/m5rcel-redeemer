# m5rcel's Redeemer

A minimal, self-hosted gift-code redemption app. Users enter a code, the Node.js backend validates and redeems it once in SQLite, a local success sound plays, and the page transitions into an animated success screen.

## Features

- Dark, responsive Vite frontend with no public admin panel.
- Fastify backend with TypeScript.
- SQLite storage in a persistent Docker volume at `/data/redeemer.sqlite`.
- Cryptographically secure backend-only code generation.
- Single-use, case-insensitive, server-normalized redeem codes.
- Protected admin generation endpoint using `Authorization: Bearer ...`.
- Rate-limited public redeem endpoint.
- Security headers via Helmet.
- Docker Compose deployment on Alpine-based Node.js 22.

## Requirements

- Docker
- Docker Compose
- An Alpine Linux server or any host capable of running Docker

## Configuration

The backend loads environment variables from `.env` for local runs and from Docker Compose environment values in production. `.env` is ignored by Git and must not be committed.

```bash
cp .env.example .env
```

Required variables:

```env
NODE_ENV=production
PORT=3000
ADMIN_SECRET=change-this-secret
DB_PATH=/data/redeemer.sqlite
```

Set a long random `ADMIN_SECRET`. The secret must only exist in environment variables or be typed manually by the admin when generating codes. Never put it in frontend source files, HTML, CSS, browser localStorage, public config files, screenshots, or client-side JavaScript.

Important variables:

- `PORT`: app port, defaults to `3000`.
- `ADMIN_SECRET`: required for `/api/admin/generate`.
- `DB_PATH`: SQLite file path, defaults to `/data/redeemer.sqlite` in Docker.
- `TRUST_PROXY`: set to `true` only when the app is reachable exclusively through a trusted reverse proxy.

## Run On Alpine Linux With Docker Compose

On the Alpine server, install Docker and the Docker Compose plugin, clone or copy this project, set a real `ADMIN_SECRET` in `docker-compose.yml` or your deployment environment, then start the app:

```bash
docker compose up -d --build
```

The app will be available at:

```text
http://localhost:3000
```

View logs:

```bash
docker compose logs -f
```

Rebuild after changes:

```bash
docker compose up -d --build
```

Stop:

```bash
docker compose down
```

## Generate Redeem Codes

Codes are generated only by the backend. The frontend never generates codes and never receives the admin secret.

Browser DevTools example:

```js
fetch("/api/admin/generate", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_SECRET_HERE"
  },
  body: JSON.stringify({
    amount: 5,
    expiresInHours: 24,
    note: "test drop"
  })
}).then(r => r.json()).then(console.log)
```

curl example:

```bash
curl -X POST http://localhost:3000/api/admin/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET_HERE" \
  -d '{"amount":5,"expiresInHours":24,"note":"test drop"}'
```

Request fields:

- `amount`: optional, defaults to `1`, maximum `100`.
- `expiresInHours`: optional positive number.
- `note`: optional admin note, stored in SQLite.

Successful response:

```json
{
  "ok": true,
  "codes": ["M5R-8F3K-Q2LX-Z9PA"]
}
```

## Redeem Codes

Public endpoint:

```http
POST /api/redeem
Content-Type: application/json
```

```json
{
  "code": "M5R-XXXX-XXXX-XXXX"
}
```

Codes are trimmed, uppercased, stripped of accidental whitespace, validated server-side, and can be redeemed once. Successful redemption writes `redeemed = 1`, `redeemed_at`, and `redeemed_ip` to SQLite, so the same code stays unusable after page refreshes, browser restarts, server restarts, Docker container restarts, and redeploys that keep the Docker volume.

## Replace The Success Sound

Replace:

```text
public/success.mp3
```

Then rebuild:

```bash
docker compose up -d --build
```

The file is served by the app at `/success.mp3`. A compatibility path also exists at `/public/success.mp3`.

If the file is missing or the browser cannot play it, the app skips the sound and still shows the success animation. If autoplay is blocked, the user sees `Tap to continue`.

## SQLite Storage

Docker Compose stores the database at:

```text
/data/redeemer.sqlite
```

inside the container, backed by the `redeemer-data` Docker volume. Codes persist after container restarts.

The app initializes this table automatically:

```sql
CREATE TABLE IF NOT EXISTS redeem_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT,
  redeemed INTEGER NOT NULL DEFAULT 0,
  redeemed_at TEXT,
  redeemed_ip TEXT,
  note TEXT
);
```

Back up the volume:

```bash
docker run --rm \
  -v m5rcel-redeemer_redeemer-data:/data \
  -v "$PWD":/backup \
  alpine sh -c 'cp /data/redeemer.sqlite /backup/redeemer.sqlite.backup'
```

If your Compose project name differs, list volumes with:

```bash
docker volume ls
```

## Reverse Proxy

Caddy example:

```caddy
redeemer.example.com {
  reverse_proxy 127.0.0.1:3000
}
```

Nginx example:

```nginx
server {
  listen 80;
  server_name redeemer.example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

When using a trusted reverse proxy and no direct public access to the app port, you may set:

```env
TRUST_PROXY=true
```

## Security Notes

- `ADMIN_SECRET` is read only by the backend from environment variables.
- The admin endpoint returns `401` for missing or incorrect authorization without revealing the configured secret.
- The admin token is compared using a timing-safe hash comparison.
- CORS is not enabled by default.
- Request bodies are size-limited.
- Public redeem attempts are rate-limited in memory per running container.
- `.env` is ignored by Git; `.env.example` contains only safe placeholders.
- Do not expose the Docker volume or SQLite file publicly.

## Troubleshooting

Check health:

```bash
curl http://localhost:3000/healthz
```

Expected response:

```json
{
  "ok": true
}
```

Check logs:

```bash
docker compose logs -f
```

If admin generation returns `401`, verify that the `Authorization` header is exactly:

```http
Authorization: Bearer YOUR_SECRET_HERE
```

If codes disappear after restart, confirm the Compose volume is mounted:

```bash
docker compose config
```

## Local Development

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Build:

```bash
npm run build
```

Run locally after build using `.env`:

```bash
DB_PATH=./data/redeemer.sqlite PORT=3000 npm start
```

For local development with watch mode:

```bash
ADMIN_SECRET=your-local-secret npm run dev
```
