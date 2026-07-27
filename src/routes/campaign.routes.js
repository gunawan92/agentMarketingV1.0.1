const express = require('express');
const controller = require('../controllers/campaign.controller');
const logger = require('../services/logger.service');

const router = express.Router();
router.post('/', controller.create);
router.get('/:campaignId', controller.detail);
router.post('/:campaignId/stages/:stage', controller.runStage);
router.post('/:campaignId/approvals', controller.approve);

logger.info('routes.campaign.registered', { endpoints: ['POST /api/campaigns', 'GET /api/campaigns/:campaignId', 'POST /api/campaigns/:campaignId/stages/:stage', 'POST /api/campaigns/:campaignId/approvals'] });
module.exports = router;
