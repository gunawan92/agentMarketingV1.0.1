const { Client } = require('pg');
const logger = require('../src/services/logger.service');
const { loadEnvironment } = require('../src/config/environment');

loadEnvironment();

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function run() {
  const database = process.env.PGDATABASE;
  if (!database) throw new Error('PGDATABASE is required.');
  const client = new Client({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: 'postgres'
  });

  try {
    await client.connect();
    const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
    if (existing.rowCount) {
      logger.info('database.create.skipped', { database, reason: 'already_exists' });
      return;
    }
    await client.query(`CREATE DATABASE ${quoteIdentifier(database)}`);
    logger.info('database.created', { database });
  } catch (error) {
    logger.error('database.create.failed', { database, error });
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
