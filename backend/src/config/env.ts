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
};

export const isDev = env.nodeEnv !== 'production';
export const isSupabase = /supabase\.(co|com)/.test(env.db.databaseUrl);
