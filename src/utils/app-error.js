class AppError extends Error {
  constructor(message, {
    code = 'INTERNAL_ERROR',
    statusCode = 500,
    details = null,
    stage,
    pipelineId,
    cause
  } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.stage = stage;
    this.pipelineId = pipelineId;
  }
}

module.exports = AppError;
