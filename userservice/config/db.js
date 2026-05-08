import pkg from 'pg';
import { ENV_VARS } from './envVars.js';
import logger from "../utils/logger.js";

const { Pool } = pkg;

const pool = new Pool({
  user: ENV_VARS.DB.USER,
  host: ENV_VARS.DB.HOST,
  database: ENV_VARS.DB.DATABASE,
  password: ENV_VARS.DB.PASSWORD,
  port: ENV_VARS.DB.PORT,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  logger.info("Connected to PostgreSQL");
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
});

export default pool;

export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.info("Query executed", { duration, rows: res.rowCount });
    return res;
  } catch (err) {
    logger.error("Database query error", { error: err.message });
    throw err;
  }
};

