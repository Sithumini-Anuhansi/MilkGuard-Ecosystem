# MilkGuard WhatsApp API (Vercel — free tier)

Firebase Cloud Functions need the **Blaze (paid) plan**. This small proxy sends WhatsApp messages from **Vercel's free tier** instead.

The DairyHub dashboard calls this API when the owner is logged in (same client bridge as Firestore persistence).

## Setup

### 1. Choose a WhatsApp provider

**Option A — Meta Cloud API (recommended for production)**

See **[META_SETUP.md](./META_SETUP.md)** for the full step-by-step guide (templates, tokens, Vercel env vars).

**Option B — Twilio Sandbox (easiest for demos)**

1. Create a free Twilio account.
2. Join the [WhatsApp Sandbox](https://www.twilio.com/docs/whatsapp/sandbox) from your phone.
3. Copy Account SID, Auth Token, and sandbox `From` number.

### 2. Deploy to Vercel

```bash
cd whatsapp-api
npm i -g vercel
vercel login
vercel
```

Set environment variables in the Vercel dashboard (Settings → Environment Variables) using values from `.env.example`.

Redeploy after adding env vars: `vercel --prod`

### 3. Configure the dashboard

Copy `DairyHub-Dashboard/.env.example` to `DairyHub-Dashboard/.env.local`:

```env
VITE_WHATSAPP_PROXY_URL=https://YOUR-PROJECT.vercel.app/api/send
VITE_WHATSAPP_PROXY_SECRET=same-secret-as-WHATSAPP_PROXY_SECRET
```

Restart the Vite dev server. For production hosting, set the same variables in your host's build settings.

### 4. Phone numbers in Firestore

- **Owner**: Settings → Owner WhatsApp Phone (`+94771234567`)
- **Collectors**: Profile → WhatsApp Phone

## Security

- Never commit tokens or `.env.local`.
- `WHATSAPP_PROXY_SECRET` blocks random callers from using your proxy.
- Set `ALLOWED_ORIGIN` to your dashboard URL in production (not `*`).

## Test

```bash
curl -X POST https://YOUR-PROJECT.vercel.app/api/send \
  -H "Authorization: Bearer YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"to":"94771234567","message":"MilkGuard test"}'
```
