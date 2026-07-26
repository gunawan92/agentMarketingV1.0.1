const path = require('path');
const fs = require('fs/promises');
const { generateJson } = require('../services/ai.service');

const skillsDirectory = path.join(__dirname, '..', 'skills');

async function loadSkill(fileName) {
  const safeFileName = path.basename(fileName);
  if (safeFileName !== fileName || !safeFileName.endsWith('.md')) {
    const error = new Error('Invalid skill file name.');
    error.statusCode = 500;
    throw error;
  }

  try {
    return await fs.readFile(path.join(skillsDirectory, safeFileName), 'utf8');
  } catch (cause) {
    const error = new Error(`Unable to load skill: ${safeFileName}`);
    error.statusCode = 500;
    error.details = cause.message;
    throw error;
  }
}

async function generateCampaign(req, res, next) {
  try {
    const { campaignBrief, ...context } = req.body || {};
    if (typeof campaignBrief !== 'string' || !campaignBrief.trim()) {
      const error = new Error('campaignBrief is required and must be a non-empty string.');
      error.statusCode = 400;
      throw error;
    }

    const strategyPrompt = await loadSkill('agent-strategy.md');
    const strategy = await generateJson({
      systemPrompt: strategyPrompt,
      userPrompt: JSON.stringify({ campaignBrief: campaignBrief.trim(), context })
    });

    const copywriterPrompt = await loadSkill('agent-copywriter.md');
    const copy = await generateJson({
      systemPrompt: copywriterPrompt,
      userPrompt: JSON.stringify({
        originalRequest: { campaignBrief: campaignBrief.trim(), context },
        strategy
      })
    });

    return res.status(200).json({ strategy, copy });
  } catch (error) {
    return next(error);
  }
}

module.exports = { generateCampaign, loadSkill };
