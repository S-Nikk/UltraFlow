/**
 * Brain Swarm: OpenCode Subagent Dispatcher
 *
 * ALL Brain computation is delegated to free OpenCode agents.
 * Claude never sees raw data — only pre-digested, compressed output.
 *
 * Models:
 *   - nemotron: Comprehension, summarization, extraction
 *   - qwen: Fast parsing, keyword extraction, simple tasks
 *   - bigpickle: Prediction, pattern detection, edge cases
 */

import { execFile, execSync } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execFileAsync = promisify(execFile);

// Default config — overridden by vault.json swarm settings
const DEFAULT_CONFIG = {
  enabled: true,
  max_parallel: 5,
  models: {
    comprehension: 'nemotron',
    fast: 'qwen',
    edge_cases: 'bigpickle',
  },
  token_budget_per_load: 300,
  compression_prompt: 'Extract ONLY information relevant to: {query}. Max 2 sentences. If nothing relevant, return "none".',
  opencode_binary: null, // Auto-detected
};

export class BrainSwarm {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.opencodePath = this.findOpenCode();
  }

  /**
   * Find OpenCode binary - searches multiple locations
   */
  findOpenCode() {
    // Check environment variable first
    if (process.env.OPENCODE_BIN && fs.existsSync(process.env.OPENCODE_BIN)) {
      return process.env.OPENCODE_BIN;
    }

    if (this.config.opencode_binary && fs.existsSync(this.config.opencode_binary)) {
      return this.config.opencode_binary;
    }

    // Check if 'opencode' is in PATH
    try {
      const which = process.platform === 'win32' ? 'where' : 'which';
      const result = execSync(which + ' opencode', { encoding: 'utf-8', stdio: 'pipe' });
      const foundPath = result.trim().split('\n')[0];
      if (foundPath && fs.existsSync(foundPath)) {
        return foundPath;
      }
    } catch (e) {
      // Not in PATH
    }

    // Known locations
    const candidates = [
      'C:/Users/ecoec/AppData/Roaming/npm/node_modules/opencode-ai/bin/opencode',
      path.join(process.env.APPDATA || '', 'npm/node_modules/opencode-ai/bin/opencode'),
      path.join(process.env.HOME || '', 'AppData/Roaming/npm/node_modules/opencode-ai/bin/opencode'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  /**
   * Ensure OpenCode is available - "end of rope" requirement
   * If not found, attempts to install it
   */
  async ensureOpenCode() {
    // Try to find it first
    let opencodePath = this.findOpenCode();
    
    if (opencodePath) {
      this.opencodePath = opencodePath;
      return { status: 'found', path: opencodePath };
    }

    // Not found - attempt to install
    console.log('[BrainSwarm] OpenCode not found. Attempting to install...');

    try {
      // Try npm global install
      execSync('npm install -g opencode-ai', { 
        stdio: 'inherit',
        encoding: 'utf-8'
      });
      
      // Try finding again after install
      opencodePath = this.findOpenCode();
      
      if (opencodePath) {
        this.opencodePath = opencodePath;
        console.log('[BrainSwarm] OpenCode installed successfully');
        return { status: 'installed', path: opencodePath };
      }
    } catch (e) {
      console.log('[BrainSwarm] Could not auto-install OpenCode:', e.message);
    }

    // Last resort: show instructions
    return { 
      status: 'not_available', 
      message: 'Please install OpenCode manually: npm install -g opencode-ai' 
    };
  }

  /**
   * Select model based on task type and content size
   */
  selectModel(task, contentSize = 0) {
    if (contentSize < 500) return this.config.models.fast;
    if (['compress', 'summarize', 'extract', 'map'].includes(task)) return this.config.models.comprehension;
    if (['predict', 'detect_pattern', 'anomaly'].includes(task)) return this.config.models.edge_cases;
    return this.config.models.comprehension;
  }

  /**
   * Execute a single OpenCode agent task
   * Returns the agent's text output
   */
  async single(model, prompt, timeout = 30000) {
    if (!this.opencodePath) {
      return this.fallback(prompt);
    }

    try {
      const { stdout } = await execFileAsync('node', [
        this.opencodePath,
        '--model', model,
        '--prompt', prompt,
        '--no-interactive',
      ], { timeout, maxBuffer: 1024 * 1024 });

      return stdout.trim();
    } catch (error) {
      // Fallback on error
      return this.fallback(prompt);
    }
  }

  /**
   * Run multiple agents in parallel
   * Returns array of results in same order as inputs
   */
  async parallel(tasks) {
    if (!this.config.enabled || !this.opencodePath) {
      return tasks.map(t => this.fallback(t.prompt));
    }

    // Respect max_parallel limit
    const results = [];
    for (let i = 0; i < tasks.length; i += this.config.max_parallel) {
      const batch = tasks.slice(i, i + this.config.max_parallel);
      const batchResults = await Promise.all(
        batch.map(task => this.single(
          task.model || this.selectModel(task.type, task.contentSize),
          task.prompt,
          task.timeout || 30000
        ))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Read and compress multiple memory files
   * Core use case: load_context needs to return compressed summaries
   */
  async readAndCompress(files, query, tokenBudget = 300) {
    if (!files.length) return '';

    const tasks = files.map(file => {
      const content = fs.existsSync(file.filePath)
        ? fs.readFileSync(file.filePath, 'utf-8')
        : file.content || '';

      const contentSize = content.length;
      const prompt = this.config.compression_prompt.replace('{query}', query)
        + `\n\nMemory file "${file.name}" (type: ${file.type}):\n${content}`;

      return {
        type: 'compress',
        model: this.selectModel('compress', contentSize),
        contentSize,
        prompt,
      };
    });

    const results = await this.parallel(tasks);

    // Filter out "none" responses and concatenate
    const compressed = results
      .filter(r => r && r.toLowerCase() !== 'none' && r.trim())
      .join('\n');

    // Trim to token budget (rough: 4 chars per token)
    const maxChars = tokenBudget * 4;
    if (compressed.length > maxChars) {
      return compressed.slice(0, maxChars) + '...';
    }

    return compressed;
  }

  /**
   * Generate checkpoint summary from session activity
   */
  async summarizeSession(recentActivity) {
    const prompt = `Summarize this session activity in exactly 2 sentences. Focus on WHAT was accomplished and WHAT state things are in now:\n\n${recentActivity}`;
    return this.single(this.config.models.comprehension, prompt);
  }

  /**
   * Extract concepts/entities from memory content (for Brain GitNexus indexing)
   */
  async extractConcepts(memoryContent, memoryName) {
    const prompt = `Extract key concepts from this memory. Return ONLY a JSON array of strings (project names, tool names, file paths, technologies). No explanation.\n\nMemory "${memoryName}":\n${memoryContent}`;
    const result = await this.single(this.config.models.fast, prompt);

    try {
      return JSON.parse(result);
    } catch {
      // Parse failed, extract manually
      const words = result.match(/["']([^"']+)["']/g);
      return words ? words.map(w => w.replace(/["']/g, '')) : [];
    }
  }

  /**
   * Map git changes to relevant memory keywords
   */
  async mapChangesToMemories(gitDiff, memoryNames) {
    const prompt = `Given these git changes, which of these memories are likely relevant? Return ONLY a JSON array of memory names.\n\nGit changes:\n${gitDiff}\n\nAvailable memories: ${JSON.stringify(memoryNames)}`;
    const result = await this.single(this.config.models.comprehension, prompt);

    try {
      return JSON.parse(result);
    } catch {
      return [];
    }
  }

  /**
   * Predict next needed memories based on patterns
   */
  async predictNext(currentMemories, patterns) {
    const prompt = `Based on these access patterns and currently loaded memories, predict which memories will be needed next. Return ONLY a JSON array of memory names.\n\nCurrent: ${JSON.stringify(currentMemories)}\nPatterns: ${JSON.stringify(patterns)}`;
    const result = await this.single(this.config.models.edge_cases, prompt);

    try {
      return JSON.parse(result);
    } catch {
      return [];
    }
  }

  /**
   * Fallback when OpenCode is unavailable
   * Does basic keyword extraction without LLM
   */
  fallback(prompt) {
    // Extract the most important-looking sentence
    const sentences = prompt.split(/[.!?\n]/).filter(s => s.trim().length > 10);
    if (sentences.length === 0) return '';

    // Return first 2 sentences that aren't instructions
    const content = sentences
      .filter(s => !s.includes('Extract') && !s.includes('Return') && !s.includes('Summarize'))
      .slice(0, 2)
      .map(s => s.trim())
      .join('. ');

    return content || sentences[0].trim();
  }

  /**
   * Check if swarm is available (OpenCode found and enabled)
   */
  isAvailable() {
    return this.config.enabled && this.opencodePath !== null;
  }

  /**
   * Get swarm status
   */
  getStatus() {
    return {
      enabled: this.config.enabled,
      opencode_found: this.opencodePath !== null,
      opencode_path: this.opencodePath,
      max_parallel: this.config.max_parallel,
      models: this.config.models,
    };
  }
}

export default BrainSwarm;
