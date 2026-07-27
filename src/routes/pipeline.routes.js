const express = require('express');
const { generateCampaign } = require('../controllers/pipeline.controller');
const logger = require('../services/logger.service');

const router = express.Router();

logger.info('routes.pipeline.registered', { endpoint: 'POST /api/generate-campaign' });
router.post('/generate-campaign', generateCampaign);

module.exports = router;
