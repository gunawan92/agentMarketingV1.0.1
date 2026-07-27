const { randomUUID } = require('crypto');
const { query } = require('../services/db.service');

async function createCampaign({ brief, createdBy }) {
  const id = randomUUID();
  const result = await query(
    `INSERT INTO marketing_ai.campaigns (id, brief, created_by)
     VALUES ($1, $2::jsonb, $3) RETURNING *`,
    [id, JSON.stringify(brief), createdBy || null]
  );
  return result.rows[0];
}

async function getCampaign(id) {
  const result = await query('SELECT * FROM marketing_ai.campaigns WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function getStageRun(id, campaignId) {
  const result = await query('SELECT * FROM marketing_ai.campaign_stages WHERE id = $1 AND campaign_id = $2', [id, campaignId]);
  return result.rows[0] || null;
}

async function getCampaignDetail(id) {
  const campaign = await getCampaign(id);
  if (!campaign) return null;
  const [stages, approvals, assets, publications] = await Promise.all([
    query('SELECT * FROM marketing_ai.campaign_stages WHERE campaign_id = $1 ORDER BY created_at ASC', [id]),
    query('SELECT * FROM marketing_ai.campaign_approvals WHERE campaign_id = $1 ORDER BY created_at ASC', [id]),
    query('SELECT * FROM marketing_ai.campaign_assets WHERE campaign_id = $1 ORDER BY created_at ASC', [id]),
    query('SELECT * FROM marketing_ai.publication_jobs WHERE campaign_id = $1 ORDER BY created_at ASC', [id])
  ]);
  return { campaign, stages: stages.rows, approvals: approvals.rows, assets: assets.rows, publications: publications.rows };
}

async function createStageRun({ campaignId, stage, input, requestId, model, promptChecksum }) {
  const id = randomUUID();
  const attemptResult = await query(
    'SELECT COALESCE(MAX(attempt), 0) + 1 AS attempt FROM marketing_ai.campaign_stages WHERE campaign_id = $1 AND stage = $2',
    [campaignId, stage]
  );
  const attempt = attemptResult.rows[0].attempt;
  const result = await query(
    `INSERT INTO marketing_ai.campaign_stages
      (id, campaign_id, stage, attempt, status, input, request_id, model, prompt_checksum, started_at)
     VALUES ($1, $2, $3, $4, 'running', $5::jsonb, $6, $7, $8, NOW()) RETURNING *`,
    [id, campaignId, stage, attempt, JSON.stringify(input), requestId || null, model, promptChecksum]
  );
  await query(
    `UPDATE marketing_ai.campaigns SET status = 'in_progress', current_stage = $2, updated_at = NOW() WHERE id = $1`,
    [campaignId, stage]
  );
  return result.rows[0];
}

async function completeStageRun(id, output) {
  const result = await query(
    `UPDATE marketing_ai.campaign_stages
     SET status = 'awaiting_approval', output = $2::jsonb, completed_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, JSON.stringify(output)]
  );
  const stageRun = result.rows[0];
  await query(`UPDATE marketing_ai.campaigns SET status = 'awaiting_approval', updated_at = NOW() WHERE id = $1`, [stageRun.campaign_id]);
  return stageRun;
}

async function failStageRun(id, error) {
  const result = await query(
    `UPDATE marketing_ai.campaign_stages
     SET status = 'failed', error = $2::jsonb, completed_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, JSON.stringify(error)]
  );
  if (result.rows[0]) {
    await query(`UPDATE marketing_ai.campaigns SET status = 'failed', updated_at = NOW() WHERE id = $1`, [result.rows[0].campaign_id]);
  }
  return result.rows[0] || null;
}

async function createApproval({ campaignId, stageRunId, decision, selectedContentItem, note, approvedBy }) {
  const id = randomUUID();
  const result = await query(
    `INSERT INTO marketing_ai.campaign_approvals
      (id, campaign_id, stage_run_id, decision, selected_content_item, note, approved_by)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7) RETURNING *`,
    [id, campaignId, stageRunId, decision, selectedContentItem ? JSON.stringify(selectedContentItem) : null, note || null, approvedBy || null]
  );
  const stageStatus = decision === 'approved' ? 'completed' : 'revision_requested';
  await query('UPDATE marketing_ai.campaign_stages SET status = $2 WHERE id = $1 AND campaign_id = $3', [stageRunId, stageStatus, campaignId]);
  await query(`UPDATE marketing_ai.campaigns SET status = 'awaiting_approval', updated_at = NOW() WHERE id = $1`, [campaignId]);
  return result.rows[0];
}

module.exports = { createCampaign, getCampaign, getCampaignDetail, getStageRun, createStageRun, completeStageRun, failStageRun, createApproval };
