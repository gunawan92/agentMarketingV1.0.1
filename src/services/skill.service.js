const path = require('path');
const fs = require('fs/promises');
const AppError = require('../utils/app-error');
const logger = require('./logger.service');

const skillsDirectory = path.resolve(__dirname, '..', 'skills');
const validSkillFilePattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.md$/;

async function loadSkill(filename) {
  if (typeof filename !== 'string' || !validSkillFilePattern.test(filename) || path.basename(filename) !== filename) {
    throw new AppError('Invalid skill filename. A Markdown filename is required.', { code: 'INVALID_SKILL_FILE', statusCode: 500 });
  }
  const skillPath = path.resolve(skillsDirectory, filename);
  if (path.dirname(skillPath) !== skillsDirectory) {
    throw new AppError('Invalid skill path.', { code: 'INVALID_SKILL_FILE', statusCode: 500 });
  }
  let content;
  try {
    content = await fs.readFile(skillPath, 'utf8');
  } catch (error) {
    throw new AppError(`Unable to read skill file: ${filename}`, { code: error.code === 'ENOENT' ? 'SKILL_NOT_FOUND' : 'SKILL_READ_FAILED', statusCode: 500, cause: error });
  }
  if (!content.trim()) throw new AppError(`Skill file is empty: ${filename}`, { code: 'SKILL_EMPTY', statusCode: 500 });
  logger.info('pipeline.skill.loaded', { skill: filename, characters: content.length });
  return content;
}

module.exports = { loadSkill };
