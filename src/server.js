const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const logger = require('./services/logger.service');

// Load shared values first, then override them with the active environment file.
dotenv.config({ path: path.join(process.cwd(), '.env') });
const environment = process.env.NODE_ENV || 'development';
const environmentFile = path.join(process.cwd(), `.env.${environment}`);
if (fs.existsSync(environmentFile)) {
  dotenv.config({ path: environmentFile, override: true });
}

const app = require('./app');
const { getModel, getApiKeyStatus } = require('./services/ai.service');
const { closePool } = require('./services/db.service');

const port = Number(process.env.PORT) || 3000;
logger.info('server.configuration.loaded', {
  environment,
  environmentFile: fs.existsSync(environmentFile) ? path.basename(environmentFile) : null,
  port,
  model: getModel(),
  apiKeyStatus: getApiKeyStatus(),
  hasBaseUrl: Boolean(process.env.OPENAI_BASE_URL)
});

const server = app.listen(port, () => {
  logger.info('server.started', { port, environment, pid: process.pid });
});

server.on('error', (error) => {
  logger.error('server.error', { error });
  // A listen failure leaves no server handle to keep Node alive; mark it as failed.
  process.exitCode = 1;
});

function shutdown(signal) {
  logger.info('server.shutdown.requested', { signal });
  server.close(async (error) => {
    if (error) {
      logger.error('server.shutdown.failed', { signal, error });
      process.exitCode = 1;
      return;
    }
    await closePool();
    logger.info('server.stopped', { signal });
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error('process.unhandled_rejection', { reason: String(reason) });
});
process.on('uncaughtException', (error) => {
  logger.error('process.uncaught_exception', { error });
  process.exitCode = 1;
  shutdown('uncaughtException');
});
