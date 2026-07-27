const OpenAI = require('openai');
const AppError = require('../utils/app-error');
const logger = require('./logger.service');

function getNonNegativeInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function getPositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getModel() {
  return process.env.OPENROUTER_MODEL
    || process.env.OPENAI_MODEL
    || process.env.OPENAI_CHAT_MODEL
    || 'gpt-4o-mini';
}

function getApiKey() {
  return process.env.OPENROUTER_API_KEY?.trim()
    || process.env.OPENAI_API_KEY?.trim()
    || process.env.OPENAI_KEY?.trim()
    || '';
}

function getApiKeyStatus() {
  const apiKey = getApiKey();
  if (!apiKey) return 'missing';
  if (apiKey.startsWith('replace_')) return 'placeholder';
  return 'configured';
}

function createClient() {
  const apiKey = getApiKey();
  if (getApiKeyStatus() !== 'configured') {
    throw new AppError('No valid OpenRouter/OpenAI API key is configured.', {
      code: 'AI_CONFIGURATION_ERROR',
      statusCode: 500
    });
  }

  const baseURL = process.env.OPENAI_BASE_URL || process.env.OPENAI_API_BASE;
  logger.info('ai.client.initialized', {
    model: getModel(),
    hasCustomBaseUrl: Boolean(baseURL),
    hasOpenRouterHeaders: Boolean(process.env.OPENROUTER_SITE_URL || process.env.OPENROUTER_APP_NAME)
  });

  return new OpenAI({
    apiKey,
    maxRetries: getNonNegativeInteger(process.env.AI_MAX_RETRIES, 1),
    ...(baseURL ? { baseURL } : {}),
    ...(process.env.OPENROUTER_SITE_URL || process.env.OPENROUTER_APP_NAME
      ? {
          defaultHeaders: {
            ...(process.env.OPENROUTER_SITE_URL ? { 'HTTP-Referer': process.env.OPENROUTER_SITE_URL } : {}),
            ...(process.env.OPENROUTER_APP_NAME ? { 'X-OpenRouter-Title': process.env.OPENROUTER_APP_NAME } : {})
          }
        }
      : {})
  });
}

function normalizeProviderError(error, timeout) {
  if (String(error.message).includes('No endpoints available matching your guardrail restrictions and data policy')) {
    return new AppError('OpenRouter found no endpoint allowed by this API key privacy or guardrail policy.', {
      code: 'AI_PROVIDER_POLICY_BLOCKED',
      statusCode: 502,
      details: process.env.NODE_ENV === 'production' ? null : error.message,
      cause: error
    });
  }
  const isTimeout = error?.name === 'APIConnectionTimeoutError' || error?.name === 'AbortError' || error?.code === 'ETIMEDOUT';
  if (isTimeout) {
    return new AppError(`AI request timed out after ${timeout}ms.`, { code: 'AI_TIMEOUT', statusCode: 504, cause: error });
  }
  return new AppError('AI provider request failed.', {
    code: 'AI_PROVIDER_ERROR',
    statusCode: Number.isInteger(error?.status) ? error.status : 502,
    details: process.env.NODE_ENV === 'production' ? null : error?.message,
    cause: error
  });
}

async function runJsonAgent({ agentName, systemPrompt, userPrompt, metadata = {} }) {
  if (!agentName || typeof systemPrompt !== 'string' || !systemPrompt.trim()) {
    throw new AppError('Agent name and system prompt are required.', { code: 'INVALID_AGENT_CONFIGURATION', statusCode: 500 });
  }

  const model = getModel();
  const timeout = getPositiveInteger(process.env.AI_TIMEOUT_MS, 60000);
  const prompt = typeof userPrompt === 'string' ? userPrompt : JSON.stringify(userPrompt);
  const startedAt = Date.now();
  logger.info('ai.request.started', { stage: agentName, model, timeout });

  let completion;
  try {
    completion = await createClient().chat.completions.create({
      model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3
    }, { timeout });
  } catch (error) {
    logger.error('ai.request.failed', { stage: agentName, durationMs: Date.now() - startedAt, errorName: error.name, errorMessage: error.message });
    if (error instanceof AppError) throw error;
    throw normalizeProviderError(error, timeout);
  }

  const content = completion.choices?.[0]?.message?.content;
  if (!content) throw new AppError('AI provider returned an empty response.', { code: 'AI_EMPTY_RESPONSE', statusCode: 502 });

  let output;
  try {
    output = JSON.parse(content);
  } catch (error) {
    throw new AppError('AI provider returned invalid JSON.', {
      code: 'AI_INVALID_JSON', statusCode: 502,
      details: process.env.NODE_ENV === 'production' ? null : error.message, cause: error
    });
  }
  if (output === null || Array.isArray(output) || typeof output !== 'object') {
    throw new AppError('AI provider JSON root must be an object.', { code: 'AI_INVALID_JSON_ROOT', statusCode: 502 });
  }

  logger.info('ai.request.completed', { stage: agentName, durationMs: Date.now() - startedAt, outputKeys: Object.keys(output) });
  return { output, meta: { ...metadata, agent: agentName, duration_ms: Date.now() - startedAt, model: completion.model || model, response_id: completion.id || null } };
}

async function generateJson({ systemPrompt, userPrompt, stage = 'generic' }) {
  const result = await runJsonAgent({ agentName: stage, systemPrompt, userPrompt });
  return result.output;
}

module.exports = { runJsonAgent, generateJson, getModel, getApiKeyStatus };
