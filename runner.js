/**
 * SAP APIM JavaScript Policy Runner
 * ------------------------------------
 * Usage:
 *   node runner.js <policy.js> [config.txt]
 *
 * If config.txt is omitted, it looks for a .txt file with the same base name
 * as the policy file (e.g. my-policy.js → my-policy.txt).
 *
 * Config file format  (see policies/sample-add-headers.txt for a full example):
 *
 *   # Lines starting with # are comments
 *
 *   # Set any context variable (everything after the first = is the value)
 *   response.content = {"id": 1}
 *   request.header.Authorization = Bearer abc123
 *   targetResponse.status = 200
 *   targetResponse.status.message = OK
 *
 *   # Variables to print after the policy runs (prefix OUTPUT:)
 *   OUTPUT: response.header.X-Powered-By
 *   OUTPUT: response.content
 */

'use strict';

const vm   = require('vm');
const fs   = require('fs');
const path = require('path');

// ─── Parse arguments ────────────────────────────────────────────────────────

const [,, policyArg, configArg] = process.argv;

if (!policyArg) {
  console.error('Usage: node runner.js <policy.js> [config.txt]');
  process.exit(1);
}

const policyFile = path.resolve(policyArg);
const configFile = configArg
  ? path.resolve(configArg)
  : policyFile.replace(/\.js$/, '.txt');

if (!fs.existsSync(policyFile)) {
  console.error('Policy file not found:', policyFile);
  process.exit(1);
}
if (!fs.existsSync(configFile)) {
  console.error('Config file not found:', configFile);
  console.error('Create a .txt file alongside the policy, or pass it as the second argument.');
  process.exit(1);
}

// ─── Parse config file ───────────────────────────────────────────────────────

const variables = {};   // input flow variables
const outputs   = [];   // variable names to print at the end

for (const raw of fs.readFileSync(configFile, 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;

  if (line.toUpperCase().startsWith('OUTPUT:')) {
    const varName = line.slice('OUTPUT:'.length).trim();
    if (varName) outputs.push(varName);
    continue;
  }

  const eq = line.indexOf('=');
  if (eq === -1) continue;

  const key   = line.slice(0, eq).trim();
  const value = line.slice(eq + 1).trim();
  variables[key] = value;
}

// ─── Build mock context ──────────────────────────────────────────────────────

// targetResponse.status needs to behave like a number AND have .message
const targetStatusCode    = parseInt(variables['targetResponse.status'] ?? '200', 10);
const targetStatusMessage = variables['targetResponse.status.message'] ?? 'OK';

const targetResponseHeaders = {};
const proxyResponseHeaders  = {};
const proxyRequestHeaders   = {};

// Pre-populate header sub-objects from variables like request.header.X-Foo
for (const [k, v] of Object.entries(variables)) {
  if (k.startsWith('request.header.'))  proxyRequestHeaders[k.slice('request.header.'.length).toLowerCase()]  = v;
  if (k.startsWith('response.header.')) proxyResponseHeaders[k.slice('response.header.'.length).toLowerCase()] = v;
}

function makeHeaderObj(store) {
  return {
    get: (n) => store[n.toLowerCase()] ?? null,
    set: (n, v) => { store[n.toLowerCase()] = v; },
  };
}

const targetResponse = {
  content: variables['response.content'] ?? '',
  status: Object.assign(
    // Behave as a number in string context (e.g. status + '' === "200")
    new Number(targetStatusCode),
    { message: targetStatusMessage, code: targetStatusCode }
  ),
  headers: makeHeaderObj(targetResponseHeaders),
};

const proxyRequest = {
  content:     variables['request.content'] ?? '',
  method:      variables['request.method']  ?? 'GET',
  url:         variables['request.url']     ?? '',
  headers:     makeHeaderObj(proxyRequestHeaders),
};

const proxyResponse = {
  content: variables['response.content'] ?? '',
  headers: makeHeaderObj(proxyResponseHeaders),
};

const context = {
  flow:           variables['context.flow'] ?? 'PROXY_REQ_FLOW',
  proxyRequest,
  targetRequest:  proxyRequest,
  targetResponse,
  proxyResponse,
  session:        {},

  getVariable(name) {
    if (name in variables) return variables[name];
    if (name.startsWith('request.header.'))
      return proxyRequestHeaders[name.slice('request.header.'.length).toLowerCase()] ?? null;
    if (name.startsWith('response.header.'))
      return proxyResponseHeaders[name.slice('response.header.'.length).toLowerCase()] ?? null;
    if (name.startsWith('request.queryparam.')) {
      const qpKey = 'request.queryparam.' + name.slice('request.queryparam.'.length);
      return variables[qpKey] ?? null;
    }
    return null;
  },

  setVariable(name, value) {
    variables[name] = value;
    if (name.startsWith('request.header.'))
      proxyRequestHeaders[name.slice('request.header.'.length).toLowerCase()] = value;
    if (name.startsWith('response.header.')) {
      proxyResponseHeaders[name.slice('response.header.'.length).toLowerCase()] = value;
      targetResponseHeaders[name.slice('response.header.'.length).toLowerCase()] = value;
    }
    if (name === 'request.content')  proxyRequest.content   = value;
    if (name === 'response.content') proxyResponse.content  = value;
  },

  removeVariable(name) { delete variables[name]; },
};

// ─── Run the policy ──────────────────────────────────────────────────────────

const code = fs.readFileSync(policyFile, 'utf8');

const sandbox = {
  context,
  request:    proxyRequest,
  response:   proxyResponse,
  httpClient: { send: () => ({ waitForComplete() {}, getResponse: () => targetResponse, getError: () => null }) },
  print:      (...args) => console.log('[policy print]', ...args),
  JSON, Math, Date, parseInt, parseFloat, isNaN, isFinite,
  encodeURIComponent, decodeURIComponent, String, Number, Boolean,
  Array, Object, RegExp, Error, console,
};

vm.createContext(sandbox);

console.log('\n▶  Running:', path.basename(policyFile));
console.log('   Config :', path.basename(configFile));
console.log('─'.repeat(50));

try {
  vm.runInContext(code, sandbox);
} catch (err) {
  console.error('\n✖  Policy threw an error:', err.message);
  process.exit(1);
}

// ─── Print outputs ───────────────────────────────────────────────────────────

console.log('\n◀  Output variables:');

if (outputs.length === 0) {
  // Print everything that was set or changed
  for (const [k, v] of Object.entries(variables)) {
    console.log(`   ${k} = ${v}`);
  }
} else {
  for (const name of outputs) {
    const val = context.getVariable(name);
    console.log(`   ${name} = ${val}`);
  }
}

console.log('─'.repeat(50));
