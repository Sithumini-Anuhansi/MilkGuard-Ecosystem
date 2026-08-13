# MilkGuard Ecosystem

Smart dairy milk-quality monitoring for small and medium dairy hubs. Collectors scan an RFID card, the ESP32 runs a sensor test, and results flow to owner and collector dashboards in real time—with permanent history, alerts, and optional WhatsApp notifications.

<img width="100%" alt="MilkGuard-Ecosystem Banner" src="/images/MilkGuard-Ecosystem.png">
---

## What it does

MilkGuard helps a dairy hub owner:

- **Identify collectors** automatically from RFID cards registered in Firestore
- **Test milk quality** on-site (pH, gas/VOC, temperature) and classify each sample as Fresh, Warning, Spoiled, or Unknown
- **Track every collection** in Firestore with test IDs, sensor readings, and editable quantity (liters)
- **Notify** the owner and relevant collector in the dashboard (and via WhatsApp when configured)
- **Report** daily, weekly, or monthly summaries per collector or for the whole hub

Collectors use a separate portal to see their own tests, edit quantity, and manage profile settings.

---

## How it works

```text
COLLECTOR
   │  Scan RFID card
   ▼
ESP32 + sensors (pH, gas, temperature)
   │  Lookup collector in Firestore (by rfidUID)
   │  Run milk quality test
   ▼
Firebase Realtime Database
   liveData/*          → live dashboards
   milkTests/{testId}  → completed test events
   ▼
Backend bridge (see below)
   ▼
Cloud Firestore
   milkCollections, notifications, collectors, settings
   ▼
Owner & Collector dashboards (React)
```

### Backend bridge (important)

Completed tests must be copied from RTDB into Firestore. Two options exist in this repo:

| Mode | When | Requirement |
|------|------|-------------|
| **Cloud Functions** (recommended) | `onMilkTestCreated` trigger on `milkTests/{testId}` | Firebase Blaze plan |
| **Client bridge** (current fallback) | `OwnerNotificationBridge` in the owner dashboard | Owner logged in on any owner page |

Without one of these running, live RTDB data still appears on dashboards, but **collections and notifications are not saved**.

WhatsApp delivery uses a separate Vercel proxy (`whatsapp-api/`) so Meta credentials stay server-side. See [whatsapp-api/README.md](whatsapp-api/README.md).

---

## Repository structure

```text
MilkGuard-Ecosystem/
├── DairyHub-Dashboard/     React (Vite) web app — owner & collector portals
├── MilkGuard-Device/       ESP32 firmware (Arduino)
│   └── Milk-Quality-Detection/
├── functions/              Firebase Cloud Functions (RTDB → Firestore, optional)
├── whatsapp-api/           Vercel serverless proxy for Meta WhatsApp API
├── firestore.rules         Firestore security rules
├── database.rules.json     Realtime Database security rules
├── firestore.indexes.json  Composite indexes
└── firebase.json           Firebase project config
```

---

## Main components

### ESP32 device (`MilkGuard-Device`)

- RC522 RFID reader identifies the collector via **Firestore** (single source of truth for RFID ↔ collector mapping)
- Reads pH, gas, and temperature during a timed sampling window
- Uploads live state to RTDB and final results to `milkTests/{testId}`
- Requires `secrets.h` (WiFi + Firebase credentials) — copy from `secrets.h.example` if provided, never commit secrets

### DairyHub Dashboard (`DairyHub-Dashboard`)

- **Owner:** live device status, today’s stats, milk collections, collectors, reports (PDF/Excel/CSV), notifications, quality thresholds
- **Collector:** own collections, live test view, quantity edit, profile (phone, WhatsApp toggle)
- Built with React, Firebase Auth, Firestore, and Realtime Database

### Firebase

- **Firestore:** collectors, users, milk collections, notifications, settings, counters
- **Realtime Database:** live sensor stream, device heartbeat, completed test events
- **Authentication:** email/password for owners and collectors

### Cloud Functions (`functions/`)

- `onMilkTestCreated` — persist tests, create notifications, send WhatsApp
- `checkDeviceOffline` — scheduled device offline checks

Deploy: `firebase deploy --only functions` (requires Blaze). Details: [functions/README.md](functions/README.md).

---

## Quick start (development)

### 1. Firebase

- Create a Firebase project and enable **Authentication**, **Firestore**, and **Realtime Database**
- Deploy rules and indexes:

```bash
firebase deploy --only firestore:rules,firestore:indexes,database
```

### 2. Dashboard

```bash
cd DairyHub-Dashboard
npm install
# Create .env.local with Firebase + optional WhatsApp proxy vars (see whatsapp-api/README.md)
npm run dev
```

Configure Firebase in `src/firebase/firebaseConfig.js`. For WhatsApp from the browser, set `VITE_WHATSAPP_PROXY_URL` and `VITE_WHATSAPP_PROXY_SECRET` in `.env.local`.

### 3. ESP32

- Open `MilkGuard-Device/Milk-Quality-Detection/Milk-Quality-Detection.ino` in Arduino IDE
- Create `MilkGuard-Device/secrets.h` with WiFi and Firebase credentials
- Flash the board and register collector RFID UIDs in Firestore (`collectors` collection)

### 4. WhatsApp proxy (optional)

```bash
cd whatsapp-api
npm install
vercel --prod
```

See [whatsapp-api/META_SETUP.md](whatsapp-api/META_SETUP.md) for Meta Business setup.

---

## Roles

| Role | Access |
|------|--------|
| **Owner** | All collectors, all collections, reports, settings, notifications, device bridge |
| **Collector** | Own collections and notifications only; profile edit |

---

## Security notes

- Do **not** commit `.env`, `secrets.h`, or API tokens — they are listed in `.gitignore`
- Register collector RFID UIDs in Firestore before testing on device
- For production, deploy Cloud Functions and tighten RTDB write rules so only the device can publish test data

---

## License

Academic / group project — MilkGuard Ecosystem. Adjust licensing as needed for your institution.
