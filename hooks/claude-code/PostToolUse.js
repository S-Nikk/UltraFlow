#!/usr/bin/env node

/**
 * Ultraflow PostToolUse Hook
 * Logs agent usage after each tool execution
 */

import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Get paths
const memoryDir = process.env.BRAIN_MEMORY_PATH || '.claude/memory';
const usageLogPath = join(memoryDir, 'agent-usage-log.json');

// Ensure log file exists
function ensureLogExists() {
  if (!existsSync(dirname(usageLogPath))) {
    return;
  }
  if (!existsSync(usageLogPath)) {
    writeFileSync(usageLogPath, JSON.stringify({ entries: [] }, null, 2));
  }
}

// Extract tool info from environment
function extractToolInfo() {
  return {
    tool_name: process.env.TOOL_NAME || 'unknown',
    tool_result: process.env.TOOL_RESULT || '',
    timestamp: new Date().toISOString(),
  };
}

// Calculate approximate token usage from result
function estimateTokens(result) {
  if (!result) return { input: 0, output: 0, total: 0 };
  
  const contentLength = typeof result === 'string' ? result.length : JSON.stringify(result).length;
  const estimated = Math.ceil(contentLength / 4);
  
  // Rough estimate: 30% input, 70% output
  return {
    input: Math.ceil(estimated * 0.3),
    output: Math.ceil(estimated * 0.7),
    total: estimated,
  };
}

// Log the tool usage
function logToolUsage() {
  ensureLogExists();
  
  const toolInfo = extractToolInfo();
  const tokens = estimateTokens(toolInfo.tool_result);
  
  const entry = {
    timestamp: toolInfo.timestamp,
    tool: toolInfo.tool_name,
    input_tokens: tokens.input,
    output_tokens: tokens.output,
    total_tokens: tokens.total,
    model: process.env.AGENT_MODEL || 'unknown',
    session_id: process.env.CLAUDE_SESSION_ID || 'unknown',
  };
  
  try {
    const log = JSON.parse(readFileSync(usageLogPath, 'utf-8'));
    if (!Array.isArray(log.entries)) {
      log.entries = [];
    }
    
    log.entries.push(entry);
    
    // Keep last 500 entries
    if (log.entries.length > 500) {
      log.entries = log.entries.slice(-500);
    }
    
    writeFileSync(usageLogPath, JSON.stringify(log, null, 2));
    console.log('[Ultraflow PostToolUse] Logged:', toolInfo.tool_name);
  } catch (e) {
    console.log('[Ultraflow PostToolUse] Warning:', e.message);
  }
}

async function main() {
  // This hook is called after each tool use
  // Log the tool usage for tracking
  
  const toolName = process.env.TOOL_NAME;
  if (toolName) {
    logToolUsage();
  }
  
  process.exit(0);
}

main();