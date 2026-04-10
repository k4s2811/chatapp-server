import pkg from 'pg';
import { ENV_VARS } from './envVars.js';

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
    console.log('Connected to database');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

export default pool;

export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executed', { text, duration, rows: res.rowCount });
    return res;
  } catch (err) {
    console.error('Database query error', { text, error: err.message });
    throw err;
  }
};

