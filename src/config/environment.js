const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadEnvironment() {
  // Deliberately do not load `.env`: each runtime uses exactly one scoped file.
  const environment = process.env.NODE_ENV || 'development';
  const environmentFile = path.join(process.cwd(), `.env.${environment}`);
  const exists = fs.existsSync(environmentFile);

  if (exists) {
    dotenv.config({ path: environmentFile, override: true });
  }

  return { environment, environmentFile, exists };
}

module.exports = { loadEnvironment };
