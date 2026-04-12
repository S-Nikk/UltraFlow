#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class ContextCheckpoint {
  constructor(memoryDir) {
    this.memoryDir = memoryDir;
    this.checkpointDir = path.join(memoryDir, '.checkpoints');
    this.ensureDir();
  }

  ensureDir() {
    if (!fs.existsSync(this.checkpointDir)) {
      fs.mkdirSync(this.checkpointDir, { recursive: true });
    }
  }

  generateCheckpoint(summary, nextSteps, tags, memories, vault) {
    const id = crypto.randomBytes(8).toString('hex');
    const timestamp = new Date().toISOString();

    const memoriesSnapshot = memories ? Object.keys(memories).slice(0, 20) : [];
    const vaultMemories = vault && vault.conscious ? Object.keys(vault.conscious.memories || {}).slice(0, 10) : [];

    return {
      id,
      timestamp,
      summary,
      nextSteps: nextSteps || '',
      tags: tags || [],
      memoriesIndexed: memoriesSnapshot.length,
      vaultMemories: vaultMemories.length,
      contextSize: this.estimateSize(memories, vault),
      memoryNames: memoriesSnapshot,
      checksum: this.computeChecksum(memories),
    };
  }

  saveCheckpoint(checkpoint) {
    const filename = `checkpoint-${checkpoint.id}.json`;
    const filepath = path.join(this.checkpointDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(checkpoint, null, 2));

    // Keep latest pointer
    const latestPath = path.join(this.checkpointDir, 'latest.json');
    fs.writeFileSync(latestPath, JSON.stringify({ id: checkpoint.id, timestamp: checkpoint.timestamp }, null, 2));

    return { status: 'saved', id: checkpoint.id, file: filename };
  }

  loadCheckpoint(id) {
    const filepath = path.join(this.checkpointDir, `checkpoint-${id}.json`);

    if (!fs.existsSync(filepath)) {
      return { error: `Checkpoint ${id} not found` };
    }

    try {
      const checkpoint = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      return checkpoint;
    } catch (e) {
      return { error: `Failed to load checkpoint: ${e.message}` };
    }
  }

  loadLatest() {
    const latestPath = path.join(this.checkpointDir, 'latest.json');

    if (!fs.existsSync(latestPath)) {
      return null;
    }

    try {
      const latest = JSON.parse(fs.readFileSync(latestPath, 'utf-8'));
      return this.loadCheckpoint(latest.id);
    } catch (e) {
      return null;
    }
  }

  pruneCheckpoints(maxCount = 20) {
    const files = fs.readdirSync(this.checkpointDir)
      .filter(f => f.startsWith('checkpoint-') && f.endsWith('.json'))
      .sort()
      .reverse();

    const toDelete = files.slice(maxCount);
    let deleted = 0;

    for (const file of toDelete) {
      try {
        fs.unlinkSync(path.join(this.checkpointDir, file));
        deleted++;
      } catch (e) {
        // Continue on error
      }
    }

    return { deleted, remaining: files.length - deleted };
  }

  listCheckpoints(limit = 10) {
    const files = fs.readdirSync(this.checkpointDir)
      .filter(f => f.startsWith('checkpoint-') && f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, limit);

    const checkpoints = [];

    for (const file of files) {
      try {
        const checkpoint = JSON.parse(fs.readFileSync(path.join(this.checkpointDir, file), 'utf-8'));
        checkpoints.push({
          id: checkpoint.id,
          timestamp: checkpoint.timestamp,
          summary: checkpoint.summary.slice(0, 100),
          tags: checkpoint.tags,
        });
      } catch (e) {
        // Skip broken checkpoints
      }
    }

    return checkpoints;
  }

  estimateSize(memories, vault) {
    let size = 0;
    if (memories) {
      size += Object.values(memories).reduce((sum, m) => sum + (m.tokens || 0), 0);
    }
    if (vault && vault.conscious) {
      size += Object.values(vault.conscious.memories || {}).reduce((sum, m) => sum + (m.tokens || 0), 0);
    }
    return size;
  }

  computeChecksum(memories) {
    if (!memories) return '';
    const keys = Object.keys(memories).sort().join(',');
    return crypto.createHash('md5').update(keys).digest('hex').slice(0, 12);
  }

  getStatus() {
    try {
      const count = fs.readdirSync(this.checkpointDir)
        .filter(f => f.startsWith('checkpoint-') && f.endsWith('.json')).length;
      const latest = this.loadLatest();
      return { checkpoints: count, latest: latest ? { id: latest.id, timestamp: latest.timestamp } : null };
    } catch (e) {
      return { error: e.message };
    }
  }
}
