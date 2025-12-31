import sql from "mssql";
import { appConfig } from "../config";

const config: sql.config = {
  user: appConfig.db.user,
  password: appConfig.db.password,
  server: appConfig.db.host,
  port: appConfig.db.port,
  database: appConfig.db.name,
  options: {
    encrypt: appConfig.db.encrypt,
    trustServerCertificate: appConfig.db.trustServerCertificate,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 30000, // 30 seconds
  requestTimeout: 30000, // 30 seconds
};

let pool: sql.ConnectionPool | null = null;
let poolConnect: Promise<sql.ConnectionPool> | null = null;
let isConnecting = false;

export async function getPool(): Promise<sql.ConnectionPool> {
  // If pool exists and is connected, return it
  if (pool && pool.connected) {
    return pool;
  }

  // If pool exists but disconnected, reset it
  if (pool && !pool.connected) {
    // eslint-disable-next-line no-console
    console.log("Pool disconnected, resetting...");
    try {
      await pool.close();
    } catch (e) {
      // Ignore close errors
    }
    pool = null;
    poolConnect = null;
    isConnecting = false;
  }

  // If already connecting, wait for that connection
  if (isConnecting && poolConnect) {
    return await poolConnect;
  }

  // Create new connection
  if (!pool) {
    isConnecting = true;
    pool = new sql.ConnectionPool(config);

    // Setup error handlers
    pool.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('Database pool error:', err);
      pool = null;
      poolConnect = null;
      isConnecting = false;
    });

    poolConnect = pool.connect().then((connectedPool) => {
      isConnecting = false;
      // eslint-disable-next-line no-console
      console.log('Database connection pool established');
      return connectedPool;
    }).catch((error) => {
      pool = null;
      poolConnect = null;
      isConnecting = false;

      // Check for Azure SQL firewall error
      const err = error as Record<string, unknown>;
      if (err.code === 'ELOGIN' ||
        (err.message && String(err.message).includes('firewall')) ||
        (err.originalError && (err.originalError as Record<string, unknown>).code === 'ELOGIN')) {
        // eslint-disable-next-line no-console
        console.error("Azure SQL Database firewall error - IP address not allowed:", error);
      } else {
        // eslint-disable-next-line no-console
        console.error("Database connection failed:", error);
      }
      throw error;
    });
  }

  const connectedPool = await poolConnect;
  if (!connectedPool) {
    throw new Error('Failed to establish database connection');
  }
  return connectedPool;
}

export async function query<T = any>(
  text: string,
  params: Record<string, unknown> = {},
  retries = 3
): Promise<sql.IResult<T>> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const connectedPool = await getPool();
      const request = connectedPool.request();
      Object.entries(params).forEach(([key, value]) => {
        request.input(key, value as sql.ISqlType);
      });
      return await request.query<T>(text);
    } catch (error) {
      lastError = error as Error;
      const isConnectionError = error && typeof error === 'object' &&
        ('code' in error && (error.code === 'ETIMEOUT' || error.code === 'ECONNRESET'));

      // If it's a connection error and we have retries left, reset pool and retry
      if (isConnectionError && attempt < retries - 1) {
        // eslint-disable-next-line no-console
        console.log(`Query failed (attempt ${attempt + 1}/${retries}), resetting pool and retrying...`);

        // Reset pool
        if (pool) {
          try {
            await pool.close();
          } catch (e) {
            // Ignore
          }
          pool = null;
          poolConnect = null;
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 5000)));
        continue;
      }

      // If not a connection error or no retries left, throw
      throw error;
    }
  }

  throw lastError || new Error('Query failed after retries');
}

export async function transaction<T>(
  callback: (tx: sql.Transaction) => Promise<T>,
  isolationLevel?: sql.IIsolationLevel
): Promise<T> {
  const connectedPool = await getPool();
  const tx = new sql.Transaction(connectedPool);
  await tx.begin(isolationLevel);
  try {
    const result = await callback(tx);
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

export type SqlTransaction = sql.Transaction;
