#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Memory directory - works from any location
const MEMORY_DIRS = [
  process.cwd() + '/.claude/memory',
  path.join(__dirname, '../../memory'),
  process.env.HOME + '/.claude/projects/C--Users-ecoec/memory',
];

let memoryIndex = {};

// Initialize memory index on startup
function initializeMemoryIndex() {
  for (const dir of MEMORY_DIRS) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const filePath = path.join(dir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = parseMemory(content, filePath);
        if (parsed) {
          memoryIndex[parsed.name] = parsed;
        }
      }
      break; // Use first directory that exists
    }
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
    name: metadata.name || path.basename(filePath),
    description: metadata.description || '',
    type: metadata.type || 'reference',
    filePath,
    content: body.trim(),
    keywords: extractKeywords(body),
  };
}

// Extract keywords from content for semantic search
function extractKeywords(content) {
  const words = content.toLowerCase().match(/\b\w+\b/g) || [];
  return [...new Set(words)].slice(0, 50);
}

// Search memories by query
function searchMemories(query) {
  const queryTerms = query.toLowerCase().split(/\s+/);
  const results = [];

  for (const [name, memory] of Object.entries(memoryIndex)) {
    let score = 0;
    const searchText = `${memory.name} ${memory.description} ${memory.type} ${memory.content}`.toLowerCase();

    // Exact match in name (highest priority)
    if (searchText.includes(query.toLowerCase())) score += 10;

    // Term matching
    for (const term of queryTerms) {
      if (memory.name.toLowerCase().includes(term)) score += 5;
      if (memory.description.toLowerCase().includes(term)) score += 3;
      if (memory.keywords.includes(term)) score += 1;
    }

    if (score > 0) {
      results.push({
        name: memory.name,
        description: memory.description,
        type: memory.type,
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
  return {
    name: memory.name,
    description: memory.description,
    type: memory.type,
    filePath: memory.filePath,
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
    }));
  return {
    total: memories.length,
    memories,
    types: ['user', 'feedback', 'project', 'reference'],
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
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// MCP server implementation
async function runMCPServer() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  // Initialize on startup
  initializeMemoryIndex();

  // Send initialized message
  process.stdout.write(
    JSON.stringify({
      jsonrpc: '2.0',
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        serverInfo: {
          name: 'brain-memory-server',
          version: '1.0.0',
        },
      },
    }) + '\n'
  );

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
            capabilities: {
              tools: [
                {
                  name: 'search_memories',
                  description: 'Search memories by keyword or semantic query',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      query: {
                        type: 'string',
                        description: 'Search query (e.g., "polymarket trading")',
                      },
                    },
                    required: ['query'],
                  },
                },
                {
                  name: 'get_memory',
                  description: 'Retrieve full content of a specific memory',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        description: 'Memory name (from search results)',
                      },
                    },
                    required: ['name'],
                  },
                },
                {
                  name: 'list_memories',
                  description: 'List all memories, optionally filtered by type',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      type: {
                        type: 'string',
                        enum: ['user', 'feedback', 'project', 'reference'],
                        description: 'Filter by memory type',
                      },
                    },
                  },
                },
                {
                  name: 'refresh_index',
                  description: 'Refresh the memory index from disk',
                  inputSchema: {
                    type: 'object',
                    properties: {},
                  },
                },
              ],
            },
            serverInfo: {
              name: 'brain-memory-server',
              version: '1.0.0',
            },
          },
        };
      } else if (request.method === 'tools/call') {
        const result = await handleToolCall(request.params);
        response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            type: 'text',
            text: JSON.stringify(result, null, 2),
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
  console.error('Server error:', err);
  process.exit(1);
});
