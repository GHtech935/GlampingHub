import { Pool, QueryResultRow } from 'pg';

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set. Please check your .env.local file.');
}

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

export default pool;

// Helper function to run queries
export async function query<T extends QueryResultRow = any>(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text, duration, rows: res.rowCount });
  return res;
}

// Helper function to get a client from the pool
export async function getClient() {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const release = client.release.bind(client);

  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
  }, 5000);

  // Monkey patch the query method to keep track of the last query executed
  client.query = ((...args: any[]) => {
    (client as any).lastQuery = args;
    return (originalQuery as any)(...args);
  }) as any;

  client.release = () => {
    clearTimeout(timeout);
    client.query = originalQuery;
    return release();
  };

  return client;
}

const tableExistenceCache = new Map<string, boolean>();

// Lightweight helper to detect optional tables (e.g. new migrations)
export async function tableExists(tableName: string): Promise<boolean> {
  if (tableExistenceCache.has(tableName)) {
    return tableExistenceCache.get(tableName)!;
  }

  try {
    const result = await pool.query<{ exists: boolean }>(
      'SELECT to_regclass($1) IS NOT NULL AS exists',
      [`public.${tableName}`]
    );

    const exists = !!result.rows[0]?.exists;

    // Cache only positive results so new tables are picked up automatically
    if (exists) {
      tableExistenceCache.set(tableName, true);
    }

    return exists;
  } catch (error) {
    console.error(`tableExists check failed for ${tableName}:`, error);
    return false;
  }
}
