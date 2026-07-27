<<<<<<< HEAD
const path = require('path');
const fs = require('fs/promises');
const { generateJson } = require('../services/ai.service');
const logger = require('../services/logger.service');
=======
const { generateCampaignPipeline } = require('../services/pipeline.service');
const AppError = require('../utils/app-error');
>>>>>>> 94a9071b743c6db25f8fd911589bff10ba051f7c

function validateCampaignRequest(body) {
  if (!body || typeof body.campaignBrief !== 'string') {
    throw new AppError('campaignBrief is required and must be a string.', {
      code: 'VALIDATION_ERROR',
      statusCode: 400
    });
  }

<<<<<<< HEAD
  try {
    const skill = await fs.readFile(path.join(skillsDirectory, safeFileName), 'utf8');
    logger.info('pipeline.skill.loaded', { skill: safeFileName, characters: skill.length });
    return skill;
  } catch (cause) {
    const error = new Error(`Unable to load skill: ${safeFileName}`);
    error.statusCode = 500;
    error.details = cause.message;
    throw error;
=======
  const campaignBrief = body.campaignBrief.trim();
  if (campaignBrief.length < 20 || campaignBrief.length > 20000) {
    throw new AppError('campaignBrief must contain between 20 and 20000 characters.', {
      code: 'VALIDATION_ERROR',
      statusCode: 400
    });
>>>>>>> 94a9071b743c6db25f8fd911589bff10ba051f7c
  }

  return { ...body, campaignBrief };
}

async function generateCampaign(req, res, next) {
  try {
<<<<<<< HEAD
    const { campaignBrief, ...context } = req.body || {};
    if (typeof campaignBrief !== 'string' || !campaignBrief.trim()) {
      const error = new Error('campaignBrief is required and must be a non-empty string.');
      error.statusCode = 400;
      throw error;
    }

    logger.info('pipeline.started', {
      requestId: req.requestId,
      contextFields: Object.keys(context),
      briefLength: campaignBrief.trim().length
    });

    const strategyPrompt = await loadSkill('agent-strategy.md');
    const strategy = await generateJson({
      systemPrompt: strategyPrompt,
      userPrompt: JSON.stringify({ campaignBrief: campaignBrief.trim(), context }),
      stage: 'strategy'
    });

    const copywriterPrompt = await loadSkill('agent-copywriter.md');
    const copy = await generateJson({
      systemPrompt: copywriterPrompt,
      userPrompt: JSON.stringify({
        originalRequest: { campaignBrief: campaignBrief.trim(), context },
        strategy
      }),
      stage: 'copywriter'
    });

    logger.info('pipeline.completed', {
      requestId: req.requestId,
      strategyKeys: Object.keys(strategy),
      copyKeys: Object.keys(copy)
    });

    return res.status(200).json({ strategy, copy });
=======
    const input = validateCampaignRequest(req.body);
    const data = await generateCampaignPipeline(input);
    return res.status(200).json({ success: true, data });
>>>>>>> 94a9071b743c6db25f8fd911589bff10ba051f7c
  } catch (error) {
    logger.error('pipeline.failed', {
      requestId: req.requestId,
      errorName: error.name,
      errorMessage: error.message
    });
    return next(error);
  }
}

module.exports = { generateCampaign };
