const express = require('express');
const cors = require('cors');
const { randomUUID } = require('crypto');
const path = require('path');
const pipelineRoutes = require('./routes/pipeline.routes');
const wizardRoutes = require('./routes/wizard.routes');
const campaignRoutes = require('./routes/campaign.routes');
const logger = require('./services/logger.service');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin || allowedOrigins.includes('*') || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
    return true;
  }

  // Local frontends often move between Vite/Next ports during development.
  if (process.env.NODE_ENV !== 'production') {
    try {
      const hostname = new URL(origin).hostname;
      return hostname === 'localhost' || hostname === '127.0.0.1';
    } catch (_error) {
      return false;
    }
  }

  return false;
}

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    logger.warn('cors.origin.rejected', { origin, allowedOrigins });
    return callback(new Error('Origin is not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));
app.use('/storage', express.static(path.join(process.cwd(), 'storage')));
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || randomUUID();
  req.requestId = requestId;
  const startedAt = Date.now();

  logger.info('http.request.started', {
    requestId,
    method: req.method,
    path: req.originalUrl
  });
  res.setHeader('X-Request-Id', requestId);
  res.on('finish', () => {
    logger.info('http.request.completed', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt
    });
  });
  next();
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', pipelineRoutes);
app.use('/api/wizard', wizardRoutes);
app.use('/api/campaigns', campaignRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

app.use((err, _req, res, _next) => {
  if (err.name === 'MulterError') {
    err.statusCode = 400;
  }
  logger.error('http.request.failed', {
    requestId: _req.requestId,
    method: _req.method,
    path: _req.originalUrl,
    statusCode: err.statusCode || 500,
    error: err
  });
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    error: err.code === 'PIPELINE_STAGE_FAILED' ? `Pipeline failed at ${err.stage} stage.` : (err.message || 'Internal server error'),
    code: err.code || 'INTERNAL_ERROR',
    ...(err.pipelineId ? { pipelineId: err.pipelineId, stage: err.stage } : {}),
    ...(process.env.NODE_ENV !== 'production' && err.details ? { details: err.details } : {})
  });
});

module.exports = app;
