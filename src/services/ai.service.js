const OpenAI = require('openai');

class AiServiceError extends Error {
  constructor(message, statusCode = 502, details) {
    super(message);
    this.name = 'AiServiceError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

function createClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new AiServiceError('OPENAI_API_KEY is not configured.', 500);
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {})
  });
}

/**
 * Sends a system prompt and user prompt to the configured OpenAI-compatible API.
 * The model is explicitly asked for a JSON object and its response is validated.
 */
async function generateJson({ systemPrompt, userPrompt }) {
  const client = createClient();
  const timeout = Number(process.env.AI_TIMEOUT_MS) || 30000;

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
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
      return parsed;
    } catch (error) {
      throw new AiServiceError('LLM did not return valid JSON.', 502, {
        reason: error.message,
        response: content
      });
    }
  } catch (error) {
    if (error instanceof AiServiceError) throw error;
    if (error.name === 'APIConnectionTimeoutError' || error.name === 'AbortError') {
      throw new AiServiceError(`LLM request timed out after ${timeout}ms.`, 504);
    }
    throw new AiServiceError('LLM request failed.', error.status || 502, error.message);
  }
}

module.exports = { generateJson, AiServiceError };
