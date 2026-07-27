const express = require('express');
const controller = require('../controllers/campaign.controller');
const { uploadAsset } = require('../middlewares/asset-upload.middleware');
const logger = require('../services/logger.service');

const router = express.Router();
router.post('/', controller.create);
router.get('/:campaignId', controller.detail);
router.post('/:campaignId/stages/:stage', controller.runStage);
router.post('/:campaignId/approvals', controller.approve);
router.post('/:campaignId/assets', uploadAsset.single('asset'), controller.uploadAsset);
router.post('/:campaignId/assets/link', controller.attachAssetUrl);

logger.info('routes.campaign.registered', { endpoints: ['POST /api/campaigns', 'GET /api/campaigns/:campaignId', 'POST /api/campaigns/:campaignId/stages/:stage', 'POST /api/campaigns/:campaignId/approvals', 'POST /api/campaigns/:campaignId/assets', 'POST /api/campaigns/:campaignId/assets/link'] });
module.exports = router;
