function serialize(data = {}) {
  try {
    return JSON.stringify(data, (key, value) => {
      const normalizedKey = key.toLowerCase();
      if (normalizedKey.includes('api_key') || normalizedKey.includes('authorization') || normalizedKey.includes('token')) {
        return '[REDACTED]';
      }
      if (value instanceof Error) {
        return { name: value.name, message: value.message, stack: value.stack };
      }
      return value;
    });
  } catch (_error) {
    return JSON.stringify({ message: 'Unable to serialize log metadata.' });
  }
}

function log(level, event, data) {
  console.log(`${new Date().toISOString()} [${level}] ${event} ${serialize(data)}`);
}

function info(event, data) {
  log('INFO', event, data);
}

function warn(event, data) {
  log('WARN', event, data);
}

function error(event, data) {
  // Use console.log intentionally so all application process logs share one stream.
  log('ERROR', event, data);
}

module.exports = { info, warn, error };
