#!/usr/bin/env node

/**
 * Brain Memory MCP Server
 * Provides 17 tools for memory, context, checkpoint, and token tracking.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { VaultManager } from './vault-manager.js';
import { BrainNexus } from './brain-nexus.js';
import { BrainSwarm } from './brain-swarm.js';
import { ContextMonitor } from './context-monitor.js';
import { ContextCheckpoint } from './context-checkpoint.js';
import { DreamLordLearner } from './dreamlord-learner.js';
import { DashboardViewer } from './dashboard-viewer.js';
import { SessionReporter } from './session-reporter.js';
import { AgentUsageLogger } from './agent-usage-logger.js';
import { getMergedConfig } from '../config/user-config.js';
import { detectAgents } from '../config/auto-detect.js';
import { initMiddleware as initLyra, optimizeSearchQuery, optimizeMemoryContext, optimizeCheckpointSummary } from '../lyra/middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Memory directory - works from any location
const MEMORY_DIRS = [
  process.cwd() + '/.claude/memory',
  path.join(__dirname, '../../.claude/memory'),
  path.join(process.env.HOME || '', '.claude/memory'),
  process.env.BRAIN_MEMORY_PATH,
].filter(Boolean);

// Resolve the active memory directory
let activeMemoryDir = null;
let memoryIndex = {};
let vaultManager = null;
let brainNexus = null;
let brainSwarm = null;
let contextMonitor = null;
let contextCheckpoint = null;
let dreamlord = null;
let dashboardViewer = null;
let sessionReporter = null;
let agentUsageLogger = null;

// Initialize memory index on startup
function initializeMemoryIndex() {
  // Initialize Lyra middleware
  const config = getMergedConfig();
  if (config.lyra?.enabled) {
    initLyra({
      mode: config.lyra.mode || 'auto',
      platform: config.lyra.platforms?.searchQueries || 'generic',
      autoOptimize: config.lyra.autoOptimize !== false,
    });
    console.log('[Brain] Lyra prompt optimization enabled');
  }

  // Get config
  const memoryPath = config.memory?.path || '.claude/memory';
  
  for (const dir of MEMORY_DIRS) {
    if (fs.existsSync(dir)) {
      activeMemoryDir = dir;
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'MEMORY.md');
      for (const file of files) {
        const filePath = path.join(dir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const parsed = parseMemory(content, filePath);
          if (parsed) {
            memoryIndex[parsed.name] = parsed;
          }
        } catch (e) {
          // Skip unreadable files
        }
      }
      break;
    }
  }

  // Initialize components if memory dir exists
  if (activeMemoryDir) {
    const vaultPath = path.join(activeMemoryDir, 'vault.json');
    const settingsPath = path.join(path.dirname(activeMemoryDir), '../settings.json');
    
    vaultManager = new VaultManager(vaultPath);
    brainNexus = new BrainNexus(activeMemoryDir);
    brainSwarm = new BrainSwarm(vaultManager.vault?.swarm || {});
    contextMonitor = new ContextMonitor(settingsPath);
    contextCheckpoint = new ContextCheckpoint(activeMemoryDir);
    dreamlord = new DreamLordLearner(activeMemoryDir);
    dashboardViewer = new DashboardViewer();
    sessionReporter = new SessionReporter(activeMemoryDir);
    agentUsageLogger = new AgentUsageLogger(activeMemoryDir);

    // Auto-index if stale
    if (brainNexus.isStale(Object.keys(memoryIndex).length)) {
      brainNexus.index(memoryIndex);
    }
    
    console.log('[Brain] Indexed', Object.keys(memoryIndex).length, 'memories');
  } else {
    console.log('[Brain] No memory directory found, running in minimal mode');
  }
}

// Parse memory file (YAML frontmatter + content)
function parseMemory(content, filePath) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;

  const frontmatter = match[1];
  const body = match[2];

  const metadata = {};
  for (const line of frontmatter.split('\n')) {
    const [key, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim();
    if (key && value) {
      metadata[key.trim()] = value.replace(/^["']|["']$/g, '');
    }
  }

  return {
    name: metadata.name || path.basename(filePath, '.md'),
    description: metadata.description || '',
    type: metadata.type || 'reference',
    filePath,
    content: body.trim(),
    keywords: extractKeywords(body),
    tokens: Math.ceil(body.length / 4),
  };
}

// Extract keywords from content for semantic search
function extractKeywords(content) {
  const words = content.toLowerCase().match(/\b\w+\b/g) || [];
  return [...new Set(words)].slice(0, 50);
}

// Search memories by query
function searchMemories(query) {
  // Optimize query with Lyra
  const optimizedQuery = optimizeSearchQuery(query);
  const effectiveQuery = optimizedQuery !== query ? optimizedQuery : query;
  
  const queryTerms = effectiveQuery.toLowerCase().split(/\s+/);
  const results = [];

  for (const [name, memory] of Object.entries(memoryIndex)) {
    let score = 0;
    const searchText = `${memory.name} ${memory.description} ${memory.type} ${memory.content}`.toLowerCase();

      if (searchText.includes(effectiveQuery.toLowerCase())) score += 10;

    for (const term of queryTerms) {
      if (memory.name.toLowerCase().includes(term)) score += 5;
      if (memory.description.toLowerCase().includes(term)) score += 3;
      if (memory.keywords?.includes(term)) score += 1;
    }

    if (score > 0) {
      results.push({
        name: memory.name,
        description: memory.description,
        type: memory.type,
        tokens: memory.tokens,
        score,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 10);
}

// Get full memory content
function getMemory(name) {
  const memory = memoryIndex[name];
  if (!memory) {
    return { error: `Memory "${name}" not found`, available: Object.keys(memoryIndex) };
  }

  // Track access in vault
  if (vaultManager) {
    vaultManager.recordAccess(name);
    vaultManager.saveVault();
  }

  return {
    name: memory.name,
    description: memory.description,
    type: memory.type,
    tokens: memory.tokens,
    content: memory.content,
  };
}

// List all memories, optionally filtered by type
function listMemories(type) {
  const memories = Object.values(memoryIndex)
    .filter(m => !type || m.type === type)
    .map(m => ({
      name: m.name,
      description: m.description,
      type: m.type,
      tokens: m.tokens,
    }));
  return {
    total: memories.length,
    totalTokens: memories.reduce((sum, m) => sum + m.tokens, 0),
    memories,
  };
}

// Refresh memory index
function refreshMemoryIndex() {
  memoryIndex = {};
  initializeMemoryIndex();
  return {
    status: 'success',
    count: Object.keys(memoryIndex).length,
    memories: Object.keys(memoryIndex),
  };
}

// Checkpoint: Save working state before /clear
function checkpoint({ summary, next_steps, tags }) {
  if (!activeMemoryDir) {
    return { error: 'No active memory directory found' };
  }

  const timestamp = new Date().toISOString();
  const checkpointData = {
    summary,
    next_steps: next_steps || '',
    tags: tags || [],
    timestamp,
  };

  // Write checkpoint-latest.md (overwrite)
  const checkpointContent = `---
name: checkpoint-latest
description: Most recent session checkpoint
type: project
timestamp: ${timestamp}
tags: ${(tags || []).join(', ')}
---

## Summary
${summary}

## Next Steps
${next_steps || 'None specified'}

## Session Context
- Timestamp: ${timestamp}
- Memories indexed: ${Object.keys(memoryIndex).length}
- Tags: ${(tags || []).join(', ') || 'none'}
`;

  const checkpointPath = path.join(activeMemoryDir, 'checkpoint-latest.md');
  fs.writeFileSync(checkpointPath, checkpointContent);

  // Record session patterns in BrainNexus
  if (brainNexus) {
    const recentlyAccessed = Object.entries(memoryIndex)
      .filter(([name]) => {
        const node = brainNexus.graph?.nodes?.[name];
        return node && node.lastAccessed;
      })
      .sort((a, b) => {
        const nodeA = brainNexus.graph.nodes[a[0]];
        const nodeB = brainNexus.graph.nodes[b[0]];
        return (nodeB.lastAccessed || '').localeCompare(nodeA.lastAccessed || '');
      })
      .slice(0, 5)
      .map(([name]) => name);

    if (recentlyAccessed.length >= 2) {
      brainNexus.recordSessionSequence(recentlyAccessed);
    }

    if (brainNexus.isStale(Object.keys(memoryIndex).length)) {
      brainNexus.index(memoryIndex);
    }
  }

  // Append to checkpoint-log.md (rolling, max 50)
  const logPath = path.join(activeMemoryDir, 'checkpoint-log.md');
  let logContent = '';
  if (fs.existsSync(logPath)) {
    logContent = fs.readFileSync(logPath, 'utf-8');
  }

  const logEntry = `- [${timestamp}] ${summary}${next_steps ? ' → Next: ' + next_steps : ''}\n`;
  const lines = logContent.split('\n').filter(l => l.startsWith('- '));
  lines.unshift(logEntry.trim());
  const cappedLines = lines.slice(0, 50);
  fs.writeFileSync(logPath, cappedLines.join('\n') + '\n');

  return {
    status: 'saved',
    timestamp,
    hint: 'Safe to /clear. Use load_context to resume.',
  };
}

// Load Context: Restore context after /clear or session start
function loadContext({ query, depth }) {
  const effectiveDepth = depth || 'summary';

  // Always try to load latest checkpoint
  let checkpointSummary = null;
  const checkpointPath = activeMemoryDir
    ? path.join(activeMemoryDir, 'checkpoint-latest.md')
    : null;

  if (checkpointPath && fs.existsSync(checkpointPath)) {
    const content = fs.readFileSync(checkpointPath, 'utf-8');
    const parsed = parseMemory(content, checkpointPath);
    if (parsed) {
      const summaryMatch = parsed.content.match(/## Summary\n([\s\S]*?)(?=\n## )/);
      const nextMatch = parsed.content.match(/## Next Steps\n([\s\S]*?)(?=\n## )/);
      const timestampMatch = content.match(/timestamp: (.+)/);

      const ts = timestampMatch ? new Date(timestampMatch[1]) : null;
      const ago = ts ? formatTimeAgo(ts) : 'unknown';

      const rawSummary = summaryMatch ? summaryMatch[1].trim() : parsed.content.slice(0, 200);
      const optimizedSummary = optimizeCheckpointSummary(rawSummary);
      
      checkpointSummary = {
        summary: optimizedSummary !== rawSummary ? optimizedSummary : rawSummary,
        next_steps: nextMatch ? nextMatch[1].trim() : '',
        when: ago,
      };
    }
  }

  // Load predigest from previous session (if exists)
  let predigestPredictions = [];
  if (activeMemoryDir) {
    const dreamsDir = path.join(activeMemoryDir, '.dreams');
    if (fs.existsSync(dreamsDir)) {
      const files = fs.readdirSync(dreamsDir)
        .filter(f => f.startsWith('predigest-') && f.endsWith('.json'))
        .sort()
        .reverse();

      if (files.length > 0) {
        try {
          const predigestPath = path.join(dreamsDir, files[0]);
          const predigest = JSON.parse(fs.readFileSync(predigestPath, 'utf-8'));
          if (predigest.predictions && Array.isArray(predigest.predictions)) {
            predigestPredictions = predigest.predictions.slice(0, 2);
          }
        } catch (e) {
          // Ignore predigest load errors
        }
      }
    }
  }

  // Get BrainNexus predictions
  let predictions = [];
  if (brainNexus) {
    const lastMemory = checkpointSummary?.summary
      ? Object.keys(memoryIndex).find(m => checkpointSummary.summary.toLowerCase().includes(m.toLowerCase()))
      : null;

    if (lastMemory) {
      predictions = brainNexus.predictNext(lastMemory)
        .map(p => ({ name: p.name, confidence: p.confidence, reason: p.reason }));
    }
  }

  const allPredictions = [...predigestPredictions, ...predictions].slice(0, 3);

  if (!query) {
    return {
      checkpoint: checkpointSummary || { summary: 'No checkpoint found', next_steps: '', when: 'never' },
      predictions: allPredictions,
      usage_tracking: {
        marked_at: Date.now(),
        unload_after: '30m of inactivity',
      },
      hint: 'Use search_memories(query) or get_memory(name) for specific context.',
    };
  }

  const matches = searchMemories(query);

  let vaultMatches = [];
  if (matches.length < 3 && vaultManager) {
    const vaultResults = vaultManager.search(query, true);
    vaultMatches = vaultResults
      .filter(r => r.location === 'vault')
      .slice(0, 3 - matches.length)
      .map(r => ({
        name: r.memory.name,
        type: r.memory.type,
        summary: (r.memory.content || '').slice(0, 200),
        location: 'vault',
        score: r.score,
      }));
  }

  if (brainNexus && matches.length > 0) {
    const topContext = brainNexus.context(matches[0].name);
    if (topContext.cluster) {
      for (const match of matches) {
        if (topContext.cluster.members.includes(match.name)) {
          match.score += 3;
        }
      }
      matches.sort((a, b) => b.score - a.score);
    }
  }

  if (effectiveDepth === 'full' && matches.length > 0) {
    const fullMatches = matches.slice(0, 2).map(m => {
      const memory = memoryIndex[m.name];
      return {
        name: m.name,
        type: m.type,
        content: memory ? memory.content : '',
        tokens: m.tokens,
      };
    });

    return {
      checkpoint: checkpointSummary,
      predictions: allPredictions.slice(0, 2),
      matches: fullMatches,
      vault_matches: vaultMatches,
      usage_tracking: {
        marked_at: Date.now(),
        unload_after: '30m of inactivity',
      },
    };
  }

  return {
    checkpoint: checkpointSummary,
    predictions: allPredictions.slice(0, 3),
    matches: matches.slice(0, 5).map(m => ({
      name: m.name,
      description: m.description,
      type: m.type,
      tokens: m.tokens,
    })),
    vault_matches: vaultMatches,
    usage_tracking: {
      marked_at: Date.now(),
      unload_after: '30m of inactivity',
    },
    hint: 'Use get_memory(name) for full content of any match.',
  };
}

// Save Memory: Write a new memory file directly
function saveMemory({ name, content, type, description }) {
  if (!activeMemoryDir) {
    return { error: 'No active memory directory found' };
  }

  const effectiveType = type || 'reference';
  const effectiveDesc = description || `Memory: ${name}`;
  const filename = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.md';
  const filePath = path.join(activeMemoryDir, filename);

  const fileContent = `---
name: ${name}
description: ${effectiveDesc}
type: ${effectiveType}
---

${content}
`;

  fs.writeFileSync(filePath, fileContent);

  const parsed = parseMemory(fileContent, filePath);
  if (parsed) {
    memoryIndex[parsed.name] = parsed;
  }

  return {
    status: 'saved',
    name,
    file: filename,
    tokens: Math.ceil(content.length / 4),
  };
}

// Helper: format time ago
function formatTimeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Context Management Tools
function generateCheckpoint(args) {
  if (!contextCheckpoint) {
    return { error: 'Checkpoint system not initialized' };
  }
  const cp = contextCheckpoint.generateCheckpoint(
    args.summary,
    args.nextSteps,
    args.tags,
    memoryIndex,
    vaultManager?.vault
  );
  return contextCheckpoint.saveCheckpoint(cp);
}

function adjustThreshold(args) {
  if (!contextMonitor || !dreamlord) {
    return { error: 'Context management not initialized' };
  }
  const adjustment = contextMonitor.updateThreshold(args.newThreshold);
  dreamlord.updateThreshold(adjustment.old, adjustment.new, args.reason || 'manual');
  return adjustment;
}

function loadCheckpointTool(args) {
  if (!contextCheckpoint) {
    return { error: 'Checkpoint system not initialized' };
  }
  if (args.id) {
    return contextCheckpoint.loadCheckpoint(args.id);
  }
  return contextCheckpoint.loadLatest() || { error: 'No checkpoints found' };
}

// Dashboard Tools
async function viewDashboard(args) {
  if (!dashboardViewer) {
    return { error: 'Dashboard viewer not initialized' };
  }
  return await dashboardViewer.viewDashboard();
}

async function getTokenSummary(args) {
  if (!dashboardViewer) {
    return { error: 'Dashboard viewer not initialized' };
  }
  return await dashboardViewer.getDashboardData();
}

async function getTaskList(args) {
  if (!dashboardViewer) {
    return { error: 'Dashboard viewer not initialized' };
  }
  return await dashboardViewer.getTaskCosts();
}

async function getOptimizationAlerts(args) {
  if (!dashboardViewer) {
    return { error: 'Dashboard viewer not initialized' };
  }
  return await dashboardViewer.getOptimizationAlerts();
}

function generateSessionReport(args) {
  if (!sessionReporter) {
    return { error: 'Session reporter not initialized' };
  }
  return sessionReporter.generateSessionReport(args || {});
}

// Agent Usage Logging Tools
function getAgentUsageLog(args) {
  if (!agentUsageLogger) {
    return { error: 'Agent usage logger not initialized' };
  }
  return agentUsageLogger.getUsageLog();
}

function logAgentDispatch(args) {
  if (!agentUsageLogger) {
    return { error: 'Agent usage logger not initialized' };
  }
  const { agent_id, model, description, input_tokens, output_tokens, status } = args;
  if (!agent_id || !model) {
    return { error: 'Missing required fields: agent_id, model' };
  }

  const tokens = {
    input_tokens: input_tokens || 0,
    output_tokens: output_tokens || 0,
    total_tokens: (input_tokens || 0) + (output_tokens || 0),
  };

  return agentUsageLogger.logAgentDispatch(
    agent_id,
    model,
    description || '',
    tokens,
    null,
    status || 'complete'
  );
}

function getAgentUsageSummary(args) {
  if (!agentUsageLogger) {
    return { error: 'Agent usage logger not initialized' };
  }
  return agentUsageLogger.getSummaryByModel();
}

// MCP Protocol Handler
async function handleToolCall(request) {
  const { name, arguments: args } = request;

  switch (name) {
    case 'search_memories':
      return searchMemories(args.query);
    case 'get_memory':
      return getMemory(args.name);
    case 'list_memories':
      return listMemories(args.type);
    case 'refresh_index':
      return refreshMemoryIndex();
    case 'checkpoint':
      return checkpoint(args);
    case 'load_context':
      return loadContext(args || {});
    case 'save_memory':
      return saveMemory(args);
    case 'generateCheckpoint':
      return generateCheckpoint(args);
    case 'adjustThreshold':
      return adjustThreshold(args);
    case 'loadCheckpoint':
      return loadCheckpointTool(args);
    case 'view_dashboard':
      return await viewDashboard(args);
    case 'get_token_summary':
      return await getTokenSummary(args);
    case 'get_task_list':
      return await getTaskList(args);
    case 'get_optimization_alerts':
      return await getOptimizationAlerts(args);
    case 'generate_session_report':
      return generateSessionReport(args);
    case 'get_agent_usage_log':
      return getAgentUsageLog(args);
    case 'log_agent_dispatch':
      return logAgentDispatch(args);
    case 'get_agent_usage_summary':
      return getAgentUsageSummary(args);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// Tool definitions for tools/list
const TOOLS = [
  {
    name: 'search_memories',
    description: 'Search memories by keyword or semantic query. Returns name/description/type pointers.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (e.g., "polymarket trading")' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_memory',
    description: 'Retrieve full content of a specific memory.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Memory name' },
      },
      required: ['name'],
    },
  },
  {
    name: 'list_memories',
    description: 'List all memories with name/description/type/tokens.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['user', 'feedback', 'project', 'reference'], description: 'Filter by memory type' },
      },
    },
  },
  {
    name: 'refresh_index',
    description: 'Refresh the memory index from disk.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'checkpoint',
    description: 'Save current working state before /clear.',
    inputSchema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'What was accomplished' },
        next_steps: { type: 'string', description: 'What should happen next' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Keywords for retrieval' },
      },
      required: ['summary'],
    },
  },
  {
    name: 'load_context',
    description: 'Restore context after /clear or session start.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What context you need' },
        depth: { type: 'string', enum: ['summary', 'full'], description: 'summary=pointers only, full=content' },
      },
    },
  },
  {
    name: 'save_memory',
    description: 'Write a new memory file.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Memory name' },
        content: { type: 'string', description: 'Memory content' },
        type: { type: 'string', enum: ['user', 'feedback', 'project', 'reference'] },
        description: { type: 'string', description: 'One-line description' },
      },
      required: ['name', 'content'],
    },
  },
  {
    name: 'generateCheckpoint',
    description: 'Generate and save a context checkpoint.',
    inputSchema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Session summary' },
        nextSteps: { type: 'string', description: 'What happens next' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['summary'],
    },
  },
  {
    name: 'adjustThreshold',
    description: 'Adjust context threshold.',
    inputSchema: {
      type: 'object',
      properties: {
        newThreshold: { type: 'number', description: 'New threshold value' },
        reason: { type: 'string', description: 'Reason for adjustment' },
      },
      required: ['newThreshold'],
    },
  },
  {
    name: 'loadCheckpoint',
    description: 'Load a previously saved checkpoint.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Checkpoint ID (omit for latest)' },
      },
    },
  },
  {
    name: 'view_dashboard',
    description: 'View current token dashboard state.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_token_summary',
    description: 'Get token cost summary from dashboard.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_task_list',
    description: 'Get list of all tasks with cost breakdown.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_optimization_alerts',
    description: 'Get cost optimization opportunities.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'generate_session_report',
    description: 'Generate a session report.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        start_time: { type: 'string' },
        end_time: { type: 'string' },
        tasks: { type: 'array' },
        total_tokens: { type: 'number' },
        total_cost: { type: 'number' },
        budget: { type: 'number' },
      },
    },
  },
  {
    name: 'get_agent_usage_log',
    description: 'Get all agent dispatch token usage logs.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'log_agent_dispatch',
    description: 'Log an agent dispatch with token usage.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string' },
        model: { type: 'string' },
        description: { type: 'string' },
        input_tokens: { type: 'number' },
        output_tokens: { type: 'number' },
        status: { type: 'string' },
      },
      required: ['agent_id', 'model'],
    },
  },
  {
    name: 'get_agent_usage_summary',
    description: 'Get agent usage summary grouped by model.',
    inputSchema: { type: 'object', properties: {} },
  },
];

// MCP server implementation
async function runMCPServer() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  // Initialize on startup
  initializeMemoryIndex();

  // Handle requests
  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const request = JSON.parse(line);
      let response;

      if (request.method === 'initialize') {
        response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'ultraflow-brain', version: '1.1.0' },
          },
        };
      } else if (request.method === 'notifications/initialized') {
        continue;
      } else if (request.method === 'tools/list') {
        response = {
          jsonrpc: '2.0',
          id: request.id,
          result: { tools: TOOLS },
        };
      } else if (request.method === 'tools/call') {
        const result = await handleToolCall(request.params);
        response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          },
        };
      } else {
        response = {
          jsonrpc: '2.0',
          id: request.id,
          error: { code: -32601, message: 'Method not found' },
        };
      }

      process.stdout.write(JSON.stringify(response) + '\n');
    } catch (error) {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32700, message: 'Parse error', data: error.message },
        }) + '\n'
      );
    }
  }
}

// Start server
runMCPServer().catch(err => {
  process.stderr.write('Server error: ' + err.message + '\n');
  process.exit(1);
});