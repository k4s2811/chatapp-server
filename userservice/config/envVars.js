import dotenv from "dotenv";
dotenv.config();

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5100";

// Comma-separated allowlist of origins permitted to send credentialed requests.
// Defaults to the configured client URL.
const CORS_ORIGINS = (process.env.CORS_ORIGINS || CLIENT_URL)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export const ENV_VARS = {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  SERVICE_NAME: process.env.SERVICE_NAME,
  LOG_LEVEL: process.env.LOG_LEVEL,
  DATABASE_URL: process.env.DATABASE_URL,

  CLIENT_URL,
  CORS_ORIGINS,

  DB: {
    PORT: process.env.PG_DBPORT,
    USER: process.env.PG_USER,
    HOST: process.env.PG_HOST,
    DATABASE: process.env.PG_DATABASE,
    PASSWORD: process.env.PG_PASSWORD,
    ENV: process.env.NODE_ENV || 'development',
    // Default to verifying the DB server's TLS certificate. Only disable by
    // explicitly setting PG_SSL_REJECT_UNAUTHORIZED=false (e.g. self-signed certs).
    SSL_REJECT_UNAUTHORIZED: process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false',
  },

  JWT: {
    ACCESS_SECRET: process.env.ACCESS,
    REFRESH_SECRET: process.env.REFRESH,
    ACCESS_TOKEN_EXPIRES: process.env.ACCESS_EXPIRES,
    REFRESH_TOKEN_EXPIRES: process.env.REFRESH_EXPIRES,
  },

  EMAIL: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    USER: process.env.EMAIL_USER,
    PASSWORD: process.env.EMAIL_PASSWORD,
    FROM: process.env.EMAIL_FROM
  },

  OAUTH: {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
  },

  SECURITY: {
    cookieSecret: process.env.COOKIE_SECRET
  },

  RATE_LIMIT: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
  }
};

// Fail fast if signing secrets are missing — otherwise tokens are signed/verified
// with `undefined`, silently breaking auth and security guarantees.
const requiredSecrets = {
  ACCESS: ENV_VARS.JWT.ACCESS_SECRET,
  REFRESH: ENV_VARS.JWT.REFRESH_SECRET,
};
const missing = Object.entries(requiredSecrets)
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missing.length) {
  throw new Error(`Missing required JWT secret env var(s): ${missing.join(", ")}`);
}
