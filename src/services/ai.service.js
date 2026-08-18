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

function extractJsonObject(text) {
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === '{') {
      if (depth === 0) start = index;
      depth += 1;
    } else if (character === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  return null;
}

function parseJsonObject(content) {
  const trimmed = String(content).trim();
  const candidates = [trimmed];
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) candidates.push(fenced[1].trim());
  const extracted = extractJsonObject(trimmed);
  if (extracted) candidates.push(extracted);

  let lastError;
  for (const candidate of [...new Set(candidates)]) {
    try {
      let output = JSON.parse(candidate);
      // Some free routes encode the requested JSON object as a JSON string.
      if (typeof output === 'string') output = JSON.parse(output);
      if (output !== null && !Array.isArray(output) && typeof output === 'object') return output;
      lastError = new TypeError('JSON root must be an object.');
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new SyntaxError('No JSON object found.');
}

async function runJsonAgent({ agentName, systemPrompt, userPrompt, metadata = {} }) {
  if (!agentName || typeof systemPrompt !== 'string' || !systemPrompt.trim()) {
    throw new AppError('Agent name and system prompt are required.', { code: 'INVALID_AGENT_CONFIGURATION', statusCode: 500 });
  }

  const model = getModel();
  const timeout = getPositiveInteger(process.env.AI_TIMEOUT_MS, 60000);
  const maxTokens = getPositiveInteger(process.env.AI_MAX_TOKENS, 4096);
  const prompt = typeof userPrompt === 'string' ? userPrompt : JSON.stringify(userPrompt);
  const startedAt = Date.now();
  logger.info('ai.request.started', { stage: agentName, model, timeout, maxTokens });

  const jsonRetries = getNonNegativeInteger(process.env.AI_JSON_RETRIES, 1);
  let completion;
  let output;
  let parseError;

  for (let attempt = 0; attempt <= jsonRetries; attempt += 1) {
    try {
      completion = await createClient().chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: attempt === 0 ? prompt : `${prompt}\n\nReturn one valid JSON object only. Do not use Markdown fences or add any text outside the JSON object.` }
        ],
        response_format: { type: 'json_object' },
        temperature: attempt === 0 ? 0.3 : 0.1,
        // A free OpenRouter route can select a reasoning model. Leave enough
        // completion budget for the actual JSON after internal reasoning.
        max_tokens: maxTokens
      }, { timeout });
    } catch (error) {
      logger.error('ai.request.failed', { stage: agentName, durationMs: Date.now() - startedAt, errorName: error.name, errorMessage: error.message });
      if (error instanceof AppError) throw error;
      throw normalizeProviderError(error, timeout);
    }

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      parseError = new Error('AI provider returned an empty response.');
    } else {
      try {
        output = parseJsonObject(content);
        break;
      } catch (error) {
        parseError = error;
      }
    }
    logger.warn('ai.response.invalid_json', {
      stage: agentName,
      attempt: attempt + 1,
      willRetry: attempt < jsonRetries,
      contentLength: typeof content === 'string' ? content.length : 0,
      finishReason: completion.choices?.[0]?.finish_reason || null
    });
  }

  if (!output) {
    throw new AppError('AI provider returned invalid JSON after retry.', {
      code: 'AI_INVALID_JSON',
      statusCode: 502,
      details: process.env.NODE_ENV === 'production' ? null : parseError?.message,
      cause: parseError
    });
  }

  logger.info('ai.request.completed', { stage: agentName, durationMs: Date.now() - startedAt, outputKeys: Object.keys(output) });
  return { output, meta: { ...metadata, agent: agentName, duration_ms: Date.now() - startedAt, model: completion.model || model, response_id: completion.id || null } };
}

async function generateJson({ systemPrompt, userPrompt, stage = 'generic' }) {
  const result = await runJsonAgent({ agentName: stage, systemPrompt, userPrompt });
  return result.output;
}

module.exports = { runJsonAgent, generateJson, getModel, getApiKeyStatus, parseJsonObject };
