# m5rcel’s Redeemer

A minimalistic, dark, aesthetic redeem-code web app made by m5rcel.

Users enter a redeem code, submit it, hear a short success sound, and then see an animated “Code Redeemed Successfully” screen.

This build includes the uploaded sound as:

```txt
public/success.mp3
```

## Features

- Vite + TypeScript frontend
- Cloudflare Pages Functions support
- Vercel Serverless Functions support
- Protected admin code-generation endpoint
- `ADMIN_SECRET` stays server-side only
- One-time redeem codes
- Cryptographically secure code generation
- Case-insensitive redeeming
- Server-side validation
- Cloudflare KV support
- Vercel KV support
- In-memory local fallback for development
- Smooth responsive UI
- Success sound waits until the audio ends before showing the final animation

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

## Run frontend locally

```bash
npm run dev
```

For backend routes, use Cloudflare Pages dev or Vercel dev.

## Environment variables

Copy the example:

```bash
cp .env.example .env
```

Set:

```env
ADMIN_SECRET=replace-with-a-long-random-secret
```

Generate a strong secret:

```bash
openssl rand -base64 48
```

Never put `ADMIN_SECRET` in frontend code, HTML, CSS, browser storage, public config, or commits.

## Cloudflare Pages deployment

Cloudflare Pages settings:

```txt
Build command: npm run build
Build output directory: dist
```

Add environment variable:

```txt
ADMIN_SECRET
```

Create a Cloudflare KV namespace and bind it to your Pages project with the exact binding name:

```txt
CODES_KV
```

Cloudflare Pages Functions will use:

```txt
functions/api/redeem.ts
functions/api/admin/generate.ts
```

## Vercel deployment

Vercel settings:

```txt
Build command: npm run build
Output directory: dist
```

Add environment variable:

```txt
ADMIN_SECRET
```

Create and connect Vercel KV so these exist:

```txt
KV_REST_API_URL
KV_REST_API_TOKEN
```

Vercel will use:

```txt
api/redeem.ts
api/admin/generate.ts
```

## GitHub Pages note

GitHub Pages can only host the static frontend. It cannot securely run `/api/redeem` or `/api/admin/generate` by itself.

Use GitHub Pages only if the API is hosted separately on Cloudflare Pages Functions, Vercel, Workers, or another secure backend provider.

Never put the admin secret in frontend JavaScript.

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

Open DevTools Console on your deployed site and paste:

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

The secret must only be typed manually by the admin. Do not store it in frontend code.

## Generate codes with curl

```bash
curl -X POST "https://your-domain.example/api/admin/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET_HERE" \
  -d '{"amount":5,"expiresInHours":24,"note":"test drop"}'
```

## Storage

Stored records look like:

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

Storage adapters are in:

```txt
server/storage.ts
```

Included adapters:

- Cloudflare KV
- Vercel KV
- In-memory local fallback

## Replace success sound

Replace:

```txt
public/success.mp3
```

with any short MP3.

The current file is your uploaded `why-did-u-redeem-it.mp3`, renamed to `success.mp3` for the app.

## Troubleshooting

### Cloudflare build fails with TypeScript null errors

This fixed version uses a `mustQuery()` helper in `src/main.ts`, so strict DOM null checks pass.

### Admin endpoint returns 401

Check:

- `ADMIN_SECRET` exists in your host settings.
- The header is exactly `Authorization: Bearer YOUR_SECRET`.
- You redeployed after adding the secret.

### Codes disappear locally

The in-memory development store resets when the serverless dev process restarts. Use Cloudflare KV or Vercel KV for real persistence.

### Success sound does not play

Browsers sometimes block audio until user interaction. The app shows a **Tap to continue** button if needed.

### Cloudflare says CODES_KV is missing

Bind the KV namespace with the exact name:

```txt
CODES_KV
```
