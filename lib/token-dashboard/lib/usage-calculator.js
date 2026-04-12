import fs from 'fs';
import path from 'path';

export class UsageCalculator {
  constructor(agentUsageLogPath) {
    this.logPath = agentUsageLogPath;
    this.windowMinutes = 300; // 5 hours
  }

  calculate() {
    try {
      if (!fs.existsSync(this.logPath)) {
        return this.emptyResult();
      }

      const content = fs.readFileSync(this.logPath, 'utf-8');
      const log = JSON.parse(content);

      // Handle both formats: {entries: [...]} and [...]
      let entries = Array.isArray(log) ? log : (log.entries || []);

      if (entries.length === 0) {
        return this.emptyResult();
      }

      const totalTokens = this.calculateTotalTokens(entries);
      const windowTokens = this.calculateWindowTokens(entries);
      const usagePercentage = totalTokens > 0 ? ((windowTokens / totalTokens) * 100).toFixed(1) : 0;

      const byModel = this.groupByModel(entries);
      const byTask = this.groupByTask(entries);

      const sessionStart = entries.length > 0 ? entries[0].timestamp : new Date().toISOString();

      return {
        total_tokens: totalTokens,
        window_tokens: windowTokens,
        usage_percentage: parseFloat(usagePercentage),
        session_start: sessionStart,
        window_minutes: this.windowMinutes,
        by_model: byModel,
        by_task: byTask,
      };
    } catch (e) {
      console.error('[UsageCalculator] Error calculating usage:', e.message);
      return this.emptyResult();
    }
  }

  calculateTotalTokens(entries) {
    return entries.reduce((sum, e) => sum + (e.total_tokens || 0), 0);
  }

  calculateWindowTokens(entries) {
    const now = new Date();
    const windowMs = this.windowMinutes * 60 * 1000;
    const cutoff = new Date(now.getTime() - windowMs);

    return entries
      .filter(e => new Date(e.timestamp) >= cutoff)
      .reduce((sum, e) => sum + (e.total_tokens || 0), 0);
  }

  groupByModel(entries) {
    const groups = {};
    const total = this.calculateTotalTokens(entries);

    entries.forEach(e => {
      const model = e.model || 'Unknown';
      if (!groups[model]) {
        groups[model] = { tokens: 0, count: 0, cost: 0 };
      }
      groups[model].tokens += e.total_tokens || 0;
      groups[model].count += 1;
      groups[model].cost += e.cost || 0;
    });

    const result = {};
    Object.entries(groups).forEach(([model, data]) => {
      result[model] = {
        tokens: data.tokens,
        count: data.count,
        cost: parseFloat(data.cost.toFixed(2)),
        percentage: total > 0 ? parseFloat(((data.tokens / total) * 100).toFixed(1)) : 0,
      };
    });

    return result;
  }

  groupByTask(entries) {
    const groups = {};
    const total = this.calculateTotalTokens(entries);

    entries.forEach(e => {
      const taskId = e.agent_id || 'unknown';
      if (!groups[taskId]) {
        groups[taskId] = {
          agent_id: taskId,
          description: e.description || '',
          model: e.model || 'Unknown',
          tokens: 0,
          cost: 0,
        };
      }
      groups[taskId].tokens += e.total_tokens || 0;
      groups[taskId].cost += e.cost || 0;
    });

    return Object.values(groups)
      .map(task => ({
        ...task,
        cost: parseFloat(task.cost.toFixed(2)),
        percentage: total > 0 ? parseFloat(((task.tokens / total) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 20);
  }

  emptyResult() {
    return {
      total_tokens: 0,
      window_tokens: 0,
      usage_percentage: 0,
      session_start: new Date().toISOString(),
      window_minutes: this.windowMinutes,
      by_model: {},
      by_task: [],
    };
  }
}
