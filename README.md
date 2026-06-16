# m5rcel’s Redeemer

A minimalistic, dark, aesthetic redeem-code web app made by m5rcel.

Users enter a redeem code, submit it, hear a short success sound when the code is valid, and then see a polished animated success screen.

## Features

- Vite + TypeScript frontend
- Cloudflare Pages Functions support
- Vercel Serverless Functions support
- Protected admin code-generation endpoint
- `ADMIN_SECRET` stays server-side only
- One-time redeem codes
- Cryptographically secure code generation
- Case-insensitive code redeeming
- Server-side validation
- Clean storage abstraction
- Cloudflare KV support
- Vercel KV support
- In-memory local fallback for development
- Smooth responsive UI
- Success sound waits until audio ends before showing animation
- Graceful fallback when audio is blocked or missing

## Project structure

```txt
m5rcels-redeemer/
  public/
    success.mp3
  src/
    main.ts
    style.css
    api-client.ts
    animations.ts
  functions/
    api/
      redeem.ts
      admin/
        generate.ts
  api/
    redeem.ts
    admin/
      generate.ts
  server/
    storage.ts
    code.ts
    auth.ts
    validation.ts
    rate-limit.ts
    handlers.ts
    types.ts
  .env.example
  .gitignore
  package.json
  README.md
  vite.config.ts
  tsconfig.json
```

## Install

```bash
npm install
```

## Run frontend locally

```bash
npm run dev
```

This starts the Vite frontend. For backend routes, use either Cloudflare Pages local dev or Vercel local dev.

## Environment variables

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Set a strong secret:

```env
ADMIN_SECRET=replace-with-a-long-random-secret
```

Generate a good secret with:

```bash
openssl rand -base64 48
```

Never put `ADMIN_SECRET` in frontend code, HTML, CSS, browser storage, public config, or commits.

## API

### Redeem code

`POST /api/redeem`

Body:

```json
{
  "code": "M5R-8F3K-Q2LX-Z9PA"
}
```

Success:

```json
{
  "ok": true,
  "message": "Code redeemed successfully."
}
```

Errors:

```json
{
  "ok": false,
  "error": "INVALID_CODE"
}
```

Possible errors:

- `MALFORMED_CODE`
- `INVALID_CODE`
- `ALREADY_REDEEMED`
- `EXPIRED_CODE`
- `RATE_LIMITED`
- `SERVER_ERROR`

### Generate codes

`POST /api/admin/generate`

Requires:

```http
Authorization: Bearer YOUR_ADMIN_SECRET
```

Body:

```json
{
  "amount": 5,
  "expiresInHours": 24,
  "note": "test drop"
}
```

Response:

```json
{
  "ok": true,
  "codes": [
    "M5R-8F3K-Q2LX-Z9PA"
  ]
}
```

`amount` defaults to `1` and is capped at `100`.

## Generate codes from browser DevTools

Open the deployed site, open DevTools Console, and manually paste:

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

The secret must only be typed manually by the admin. Do not store it in frontend JavaScript, HTML, CSS, localStorage, sessionStorage, or public files.

## Generate codes with curl

```bash
curl -X POST "https://your-domain.example/api/admin/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET_HERE" \
  -d '{"amount":5,"expiresInHours":24,"note":"test drop"}'
```

## Redeem codes

A user enters a code on the main page and clicks **Redeem Code**.

If valid:

1. The backend marks the code as redeemed.
2. The frontend plays `/success.mp3`.
3. After the audio ends, the success animation appears.

Invalid, expired, malformed, already-used, server, and network errors are shown inside the card without `alert()`.

## Storage

The backend uses `server/storage.ts`.

Storage adapters included:

- `createCloudflareKvStorage`
- `createVercelKvStorage`
- `createMemoryStorage`

### Cloudflare storage

Use Cloudflare KV.

Bind a KV namespace named:

```txt
CODES_KV
```

The app stores records under keys like:

```txt
code:M5R-8F3K-Q2LX-Z9PA
```

### Vercel storage

Use Vercel KV.

After creating Vercel KV, Vercel injects:

```env
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

If those are missing, the Vercel API falls back to in-memory storage, which is only suitable for local development.

### Stored code record

```ts
{
  code: string;
  createdAt: string;
  expiresAt?: string;
  redeemed: boolean;
  redeemedAt?: string;
  redeemedBy?: string;
  note?: string;
}
```

## Cloudflare Pages deployment

1. Push this project to GitHub.
2. Create a Cloudflare Pages project.
3. Build command:

```bash
npm run build
```

4. Build output directory:

```txt
dist
```

5. Add environment variable:

```txt
ADMIN_SECRET
```

6. Create a KV namespace.
7. Bind it to the Pages project as:

```txt
CODES_KV
```

8. Deploy.

Cloudflare Pages Functions automatically use the files inside `functions/`.

## Vercel deployment

1. Push this project to GitHub.
2. Import it into Vercel.
3. Add environment variable:

```txt
ADMIN_SECRET
```

4. Create Vercel KV and connect it to the project.
5. Build command:

```bash
npm run build
```

6. Output directory:

```txt
dist
```

7. Deploy.

Vercel automatically uses the files inside `api/`.

## GitHub Pages note

GitHub Pages can only host the static frontend. It cannot securely run the protected `/api/admin/generate` backend by itself.

You can use GitHub Pages only if the API endpoints are hosted separately on Cloudflare Workers, Cloudflare Pages Functions, Vercel, Netlify Functions, or another secure backend provider.

Never fake the admin endpoint in frontend JavaScript, because that would expose the secret and allow anyone to generate codes.

## Replace the success sound

Replace:

```txt
public/success.mp3
```

with your own short MP3 file.

Keep it short, ideally under 2 seconds.

If the file is missing or the browser cannot play it, the app skips directly to the success animation. If autoplay is blocked, it shows a **Tap to continue** button.

## Security notes

- Code generation happens only server-side.
- Redeem validation happens only server-side.
- Codes are normalized by trimming, uppercasing, and removing spaces.
- Admin secret is checked with a constant-time-ish comparison.
- Bad admin auth returns HTTP `401`.
- Redeem attempts are lightly rate-limited in memory.
- Internal stack traces are never returned to the client.
- `.env` is ignored by Git.
- Do not rely on frontend validation for security.

## Troubleshooting

### The admin endpoint returns 401

Check that:

- `ADMIN_SECRET` is set in your hosting provider.
- The request header is exactly `Authorization: Bearer YOUR_SECRET`.
- You redeployed after adding the environment variable.

### Codes disappear locally

The local fallback storage is in-memory. It resets when the dev server or function restarts.

Use Cloudflare KV or Vercel KV for persistent production storage.

### The success sound does not play

Browsers can block audio until user interaction. The app handles this by showing a **Tap to continue** button.

Also make sure `public/success.mp3` exists and is a valid MP3 file.

### Vercel codes are not persistent

Create and connect Vercel KV. Without `KV_REST_API_URL` and `KV_REST_API_TOKEN`, the Vercel API uses in-memory development storage.

### Cloudflare says `CODES_KV` is undefined

Bind your KV namespace to the Pages project with the exact binding name:

```txt
CODES_KV
```
