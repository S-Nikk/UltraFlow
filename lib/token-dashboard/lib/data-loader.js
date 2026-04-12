import fs from 'fs';
import path from 'path';

export class DataLoader {
  constructor(dataPath) {
    this.dataPath = path.normalize(dataPath);
    this.data = this.loadData();
  }

  loadData() {
    try {
      if (!fs.existsSync(this.dataPath)) {
        console.warn(`[DataLoader] File not found: ${this.dataPath}`);
        return this.getDefaultData();
      }

      const content = fs.readFileSync(this.dataPath, 'utf-8');
      const rawData = JSON.parse(content);

      // Check if it's agent-usage-log format (array) or dashboard format (object)
      if (Array.isArray(rawData)) {
        return this.transformFromUsageLog(rawData);
      }

      return rawData;
    } catch (e) {
      console.warn(`[DataLoader] Load error:`, e.message);
      return this.getDefaultData();
    }
  }

  transformFromUsageLog(usageLog) {
    if (!usageLog || usageLog.length === 0) {
      return this.getDefaultData();
    }

    // Calculate totals from usage log
    let totalTokens = 0;
    let totalCost = 0;
    const taskMap = {};

    for (const entry of usageLog) {
      const tokens = entry.total_tokens || (entry.input_tokens || 0) + (entry.output_tokens || 0);
      const cost = entry.cost || entry.cost_usd || 0;
      
      totalTokens += tokens;
      totalCost += cost;

      // Group into tasks by timestamp
      const taskId = entry.task || entry.agent_id || `task-${new Date(entry.timestamp).getTime()}`;
      if (!taskMap[taskId]) {
        taskMap[taskId] = {
          id: taskId,
          name: entry.description || entry.task || 'Unknown Task',
          model: entry.model || 'unknown',
          tokens_in: 0,
          tokens_out: 0,
          timestamp: entry.timestamp,
          status: entry.status || 'complete'
        };
      }
      taskMap[taskId].tokens_in += entry.input_tokens || 0;
      taskMap[taskId].tokens_out += entry.output_tokens || 0;
    }

    return {
      session_id: 'current',
      start_time: usageLog[0]?.timestamp || new Date().toISOString(),
      budget: 1200,
      total_tokens: totalTokens,
      total_cost: totalCost,
      tasks: Object.values(taskMap)
    };
  }

  getDefaultData() {
    return {
      session_id: 'default',
      start_time: new Date().toISOString(),
      tasks: [],
      total_tokens: 0,
      total_cost: 0,
      budget: 1200,
    };
  }

  reload() {
    this.data = this.loadData();
    return this.data;
  }

  getData() {
    return this.reload();
  }

  getTasks() {
    return this.getData().tasks || [];
  }

  getMetadata() {
    const data = this.getData();
    return {
      session_id: data.session_id,
      start_time: data.start_time,
      total_tokens: data.total_tokens,
      total_cost: data.total_cost,
      budget: data.budget,
    };
  }
}