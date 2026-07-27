const path = require('path');
const fs = require('fs/promises');
<<<<<<< HEAD
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
=======
const AppError = require('../utils/app-error');

const skillsDirectory = path.resolve(__dirname, '..', 'skills');
const validSkillFilePattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.md$/;

async function loadSkill(filename) {
  if (
    typeof filename !== 'string'
    || !validSkillFilePattern.test(filename)
    || path.basename(filename) !== filename
  ) {
    throw new AppError('Invalid skill filename. A Markdown filename is required.', {
      code: 'INVALID_SKILL_FILE',
      statusCode: 500
    });
  }

  const skillPath = path.resolve(skillsDirectory, filename);
  if (path.dirname(skillPath) !== skillsDirectory) {
    throw new AppError('Invalid skill path.', {
      code: 'INVALID_SKILL_FILE',
      statusCode: 500
    });
  }

  let content;
  try {
    content = await fs.readFile(skillPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new AppError(`Skill file not found: ${filename}`, {
        code: 'SKILL_NOT_FOUND',
        statusCode: 500,
        cause: error
      });
    }
    throw new AppError(`Unable to read skill file: ${filename}`, {
      code: 'SKILL_READ_FAILED',
      statusCode: 500,
      cause: error
    });
  }

  if (!content.trim()) {
    throw new AppError(`Skill file is empty: ${filename}`, {
      code: 'SKILL_EMPTY',
      statusCode: 500
    });
  }

  return content;
>>>>>>> 94a9071b743c6db25f8fd911589bff10ba051f7c
}

module.exports = { loadSkill };
