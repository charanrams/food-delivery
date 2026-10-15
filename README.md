# A3 Kitchen

Single-kitchen food ordering & delivery. Docs live in [`docs/`](docs/) — start with [`docs/AGENTS.md`](docs/AGENTS.md).

| Folder | What |
|---|---|
| `backend/` | Express + TypeScript API, MongoDB (`backend/contracts` = shared types) |
| `frontend/` | React web app with 3 role-based dashboards: customer `/`, delivery `/delivery`, admin `/admin` |
| `mobile-customer/` | Flutter customer app |
| `mobile-delivery/` | Flutter delivery-partner app |

## Run locally

```bash
npm install
cp backend/.env.example backend/.env    # server secrets, CORS_ORIGINS; fill in CLOUDINARY_* (and MONGODB_URI)
cp frontend/.env.example frontend/.env  # VITE_API_URL = backend address (http://localhost:4000 locally)
npm run dev:server          # API on http://localhost:4000 (in-memory DB, auto-seeded)
npm run dev:web             # web on http://localhost:5173
```

Seeded accounts (password `A3kitchen@123`, override with `SEED_PASSWORD`):

| Role | Login | Lands on |
|---|---|---|
| Admin | admin@a3kitchen.in | /admin |
| Delivery partner | delivery@a3kitchen.in | /delivery |
| Customer | customer@a3kitchen.in | / |

Mobile apps (phone over USB or emulator) — the app calls `http://localhost:4000`, tunnelled to this PC with `adb reverse` (no IP or firewall setup):

```bash
npm run phone                       # adb reverse tcp:4000 tcp:4000
cd mobile-customer && flutter run   # or VS Code → Run and Debug → "Customer app (local API)"
```

Production builds: `flutter build apk --dart-define=USE_PRODUCTION=true` (URL in `lib/core/env.dart`).

## Checks

```bash
npm run typecheck && npm test
cd mobile-customer && flutter analyze && flutter test
cd mobile-delivery && flutter analyze && flutter test
```
