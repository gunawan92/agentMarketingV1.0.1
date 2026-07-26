const express = require('express');
const { generateCampaign } = require('../controllers/pipeline.controller');

const router = express.Router();

router.post('/generate-campaign', generateCampaign);

module.exports = router;
