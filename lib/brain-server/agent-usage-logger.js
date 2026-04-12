#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Agent usage logging system
export class AgentUsageLogger {
  constructor(memoryDir) {
    this.memoryDir = memoryDir || path.join(__dirname, '../../memory');
    this.usageLogPath = path.join(this.memoryDir, 'agent-usage-log.json');
    this.ensureLogExists();
  }

  ensureLogExists() {
    if (!fs.existsSync(this.usageLogPath)) {
      fs.writeFileSync(this.usageLogPath, JSON.stringify({ entries: [] }, null, 2));
    }
  }

  /**
   * Extract token estimate from Agent result
   * Handles different response formats from OpenCode, Haiku, Sonnet, Opus
   */
  extractTokens(result) {
    if (!result) return { input_tokens: 0, output_tokens: 0, total_tokens: 0 };

    // OpenCode format (may have nested structure)
    if (result.tokens_used) {
      return {
        input_tokens: result.tokens_used.input || 0,
        output_tokens: result.tokens_used.output || 0,
        total_tokens: (result.tokens_used.input || 0) + (result.tokens_used.output || 0),
      };
    }

    // Anthropic format (Haiku, Sonnet, Opus)
    if (result.usage) {
      return {
        input_tokens: result.usage.input_tokens || 0,
        output_tokens: result.usage.output_tokens || 0,
        total_tokens: (result.usage.input_tokens || 0) + (result.usage.output_tokens || 0),
      };
    }

    // Estimate based on content length (fallback)
    const content = JSON.stringify(result).length;
    const estimatedTokens = Math.ceil(content / 4); // ~4 chars per token

    return {
      input_tokens: Math.ceil(estimatedTokens * 0.3),
      output_tokens: Math.ceil(estimatedTokens * 0.7),
      total_tokens: estimatedTokens,
    };
  }

  /**
   * Calculate cost based on model and tokens
   */
  calculateCost(model, totalTokens, outputTokens) {
    const pricingTiers = {
      'Haiku': { input: 0.80 / 1_000_000, output: 4.00 / 1_000_000 },
      'Sonnet': { input: 3.00 / 1_000_000, output: 15.00 / 1_000_000 },
      'Opus': { input: 15.00 / 1_000_000, output: 75.00 / 1_000_000 },
      'OpenCode': { input: 0, output: 0 }, // Free
    };

    const pricing = pricingTiers[model] || { input: 0, output: 0 };
    const inputTokens = totalTokens - outputTokens;

    return (inputTokens * pricing.input) + (outputTokens * pricing.output);
  }

  /**
   * Log agent dispatch with token usage
   */
  logAgentDispatch(agentId, model, description, tokens, result, status = 'complete') {
    const entry = {
      timestamp: new Date().toISOString(),
      agent_id: agentId,
      model: model || 'Unknown',
      description: description || '',
      input_tokens: tokens.input_tokens || 0,
      output_tokens: tokens.output_tokens || 0,
      total_tokens: tokens.total_tokens || 0,
      cost: this.calculateCost(
        model,
        tokens.total_tokens || 0,
        tokens.output_tokens || 0
      ),
      status,
    };

    try {
      const log = JSON.parse(fs.readFileSync(this.usageLogPath, 'utf-8'));
      if (!Array.isArray(log.entries)) {
        log.entries = [];
      }

      log.entries.push(entry);

      // Keep last 500 entries
      if (log.entries.length > 500) {
        log.entries = log.entries.slice(-500);
      }

      fs.writeFileSync(this.usageLogPath, JSON.stringify(log, null, 2));

      console.log(`[Agent Usage Logger] Logged: ${agentId} (${model}) - ${tokens.total_tokens} tokens`);
      return entry;
    } catch (e) {
      console.error(`[Agent Usage Logger] Error logging usage:`, e.message);
      return null;
    }
  }

  /**
   * Get all logged agent usages
   */
  getUsageLog() {
    try {
      if (!fs.existsSync(this.usageLogPath)) {
        return { entries: [] };
      }
      return JSON.parse(fs.readFileSync(this.usageLogPath, 'utf-8'));
    } catch (e) {
      console.error(`[Agent Usage Logger] Error reading usage log:`, e.message);
      return { entries: [] };
    }
  }

  /**
   * Get summary by model
   */
  getSummaryByModel() {
    const log = this.getUsageLog();
    const summary = {};

    (log.entries || []).forEach(entry => {
      if (!summary[entry.model]) {
        summary[entry.model] = {
          count: 0,
          total_tokens: 0,
          total_cost: 0,
          agents: [],
        };
      }

      summary[entry.model].count++;
      summary[entry.model].total_tokens += entry.total_tokens || 0;
      summary[entry.model].total_cost += entry.cost || 0;

      if (!summary[entry.model].agents.includes(entry.agent_id)) {
        summary[entry.model].agents.push(entry.agent_id);
      }
    });

    return summary;
  }

  /**
   * Clear old entries (older than daysToKeep)
   */
  cleanup(daysToKeep = 7) {
    try {
      const log = this.getUsageLog();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const filtered = (log.entries || []).filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= cutoffDate;
      });

      const removed = (log.entries || []).length - filtered.length;
      log.entries = filtered;

      fs.writeFileSync(this.usageLogPath, JSON.stringify(log, null, 2));
      console.log(`[Agent Usage Logger] Cleanup: removed ${removed} old entries`);

      return { removed, kept: filtered.length };
    } catch (e) {
      console.error(`[Agent Usage Logger] Error during cleanup:`, e.message);
      return { error: e.message };
    }
  }
}

// Hook for PostToolUse - Called after Agent tool execution
export async function postAgentUseHook(toolResult, context) {
  try {
    if (toolResult.name !== 'Agent') {
      return; // Only handle Agent tool
    }

    const memoryDir = context?.memoryDir || process.cwd() + '/.claude/memory';
    const logger = new AgentUsageLogger(memoryDir);

    const agentId = toolResult.arguments?.agent_id || 'unknown';
    const model = toolResult.arguments?.model || toolResult.result?.model || 'OpenCode';
    const description = toolResult.arguments?.task || toolResult.result?.task || '';

    // Extract tokens from result
    const tokens = logger.extractTokens(toolResult.result);

    // Log the dispatch
    logger.logAgentDispatch(
      agentId,
      model,
      description,
      tokens,
      toolResult.result,
      toolResult.result?.status || 'complete'
    );

    // Broadcast to dashboard if available
    // (This can be expanded to use WebSocket or HTTP POST)
    console.log(`[Agent Hook] Dispatch logged: ${agentId} via ${model}`);

  } catch (e) {
    console.error(`[Agent Hook] Error in PostToolUse:`, e.message);
  }
}

export default AgentUsageLogger;
