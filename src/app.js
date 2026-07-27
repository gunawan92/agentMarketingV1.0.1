const express = require('express');
const cors = require('cors');
const pipelineRoutes = require('./routes/pipeline.routes');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Allows server-to-server requests and all origins when no allow-list is set.
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', pipelineRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

app.use((err, _req, res, _next) => {
  if (process.env.NODE_ENV === 'production') {
    console.error({
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Internal server error',
      stage: err.stage,
      pipeline_id: err.pipelineId
    });
  } else {
    console.error(err);
  }
  const statusCode = err.statusCode || 500;
  if (err.code === 'PIPELINE_STAGE_FAILED') {
    return res.status(statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: `Pipeline failed at ${err.stage} stage.`,
        pipeline_id: err.pipelineId,
        stage: err.stage,
        details: process.env.NODE_ENV === 'production' ? null : (err.details || null)
      }
    });
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Internal server error',
      details: process.env.NODE_ENV === 'production' ? null : (err.details || null)
    }
  });
});

module.exports = app;
