export class CostTracker {
  constructor(dataLoader) {
    this.dataLoader = dataLoader;
    this.pricingTiers = {
      'Haiku': { input: 1, output: 5 },
      'Opus': { input: 3, output: 15 },
      'Sonnet': { input: 5, output: 25 },
      'GPT-5-Nano': { input: 0.5, output: 2.5 },
      'Qwen': { input: 0.3, output: 1.5 },
      'Minimax': { input: 0.4, output: 2 },
      'BigPickle': { input: 0.6, output: 3 },
      'Nemotron': { input: 0.8, output: 4 },
    };
  }

  calculateTaskCost(task) {
    if (!task.tokens_in && !task.tokens_out && task.cost_usd) {
      return task.cost_usd;
    }

    const model = task.model || 'Haiku';
    const tier = this.pricingTiers[model] || this.pricingTiers['Haiku'];
    const tokensIn = task.tokens_in || 0;
    const tokensOut = task.tokens_out || 0;

    // Pricing matrix is in dollars per million tokens (MTok)
    const cost = (tokensIn / 1000000 * tier.input) + (tokensOut / 1000000 * tier.output);
    return parseFloat(cost.toFixed(6));
  }

  getSummary() {
    const data = this.dataLoader.getData();
    const tasks = data.tasks || [];

    let totalTokens = 0;
    let totalCost = 0;
    const modelBreakdown = {};

    tasks.forEach(task => {
      const model = task.model || 'Haiku';
      const taskCost = this.calculateTaskCost(task);
      const tokensIn = task.tokens_in || 0;
      const tokensOut = task.tokens_out || 0;

      totalTokens += tokensIn + tokensOut;
      totalCost += taskCost;

      if (!modelBreakdown[model]) {
        modelBreakdown[model] = {
          tokens_in: 0,
          tokens_out: 0,
          total_tokens: 0,
          cost: 0,
          count: 0,
        };
      }
      modelBreakdown[model].tokens_in += tokensIn;
      modelBreakdown[model].tokens_out += tokensOut;
      modelBreakdown[model].total_tokens += tokensIn + tokensOut;
      modelBreakdown[model].cost += taskCost;
      modelBreakdown[model].count += 1;
    });

    const budget = data.budget || 1200;
    const budgetUsed = budget > 0 ? (totalCost / budget * 100).toFixed(2) : 0;
    const efficiency = totalTokens > 0 ? (totalCost / totalTokens).toFixed(6) : 0;

    return {
      total_tokens: totalTokens,
      total_cost: totalCost.toFixed(2),
      budget: budget,
      budget_used_percent: budgetUsed,
      budget_remaining: Math.max(0, (budget - totalCost).toFixed(2)),
      efficiency: efficiency,
      task_count: tasks.length,
      model_breakdown: Object.entries(modelBreakdown).map(([model, data]) => ({
        model,
        tokens_in: data.tokens_in,
        tokens_out: data.tokens_out,
        total_tokens: data.total_tokens,
        cost: data.cost.toFixed(2),
        count: data.count,
        avg_cost_per_token: totalTokens > 0 ? (data.cost / data.total_tokens).toFixed(6) : '0',
      })),
      timestamp: new Date().toISOString(),
    };
  }

  getTasks() {
    const data = this.dataLoader.getData();
    const tasks = data.tasks || [];

    return tasks.map(task => {
      const cost = this.calculateTaskCost(task);
      const totalTokens = (task.tokens_in || 0) + (task.tokens_out || 0);
      const efficiency = totalTokens > 0 ? (cost / totalTokens).toFixed(6) : '0';

      return {
        id: task.id || '',
        name: task.name || 'Unknown',
        model: task.model || 'Unknown',
        tokens: totalTokens,
        tokens_in: task.tokens_in || 0,
        tokens_out: task.tokens_out || 0,
        cost: cost.toFixed(2),
        status: task.status || 'complete',
        timestamp: task.timestamp,
        efficiency: efficiency,
      };
    }).sort((a, b) => parseFloat(b.cost) - parseFloat(a.cost));
  }

  getCosts() {
    const tasks = this.getTasks();
    return tasks.map(task => ({
      task: task.name,
      model: task.model,
      tokens: task.tokens,
      cost: task.cost,
      timestamp: task.timestamp,
    }));
  }

  getOptimizations() {
    const tasks = this.getTasks();
    const opportunities = [];

    // Group by model to find optimization opportunities
    const modelCosts = {};
    tasks.forEach(task => {
      if (!modelCosts[task.model]) {
        modelCosts[task.model] = { cost: 0, tokens: 0, count: 0 };
      }
      modelCosts[task.model].cost += parseFloat(task.cost);
      modelCosts[task.model].tokens += task.tokens;
      modelCosts[task.model].count += 1;
    });

    // Identify expensive models that could move to cheaper ones
    const modelHierarchy = {
      'Opus': { tier: 4, cheaper: 'Sonnet' },
      'Sonnet': { tier: 3, cheaper: 'Haiku' },
      'GPT-5-Nano': { tier: 2, cheaper: 'Haiku' },
      'Minimax': { tier: 2, cheaper: 'Haiku' },
      'Haiku': { tier: 1, cheaper: null },
      'Qwen': { tier: 1, cheaper: null },
    };

    Object.entries(modelCosts).forEach(([model, data]) => {
      if (data.cost > 100 && modelHierarchy[model]?.cheaper) {
        const cheaper = modelHierarchy[model].cheaper;
        const costRatio = 0.5; // Simplified: cheaper costs ~50%
        const savedCost = data.cost * (1 - costRatio);

        opportunities.push({
          opportunity: `Move ${data.count} ${model} task(s) to ${cheaper}`,
          current_cost: data.cost.toFixed(2),
          optimized_cost: (data.cost * costRatio).toFixed(2),
          savings: savedCost.toFixed(2),
          savings_percent: ((1 - costRatio) * 100).toFixed(0),
        });
      }
    });

    // Identify high-cost individual tasks
    tasks.forEach(task => {
      if (parseFloat(task.cost) > 50) {
        const savings = parseFloat(task.cost) * 0.25; // 25% potential savings
        opportunities.push({
          opportunity: `Optimize "${task.name}" (${task.model}) through better prompting`,
          current_cost: task.cost.toFixed(2),
          optimized_cost: (parseFloat(task.cost) - savings).toFixed(2),
          savings: savings.toFixed(2),
          savings_percent: '25',
        });
      }
    });

    // Sort by savings amount
    return opportunities
      .sort((a, b) => parseFloat(b.savings) - parseFloat(a.savings))
      .slice(0, 5); // Top 5 opportunities
  }
}
