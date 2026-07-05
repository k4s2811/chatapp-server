import pkg from "pg";
import { ENV_VARS } from "./envVars.js";
import logger from "../utils/logger.js";

const { Pool } = pkg;

const isProduction = ENV_VARS.NODE_ENV === "production";

const pool = new Pool({
  connectionString: isProduction
    ? ENV_VARS.DATABASE_URL
    : undefined,

  user: !isProduction ? ENV_VARS.DB.USER : undefined,
  host: !isProduction ? ENV_VARS.DB.HOST : undefined,
  database: !isProduction ? ENV_VARS.DB.DATABASE : undefined,
  password: !isProduction ? ENV_VARS.DB.PASSWORD : undefined,
  port: !isProduction ? ENV_VARS.DB.PORT : undefined,

  ssl: isProduction
    ? {
      rejectUnauthorized: ENV_VARS.DB.SSL_REJECT_UNAUTHORIZED,
    }
    : false,

  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("connect", () => {
  logger.info("Connected to PostgreSQL");
});

pool.on("error", (err) => {
  logger.error("Unexpected error on idle client", err);
});

export default pool;

export const query = async (text, params) => {
  const start = Date.now();

  try {
    const res = await pool.query(text, params);

    const duration = Date.now() - start;

    logger.info("Query executed", {
      duration,
      rows: res.rowCount,
    });

    return res;
  } catch (err) {
    logger.error("Database query error", {
      error: err.message,
    });

    throw err;
  }
};