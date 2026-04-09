import pkg from 'pg';
import { ENV_VARS } from "./envVars.js";

const { Pool } = pkg;

const pool = new Pool({
    user: ENV_VARS.DB_USER,
    host: ENV_VARS.DB_HOST,
    database: ENV_VARS.DB_NAME,
    password: ENV_VARS.DB_PASSWORD,
    port: ENV_VARS.DB_PORT,
});

pool.on('connect', () => {
    console.log('Connected to database');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

export default pool;
