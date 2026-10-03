# SmartFlow AI

A traffic management platform that combines live traffic monitoring, incident reporting, signal control and a 3D intersection simulation with an AI-style emergency vehicle priority pipeline. Built as a full-stack TypeScript monorepo: an Express REST API backed by PostgreSQL, and a React single-page app.

## Features

- **Live traffic** - road-level congestion, density and average speed from a traffic records feed
- **Incident reporting** - citizens report incidents with photos (Leaflet map picker, geolocation); operators review and resolve them
- **Signal control** - per-direction manual override (red/amber/green) and automatic mode
- **Emergency priority** - simulate an ambulance approaching, watch the detection and plate-verification pipeline grant a green corridor
- **Emergency response** - authorized-vehicle plate verification, live map with nearby hospitals (OpenStreetMap), routing (OSRM/Mapbox) and safe signal-priority requests with granted/denied reasons, per session
- **3D simulation** - Three.js intersection with cars, buses, motorcycles and emergency vehicles, driven by a client-side traffic engine
- **Admin console** - dashboard analytics, roads/vehicles CRUD, user management (roles, suspend), system logs, settings
- **Accounts** - JWT auth with user/operator/admin roles, password reset, notifications, saved routes

## Tech stack

| Layer      | Tools |
|------------|-------|
| Backend    | Node.js, Express, TypeScript, pg, zod, JWT, bcryptjs, helmet, rate limiting |
| Frontend   | React 18, Vite, TypeScript, Tailwind CSS, React Router, axios, Leaflet, Recharts, Three.js (@react-three/fiber) |
| Database   | PostgreSQL |

## Project structure

```
backend/                Express REST API
  src/
    config/             env parsing and Postgres pool
    constants/          shared domain constants
    controllers/        request handlers per resource
    middleware/         auth (JWT + roles), error handling, file upload
    routes/             API route table
    types/              Express type augmentation
    utils/              response helpers, validation, logger, ApiError
database/
  schema.sql            tables, indexes, constraints
  seed.sql              demo data (users, roads, vehicles, signals, incidents, traffic records)
frontend/               React SPA
  src/
    components/         layouts, UI kit, traffic legend
    context/            auth and toast providers
    pages/              public, user and admin pages
    services/           axios client and typed API calls
    simulation/         3D traffic engine and scene
  vite.config.ts        build config; injects canonical/OG/sitemap when VITE_SITE_URL is set
```

## Prerequisites

- Node.js 18 or newer
- PostgreSQL 14 or newer (a local install, or a hosted instance such as Supabase)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/subhankalgond/trafic.git
cd trafic

cd backend  && npm install
cd ../frontend && npm install
```

### 2. Configure environment

Copy the example files and fill in values (see the reference below):

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Point `DATABASE_URL` at your Postgres instance. For a local server:

```
DATABASE_URL=postgresql://postgres:yourpassword@127.0.0.1:5432/trafficflow
```

For a hosted instance such as Supabase, copy the connection string URI from the project dashboard.

Generate a JWT secret for anything beyond local play:

```
JWT_SECRET=<long random string>
```

### 3. Create the database

```bash
createdb trafficflow    # or: psql -c "CREATE DATABASE trafficflow;"
psql -d trafficflow -f database/schema.sql
psql -d trafficflow -f database/seed.sql
psql -d trafficflow -f database/migrations/001_emergency_response.sql
```

The seed is safe to re-run: it clears and reloads demo data. Traffic record timestamps are generated relative to `NOW()`, so the 24-hour analytics windows always have data.

### 4. Run

```bash
# terminal 1
cd backend && npm run dev        # API on http://localhost:5000

# terminal 2
cd frontend && npm run dev       # app on http://localhost:5173
```

Open http://localhost:5173. Production build:

```bash
cd backend  && npm run build && npm start
cd frontend && npm run build     # static output in frontend/dist
```

## Demo credentials

Created by `database/seed.sql`:

| Role     | Email                     | Password    |
|----------|---------------------------|-------------|
| User     | demo@smartflow.test       | Demo@1234   |
| User     | ananya@smartflow.test     | Demo@1234   |
| Operator | operator@smartflow.test   | Demo@1234   |
| Admin    | admin@smartflow.test      | Admin@2026  |

Operators can access the admin dashboard, signals, emergency simulation and logs. Admins additionally manage users, roads and vehicles.

## Environment variables

### backend/.env

| Variable                  | Description                                        | Default                          |
|---------------------------|----------------------------------------------------|----------------------------------|
| `PORT`                    | API port                                           | `5000`                           |
| `NODE_ENV`                | `development` or `production`                      | `development`                    |
| `DATABASE_URL`            | Postgres connection string                         | -                                |
| `JWT_SECRET`              | Token signing secret                               | -                                |
| `JWT_EXPIRES_IN`          | Token lifetime                                     | `7d`                             |
| `FRONTEND_URL`            | Frontend origin (used in emails/links)             | `http://localhost:5173`          |
| `API_URL`                 | Public API base URL                                | `http://localhost:5000`          |
| `CORS_ORIGINS`            | Comma-separated allowed origins                    | `http://localhost:5173,http://localhost:4173` |
| `UPLOAD_DIR`              | Directory for incident images (relative to backend)| `uploads`                        |
| `UPLOAD_MAX_FILE_SIZE_MB` | Incident photo size limit                          | `5`                              |
| `ROUTING_PROVIDER`        | `osrm` (keyless demo) or `mapbox`                  | `osrm`                           |
| `MAPBOX_TOKEN`            | Mapbox directions token (only for `mapbox`)        | -                                |
| `OSRM_BASE_URL`           | Self-hosted OSRM for production routing            | `https://router.project-osrm.org`|
| `OVERPASS_BASE_URL`       | OpenStreetMap Overpass endpoint for hospitals      | `https://overpass-api.de/api`    |
| `OVERPASS_USER_AGENT`     | Contact string sent to Overpass (required)         | `SmartFlowAI/1.0`                |
| `TRAFFIC_PROVIDER`        | `none` or `tomtom`                                 | `none`                           |
| `TOMTOM_KEY`              | TomTom traffic API key (only for `tomtom`)         | -                                |
| `EMERGENCY_REQUEST_TIMEOUT_MS` | Timeout for provider calls                    | `8000`                           |
| `EMERGENCY_YELLOW_CLEARANCE_S` | Yellow hold before serving a priority request | `4`                              |
| `EMERGENCY_ALL_RED_CLEARANCE_S`| All-red clearance after emergency green       | `2`                              |
| `EMERGENCY_MIN_GREEN_S`   | Minimum emergency green before release             | `30`                             |
| `HOSPITAL_RADIUS_M`       | Default hospital search radius                     | `8000`                           |
| `SIGNAL_ACTUATION_ENABLED`| Physical light control. Keep `false`               | `false`                          |

### frontend/.env

| Variable        | Description                                                                 |
|-----------------|-----------------------------------------------------------------------------|
| `VITE_API_URL`  | API base URL the SPA calls                                                  |
| `VITE_SITE_URL` | Public site URL. Empty locally. When set at build time, the build injects canonical and Open Graph URL tags and generates a `sitemap.xml` with absolute URLs (custom domain support) |

## API overview

All routes live under `/api`. Authenticated routes take a `Bearer` token. Responses follow `{ success, data | message }`.

| Group            | Highlights |
|------------------|------------|
| `GET /health`    | Liveness check |
| `/auth`          | register, login, forgot/reset password (rate limited) |
| `/users/me`      | profile get/update, change password |
| `/traffic`       | overview KPIs, roads, intersections, density |
| `/roads`         | list/get public; create/update/delete admin only |
| `/vehicles`      | registry for operators; `/detections` is public feed |
| `/incidents`     | list/get public; create (multipart image); operator status updates; `/my-reports` |
| `/signals`       | list public; `PUT /:direction` and `/signals-mode` operator only |
| `/emergency`     | events feed, `POST /simulate`, `POST /reset`, analytics |
| `/emergency-response` | plate verify, hospitals, route, sessions, GPS ping, priority request/release, intersections |
| `/notifications` | list, mark read, mark all, delete |
| `/saved-routes`  | user route bookmarks |
| `/admin`         | dashboard, analytics, users (admin), settings |
| `/logs`          | system logs (operator+) |

## Architecture notes

- **Auth**: passwords hashed with bcrypt; JWT issued on login and sent as `Authorization: Bearer`. Roles (`user`, `operator`, `admin`) enforced by middleware on the route table.
- **Validation**: request bodies validated with zod; field errors are returned to forms.
- **Emergency pipeline**: a simulation writes an emergency event; detection records are matched against the vehicle registry; when a plate is verified, the signals controller grants a green corridor on the approaching direction and conflicting directions are held. All steps are visible in the event log and the 3D scene.
- **Simulation**: `frontend/src/simulation` contains a self-contained traffic engine (spawn, queue, signal phases, emergency override) rendered through @react-three/fiber. It reads live signal state from the API so the 3D scene mirrors backend state during an emergency run.
- **Emergency response module**: the Emergency page verifies a number plate against the authorized vehicle registry (`POST /api/emergency-response/verify-plate`) and never grants priority from the plate alone - every session is re-verified server-side before a priority decision. Hospitals come from OpenStreetMap (Overpass), routing from OSRM (self-host via `OSRM_BASE_URL`) or Mapbox with `MAPBOX_TOKEN`. Live traffic is only reported when a provider is configured; otherwise the UI shows an explicit "traffic unavailable" note instead of invented data. Browser GPS (or a clearly labelled simulation mode) feeds the vehicle position; signal priority is decided by the existing simulator respecting yellow clearance, all-red clearance, minimum green and conflicting approaches, with every decision (granted or denied, with reason) stored in `signal_priority_requests` for audit. Physical traffic-light actuation stays disabled unless `SIGNAL_ACTUATION_ENABLED=true` and certified controller hardware is wired up.
- **Uploads**: incident images are stored on disk in `UPLOAD_DIR` and served statically by the API at `/uploads`.
- **Security**: helmet headers, CORS allow-list, rate limiting on auth (20/15min) and API (300/min), 1 MB JSON body cap.

## License

All rights reserved by the author.
