import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// MySQL connection pool configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'watchwds',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Ensure JSON columns return parsed objects
  typeCast: function (field: any, next: any) {
    if (field.type === 'JSON') {
      const val = field.string();
      if (val === null) return null;
      try { return JSON.parse(val); } catch { return val; }
    }
    return next();
  }
});

export default pool;

/**
 * Execute a query and return rows.
 */
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

/**
 * Execute a query and return the first row or null.
 */
export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Execute an INSERT/UPDATE/DELETE and return the result metadata.
 */
export async function execute(sql: string, params?: any[]): Promise<mysql.ResultSetHeader> {
  const [result] = await pool.execute(sql, params);
  return result as mysql.ResultSetHeader;
}

/**
 * Test the database connection.
 */
export async function testConnection(): Promise<boolean> {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('[MySQL] Connection pool established successfully.');
    return true;
  } catch (err: any) {
    console.error('[MySQL] Connection failed:', err.message);
    return false;
  }
}
