import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: parseInt(process.env.PORT ?? '5000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  db: {
    databaseUrl:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@127.0.0.1:5432/trafficflow',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  apiUrlBase: process.env.API_URL ?? 'http://localhost:5000',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:4173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  upload: {
    maxFileSizeMb: parseInt(process.env.UPLOAD_MAX_FILE_SIZE_MB ?? '5', 10),
    dir: process.env.UPLOAD_DIR ?? 'uploads',
  },
  // ---------- emergency response (external providers) ----------
  // Routing/mapping uses free, keyless providers (Nominatim search, OSRM
  // routing, Overpass hospital search) so the feature works out of the box.
  // Configure the optional traffic provider to get live traffic-aware ETAs.
  emergency: {
    // 'osrm' (default, keyless public demo router) or 'mapbox' with a token.
    routingProvider: process.env.ROUTING_PROVIDER ?? 'osrm',
    mapboxToken: process.env.MAPBOX_TOKEN ?? '',
    osrmBaseUrl: process.env.OSRM_BASE_URL ?? 'https://router.project-osrm.org',
    geocodingBaseUrl: process.env.GEOCODING_BASE_URL ?? 'https://nominatim.openstreetmap.org',
    overpassBaseUrl: process.env.OVERPASS_BASE_URL ?? 'https://overpass-api.de/api',
    overpassUserAgent: process.env.OVERPASS_USER_AGENT ?? 'SmartFlowAI/1.0 (traffic management demo)',
    // Optional live traffic data; see the TomTom key note in .env.example.
    trafficProvider: process.env.TRAFFIC_PROVIDER ?? 'none',
    tomtomKey: process.env.TOMTOM_KEY ?? '',
    requestTimeoutMs: parseInt(process.env.PROVIDER_TIMEOUT_MS ?? '8000', 10),
    // Clearances (seconds) honored by the priority controller.
    yellowClearanceSeconds: parseInt(process.env.EMERGENCY_YELLOW_SECONDS ?? '4', 10),
    allRedClearanceSeconds: parseInt(process.env.EMERGENCY_ALL_RED_SECONDS ?? '2', 10),
    minGreenSeconds: parseInt(process.env.EMERGENCY_MIN_GREEN_SECONDS ?? '30', 10),
    // search radius in meters when looking for nearby hospitals
    hospitalRadiusM: parseInt(process.env.HOSPITAL_RADIUS_M ?? '8000', 10),
  },
  // Master safety switch: physical signal actuation stays off unless an
  // authorized integration sets this to true (see constants/domain.ts).
  signalActuationEnabled: process.env.SIGNAL_ACTUATION_ENABLED === 'true',
};

export const isDev = env.nodeEnv !== 'production';
export const isSupabase = /supabase\.(co|com)/.test(env.db.databaseUrl);
