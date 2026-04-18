import dotenv from "dotenv";
dotenv.config();

export const ENV_VARS = {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  DB: {
    PORT: process.env.PG_DBPORT,
    USER: process.env.PG_USER,
    HOST: process.env.PG_HOST,
    DATABASE: process.env.PG_DATABASE,
    PASSWORD: process.env.PG_PASSWORD,
    ENV: process.env.NODE_ENV || 'development',
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


