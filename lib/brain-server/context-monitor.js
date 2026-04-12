#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

export class ContextMonitor {
  constructor(settingsPath) {
    this.settingsPath = settingsPath;
    this.thresholdPath = path.join(path.dirname(settingsPath), '../memory/context-threshold.json');
    this.threshold = this.loadThreshold();
  }

  loadThreshold() {
    if (fs.existsSync(this.thresholdPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.thresholdPath, 'utf-8'));
      } catch (e) {
        return this.defaultThreshold();
      }
    }
    return this.defaultThreshold();
  }

  defaultThreshold() {
    return { current: 2000, min: 1000, max: 5000, history: [], last_adjustment: null };
  }

  calculateContextSize(memories, vault) {
    let size = 0;
    if (memories) {
      size += Object.values(memories).reduce((sum, m) => sum + (m.tokens || 0), 0);
    }
    if (vault && vault.conscious) {
      size += Object.values(vault.conscious.memories || {}).reduce((sum, m) => sum + (m.tokens || 0), 0);
    }
    return size;
  }

  shouldConsolidate(contextSize) {
    if (contextSize > this.threshold.current) {
      return { should: true, reason: 'context_exceeds_threshold', currentSize: contextSize, threshold: this.threshold.current };
    }
    if (contextSize > this.threshold.max * 0.9) {
      return { should: true, reason: 'context_near_max', currentSize: contextSize, limit: this.threshold.max };
    }
    return { should: false };
  }

  triggerConsolidation(memories, vault, dreamlord) {
    const contextSize = this.calculateContextSize(memories, vault);
    const consolidationNeeded = this.shouldConsolidate(contextSize);

    if (!consolidationNeeded.should) {
      return { status: 'not_needed', contextSize };
    }

    const targetSize = Math.floor(this.threshold.current * 0.7);
    const memoriesToArchive = this.selectMemoriesForArchive(memories, vault, targetSize);

    return {
      status: 'consolidation_triggered',
      reason: consolidationNeeded.reason,
      currentSize: contextSize,
      targetSize,
      memoriesToArchive,
      consolidationScore: dreamlord ? dreamlord.calculateUsefulnessScore(memoriesToArchive) : 0,
    };
  }

  selectMemoriesForArchive(memories, vault, targetSize) {
    const candidates = [];
    let accumulated = 0;

    if (memories) {
      for (const [name, memory] of Object.entries(memories)) {
        if (accumulated >= targetSize) break;
        candidates.push({ name, type: 'memory', tokens: memory.tokens || 0 });
        accumulated += memory.tokens || 0;
      }
    }

    return candidates.sort((a, b) => a.tokens - b.tokens).slice(0, Math.ceil(candidates.length * 0.3));
  }

  saveThreshold() {
    fs.mkdirSync(path.dirname(this.thresholdPath), { recursive: true });
    fs.writeFileSync(this.thresholdPath, JSON.stringify(this.threshold, null, 2));
  }

  updateThreshold(newCurrent) {
    const old = this.threshold.current;
    this.threshold.current = Math.max(this.threshold.min, Math.min(this.threshold.max, newCurrent));
    this.threshold.history.push({ timestamp: Date.now(), old, new: this.threshold.current });
    this.threshold.last_adjustment = new Date().toISOString();
    this.saveThreshold();
    return { old, new: this.threshold.current, diff: this.threshold.current - old };
  }

  getStatus() {
    return {
      current: this.threshold.current,
      min: this.threshold.min,
      max: this.threshold.max,
      lastAdjustment: this.threshold.last_adjustment,
      adjustmentCount: this.threshold.history.length,
    };
  }
}
