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
    const output = await generateJson({ systemPrompt, userPrompt: JSON.stringify(input), stage });
    const completed = await repository.completeStageRun(stageRun.id, output);
    logger.info('campaign.stage.completed', { campaignId, stage, stageRunId: completed.id, attempt: completed.attempt });
    return res.status(200).json({ campaignId, stageRun: completed, output });
  } catch (error) {
    if (stageRun) await repository.failStageRun(stageRun.id, { name: error.name, message: error.message });
    logger.error('campaign.stage.failed', { campaignId: req.params.campaignId, stage: req.params.stage, stageRunId: stageRun?.id, error });
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

module.exports = { create, detail, runStage, approve };
