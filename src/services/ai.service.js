const OpenAI = require('openai');
const logger = require('./logger.service');

class AiServiceError extends Error {
  constructor(message, statusCode = 502, details) {
    super(message);
    this.name = 'AiServiceError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

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

  try {
    const completion = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4
    }, { timeout });

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
  }
}

module.exports = { generateJson, AiServiceError, getModel, getApiKeyStatus };
