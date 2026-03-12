import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS drafts (
      id SERIAL PRIMARY KEY,
      prompt TEXT NOT NULL,
      model TEXT NOT NULL,
      ratio TEXT NOT NULL,
      image_url TEXT NOT NULL,
      posted BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS gemini_key_usage (
      id SERIAL PRIMARY KEY,
      model TEXT NOT NULL,
      key_slot INTEGER NOT NULL,
      usage_count INTEGER NOT NULL DEFAULT 0,
      UNIQUE(model, key_slot)
    );
  `);
}
