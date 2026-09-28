const { Pool } = require('pg');

let pool = null;
let isConnected = false;
let dbMode = 'uninitialized';

const connectDB = async () => {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.PG_URI;

  if (!connectionString) {
    console.warn('\n⚠️ [Database] DATABASE_URL not set. Running in local in-memory fallback mode.');
    console.warn('   To use PostgreSQL, set DATABASE_URL in your .env or Render dashboard.\n');
    isConnected = false;
    dbMode = 'in-memory-fallback';
    return { isConnected: false, mode: dbMode };
  }

  try {
    const isProduction = process.env.NODE_ENV === 'production' || connectionString.includes('render.com') || connectionString.includes('supabase') || connectionString.includes('neon.tech');

    pool = new Pool({
      connectionString,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000,
    });

    // Test connection
    const client = await pool.connect();
    
    // Auto-create tasks table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(120) NOT NULL,
        description TEXT DEFAULT '',
        status VARCHAR(20) DEFAULT 'todo',
        priority VARCHAR(20) DEFAULT 'medium',
        due_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_status_priority 
      ON tasks (status, priority, created_at DESC);
    `);

    client.release();
    isConnected = true;
    dbMode = 'postgresql';
    console.log(`\n✅ [Database] PostgreSQL Connected successfully! Schema initialized.`);
    return { isConnected: true, mode: dbMode };
  } catch (error) {
    console.warn(`\n⚠️ [Database] Could not connect to PostgreSQL (${error.message}).`);
    console.warn('   Operating in local in-memory fallback mode so the server remains fully functional.\n');
    isConnected = false;
    dbMode = 'in-memory-fallback';
    pool = null;
    return { isConnected: false, mode: dbMode, error: error.message };
  }
};

const query = async (text, params) => {
  if (!pool || !isConnected) {
    throw new Error('Database pool not connected');
  }
  return pool.query(text, params);
};

const getDbStatus = () => ({
  type: 'PostgreSQL',
  isConnected,
  mode: dbMode,
  databaseName: isConnected ? 'postgresql' : 'in-memory',
});

module.exports = {
  connectDB,
  query,
  getDbStatus,
};
