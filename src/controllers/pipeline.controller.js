const { generateCampaignPipeline } = require('../services/pipeline.service');
const AppError = require('../utils/app-error');

function validateCampaignRequest(body) {
  if (!body || typeof body.campaignBrief !== 'string') {
    throw new AppError('campaignBrief is required and must be a string.', {
      code: 'VALIDATION_ERROR',
      statusCode: 400
    });
  }

  const campaignBrief = body.campaignBrief.trim();
  if (campaignBrief.length < 20 || campaignBrief.length > 20000) {
    throw new AppError('campaignBrief must contain between 20 and 20000 characters.', {
      code: 'VALIDATION_ERROR',
      statusCode: 400
    });
  }

  return { ...body, campaignBrief };
}

async function generateCampaign(req, res, next) {
  try {
    const input = validateCampaignRequest(req.body);
    const data = await generateCampaignPipeline(input);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

module.exports = { generateCampaign };
