const path = require('path');
const fs = require('fs/promises');
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
}

module.exports = { loadSkill };
