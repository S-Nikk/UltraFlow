#!/usr/bin/env node

/**
 * UserPromptSubmit Hook: Auto-detect when user references past context
 * Triggers Brain to load relevant memories proactively
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Keywords that indicate reference to past work
const CONTEXT_INDICATORS = [
  'task',
  'memory',
  'previous',
  'last session',
  'before',
  'earlier',
  'like we',
  'remember',
  'project',
  'working on',
  'status',
  'progress',
  'where did we',
  'what was',
  'continue',
  'next step',
  'following up',
];

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

function detectContextReference(userInput) {
  const input = userInput.toLowerCase();

  // Check if input references past context
  const hasContextIndicator = CONTEXT_INDICATORS.some(indicator =>
    input.includes(indicator)
  );

  if (!hasContextIndicator) return null;

  // Extract potential search terms
  const words = userInput.match(/\b\w{4,}\b/g) || [];
  const keywords = [...new Set(words.slice(0, 5))];

  return {
    shouldLoadContext: true,
    keywords,
    indication: CONTEXT_INDICATORS.find(ind => input.includes(ind)),
  };
}

function parseMemories(memoryDir) {
  const memories = [];
  const files = fs.readdirSync(memoryDir).filter(f => f.endsWith('.md') && f !== 'MEMORY.md');

  for (const file of files) {
    const content = fs.readFileSync(path.join(memoryDir, file), 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) continue;

    const frontmatter = match[1];
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
      description: metadata.description || '',
      type: metadata.type || 'reference',
      keywords: (metadata.description + ' ' + metadata.name).toLowerCase().split(/\s+/),
    });
  }

  return memories;
}

function findMatchingMemories(keywords, memories) {
  const scores = {};

  for (const memory of memories) {
    let score = 0;
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      if (memory.name.toLowerCase().includes(keywordLower)) score += 10;
      if (memory.description.toLowerCase().includes(keywordLower)) score += 5;
      if (memory.keywords.some(k => k.includes(keywordLower))) score += 2;
    }
    if (score > 0) {
      scores[memory.name] = { memory, score };
    }
  }

  return Object.entries(scores)
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, 5)
    .map(([, { memory }]) => memory);
}

function main() {
  try {
    const userInput = process.argv[2] || '';

    const contextRef = detectContextReference(userInput);
    if (!contextRef?.shouldLoadContext) {
      // No context reference detected, silent exit
      process.exit(0);
    }

    const memoryDir = getMemoryIndex();
    if (!memoryDir) {
      process.exit(0);
    }

    const memories = parseMemories(memoryDir);
    const matched = findMatchingMemories(contextRef.keywords, memories);

    const output = {
      status: 'context_detected',
      contextIndicator: contextRef.indication,
      suggestedMemories: matched.map(m => ({
        name: m.name,
        type: m.type,
        description: m.description,
      })),
      instruction: `User referenced past work ("${contextRef.indication}"). Consider searching Brain for: ${matched.map(m => `"${m.name}"`).join(', ') || 'general context'}`,
    };

    console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    // Silent fail - don't disrupt normal operation
    process.exit(0);
  }
}

main();
