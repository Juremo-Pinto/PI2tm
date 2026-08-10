const express = require('express');
const { execFile } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');

const execFileAsync = util.promisify(execFile);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MEDICOES_PATH = path.join(__dirname, 'data', 'medicoes.json');
const CONFIG_PATH = path.join(__dirname, 'data', 'config.json');
const PYTHON_SCRIPT = path.join(__dirname, 'python', 'classify.py');
const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';

const DEFAULT_CONFIG = { valueCount: 3 };

function readMedicoes() {
  if (!fs.existsSync(MEDICOES_PATH)) return [];
  return JSON.parse(fs.readFileSync(MEDICOES_PATH, 'utf-8'));
}

function writeMedicoes(medicoes) {
  fs.writeFileSync(MEDICOES_PATH, JSON.stringify(medicoes, null, 2));
}

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return { ...DEFAULT_CONFIG };
  return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) };
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function isValidSample(value, expectedCount) {
  return (
    Array.isArray(value) &&
    value.length === expectedCount &&
    value.every((v) => typeof v === 'number' && !Number.isNaN(v))
  );
}

// Runs the Python KNN script and returns { classification, probabilities }.
// Throws an Error with a `payload` property set to the classifier's own error JSON, when present.
async function classifySample(sample) {
  let stdout;
  try {
    ({ stdout } = await execFileAsync(PYTHON_BIN, [PYTHON_SCRIPT, JSON.stringify(sample)]));
  } catch (error) {
    const err = new Error(error.stderr?.trim() || error.message);
    err.payload = { error: 'classification failed', details: error.stderr?.trim() || error.message };
    throw err;
  }

  let result;
  try {
    result = JSON.parse(stdout);
  } catch (parseError) {
    const err = new Error('invalid response from classifier');
    err.payload = { error: 'invalid response from classifier', raw: stdout };
    throw err;
  }

  if (result.error) {
    const err = new Error(result.error);
    err.payload = result;
    throw err;
  }

  return result;
}

// GET /config - current settings (how many numeric values a measurement must have)
app.get('/config', (req, res) => {
  res.json(readConfig());
});

// PUT /config - update how many numeric values a measurement must have
app.put('/config', (req, res) => {
  const { valueCount } = req.body;
  if (!Number.isInteger(valueCount) || valueCount < 1) {
    return res.status(400).json({ error: 'valueCount must be a positive integer' });
  }

  const config = { ...readConfig(), valueCount };
  writeConfig(config);
  res.json(config);
});

// GET /medicoes - list stored measurements (already classified)
app.get('/medicoes', (req, res) => {
  res.json(readMedicoes());
});

// POST /medicoes - classify a sample and store it as a measurement { sample: [n1, ..., nN] }
app.post('/medicoes', async (req, res) => {
  const { valueCount } = readConfig();
  const { sample } = req.body;
  if (!isValidSample(sample, valueCount)) {
    return res.status(400).json({ error: `sample must be an array of exactly ${valueCount} numbers` });
  }

  try {
    const { classification, probabilities } = await classifySample(sample);

    const medicoes = readMedicoes();
    const medicao = {
      id: Date.now(),
      sample,
      classification,
      probabilities,
      createdAt: new Date().toISOString(),
    };
    medicoes.push(medicao);
    writeMedicoes(medicoes);

    res.status(201).json(medicao);
  } catch (error) {
    res.status(error.payload?.error === 'classification failed' ? 500 : 400).json(error.payload || { error: error.message });
  }
});

// POST /classificar - classify a sample array as good/medium/bad via the Python KNN script
app.post('/classificar', async (req, res) => {
  const { valueCount } = readConfig();
  const { sample } = req.body;
  if (!isValidSample(sample, valueCount)) {
    return res.status(400).json({ error: `sample must be an array of exactly ${valueCount} numbers` });
  }

  try {
    const result = await classifySample(sample);
    res.json(result);
  } catch (error) {
    res.status(error.payload?.error === 'classification failed' ? 500 : 400).json(error.payload || { error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));