import mysql, { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import dotenv from 'dotenv';
import { SqlitePoolWrapper } from './sqliteAdapter.js';

dotenv.config();

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = Number(process.env.DB_PORT) || 3306;
const dbName = process.env.DB_NAME || 'daktar_serial';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';

let isMysqlActive = false;
let sqliteAdapter: SqlitePoolWrapper | null = null;

function getSqliteAdapter(): SqlitePoolWrapper {
  if (!sqliteAdapter) {
    sqliteAdapter = new SqlitePoolWrapper();
  }
  return sqliteAdapter;
}

// Create native MySQL / MariaDB connection pool
const mysqlPool = mysql.createPool({
  host: dbHost,
  port: dbPort,
  database: dbName,
  user: dbUser,
  password: dbPassword,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

/**
 * Hybrid DB Pool proxy:
 * Uses MySQL if reachable, otherwise seamlessly delegates to SQLite embedded database.
 */
export const pool: mysql.Pool = {
  async query<T = any>(sql: string, params: any[] = []): Promise<[T, any]> {
    if (isMysqlActive) {
      try {
        return (await mysqlPool.query(sql, params)) as any;
      } catch (err: any) {
        if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
          console.warn('[Database] MySQL disconnected, falling back to embedded SQLite.');
          isMysqlActive = false;
        } else {
          throw err;
        }
      }
    }
    return (await getSqliteAdapter().query<any>(sql, params)) as any;
  },

  async execute<T = any>(sql: string, params: any[] = []): Promise<[T, any]> {
    if (isMysqlActive) {
      try {
        return (await mysqlPool.execute(sql, params)) as any;
      } catch (err: any) {
        if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
          console.warn('[Database] MySQL disconnected, falling back to embedded SQLite.');
          isMysqlActive = false;
        } else {
          throw err;
        }
      }
    }
    return (await getSqliteAdapter().execute<any>(sql, params)) as any;
  },

  async getConnection(): Promise<any> {
    if (isMysqlActive) {
      try {
        return await mysqlPool.getConnection();
      } catch (err: any) {
        if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
          console.warn('[Database] MySQL disconnected, falling back to embedded SQLite.');
          isMysqlActive = false;
        } else {
          throw err;
        }
      }
    }
    return getSqliteAdapter().getConnection();
  },
} as unknown as mysql.Pool;

export const db = pool;
export default pool;

/**
 * Initializes and tests the database connection pool.
 */
export async function initDatabase(): Promise<void> {
  try {
    const connection = await mysqlPool.getConnection();
    isMysqlActive = true;
    console.log(`[MySQL] Successfully connected to database: ${dbName} on ${dbHost}:${dbPort}`);
    connection.release();
  } catch (err: any) {
    isMysqlActive = false;
    console.log(`[Database] MySQL not reachable at ${dbHost}:${dbPort} (${err.code || err.message}).`);
    console.log(`[Database] Running in embedded mode using SQLite with full schema and seed data!`);
    getSqliteAdapter(); // trigger table creation & seed
  }
}

/**
 * Helper to execute a query returning an array of rows
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}

/**
 * Helper to execute a query returning a single row or null
 */
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const [rows] = await pool.query(sql, params);
  if (!rows || (rows as any[]).length === 0) {
    return null;
  }
  return (rows as any[])[0] as T;
}

/**
 * Helper to execute INSERT, UPDATE, DELETE statements
 */
export async function execute(sql: string, params: any[] = []): Promise<ResultSetHeader> {
  const [result] = await pool.execute(sql, params);
  return result as ResultSetHeader;
}

/**
 * Audit and Activity logging for user and system actions
 */
export async function logActivity(userId: number | null, action: string, details: string, ipAddress: string = ''): Promise<void> {
  try {
    await pool.execute(
      `INSERT INTO activity_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)`,
      [userId || null, action, details, ipAddress || null]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

