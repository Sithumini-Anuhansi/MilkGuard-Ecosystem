# Meta WhatsApp Cloud API — MilkGuard setup

MilkGuard sends **proactive alerts** (milk test results, device offline). Meta only allows those as **approved message templates**, not free-text, unless the user messaged you in the last 24 hours.

---

## Part 1 — Meta Developer setup

### 1. Create a Meta developer account

1. Go to [developers.facebook.com](https://developers.facebook.com/)
2. **Get Started** → verify phone/email
3. Complete developer registration

### 2. Create an app with WhatsApp

1. **My Apps** → **Create App**
2. Use case: **Other** → **Business**
3. App name: `MilkGuard` (or your choice)
4. Add product: **WhatsApp** → **Set up**

### 3. API Setup (test your first message)

1. Open **WhatsApp** → **API Setup** in the left menu
2. Under **From**, note the **test phone number** (Meta provides one)
3. Copy **Phone number ID** (long numeric ID — not the phone number itself)
4. Click **Generate access token** (temporary — expires in ~24 hours; fine for first test)
5. Under **To**, click **Manage phone number list** and add:
   - Your owner phone: `+94771234567`
   - Each collector phone you want to test
6. Click **Send message** with the default `hello_world` template — confirm it arrives on WhatsApp

Save these values:

| Value | Where to find it |
|-------|------------------|
| `WHATSAPP_TOKEN` | API Setup → Generate access token |
| `WHATSAPP_PHONE_NUMBER_ID` | API Setup → Phone number ID |

---

## Part 2 — Create the MilkGuard message template

1. Open [Meta Business Suite](https://business.facebook.com/) → **WhatsApp Manager** → **Message templates**
2. **Create template**
   - **Name:** `milkguard_alerts` (lowercase, underscores only — must match `WHATSAPP_TEMPLATE_NAME` exactly in both `.env` files)
   - **Category:** Utility
   - **Language:** English
   - **Header (static text, no variable):** `MilkGuard Alert`
   - **Body (verbatim — variable numbers below are Meta's actual assignment, not reading order):**

```
Your MilkGuard alert for Ref: {{5}} has been triggered:
{{1}}
Status: {{2}}
{{3}}
{{4}}
```

   - **Footer (static text, no variables allowed here):** `Visit the website for more details.`

**Important:** only `{{2}}` (`Status:`) and `{{5}}` (`Ref:`) have a literal label already in the template text. `{{1}}`, `{{3}}`, and `{{4}}` are bare lines with no label — the code has to send the full label *inside* the value:

| Param sent (array index → `{{n}}`) | Value | Renders as |
|---|---|---|
| `[0]` → `{{1}}` | `"Collector Pabasara"` | `Collector Pabasara` |
| `[1]` → `{{2}}` | `"Warning"` | `Status: Warning` |
| `[2]` → `{{3}}` | `"pH 6.85"` | `pH 6.85` |
| `[3]` → `{{4}}` | `"Gas 520 ppm"` | `Gas 520 ppm` |
| `[4]` → `{{5}}` | `"MG-0019"` | `Ref: MG-0019` |

This is what `buildMilkTemplateParams()` in both `DairyHub-Dashboard/src/services/notificationBridge.js` (the active sender) and `functions/src/sendWhatsApp.js` (the dormant Cloud Functions fallback) build. If you ever edit the template's body wording in Meta, update both functions to match — Meta fills `{{1}}`..`{{5}}` purely positionally from the array you send; it has no idea what a "correct" value looks like.

3. Submit for approval (often minutes to a few hours for Utility templates)

Device-offline alerts reuse this same template via `buildDeviceTemplateParams()`: `["Device <id>", "Offline", "Last collector <name>" (or "No recent collector"), "-", "<deviceId>"]`.

---

## Part 3 — Permanent access token (required beyond 24h)

Temporary tokens expire. Create a **System User** token:

1. [business.facebook.com](https://business.facebook.com/) → **Settings** → **Business settings**
2. **Users** → **System users** → **Add** → name it `milkguard-api`
3. **Add assets** → assign your **App** and **WhatsApp Business Account**
4. **Generate token** → select your app → permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. Copy the token → use as `WHATSAPP_TOKEN` on Vercel (never commit to git)

---

## Part 4 — Deploy Vercel proxy

```bash
cd whatsapp-api
vercel login
vercel
vercel --prod
```

In **Vercel → Project → Settings → Environment Variables**:

| Variable | Example |
|----------|---------|
| `WHATSAPP_PROVIDER` | `meta` |
| `WHATSAPP_TOKEN` | System user token from Part 3 |
| `WHATSAPP_PHONE_NUMBER_ID` | e.g. `123456789012345` |
| `WHATSAPP_TEMPLATE_NAME` | `milkguard_milk_alert` |
| `WHATSAPP_TEMPLATE_LANGUAGE` | `en` |
| `WHATSAPP_PROXY_SECRET` | long random string |
| `ALLOWED_ORIGIN` | `http://localhost:5173` (your dashboard URL in prod) |

**First pipeline test** (before your template is approved):

```env
WHATSAPP_TEMPLATE_NAME=hello_world
```

`hello_world` is pre-approved and has no variables.

Redeploy after changing env vars: `vercel --prod`

---

## Part 5 — Dashboard `.env.local`

```env
VITE_WHATSAPP_PROXY_URL=https://YOUR-PROJECT.vercel.app/api/send
VITE_WHATSAPP_PROXY_SECRET=same-as-WHATSAPP_PROXY_SECRET
```

Restart: `npm run dev` in `DairyHub-Dashboard/`

Settings page should show **WhatsApp proxy connected** (green).

---

## Part 6 — Firestore phone numbers

| Role | Where | Format |
|------|-------|--------|
| Owner | Settings → Owner WhatsApp Phone | `+94771234567` |
| Collector | Profile → WhatsApp Phone | `+94729787137` |

Numbers must match those added as **test recipients** in Meta API Setup (until you complete business verification for production).

---

## Part 7 — Test end-to-end

### A. Test proxy directly

```bash
curl -X POST https://YOUR-PROJECT.vercel.app/api/send \
  -H "Authorization: Bearer YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"to\":\"94771234567\",\"message\":\"test\",\"templateParams\":[\"Sadeepa\",\"Warning\",\"6.85\",\"520\",\"MG-TEST-001\"]}"
```

For `hello_world` only:

```bash
curl -X POST https://YOUR-PROJECT.vercel.app/api/send \
  -H "Authorization: Bearer YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"to\":\"94771234567\",\"message\":\"hello\"}"
```

### B. Test via MilkGuard

1. Log in as **owner** (bridge must be running)
2. Run a milk test on ESP32
3. Check WhatsApp on owner/collector phones
4. Notification should show **WhatsApp** badge when send succeeds

---

## Common errors

| Error | Fix |
|-------|-----|
| `(#131030) Recipient phone number not in allowed list` | Add number in API Setup → Manage phone number list |
| `(#132001) Template name does not exist` | Check `WHATSAPP_TEMPLATE_NAME` spelling; wait for approval |
| `(#131047) Re-engagement message` | Need approved template — plain text not allowed outside 24h window |
| `401 Unauthorized` on proxy | `WHATSAPP_PROXY_SECRET` mismatch between Vercel and `.env.local` |
| Token expired | Regenerate system user token; update Vercel env |

---

## Production (after university demo)

1. Complete **Meta Business Verification**
2. Add your own business phone number (not Meta test number)
3. Register number via Graph API if required
4. Keep using approved templates for all outbound alerts

Docs: [WhatsApp Cloud API Get Started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/)
