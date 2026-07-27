const OpenAI = require('openai');
const AppError = require('../utils/app-error');

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

  const model = process.env.OPENAI_MODEL || process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
  const timeout = getPositiveInteger(process.env.AI_TIMEOUT_MS, 60000);
  const startedAt = Date.now();
  const prompt = typeof userPrompt === 'string'
    ? userPrompt
    : JSON.stringify(userPrompt);

  let completion;
  try {
    completion = await getOpenAIClient().chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    }, { timeout });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw normalizeProviderError(error, timeout);
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
