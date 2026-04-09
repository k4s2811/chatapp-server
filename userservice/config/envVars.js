import dotenv from "dotenv";
dotenv.config();

export const ENV_VARS = {
  DB: {
    PORT: process.env.PORT || 3001,
    USER: process.env.USER,
    HOST: process.env.HOST,
    DATABASE: process.env.DATABASE,
    PASSWORD: process.env.PASSWORD,
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

  SECURITY: {
    cookieSecret: process.env.COOKIE_SECRET
  },

  RATE_LIMIT: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
  }
};


