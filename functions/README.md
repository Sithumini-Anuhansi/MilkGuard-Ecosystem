# MilkGuard Cloud Functions

Server-side backend for the MilkGuard production workflow.

## Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `onMilkTestCreated` | RTDB `milkTests/{testId}` write | Persist to Firestore, create notifications, send WhatsApp |
| `checkDeviceOffline` | Scheduled every 2 min | Alert when ESP32 heartbeat stops |

## Setup

```bash
cd functions
npm install
```

Copy `.env.example` values into Firebase environment config or Secret Manager:

```bash
firebase functions:config:set whatsapp.provider="meta"
firebase functions:secrets:set WHATSAPP_TOKEN
firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID
```

## Deploy

```bash
firebase deploy --only functions
firebase deploy --only firestore:rules,database
```

## WhatsApp

Supports **Meta Cloud API** (default) or **Twilio Sandbox**. Set `WHATSAPP_PROVIDER=meta|twilio` in environment.

Recipient phones come from:
- Owner: `settings/system.ownerPhone`
- Collector: `collectors` doc matched by `collectorId`

Notification rules:
- **Collector WhatsApp**: every test (Fresh, Warning, Spoiled) — phone from `collectors` doc
- **Owner WhatsApp**: Warning and Spoiled only — phone from `settings/system.ownerPhone`
