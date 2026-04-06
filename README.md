# Election Monitoring Platform (JavaScript)

This project is a JavaScript monorepo for polling-unit election monitoring with:

- **Mobile app** for field agents to submit polling-unit result sheets
- **Web e-situation room** for live incoming submissions and aggregate tallies
- **Backend API** for upload metadata, OCR processing, and real-time updates

## Apps

- `apps/mobile` - React Native (Expo)
- `apps/web` - React + Vite dashboard
- `apps/server` - Node.js + Express + Socket.io API

## Quick start

1. Install dependencies:

```bash
npm run install:all
```

2. Create env files:

- Copy `apps/server/.env.example` to `apps/server/.env`
- Copy `apps/web/.env.example` to `apps/web/.env`

3. Run backend + web dashboard:

```bash
npm run dev
```

4. Run mobile app separately:

```bash
npm run dev:mobile
```

## Current prototype flow

1. Field agent uses the Expo mobile app to snap/select result sheet image
2. Submission is sent to backend
3. Dashboard receives live updates via Socket.io
4. Dashboard triggers OCR processing endpoint
5. Parsed results are aggregated in live tally cards

The web app is now **admin-only e-situation room**. Field data entry happens in the mobile app.

## Portal access

- Login endpoint: `POST /api/auth/login`
- Default credentials:
  - username: `admin`
  - password: `password123`
- Override via server env:
  - `ADMIN_USER`
  - `ADMIN_PASS`

## Multi-election and hierarchy support

Submissions now carry:

- `electionType` (Presidential, Governorship, Senate, House of Representatives, State House of Assembly)
- `electionCycle`
- `pollingUnitCode`, `ward`, `localGovernment`, `state`

The web portal can aggregate by:

- Polling Unit -> Ward -> Local Gov -> State -> Federal

## OCR integration

The server exposes a pluggable OCR service:

- By default, it runs a deterministic parser mock for development
- You can switch to real Anthropic Vision API by setting:
  - `OCR_PROVIDER=anthropic`
  - `ANTHROPIC_API_KEY=...`

## Next production upgrades

- Real file uploads to Cloudinary or S3
- Postgres persistence for audit-grade records
- Immutable append-only audit log
- GPS capture + offline sync queue in mobile app
- Supervisor verification workflow
# elecmonit
# elecmonit
