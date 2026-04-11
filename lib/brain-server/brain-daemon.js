#!/usr/bin/env node

/**
 * Brain Daemon: Background worker for autonomous memory updates
 * Runs periodically to consolidate memories, detect patterns, update index
 *
 * Usage: node brain-daemon.js [interval-ms] [memory-dir]
 * Example: node brain-daemon.js 30000 ~/.claude/memory
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INTERVAL = parseInt(process.argv[2] || '60000'); // Default 60 seconds
const MEMORY_DIR = process.argv[3] || `${process.cwd()}/.claude/memory`;

class BrainDaemon {
  constructor(memoryDir) {
    this.memoryDir = memoryDir;
    this.lastCheck = 0;
    this.memories = {};
    this.stats = {
      updates: 0,
      consolidations: 0,
      patterns: [],
    };
  }

  loadMemories() {
    try {
      if (!fs.existsSync(this.memoryDir)) {
        return;
      }

      const files = fs.readdirSync(this.memoryDir).filter(f => f.endsWith('.md'));

      this.memories = {};
      for (const file of files) {
        const filePath = path.join(this.memoryDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const stat = fs.statSync(filePath);

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

        this.memories[file] = {
          name: metadata.name || file,
          type: metadata.type || 'reference',
          description: metadata.description || '',
          size: content.length,
          mtime: stat.mtime,
          keywords: this.extractKeywords(body),
        };
      }
    } catch (error) {
      console.error('Error loading memories:', error.message);
    }
  }

  extractKeywords(content) {
    const words = content.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const freq = {};

    for (const word of words) {
      freq[word] = (freq[word] || 0) + 1;
    }

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  detectPatterns() {
    // Detect recurring themes across memories
    const allKeywords = [];

    for (const memory of Object.values(this.memories)) {
      allKeywords.push(...memory.keywords);
    }

    const freq = {};
    for (const keyword of allKeywords) {
      freq[keyword] = (freq[keyword] || 0) + 1;
    }

    this.stats.patterns = Object.entries(freq)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, frequency: count }));
  }

  updateMemoryIndex() {
    try {
      const indexPath = path.join(this.memoryDir, 'MEMORY.md');
      if (!fs.existsSync(indexPath)) return;

      let index = fs.readFileSync(indexPath, 'utf-8');

      // Update statistics in index
      const stats = `**Last Brain update:** ${new Date().toISOString()}
**Memories indexed:** ${Object.keys(this.memories).length}
**Patterns detected:** ${this.stats.patterns.length}`;

      if (!index.includes('Last Brain update')) {
        index = index.replace(/\n---\s*$/, `\n\n---\n\n${stats}`);
      } else {
        index = index.replace(
          /\*\*Last Brain update:\*\*.*?\n\*\*Memories indexed:\*\*.*?\n\*\*Patterns detected:\*\*.*/s,
          stats
        );
      }

      fs.writeFileSync(indexPath, index);
      this.stats.updates++;
    } catch (error) {
      console.error('Error updating index:', error.message);
    }
  }

  consolidateMemories() {
    // Merge related memories if size thresholds are exceeded
    try {
      // This is a placeholder - actual consolidation logic would be more complex
      // Could merge small memories, archive old ones, etc.

      this.stats.consolidations++;
    } catch (error) {
      console.error('Error consolidating:', error.message);
    }
  }

  run() {
    console.log(`[Brain Daemon] Started with ${INTERVAL}ms interval`);

    setInterval(() => {
      try {
        this.loadMemories();
        this.detectPatterns();
        this.updateMemoryIndex();
        this.consolidateMemories();

        console.log(
          `[Brain] Updated ${Object.keys(this.memories).length} memories, ` +
            `detected ${this.stats.patterns.length} patterns`
        );
      } catch (error) {
        console.error('[Brain Daemon Error]', error.message);
      }
    }, INTERVAL);

    // Initial run
    this.loadMemories();
    this.detectPatterns();
    this.updateMemoryIndex();
  }
}

const daemon = new BrainDaemon(MEMORY_DIR);
daemon.run();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[Brain Daemon] Shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[Brain Daemon] Received SIGTERM, shutting down');
  process.exit(0);
});
