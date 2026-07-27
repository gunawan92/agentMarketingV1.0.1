const { generateJson } = require('../services/ai.service');
const { loadSkill } = require('../services/skill.service');
const logger = require('../services/logger.service');

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function requireString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw badRequest(`${field} is required and must be a non-empty string.`);
  return value.trim();
}

function requireObject(value, field) {
  if (!value || Array.isArray(value) || typeof value !== 'object') throw badRequest(`${field} is required and must be an object.`);
  return value;
}

function normalizeSelectedContentItem(value) {
  const item = requireObject(value, 'selectedContentItem');
  // Strategy v1 returns `cta_direction`; the earlier wizard contract used
  // `call_to_action`. Accept both, then pass one stable field downstream.
  const callToAction = item.call_to_action ?? item.cta_direction;
  return {
    ...item,
    call_to_action: requireString(callToAction, 'selectedContentItem.call_to_action or selectedContentItem.cta_direction')
  };
}

async function runStage({ requestId, stage, skillFile, input }) {
  logger.info('wizard.stage.started', { requestId, stage, inputFields: Object.keys(input) });
  const systemPrompt = await loadSkill(skillFile);
  const output = await generateJson({ systemPrompt, userPrompt: JSON.stringify(input), stage });
  logger.info('wizard.stage.completed', { requestId, stage, outputKeys: Object.keys(output) });
  return output;
}

async function strategy(req, res, next) {
  try {
    const { campaignBrief, targetAudience, campaignDuration, ...context } = req.body || {};
    const input = {
      campaignBrief: requireString(campaignBrief, 'campaignBrief'),
      targetAudience: requireString(targetAudience, 'targetAudience'),
      campaignDuration: requireString(campaignDuration, 'campaignDuration'),
      context
    };
    const output = await runStage({ requestId: req.requestId, stage: 'strategy', skillFile: 'agent-strategy.md', input });
    return res.status(200).json({ stage: 'strategy', strategy: output });
  } catch (error) {
    logger.error('wizard.stage.failed', { requestId: req.requestId, stage: 'strategy', errorName: error.name, errorMessage: error.message });
    return next(error);
  }
}

async function copy(req, res, next) {
  try {
    const { campaignBrief, strategy: strategyOutput, selectedContentItem, platform, toneOfVoice, language, ...context } = req.body || {};
    const selectedItem = normalizeSelectedContentItem(selectedContentItem);
    requireString(selectedItem.main_angle, 'selectedContentItem.main_angle');
    requireString(selectedItem.format, 'selectedContentItem.format');
    const input = {
      campaignBrief: requireString(campaignBrief, 'campaignBrief'),
      strategy: requireObject(strategyOutput, 'strategy'),
      selectedContentItem: selectedItem,
      platform: requireString(platform, 'platform'),
      toneOfVoice: requireString(toneOfVoice, 'toneOfVoice'),
      language: requireString(language, 'language'),
      context
    };
    const output = await runStage({ requestId: req.requestId, stage: 'copywriter', skillFile: 'agent-copywriter.md', input });
    return res.status(200).json({ stage: 'copywriter', copy: output });
  } catch (error) {
    logger.error('wizard.stage.failed', { requestId: req.requestId, stage: 'copywriter', errorName: error.name, errorMessage: error.message });
    return next(error);
  }
}

async function design(req, res, next) {
  try {
    const { copy: copyOutput, assetDimension, ...context } = req.body || {};
    const input = { copy: requireObject(copyOutput, 'copy'), assetDimension: requireString(assetDimension, 'assetDimension'), context };
    const output = await runStage({ requestId: req.requestId, stage: 'design', skillFile: 'agent-design.md', input });
    return res.status(200).json({ stage: 'design', design: output });
  } catch (error) {
    logger.error('wizard.stage.failed', { requestId: req.requestId, stage: 'design', errorName: error.name, errorMessage: error.message });
    return next(error);
  }
}

async function publisher(req, res, next) {
  try {
    const { copy: copyOutput, visualAsset, platform, timezone, ...context } = req.body || {};
    const input = {
      copy: requireObject(copyOutput, 'copy'),
      visualAsset: requireObject(visualAsset, 'visualAsset'),
      platform: requireString(platform, 'platform'),
      timezone: requireString(timezone, 'timezone'),
      context
    };
    const output = await runStage({ requestId: req.requestId, stage: 'publisher', skillFile: 'agent-publisher.md', input });
    return res.status(200).json({ stage: 'publisher', publication: output });
  } catch (error) {
    logger.error('wizard.stage.failed', { requestId: req.requestId, stage: 'publisher', errorName: error.name, errorMessage: error.message });
    return next(error);
  }
}

async function ads(req, res, next) {
  try {
    const { copy: copyOutput, visualAsset, budget, ...context } = req.body || {};
    const input = {
      copy: requireObject(copyOutput, 'copy'),
      visualAsset: requireObject(visualAsset, 'visualAsset'),
      budget: requireObject(budget, 'budget'),
      context
    };
    const output = await runStage({ requestId: req.requestId, stage: 'ads', skillFile: 'agent-ads.md', input });
    return res.status(200).json({ stage: 'ads', ads: output });
  } catch (error) {
    logger.error('wizard.stage.failed', { requestId: req.requestId, stage: 'ads', errorName: error.name, errorMessage: error.message });
    return next(error);
  }
}

async function crm(req, res, next) {
  try {
    const { analytics, customerTrigger, campaignContext, ...context } = req.body || {};
    if (!analytics && !customerTrigger) throw badRequest('analytics or customerTrigger is required.');
    const input = {
      ...(analytics ? { analytics: requireObject(analytics, 'analytics') } : {}),
      ...(customerTrigger ? { customerTrigger: requireObject(customerTrigger, 'customerTrigger') } : {}),
      ...(campaignContext ? { campaignContext: requireObject(campaignContext, 'campaignContext') } : {}),
      context
    };
    const output = await runStage({ requestId: req.requestId, stage: 'crm', skillFile: 'agent-crm.md', input });
    return res.status(200).json({ stage: 'crm', crm: output });
  } catch (error) {
    logger.error('wizard.stage.failed', { requestId: req.requestId, stage: 'crm', errorName: error.name, errorMessage: error.message });
    return next(error);
  }
}

module.exports = { strategy, copy, design, publisher, ads, crm };
