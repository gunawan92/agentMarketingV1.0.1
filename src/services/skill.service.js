const path = require('path');
const fs = require('fs/promises');
const logger = require('./logger.service');

const skillsDirectory = path.join(__dirname, '..', 'skills');

async function loadSkill(fileName) {
  const safeFileName = path.basename(fileName);
  if (safeFileName !== fileName || !safeFileName.endsWith('.md')) {
    const error = new Error('Invalid skill file name.');
    error.statusCode = 500;
    throw error;
  }

  try {
    const skill = await fs.readFile(path.join(skillsDirectory, safeFileName), 'utf8');
    logger.info('pipeline.skill.loaded', { skill: safeFileName, characters: skill.length });
    return skill;
  } catch (cause) {
    const error = new Error(`Unable to load skill: ${safeFileName}`);
    error.statusCode = 500;
    error.details = cause.message;
    throw error;
  }
}

module.exports = { loadSkill };
