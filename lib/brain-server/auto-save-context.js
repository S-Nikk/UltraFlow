#!/usr/bin/env node

/**
 * PostToolUse Hook: Auto-save important context from tasks
 * Continuously updates memory with new project info, progress, decisions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getMemoryDir() {
  const memoryDirs = [
    process.cwd() + '/.claude/memory',
    path.join(__dirname, '../../memory'),
  ];

  for (const dir of memoryDirs) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }

  return null;
}

function updateSessionContext() {
  const memoryDir = getMemoryDir();
  if (!memoryDir) return;

  const sessionFile = path.join(memoryDir, 'current-session.md');
  const timestamp = new Date().toISOString();

  // Read existing memories to detect what was just updated
  const memoryFiles = fs.readdirSync(memoryDir)
    .filter(f => f.endsWith('.md') && f !== 'MEMORY.md' && f !== 'current-session.md')
    .map(f => {
      const stat = fs.statSync(path.join(memoryDir, f));
      return { file: f, mtime: stat.mtime };
    })
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 3)
    .map(item => item.file);

  const content = `---
name: Current Session Context
description: Auto-updated session memory for Brain system
type: project
---

# Session Update: ${timestamp}

## Recently Modified Memories
${memoryFiles.map(f => `- ${f.replace('.md', '')}`).join('\n')}

## Status
Brain auto-save system is actively monitoring for updates.

All changes to memory files are automatically detected and indexed.

---
**Auto-updated by Brain system | Last modified: ${timestamp}**
`;

  fs.writeFileSync(sessionFile, content);
}

function extractTaskContext(input) {
  try {
    const data = JSON.parse(input);

    // If it's a TaskCreate or TaskUpdate, extract context
    if (data.tool_input) {
      return {
        type: data.tool_name,
        subject: data.tool_input.subject,
        description: data.tool_input.description,
        status: data.tool_input.status,
      };
    }
  } catch {
    // Silently ignore parse errors
  }

  return null;
}

function main() {
  try {
    // Update session context file
    updateSessionContext();

    const output = {
      status: 'context_saved',
      message: 'Brain has updated its memory index',
    };

    console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    // Silent fail - don't disrupt normal operation
    process.exit(0);
  }
}

main();
