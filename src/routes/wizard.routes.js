const express = require('express');
const wizard = require('../controllers/wizard.controller');
const logger = require('../services/logger.service');

const router = express.Router();

router.post('/strategy', wizard.strategy);
router.post('/copy', wizard.copy);
router.post('/design', wizard.design);
router.post('/publisher', wizard.publisher);
router.post('/ads', wizard.ads);
router.post('/crm', wizard.crm);

logger.info('routes.wizard.registered', {
  endpoints: ['POST /api/wizard/strategy', 'POST /api/wizard/copy', 'POST /api/wizard/design', 'POST /api/wizard/publisher', 'POST /api/wizard/ads', 'POST /api/wizard/crm']
});

module.exports = router;
