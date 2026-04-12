const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const Lyra = require('../lyra');
const GitNexus = require('../gitnexus');

const PORT = 3001;
const HOME = os.homedir();
const MEMORY_DIR = path.join(HOME, '.ultraflow', 'memory');
const LOG_FILE = path.join(MEMORY_DIR, 'agent-usage-log.json');

if (!fs.existsSync(MEMORY_DIR)) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
}

const tools = [
  { name: 'memory_search', description: 'Search the agent memory/knowledge base' },
  { name: 'memory_write', description: 'Store information in agent memory' },
  { name: 'memory_read', description: 'Retrieve stored information from memory' },
  { name: 'memory_list', description: 'List all stored memory entries' },
  { name: 'memory_delete', description: 'Delete a memory entry' },
  { name: 'checkpoint_save', description: 'Save a checkpoint of current state' },
  { name: 'checkpoint_load', description: 'Load a checkpoint' },
  { name: 'checkpoint_list', description: 'List all checkpoints' },
  { name: 'lyra_optimize', description: 'Optimize a prompt using Lyra' },
  { name: 'lyra_optimize_checkpoint', description: 'Optimize checkpoint content with Lyra' },
  { name: 'gitnexus_analyze', description: 'Analyze codebase with GitNexus' },
  { name: 'gitnexus_impact', description: 'Get blast radius for a symbol' },
  { name: 'gitnexus_query', description: 'Query codebase by concept' },
  { name: 'gitnexus_context', description: 'Get 360-degree view of a symbol' },
  { name: 'gitnexus_detect_changes', description: 'Detect changes and risk level' },
  { name: 'token_usage', description: 'Get token usage statistics' },
  { name: 'session_history', description: 'Get session history' },
  { name: 'context_window', description: 'Manage context window' },
  { name: 'preferences_get', description: 'Get agent preferences' },
  { name: 'preferences_set', description: 'Set agent preferences' },
  { name: 'capabilities_list', description: 'List agent capabilities' },
  { name: 'mcp_tools_list', description: 'List available MCP tools' }
];

let memoryStore = {};
let checkpoints = {};
let preferences = { theme: 'dark', autoOptimize: true, lyraMode: 'auto' };

function handleMcpRequest(body, res) {
  const response = { jsonrpc: '2.0' };
  
  try {
    const request = JSON.parse(body);
    
    if (request.method === 'tools/list') {
      response.result = { tools };
      res.end(JSON.stringify(response));
      return;
    }
    
    if (request.method === 'tools/call') {
      const { name, arguments: args } = request.params || {};
      const result = executeTool(name, args);
      response.result = { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      res.end(JSON.stringify(response));
      return;
    }
    
    if (request.method === 'initialize') {
      response.result = { protocolVersion: '2024-11-05', capabilities: {}, serverInfo: { name: 'ultraflow-brain', version: '1.2.0' } };
      res.end(JSON.stringify(response));
      return;
    }
    
    response.error = { code: -32601, message: 'Method not found' };
    res.end(JSON.stringify(response));
  } catch (e) {
    response.error = { code: -32700, message: 'Parse error' };
    res.end(JSON.stringify(response));
  }
}

function executeTool(name, args) {
  switch (name) {
    case 'memory_search':
      return memorySearch(args?.query || '');
    case 'memory_write':
      return memoryWrite(args?.key, args?.value);
    case 'memory_read':
      return memoryRead(args?.key);
    case 'memory_list':
      return memoryList();
    case 'memory_delete':
      return memoryDelete(args?.key);
    case 'checkpoint_save':
      return checkpointSave(args?.name, args?.data);
    case 'checkpoint_load':
      return checkpointLoad(args?.name);
    case 'checkpoint_list':
      return checkpointList();
    case 'lyra_optimize':
      return lyraOptimize(args?.prompt);
    case 'lyra_optimize_checkpoint':
      return lyraOptimizeCheckpoint(args?.checkpoint);
    case 'gitnexus_analyze':
      return gitnexusAnalyze(args?.options);
    case 'gitnexus_impact':
      return gitnexusImpact(args?.symbol, args?.direction);
    case 'gitnexus_query':
      return gitnexusQuery(args?.concept);
    case 'gitnexus_context':
      return gitnexusContext(args?.symbol);
    case 'gitnexus_detect_changes':
      return gitnexusDetectChanges(args?.base);
    case 'token_usage':
      return getTokenUsage();
    case 'session_history':
      return getSessionHistory();
    case 'context_window':
      return manageContextWindow(args?.action, args?.data);
    case 'preferences_get':
      return preferences;
    case 'preferences_set':
      return setPreferences(args?.key, args?.value);
    case 'capabilities_list':
      return { capabilities: ['memory', 'checkpoints', 'lyra', 'tokens', 'sessions', 'gitnexus'] };
    case 'mcp_tools_list':
      return { tools: tools.map(t => t.name) };
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

function memorySearch(query) {
  const optimizedQuery = Lyra.optimize(query, { mode: 'auto' }).optimized;
  const results = Object.entries(memoryStore)
    .filter(([k, v]) => k.includes(query) || JSON.stringify(v).includes(query))
    .map(([k, v]) => ({ key: k, value: v, lyraOptimized: true }));
  return { query: optimizedQuery, results, count: results.length, lyraApplied: true };
}

function memoryWrite(key, value) {
  memoryStore[key] = value;
  return { success: true, key };
}

function memoryRead(key) {
  return { key, value: memoryStore[key] || null };
}

function memoryList() {
  return { entries: Object.keys(memoryStore), count: Object.keys(memoryStore).length };
}

function memoryDelete(key) {
  delete memoryStore[key];
  return { success: true, key };
}

function checkpointSave(name, data) {
  const optimized = Lyra.optimizeCheckpoint({ content: JSON.stringify(data) });
  checkpoints[name] = { data, lyraOptimized: true, lyraTechniques: optimized.lyraTechniques };
  return { success: true, name };
}

function checkpointLoad(name) {
  return { name, data: checkpoints[name]?.data || null };
}

function checkpointList() {
  return { checkpoints: Object.keys(checkpoints), count: Object.keys(checkpoints).length };
}

function lyraOptimize(prompt) {
  const result = Lyra.optimize(prompt, { mode: 'auto' });
  return result;
}

function lyraOptimizeCheckpoint(checkpoint) {
  const result = Lyra.optimizeCheckpoint(checkpoint);
  return result;
}

function gitnexusAnalyze(options = {}) {
  const HOME = os.homedir();
  const projects = [
    path.join(HOME, 'AI'),
    path.join(HOME, 'AI-OpenCode')
  ];
  
  const results = [];
  for (const projectPath of projects) {
    if (fs.existsSync(projectPath)) {
      try {
        execSync('npx gitnexus analyze', { cwd: projectPath, stdio: 'ignore', shell: true });
        results.push({ project: path.basename(projectPath), status: 'indexed' });
      } catch {
        results.push({ project: path.basename(projectPath), status: 'error' });
      }
    }
  }
  return { results, count: results.length };
}

function gitnexusImpact(symbol, direction = 'upstream') {
  const HOME = os.homedir();
  const mainProject = path.join(HOME, 'AI');
  
  try {
    const result = execSync(`npx gitnexus impact ${symbol} --direction ${direction}`, {
      cwd: mainProject,
      encoding: 'utf-8',
      shell: true
    });
    return JSON.parse(result);
  } catch {
    return { error: 'GitNexus not available or symbol not found', symbol, direction };
  }
}

function gitnexusQuery(concept) {
  const HOME = os.homedir();
  const mainProject = path.join(HOME, 'AI');
  
  try {
    const result = execSync(`npx gitnexus query "${concept}"`, {
      cwd: mainProject,
      encoding: 'utf-8',
      shell: true
    });
    return JSON.parse(result);
  } catch {
    return { error: 'GitNexus not available', concept };
  }
}

function gitnexusContext(symbol) {
  const HOME = os.homedir();
  const mainProject = path.join(HOME, 'AI');
  
  try {
    const result = execSync(`npx gitnexus context ${symbol}`, {
      cwd: mainProject,
      encoding: 'utf-8',
      shell: true
    });
    return JSON.parse(result);
  } catch {
    return { error: 'GitNexus not available', symbol };
  }
}

function gitnexusDetectChanges(base = 'HEAD~1') {
  const HOME = os.homedir();
  const mainProject = path.join(HOME, 'AI');
  
  try {
    const result = execSync(`npx gitnexus detect-changes --base ${base}`, {
      cwd: mainProject,
      encoding: 'utf-8',
      shell: true
    });
    return JSON.parse(result);
  } catch {
    return { error: 'GitNexus not available', base };
  }
}

function getTokenUsage() {
  const logPath = path.join(HOME, '.claude', 'memory', 'agent-usage-log.json');
  try {
    if (fs.existsSync(logPath)) {
      const data = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
      return { source: 'agent-usage-log', data };
    }
  } catch {}
  return { source: 'none', message: 'No token data available' };
}

function getSessionHistory() {
  return { sessions: [], count: 0 };
}

function manageContextWindow(action, data) {
  return { action, status: 'ok' };
}

function setPreferences(key, value) {
  preferences[key] = value;
  return { success: true, key, value };
}

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'POST' && req.url === '/mcp') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => handleMcpRequest(body, res));
  } else if (req.method === 'GET' && req.url === '/health') {
    res.end(JSON.stringify({ status: 'ok', server: 'ultraflow-brain', version: '1.2.0' }));
  } else {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

class BrainServer {
  constructor() {
    this.server = server;
    this.server.listen(PORT, () => {
      console.log(`⚡ Ultraflow Brain MCP running on port ${PORT}`);
      console.log(`   MCP endpoint: http://localhost:${PORT}/mcp`);
    });
  }
}

module.exports = BrainServer;