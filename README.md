# Flex4Genz (Netlify + React)

A thick liquid-glass React app (orange/white high-contrast UI) for text/image-guided generation with three model modes:
- **Fazon Realistic Pro** (3 Gemini keys, text + image input)
- **Fazon Photography** (2 Gemini keys, text only)
- **Nano Banana Pro** (2 Gemini keys, text + image input)

It includes:
- robot walking loading animation (SVG)
- prompt textbox + optional image input for supported models
- aspect ratios: `1:1`, `2:3`, `4:5`, `9:16`, `16:9`
- temporary saves, display, delete-if-not-posted behavior
- save to account profile button + save to device
- Netlify Functions + Neon Postgres + Netlify blob-ready image keys

## Run locally

```bash
npm install
npm run dev
```

## Build for Netlify

```bash
npm run build
```

`netlify.toml` is preconfigured for:
- static publish: `dist`
- functions folder: `netlify/functions`

## Netlify secrets (exact place)

In Netlify UI:
1. Open your site dashboard.
2. Go to **Site configuration → Environment variables**.
3. Add these variables exactly:

### Gemini keys (9 total slots)
- `GEMINI_KEY_1`
- `GEMINI_KEY_2`
- `GEMINI_KEY_3`
- `GEMINI_KEY_4`
- `GEMINI_KEY_5`
- `GEMINI_KEY_6`
- `GEMINI_KEY_7`
- `GEMINI_KEY_8`
- `GEMINI_KEY_9`

Slot mapping in code:
- Fazon Realistic Pro → 1,2,3
- Fazon Photography → 4,5
- Nano Banana Pro → 6,7
- 8,9 reserved fallback capacity

Rotation rule:
- key usage is tracked per model in Neon table `gemini_key_usage`
- when the most eligible key hits 100 generations, model pool counts reset and rotation restarts

### Admin auth secrets
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

### Database
- `NEON_DATABASE_URL` (Neon Postgres connection string)

## Neon setup

Create a Neon project and copy connection string to `NEON_DATABASE_URL`.
Tables are auto-created by functions on first call:
- `drafts`
- `gemini_key_usage`

## Netlify Blobs

`generate.js` already returns a deterministic `blobKey` (`generated/<timestamp>-<random>.png`) so you can plug in Netlify Blobs persistence in one place.

In production, add the Netlify Blobs SDK call in `netlify/functions/generate.js` to persist the returned image bytes under this key.

## Admin-only auth and referrals

- No public signup flow is included.
- Use `/.netlify/functions/admin-login` with admin credentials from secrets.
- Referral links can be attached to admin-only pages by storing/referring from Neon in future extension.

## Important deployment notes

- Keep all Gemini keys and admin credentials only in Netlify Environment Variables.
- Do **not** hardcode secrets in frontend code.
- Frontend currently calls serverless functions at `/.netlify/functions/*`.


## Reliability fixes included

- Netlify function handlers use `export const handler` for runtime compatibility.
- Gemini image input uses the correct `inlineData` payload format for reference-image models.
- UI includes stronger body-level gradient and dark-on-light text contrast to avoid a blank/washed-out experience.
