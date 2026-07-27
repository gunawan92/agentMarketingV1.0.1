const OpenAI = require('openai');
<<<<<<< HEAD
const logger = require('./logger.service');
=======
const AppError = require('../utils/app-error');
>>>>>>> 94a9071b743c6db25f8fd911589bff10ba051f7c

let openaiClient;

function getOpenAIClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
    if (!apiKey) {
      throw new AppError('OpenAI API key is not configured.', {
        code: 'AI_CONFIGURATION_ERROR',
        statusCode: 500
      });
    }

    openaiClient = new OpenAI({
      apiKey,
      maxRetries: getNonNegativeInteger(process.env.AI_MAX_RETRIES, 1),
      ...(process.env.OPENAI_BASE_URL || process.env.OPENAI_API_BASE
        ? { baseURL: process.env.OPENAI_BASE_URL || process.env.OPENAI_API_BASE }
        : {})
    });
  }
  return openaiClient;
}

<<<<<<< HEAD
function getModel() {
  return process.env.OPENROUTER_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
}

function getApiKey() {
  return process.env.OPENROUTER_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim() || '';
}

function getApiKeyStatus() {
  const apiKey = getApiKey();
  if (!apiKey) return 'missing';
  if (apiKey.startsWith('replace_')) return 'placeholder';
  return 'configured';
}

function createClient() {
  // OPENAI_API_KEY keeps compatibility with the OpenAI SDK; OPENROUTER_API_KEY
  // makes the selected provider explicit in development configuration.
  const apiKey = getApiKey();
  if (getApiKeyStatus() !== 'configured') {
    throw new AiServiceError(
      'No valid OpenRouter/OpenAI API key is configured. Set OPENROUTER_API_KEY or OPENAI_API_KEY in the active environment file and restart the server.',
      500
    );
  }

  logger.info('ai.client.initialized', {
    model: getModel(),
    hasCustomBaseUrl: Boolean(process.env.OPENAI_BASE_URL),
    hasOpenRouterHeaders: Boolean(process.env.OPENROUTER_SITE_URL || process.env.OPENROUTER_APP_NAME)
  });

  return new OpenAI({
    apiKey,
    ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
    ...(process.env.OPENROUTER_SITE_URL || process.env.OPENROUTER_APP_NAME
      ? {
          defaultHeaders: {
            ...(process.env.OPENROUTER_SITE_URL
              ? { 'HTTP-Referer': process.env.OPENROUTER_SITE_URL }
              : {}),
            ...(process.env.OPENROUTER_APP_NAME
              ? { 'X-OpenRouter-Title': process.env.OPENROUTER_APP_NAME }
              : {})
          }
        }
      : {})
  });
}

/**
 * Sends a system prompt and user prompt to the configured OpenAI-compatible API.
 * The model is explicitly asked for a JSON object and its response is validated.
 */
async function generateJson({ systemPrompt, userPrompt, stage = 'unknown' }) {
  const client = createClient();
  const timeout = Number(process.env.AI_TIMEOUT_MS) || 30000;
  const startedAt = Date.now();

  logger.info('ai.request.started', { stage, model: getModel(), timeout });
=======
function getNonNegativeInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function getPositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeProviderError(error, timeout) {
  const isTimeout = error?.name === 'APIConnectionTimeoutError'
    || error?.name === 'AbortError'
    || error?.code === 'ETIMEDOUT';

  if (isTimeout) {
    return new AppError(`AI request timed out after ${timeout}ms.`, {
      code: 'AI_TIMEOUT',
      statusCode: 504,
      cause: error
    });
  }

  return new AppError('AI provider request failed.', {
    code: 'AI_PROVIDER_ERROR',
    statusCode: Number.isInteger(error?.status) ? error.status : 502,
    details: process.env.NODE_ENV === 'production' ? null : error?.message,
    cause: error
  });
}

async function runJsonAgent({
  agentName,
  systemPrompt,
  userPrompt,
  metadata = {}
}) {
  if (!agentName || typeof systemPrompt !== 'string' || !systemPrompt.trim()) {
    throw new AppError('Agent name and system prompt are required.', {
      code: 'INVALID_AGENT_CONFIGURATION',
      statusCode: 500
    });
  }
>>>>>>> 94a9071b743c6db25f8fd911589bff10ba051f7c

  const model = process.env.OPENAI_MODEL || process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
  const timeout = getPositiveInteger(process.env.AI_TIMEOUT_MS, 60000);
  const startedAt = Date.now();
  const prompt = typeof userPrompt === 'string'
    ? userPrompt
    : JSON.stringify(userPrompt);

  let completion;
  try {
<<<<<<< HEAD
    const completion = await client.chat.completions.create({
      model: getModel(),
=======
    completion = await getOpenAIClient().chat.completions.create({
      model,
>>>>>>> 94a9071b743c6db25f8fd911589bff10ba051f7c
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    }, { timeout });
<<<<<<< HEAD

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      throw new AiServiceError('LLM returned an empty response.');
    }

    try {
      const parsed = JSON.parse(content);
      if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
        throw new Error('Response must be a JSON object.');
      }
      logger.info('ai.request.completed', {
        stage,
        durationMs: Date.now() - startedAt,
        outputKeys: Object.keys(parsed)
      });
      return parsed;
    } catch (error) {
      throw new AiServiceError('LLM did not return valid JSON.', 502, {
        reason: error.message,
        response: content
      });
    }
  } catch (error) {
    logger.error('ai.request.failed', {
      stage,
      durationMs: Date.now() - startedAt,
      errorName: error.name,
      errorMessage: error.message
    });
    if (error instanceof AiServiceError) throw error;
    if (error.name === 'APIConnectionTimeoutError' || error.name === 'AbortError') {
      throw new AiServiceError(`LLM request timed out after ${timeout}ms.`, 504);
    }
    if (String(error.message).includes('No endpoints available matching your guardrail restrictions and data policy')) {
      throw new AiServiceError(
        'OpenRouter found no endpoint allowed by this API key privacy or guardrail policy. Review OpenRouter Settings > Privacy, or use a model permitted by that policy.',
        502,
        error.message
      );
    }
    throw new AiServiceError('LLM request failed.', error.status || 502, error.message);
=======
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw normalizeProviderError(error, timeout);
>>>>>>> 94a9071b743c6db25f8fd911589bff10ba051f7c
  }

  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    throw new AppError('AI provider returned an empty response.', {
      code: 'AI_EMPTY_RESPONSE',
      statusCode: 502
    });
  }

  let output;
  try {
    output = JSON.parse(content);
  } catch (error) {
    throw new AppError('AI provider returned invalid JSON.', {
      code: 'AI_INVALID_JSON',
      statusCode: 502,
      details: process.env.NODE_ENV === 'production' ? null : error.message,
      cause: error
    });
  }

  if (output === null || Array.isArray(output) || typeof output !== 'object') {
    throw new AppError('AI provider JSON root must be an object.', {
      code: 'AI_INVALID_JSON_ROOT',
      statusCode: 502
    });
  }

  return {
    output,
    meta: {
      ...metadata,
      agent: agentName,
      duration_ms: Date.now() - startedAt,
      model: completion.model || model,
      response_id: completion.id || null
    }
  };
}

<<<<<<< HEAD
module.exports = { generateJson, AiServiceError, getModel, getApiKeyStatus };
=======
// Kept as a compatibility adapter for existing consumers.
async function generateJson({ systemPrompt, userPrompt }) {
  const result = await runJsonAgent({
    agentName: 'generic',
    systemPrompt,
    userPrompt
  });
  return result.output;
}

module.exports = { runJsonAgent, generateJson };
>>>>>>> 94a9071b743c6db25f8fd911589bff10ba051f7c
