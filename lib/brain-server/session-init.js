#!/usr/bin/env node

/**
 * SessionStart Hook: Auto-load Brain context when session starts
 * Searches for relevant memories based on git status and recent changes
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getMemoryIndex() {
  const memoryDirs = [
    process.cwd() + '/.claude/memory',
    path.join(__dirname, '../../memory'),
  ];

  for (const dir of memoryDirs) {
    if (fs.existsSync(dir)) {
      const indexPath = path.join(dir, 'MEMORY.md');
      if (fs.existsSync(indexPath)) {
        return dir;
      }
    }
  }
  return null;
}

function detectActiveProject() {
  try {
    // Check current git branch and recent commits
    const branch = execSync('git rev-parse --abbrev-ref HEAD 2>/dev/null', {
      encoding: 'utf-8',
      cwd: process.cwd(),
    }).trim();

    const log = execSync('git log --oneline -5 2>/dev/null', {
      encoding: 'utf-8',
      cwd: process.cwd(),
    }).trim();

    return { branch, log };
  } catch {
    return null;
  }
}

function parseMemories(memoryDir) {
  const memories = [];
  const files = fs.readdirSync(memoryDir).filter(f => f.endsWith('.md') && f !== 'MEMORY.md');

  for (const file of files) {
    const content = fs.readFileSync(path.join(memoryDir, file), 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) continue;

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

    memories.push({
      name: metadata.name || file,
      type: metadata.type || 'reference',
      file,
      preview: body.split('\n').slice(0, 3).join('\n'),
    });
  }

  return memories;
}

function findRelevantMemories(gitInfo, memories) {
  if (!gitInfo || !gitInfo.log) return [];

  const logText = gitInfo.log.toLowerCase();
  const relevant = [];

  // Find memories mentioned in recent commits or branch name
  for (const memory of memories) {
    const nameKeywords = memory.name.toLowerCase().split(/\s+/);
    for (const keyword of nameKeywords) {
      if (keyword.length > 3 && (logText.includes(keyword) || gitInfo.branch.toLowerCase().includes(keyword))) {
        relevant.push(memory);
        break;
      }
    }
  }

  return relevant;
}

function main() {
  try {
    const memoryDir = getMemoryIndex();
    if (!memoryDir) {
      console.log('No memory system found');
      return;
    }

    const gitInfo = detectActiveProject();
    const memories = parseMemories(memoryDir);
    const relevant = findRelevantMemories(gitInfo, memories);

    // Send context to Claude via JSON output
    const output = {
      status: 'success',
      sessionContext: {
        memoryCount: memories.length,
        relevantMemories: relevant,
        gitBranch: gitInfo?.branch,
        message: relevant.length > 0
          ? `Brain loaded ${relevant.length} relevant memories for this session`
          : 'Brain ready - no specific project context detected',
      },
    };

    console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    console.error('Session init error:', error.message);
  }
}

main();
