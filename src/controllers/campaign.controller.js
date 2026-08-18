const crypto = require('crypto');
const repository = require('../repositories/campaign.repository');
const { generateJson, getModel } = require('../services/ai.service');
const { loadSkill } = require('../services/skill.service');
const logger = require('../services/logger.service');

const stages = {
  strategy: 'agent-strategy.md',
  copywriter: 'agent-copywriter.md',
  design: 'agent-design.md',
  publisher: 'agent-publisher.md',
  ads: 'agent-ads.md',
  crm: 'agent-crm.md'
};

function badRequest(message) { const error = new Error(message); error.statusCode = 400; return error; }
function notFound(message) { const error = new Error(message); error.statusCode = 404; return error; }
function requireObject(value, field) {
  if (!value || Array.isArray(value) || typeof value !== 'object') throw badRequest(`${field} is required and must be an object.`);
  return value;
}

function startJsonHeartbeat(res) {
  res.status(200);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  const timer = setInterval(() => {
    if (!res.destroyed && !res.writableEnded) res.write(' ');
  }, 10000);
  timer.unref();
  return () => clearInterval(timer);
}

async function assertCampaignAndStage(campaignId, stageRunId) {
  if (!await repository.getCampaign(campaignId)) throw notFound('Campaign not found.');
  if (stageRunId && !await repository.getStageRun(stageRunId, campaignId)) throw notFound('Stage run not found for this campaign.');
}

async function create(req, res, next) {
  try {
    const { brief, createdBy } = req.body || {};
    const campaign = await repository.createCampaign({ brief: requireObject(brief, 'brief'), createdBy });
    logger.info('campaign.created', { campaignId: campaign.id, requestId: req.requestId });
    return res.status(201).json({ campaign });
  } catch (error) { return next(error); }
}

async function detail(req, res, next) {
  try {
    const result = await repository.getCampaignDetail(req.params.campaignId);
    if (!result) throw notFound('Campaign not found.');
    logger.info('campaign.resumed', { campaignId: req.params.campaignId, requestId: req.requestId, stageCount: result.stages.length });
    return res.json(result);
  } catch (error) { return next(error); }
}

async function runStage(req, res, next) {
  let stageRun;
  let stopHeartbeat;
  try {
    const { campaignId, stage } = req.params;
    const skillFile = stages[stage];
    if (!skillFile) throw badRequest(`Unsupported stage: ${stage}.`);
    const campaign = await repository.getCampaign(campaignId);
    if (!campaign) throw notFound('Campaign not found.');
    const input = requireObject(req.body?.input, 'input');
    const systemPrompt = await loadSkill(skillFile);
    const promptChecksum = crypto.createHash('sha256').update(systemPrompt).digest('hex');
    stageRun = await repository.createStageRun({
      campaignId,
      stage,
      input,
      requestId: req.requestId,
      model: getModel(),
      promptChecksum
    });
    logger.info('campaign.stage.started', { campaignId, stage, stageRunId: stageRun.id, attempt: stageRun.attempt, requestId: req.requestId });
    // Free AI routes can take several minutes. Send JSON-safe whitespace so
    // browsers and reverse proxies do not close an otherwise idle connection.
    stopHeartbeat = startJsonHeartbeat(res);
    const output = await generateJson({ systemPrompt, userPrompt: JSON.stringify(input), stage });
    const completed = await repository.completeStageRun(stageRun.id, output);
    logger.info('campaign.stage.completed', { campaignId, stage, stageRunId: completed.id, attempt: completed.attempt });
    stopHeartbeat();
    return res.end(JSON.stringify({ campaignId, stageRun: completed, output }));
  } catch (error) {
    if (stopHeartbeat) stopHeartbeat();
    if (stageRun) await repository.failStageRun(stageRun.id, { name: error.name, message: error.message });
    logger.error('campaign.stage.failed', { campaignId: req.params.campaignId, stage: req.params.stage, stageRunId: stageRun?.id, error });
    if (res.headersSent) {
      return res.end(JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        code: error.code || 'INTERNAL_ERROR'
      }));
    }
    return next(error);
  }
}

async function approve(req, res, next) {
  try {
    const { campaignId } = req.params;
    if (!await repository.getCampaign(campaignId)) throw notFound('Campaign not found.');
    const { stageRunId, decision, selectedContentItem, note, approvedBy } = req.body || {};
    if (!['approved', 'rejected', 'revision_requested'].includes(decision)) throw badRequest('decision must be approved, rejected, or revision_requested.');
    if (typeof stageRunId !== 'string' || !stageRunId) throw badRequest('stageRunId is required.');
    if (!await repository.getStageRun(stageRunId, campaignId)) throw notFound('Stage run not found for this campaign.');
    const approval = await repository.createApproval({ campaignId, stageRunId, decision, selectedContentItem, note, approvedBy });
    logger.info('campaign.approved', { campaignId, stageRunId, decision, requestId: req.requestId });
    return res.status(201).json({ approval });
  } catch (error) { return next(error); }
}

async function uploadAsset(req, res, next) {
  try {
    const { campaignId } = req.params;
    const { stageRunId, altText, assetType = 'social_image' } = req.body || {};
    if (!req.file) throw badRequest('asset file is required.');
    await assertCampaignAndStage(campaignId, stageRunId);
    const storageUrl = `${req.protocol}://${req.get('host')}/storage/campaign-assets/${req.file.filename}`;
    const asset = await repository.createAsset({
      campaignId,
      stageRunId,
      assetType,
      storageUrl,
      mimeType: req.file.mimetype,
      metadata: { originalName: req.file.originalname, size: req.file.size, altText: altText || '' }
    });
    logger.info('campaign.asset.uploaded', { campaignId, assetId: asset.id, stageRunId, mimeType: req.file.mimetype, size: req.file.size });
    return res.status(201).json({ asset });
  } catch (error) { return next(error); }
}

async function attachAssetUrl(req, res, next) {
  try {
    const { campaignId } = req.params;
    const { stageRunId, storageUrl, altText, assetType = 'social_image' } = req.body || {};
    if (typeof storageUrl !== 'string' || !storageUrl.trim()) throw badRequest('storageUrl is required.');
    let parsedUrl;
    try { parsedUrl = new URL(storageUrl); } catch (_error) { throw badRequest('storageUrl must be a valid URL.'); }
    if (!/^https?:$/.test(parsedUrl.protocol) || !/\.(png|jpe?g|webp|gif|avif)$/i.test(parsedUrl.pathname)) {
      throw badRequest('storageUrl must point directly to an image file (PNG, JPEG, WebP, GIF, or AVIF), not a landing page.');
    }
    await assertCampaignAndStage(campaignId, stageRunId);
    const asset = await repository.createAsset({
      campaignId, stageRunId, assetType, storageUrl: parsedUrl.toString(),
      metadata: { altText: altText || '', source: 'external_url' }
    });
    logger.info('campaign.asset.url_attached', { campaignId, assetId: asset.id, stageRunId });
    return res.status(201).json({ asset });
  } catch (error) { return next(error); }
}

module.exports = { create, detail, runStage, approve, uploadAsset, attachAssetUrl };
