#!/usr/bin/env node

/**
 * Vault Manager: Tiered Memory System
 *
 * Conscious Memory (Active):
 *   - Task-relevant data
 *   - High relevancy tokens
 *   - Parsed, indexed, fast access
 *
 * Vault (Unconscious):
 *   - Raw historical data
 *   - Low relevancy tokens
 *   - Compressed dump format
 *   - Searchable but slower
 *
 * Token Unloader:
 *   - Moves tokens by relevancy
 *   - Unloads < 0.3 relevance to vault
 *   - Keeps < 3000 tokens active
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class VaultManager {
  constructor(vaultPath) {
    this.vaultPath = vaultPath;
    this.vault = this.loadVault();
  }

  loadVault() {
    try {
      if (fs.existsSync(this.vaultPath)) {
        return JSON.parse(fs.readFileSync(this.vaultPath, 'utf-8'));
      }
    } catch (error) {
      console.error('Error loading vault:', error.message);
    }

    return this.createEmptyVault();
  }

  createEmptyVault() {
    return {
      version: '1.0.0',
      config: {
        activeMemoryMaxTokens: 3000,
        vaultCompressionFormat: 'raw',
        unloadThreshold: 0.3,
        indexingSkill: 'enabled',
      },
      conscious: {
        name: 'Active Memory (Conscious)',
        description: 'Frequently accessed, task-relevant',
        maxSize: 3000,
        memories: [],
      },
      vault: {
        name: 'Raw Vault (Unconscious)',
        description: 'Raw historical dump',
        format: 'raw-dump',
        entries: [],
      },
      indexing: {
        type: 'hierarchical',
        levels: ['token_frequency', 'relevancy_score', 'recency', 'access_count'],
        lastIndexed: null,
      },
    };
  }

  /**
   * Calculate token count of memory content
   */
  estimateTokens(content) {
    // Rough estimate: ~4 chars per token
    return Math.ceil(content.length / 4);
  }

  /**
   * Calculate relevancy score (0-1) based on metadata
   * Higher = more task-relevant
   */
  calculateRelevancy(memory, currentContext = {}) {
    let score = 0.5; // base

    // Type scores
    const typeScores = {
      project: 0.9,
      feedback: 0.7,
      user: 0.6,
      reference: 0.4,
    };
    score *= typeScores[memory.type] || 0.5;

    // Recency score
    if (memory.updated) {
      const daysSinceUpdate = (Date.now() - memory.updated) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0.5, 1 - daysSinceUpdate / 30);
      score = (score + recencyScore) / 2;
    }

    // Context match score
    if (currentContext.keywords && memory.keywords) {
      const matches = memory.keywords.filter(k =>
        currentContext.keywords.some(ck => ck.includes(k) || k.includes(ck))
      ).length;
      const contextScore = Math.min(1, matches / 5);
      score = (score + contextScore) / 2;
    }

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Load memory to Conscious
   */
  loadToConscious(memory) {
    const tokens = this.estimateTokens(memory.content);
    const relevancy = this.calculateRelevancy(memory);

    const conscious = {
      ...memory,
      tokens,
      relevancy,
      loadedAt: Date.now(),
      accessCount: 0,
    };

    this.vault.conscious.memories.push(conscious);

    // Keep under max
    if (this.getTotalConsciousTokens() > this.vault.config.activeMemoryMaxTokens) {
      this.unloadLowRelevancy();
    }
  }

  /**
   * Unload low-relevancy tokens to vault
   */
  unloadLowRelevancy() {
    const threshold = this.vault.config.unloadThreshold;

    const toKeep = [];
    const toUnload = [];

    for (const memory of this.vault.conscious.memories) {
      if (memory.relevancy >= threshold) {
        toKeep.push(memory);
      } else {
        toUnload.push({
          name: memory.name,
          type: memory.type,
          content: memory.content,
          relevancy: memory.relevancy,
          unloadedAt: Date.now(),
          originalLocation: 'conscious',
        });
      }
    }

    // Dump to vault in raw format
    for (const item of toUnload) {
      this.vault.vault.entries.push(item);
    }

    this.vault.conscious.memories = toKeep;
    this.saveVault();

    return {
      unloaded: toUnload.length,
      remaining: toKeep.length,
    };
  }

  /**
   * Search both conscious and vault
   */
  search(query, searchVault = false) {
    const results = [];

    // Always search conscious first
    for (const memory of this.vault.conscious.memories) {
      const score = this.rankMemory(memory, query);
      if (score > 0) {
        results.push({
          location: 'conscious',
          memory,
          score,
        });
      }
    }

    // Optionally search vault
    if (searchVault) {
      for (const entry of this.vault.vault.entries) {
        const score = this.rankMemory(entry, query);
        if (score > 0.1) {
          // Lower threshold for vault
          results.push({
            location: 'vault',
            memory: entry,
            score: score * 0.7, // Vault results scored lower
          });
        }
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  rankMemory(memory, query) {
    const queryTerms = query.toLowerCase().split(/\s+/);
    let score = 0;

    for (const term of queryTerms) {
      if (memory.name.toLowerCase().includes(term)) score += 3;
      if (memory.type === term) score += 2;
      if (memory.content?.toLowerCase().includes(term)) score += 1;
    }

    return score;
  }

  /**
   * Recover memory from vault to conscious
   */
  recoverFromVault(name) {
    const index = this.vault.vault.entries.findIndex(e => e.name === name);
    if (index === -1) return null;

    const [entry] = this.vault.vault.entries.splice(index, 1);
    this.loadToConscious(entry);
    return entry;
  }

  /**
   * Get statistics
   */
  getStats() {
    const consciousSize = this.getTotalConsciousTokens();
    const vaultSize = this.vault.vault.entries.length;
    const avgRelevancy =
      this.vault.conscious.memories.reduce((sum, m) => sum + m.relevancy, 0) /
      Math.max(1, this.vault.conscious.memories.length);

    return {
      conscious: {
        count: this.vault.conscious.memories.length,
        tokens: consciousSize,
        avgRelevancy: Math.round(avgRelevancy * 100),
        maxTokens: this.vault.config.activeMemoryMaxTokens,
        utilizationPercent: Math.round((consciousSize / this.vault.config.activeMemoryMaxTokens) * 100),
      },
      vault: {
        entries: vaultSize,
        format: this.vault.vault.format,
      },
      indexing: {
        lastIndexed: this.vault.indexing.lastIndexed,
        levels: this.vault.indexing.levels,
      },
    };
  }

  getTotalConsciousTokens() {
    return this.vault.conscious.memories.reduce((sum, m) => sum + (m.tokens || 0), 0);
  }

  /**
   * Index memories for fast retrieval
   */
  indexMemories() {
    // Sort by relevancy + recency + access
    this.vault.conscious.memories.sort((a, b) => {
      const scoreA = a.relevancy + (1 / (a.accessCount + 1));
      const scoreB = b.relevancy + (1 / (b.accessCount + 1));
      return scoreB - scoreA;
    });

    this.vault.indexing.lastIndexed = new Date().toISOString();
    this.saveVault();
  }

  /**
   * Record memory access (increases access count)
   */
  recordAccess(name) {
    const memory = this.vault.conscious.memories.find(m => m.name === name);
    if (memory) {
      memory.accessCount = (memory.accessCount || 0) + 1;
      memory.lastAccessed = Date.now();
    }
  }

  saveVault() {
    fs.writeFileSync(this.vaultPath, JSON.stringify(this.vault, null, 2));
  }
}

// CLI Interface
function main() {
  const command = process.argv[2];
  const vaultPath = process.argv[3] || './.claude/memory/vault.json';

  const manager = new VaultManager(vaultPath);

  switch (command) {
    case 'stats': {
      const stats = manager.getStats();
      console.log(JSON.stringify(stats, null, 2));
      break;
    }

    case 'search': {
      const query = process.argv.slice(4).join(' ');
      const results = manager.search(query, true);
      console.log(JSON.stringify(results.slice(0, 5), null, 2));
      break;
    }

    case 'index': {
      manager.indexMemories();
      console.log('Indexed memories by relevancy + recency + access');
      break;
    }

    case 'unload': {
      const result = manager.unloadLowRelevancy();
      console.log(`Unloaded ${result.unloaded} memories to vault. ${result.remaining} remain conscious.`);
      break;
    }

    default:
      console.log(`
Vault Manager Commands:
  node vault-manager.js stats [vaultPath]        - Show memory statistics
  node vault-manager.js search [vaultPath] query - Search conscious + vault
  node vault-manager.js index [vaultPath]        - Re-index conscious memories
  node vault-manager.js unload [vaultPath]       - Unload low-relevancy to vault
`);
  }
}

main();
