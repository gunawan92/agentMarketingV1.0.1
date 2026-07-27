const { loadEnvironment } = require('../src/config/environment');

loadEnvironment();

const { query, closePool } = require('../src/services/db.service');
const logger = require('../src/services/logger.service');

const migration = `
CREATE SCHEMA IF NOT EXISTS marketing_ai;

CREATE TABLE IF NOT EXISTS marketing_ai.campaigns (
  id UUID PRIMARY KEY,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  current_stage VARCHAR(32),
  brief JSONB NOT NULL,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_ai.campaign_stages (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES marketing_ai.campaigns(id) ON DELETE CASCADE,
  stage VARCHAR(32) NOT NULL,
  attempt INTEGER NOT NULL,
  status VARCHAR(32) NOT NULL,
  input JSONB NOT NULL,
  output JSONB,
  error JSONB,
  request_id TEXT,
  model VARCHAR(255),
  prompt_checksum VARCHAR(128),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, stage, attempt)
);

CREATE TABLE IF NOT EXISTS marketing_ai.campaign_approvals (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES marketing_ai.campaigns(id) ON DELETE CASCADE,
  stage_run_id UUID NOT NULL REFERENCES marketing_ai.campaign_stages(id) ON DELETE CASCADE,
  decision VARCHAR(32) NOT NULL,
  selected_content_item JSONB,
  note TEXT,
  approved_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_ai.campaign_assets (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES marketing_ai.campaigns(id) ON DELETE CASCADE,
  stage_run_id UUID REFERENCES marketing_ai.campaign_stages(id) ON DELETE SET NULL,
  asset_type VARCHAR(64) NOT NULL,
  storage_url TEXT NOT NULL,
  mime_type VARCHAR(128),
  width INTEGER,
  height INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_ai.publication_jobs (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES marketing_ai.campaigns(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  idempotency_key UUID UNIQUE,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  error JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS campaign_stages_campaign_created_idx ON marketing_ai.campaign_stages (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS publication_jobs_status_scheduled_idx ON marketing_ai.publication_jobs (status, scheduled_at);

ALTER TABLE marketing_ai.campaign_stages ALTER COLUMN request_id TYPE TEXT USING request_id::text;
`;

async function run() {
  try {
    logger.info('database.migration.started', { schema: 'marketing_ai' });
    await query(migration);
    logger.info('database.migration.completed', { schema: 'marketing_ai' });
  } catch (error) {
    logger.error('database.migration.failed', { error });
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

run();
