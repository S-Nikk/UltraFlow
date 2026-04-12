#!/usr/bin/env node

/**
 * Ultraflow MCP Server
 * JSON-RPC 2.0 implementation exposing memory, context, checkpoint, token tracking, and Lyra tools
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { getMergedConfig } from '../config/user-config.js';
import { LyraOptimizer } from '../lyra/LyraOptimizer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Memory directory paths
const MEMORY_DIRS = [
  process.cwd() + '/.claude/memory',
  path.join(__dirname, '../../.claude/memory'),
  path.join(process.env.HOME || '', '.claude/memory'),
  process.env.BRAIN_MEMORY_PATH,
].filter(Boolean);

// State
let activeMemoryDir = null;
let memoryIndex = {};
let lyraOptimizer = null;

// Initialize components
function initialize() {
  const config = getMergedConfig();
  const memoryPath = config.memory?.path || '.claude/memory';

  // Initialize Lyra
  if (config.lyra?.enabled) {
    lyraOptimizer = new LyraOptimizer({
      mode: config.lyra.mode || 'auto',
      platform: config.lyra.platforms?.searchQueries || 'generic'
    });
  }

  // Find and load memory index
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
        } catch (e) {}
      }
      break;
    }
  }

  console.error('[MCP] Initialized with', Object.keys(memoryIndex).length, 'memories');
}

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

function extractKeywords(content) {
  const words = content.toLowerCase().match(/\b\w+\b/g) || [];
  return [...new Set(words)].slice(0, 50);
}

// Tool Implementations
function searchMemories(args) {
  const query = args.query || '';
  const queryTerms = query.toLowerCase().split(/\s+/);
  const results = [];

  for (const [name, memory] of Object.entries(memoryIndex)) {
    let score = 0;
    const searchText = `${memory.name} ${memory.description} ${memory.type} ${memory.content}`.toLowerCase();

    if (searchText.includes(query.toLowerCase())) score += 10;
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
        score
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 10);
}

function getMemory(args) {
  const memory = memoryIndex[args.name];
  if (!memory) {
    return { error: `Memory "${args.name}" not found`, available: Object.keys(memoryIndex) };
  }
  return {
    name: memory.name,
    description: memory.description,
    type: memory.type,
    tokens: memory.tokens,
    content: memory.content,
  };
}

function listMemories(args) {
  const memories = Object.values(memoryIndex)
    .filter(m => !args.type || m.type === args.type)
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

function saveMemory(args) {
  if (!activeMemoryDir) {
    return { error: 'No active memory directory found' };
  }

  const filename = args.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.md';
  const filePath = path.join(activeMemoryDir, filename);

  const fileContent = `---
name: ${args.name}
description: ${args.description || `Memory: ${args.name}`}
type: ${args.type || 'reference'}
---

${args.content}
`;

  fs.writeFileSync(filePath, fileContent);

  const parsed = parseMemory(fileContent, filePath);
  if (parsed) {
    memoryIndex[parsed.name] = parsed;
  }

  return {
    status: 'saved',
    name: args.name,
    file: filename,
    tokens: Math.ceil((args.content || '').length / 4),
  };
}

function refreshIndex() {
  memoryIndex = {};
  initialize();
  return {
    status: 'success',
    count: Object.keys(memoryIndex).length,
    memories: Object.keys(memoryIndex),
  };
}

function checkpoint(args) {
  if (!activeMemoryDir) {
    return { error: 'No active memory directory found' };
  }

  const timestamp = new Date().toISOString();
  const checkpointContent = `---
name: checkpoint-latest
description: Most recent session checkpoint
type: project
timestamp: ${timestamp}
tags: ${(args.tags || []).join(', ')}
---

## Summary
${args.summary || 'No summary provided'}

## Next Steps
${args.next_steps || 'None specified'}

## Session Context
- Timestamp: ${timestamp}
- Memories indexed: ${Object.keys(memoryIndex).length}
`;

  const checkpointPath = path.join(activeMemoryDir, 'checkpoint-latest.md');
  fs.writeFileSync(checkpointPath, checkpointContent);

  return {
    status: 'saved',
    timestamp,
    hint: 'Safe to /clear. Use load_context to resume.',
  };
}

function loadContext(args) {
  if (!activeMemoryDir) {
    return { checkpoint: { summary: 'No memory directory', next_steps: '', when: 'never' } };
  }

  const checkpointPath = path.join(activeMemoryDir, 'checkpoint-latest.md');
  let checkpointSummary = null;

  if (fs.existsSync(checkpointPath)) {
    const content = fs.readFileSync(checkpointPath, 'utf-8');
    const summaryMatch = content.match(/## Summary\n([\s\S]*?)(?=\n## )/);
    const nextMatch = content.match(/## Next Steps\n([\s\S]*?)(?=\n## )/);
    const timestampMatch = content.match(/timestamp: (.+)/);

    const ts = timestampMatch ? new Date(timestampMatch[1]) : null;
    const ago = ts ? formatTimeAgo(ts) : 'unknown';

    checkpointSummary = {
      summary: summaryMatch ? summaryMatch[1].trim() : content.slice(0, 200),
      next_steps: nextMatch ? nextMatch[1].trim() : '',
      when: ago,
    };
  }

  const query = args.query;
  if (!query) {
    return {
      checkpoint: checkpointSummary || { summary: 'No checkpoint', next_steps: '', when: 'never' },
      hint: 'Use search_memories(query) for specific context.',
    };
  }

  const matches = searchMemories({ query });

  return {
    checkpoint: checkpointSummary,
    matches: matches.slice(0, 5).map(m => ({
      name: m.name,
      description: m.description,
      type: m.type,
      tokens: m.tokens,
    })),
    hint: 'Use get_memory(name) for full content.',
  };
}

function formatTimeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function lyraOptimize(args) {
  if (!lyraOptimizer) {
    return { error: 'Lyra not initialized' };
  }

  return lyraOptimizer.optimize(args.prompt, {
    mode: args.mode || 'basic',
    platform: args.platform || 'generic',
  });
}

function lyraAnalyze(args) {
  if (!lyraOptimizer) {
    return { error: 'Lyra not initialized' };
  }

  return lyraOptimizer.analyze(args.prompt);
}

// Tool definitions
const TOOLS = [
  {
    name: 'search_memories',
    description: 'Search memories by keyword or semantic query',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
  {
    name: 'get_memory',
    description: 'Retrieve full content of a specific memory',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    },
  },
  {
    name: 'list_memories',
    description: 'List all memories with name/description/type/tokens',
    inputSchema: {
      type: 'object',
      properties: { type: { type: 'string', enum: ['user', 'feedback', 'project', 'reference'] } },
    },
  },
  {
    name: 'save_memory',
    description: 'Write a new memory file',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        content: { type: 'string' },
        type: { type: 'string', enum: ['user', 'feedback', 'project', 'reference'] },
        description: { type: 'string' },
      },
      required: ['name', 'content'],
    },
  },
  {
    name: 'refresh_index',
    description: 'Refresh the memory index from disk',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'checkpoint',
    description: 'Save current working state before /clear',
    inputSchema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        next_steps: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['summary'],
    },
  },
  {
    name: 'load_context',
    description: 'Restore context after /clear or session start',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        depth: { type: 'string', enum: ['summary', 'full'] },
      },
    },
  },
  {
    name: 'lyra_optimize',
    description: 'Optimize a prompt using Lyra (Master Prompt Optimization Specialist)',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string' },
        mode: { type: 'string', enum: ['basic', 'detail', 'auto'] },
        platform: { type: 'string', enum: ['claude', 'chatgpt', 'gemini', 'opencode', 'codex', 'generic'] },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'lyra_analyze',
    description: 'Analyze a prompt without optimizing (show diagnosis)',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'get_token_summary',
    description: 'Get token cost summary from token dashboard',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_agent_usage_log',
    description: 'Get all agent dispatch token usage logs',
    inputSchema: { type: 'object', properties: {} },
  },
];

// Handle tool calls
async function handleToolCall(request) {
  const { name, arguments: args } = request;

  switch (name) {
    case 'search_memories':
      return searchMemories(args);
    case 'get_memory':
      return getMemory(args);
    case 'list_memories':
      return listMemories(args);
    case 'save_memory':
      return saveMemory(args);
    case 'refresh_index':
      return refreshIndex();
    case 'checkpoint':
      return checkpoint(args);
    case 'load_context':
      return loadContext(args || {});
    case 'lyra_optimize':
      return lyraOptimize(args);
    case 'lyra_analyze':
      return lyraAnalyze(args);
    case 'get_token_summary':
      return { status: 'Use token dashboard at http://localhost:3000' };
    case 'get_agent_usage_log':
      return { status: 'Agent logging via MCP' };
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// MCP Protocol Handler
export async function runMCPServer() {
  initialize();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

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
            serverInfo: { name: 'ultraflow-mcp', version: '1.2.0' },
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

// Run if called directly
import { fileURLToPath } from 'url';
if (import.meta.url === process.argv[1]) {
  runMCPServer().catch(err => {
    console.error('[Ultraflow MCP] Server error:', err.message);
    process.exit(1);
  });
}