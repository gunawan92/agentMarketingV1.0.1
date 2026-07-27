const { Pool } = require('pg');
const logger = require('./logger.service');

let pool;

function getPositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getDatabaseConfig() {
  if (process.env.DATABASE_URL) return { connectionString: process.env.DATABASE_URL };
  return {
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT) || 5432,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD
  };
}

function hasDatabaseConfig() {
  const config = getDatabaseConfig();
  return Boolean(config.connectionString || (config.host && config.database && config.user));
}

function getPool() {
  if (!hasDatabaseConfig()) {
    const error = new Error('PostgreSQL is not configured. Set DATABASE_URL or PGHOST, PGDATABASE, and PGUSER.');
    error.statusCode = 500;
    throw error;
  }

  if (!pool) {
    const config = getDatabaseConfig();
    const poolMax = getPositiveInteger(process.env.PGPOOL_MAX, 5);
    pool = new Pool({
      ...config,
      max: poolMax,
      idleTimeoutMillis: getPositiveInteger(process.env.PG_IDLE_TIMEOUT_MS, 30000),
      connectionTimeoutMillis: getPositiveInteger(process.env.PG_CONNECTION_TIMEOUT_MS, 10000)
    });
    pool.on('error', (error) => logger.error('database.pool.error', { error }));
    logger.info('database.pool.initialized', {
      host: config.host || 'DATABASE_URL',
      database: config.database || 'DATABASE_URL',
      port: config.port || null,
      poolMax
    });
  }
  return pool;
}

async function query(text, params = []) {
  const startedAt = Date.now();
  try {
    const result = await getPool().query(text, params);
    logger.info('database.query.completed', { durationMs: Date.now() - startedAt, rowCount: result.rowCount });
    return result;
  } catch (error) {
    logger.error('database.query.failed', { durationMs: Date.now() - startedAt, error });
    throw error;
  }
}

async function closePool() {
  if (pool) await pool.end();
}

module.exports = { getPool, query, closePool, hasDatabaseConfig };
