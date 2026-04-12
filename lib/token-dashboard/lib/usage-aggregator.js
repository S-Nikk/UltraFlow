export class UsageAggregator {
  static aggregateByModel(usageData) {
    const models = usageData.by_model || {};
    return Object.entries(models)
      .map(([model, data]) => ({
        model,
        tokens: data.tokens,
        count: data.count,
        cost: data.cost,
        percentage: data.percentage,
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }

  static aggregateByTask(usageData, limit = 20) {
    const tasks = usageData.by_task || [];
    return tasks
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, limit)
      .map(task => ({
        agent_id: task.agent_id,
        description: task.description,
        model: task.model,
        tokens: task.tokens,
        cost: task.cost,
        percentage: task.percentage,
      }));
  }

  static formatForDisplay(usageData) {
    return {
      summary: {
        total_tokens: usageData.total_tokens,
        window_tokens: usageData.window_tokens,
        usage_percentage: usageData.usage_percentage,
        window_minutes: usageData.window_minutes,
        session_start: usageData.session_start,
      },
      models: this.aggregateByModel(usageData),
      tasks: this.aggregateByTask(usageData),
    };
  }
}
