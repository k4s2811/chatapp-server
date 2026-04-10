import pkg from 'pg';
import { ENV_VARS } from "../config/envVars.js";

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


export const migrate = async () => {
    const client = await pool.connect();
    try {
        console.log('Running migrations...');

        await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
        await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email       VARCHAR(255) UNIQUE NOT NULL,
        username    VARCHAR(50) NOT NULL,
        password    VARCHAR(255) NOT NULL,
        role        VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        is_verified BOOLEAN NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

        await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token       VARCHAR(512) UNIQUE NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        revoked     BOOLEAN NOT NULL DEFAULT FALSE,
        ip_address  INET,
        user_agent  TEXT
      );
    `);

        await client.query(`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token       VARCHAR(256) UNIQUE NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        used        BOOLEAN NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

        await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token       VARCHAR(256) UNIQUE NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        used        BOOLEAN NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

        await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
        action      VARCHAR(100) NOT NULL,
        ip_address  INET,
        user_agent  TEXT,
        metadata    JSONB,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

        // Indexes (IF NOT EXISTS supported via DO block)
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
            'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
            'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)',
            'CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id ON verification_tokens(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)',
        ];
        for (const idx of indexes) await client.query(idx);

        // Trigger function
        await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

        // Trigger (only create if not exists)
        await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at'
        ) THEN
          CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$;
    `);

        console.log(' Migrations completed successfully.');
    } catch (err) {
        console.error(' Migration failed:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
};

