import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class SessionReporter {
  constructor(memoryDir) {
    this.memoryDir = memoryDir;
    this.sessionsDir = path.join(memoryDir, '.sessions');
    this.ensureSessionsDir();
  }

  ensureSessionsDir() {
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  /**
   * Generate a session report
   * @param {Object} sessionData - Session data
   * @returns {Object} Report metadata
   */
  generateSessionReport(sessionData) {
    const {
      session_id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      start_time = new Date().toISOString(),
      end_time = new Date().toISOString(),
      tasks = [],
      total_tokens = 0,
      total_cost = 0,
      budget = 1200,
    } = sessionData;

    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(2);
    const durationMinutes = Math.round(durationMs / (1000 * 60));

    const budgetUsedPercent = ((total_cost / budget) * 100).toFixed(2);
    const efficiency = total_tokens > 0 ? (total_cost / total_tokens).toFixed(6) : 0;

    // Calculate task efficiency ranking
    const taskEfficiency = tasks
      .map(task => ({
        ...task,
        efficiency: task.cost_usd / ((task.tokens_in || 0) + (task.tokens_out || 0)) || 0,
      }))
      .sort((a, b) => a.efficiency - b.efficiency);

    // Generate optimization opportunities
    const opportunities = this.generateOpportunities(tasks, total_cost);

    // Generate markdown report
    const markdown = this.generateMarkdown({
      session_id,
      start_time,
      end_time,
      durationHours,
      durationMinutes,
      tasks,
      taskEfficiency,
      total_tokens,
      total_cost,
      budget,
      budgetUsedPercent,
      efficiency,
      opportunities,
    });

    // Save report
    const reportDate = startDate.toISOString().replace(/[:.]/g, '-').split('T')[0];
    const reportTime = startDate.toISOString().replace(/[:.]/g, '-').slice(11, 19);
    const reportName = `report-${reportDate}T${reportTime}-${session_id.slice(0, 8)}.md`;
    const reportPath = path.join(this.sessionsDir, reportName);

    fs.writeFileSync(reportPath, markdown, 'utf-8');

    // Update session history
    this.updateSessionHistory({
      session_id,
      start: start_time,
      end: end_time,
      duration_minutes: durationMinutes,
      total_tokens,
      total_cost,
      budget_used_percent: budgetUsedPercent,
      report_file: reportName,
      tasks: tasks.length,
      efficiency: parseFloat(efficiency),
    });

    return {
      status: 'success',
      report_file: reportPath,
      report_name: reportName,
      session_id,
      duration_minutes: durationMinutes,
      total_tokens,
      total_cost,
      budget_used_percent: budgetUsedPercent,
    };
  }

  generateOpportunities(tasks, totalCost) {
    const opportunities = [];

    // Group by model
    const modelCosts = {};
    tasks.forEach(task => {
      const model = task.model || 'Unknown';
      if (!modelCosts[model]) {
        modelCosts[model] = { cost: 0, tokens: 0, count: 0 };
      }
      modelCosts[model].cost += task.cost_usd || 0;
      modelCosts[model].tokens += (task.tokens_in || 0) + (task.tokens_out || 0);
      modelCosts[model].count += 1;
    });

    // Model optimization suggestions
    const modelHierarchy = {
      'Opus': { cheaper: 'Sonnet', ratio: 0.4 },
      'Sonnet': { cheaper: 'Haiku', ratio: 0.3 },
      'GPT-5-Nano': { cheaper: 'Haiku', ratio: 0.3 },
    };

    Object.entries(modelCosts).forEach(([model, data]) => {
      if (data.cost > 100 && modelHierarchy[model]) {
        const { cheaper, ratio } = modelHierarchy[model];
        const savings = data.cost * (1 - ratio);

        opportunities.push({
          opportunity: `Move ${data.count} ${model} task(s) to ${cheaper}`,
          current_cost: data.cost,
          optimized_cost: data.cost * ratio,
          savings,
          savings_percent: Math.round((1 - ratio) * 100),
        });
      }
    });

    // High-cost task optimization
    tasks.forEach(task => {
      if ((task.cost_usd || 0) > 50) {
        const savings = task.cost_usd * 0.25;
        opportunities.push({
          opportunity: `Optimize "${task.name}" (${task.model}) with better prompting`,
          current_cost: task.cost_usd,
          optimized_cost: task.cost_usd * 0.75,
          savings,
          savings_percent: 25,
        });
      }
    });

    return opportunities
      .sort((a, b) => b.savings - a.savings)
      .slice(0, 5);
  }

  generateMarkdown(data) {
    const {
      session_id,
      start_time,
      end_time,
      durationHours,
      durationMinutes,
      tasks,
      taskEfficiency,
      total_tokens,
      total_cost,
      budget,
      budgetUsedPercent,
      efficiency,
      opportunities,
    } = data;

    const costBreakdownByModel = {};
    tasks.forEach(task => {
      const model = task.model || 'Unknown';
      if (!costBreakdownByModel[model]) {
        costBreakdownByModel[model] = { tokens: 0, cost: 0 };
      }
      costBreakdownByModel[model].tokens += (task.tokens_in || 0) + (task.tokens_out || 0);
      costBreakdownByModel[model].cost += task.cost_usd || 0;
    });

    const modelTable = Object.entries(costBreakdownByModel)
      .map(([model, data]) => {
        const percent = total_cost > 0 ? ((data.cost / total_cost) * 100).toFixed(0) : '0';
        return `| ${model} | ${data.tokens.toLocaleString()} | $${data.cost.toFixed(2)} | ${percent}% |`;
      })
      .join('\n');

    const taskTable = taskEfficiency
      .map(task => {
        const eff = task.efficiency > 0 ? `$${task.efficiency.toFixed(2)}/K` : 'N/A';
        return `| ${task.name} | ${task.model} | ${((task.tokens_in || 0) + (task.tokens_out || 0)).toLocaleString()} | $${(task.cost_usd || 0).toFixed(2)} | ${eff} |`;
      })
      .join('\n');

    const opportunitiesSection = opportunities.map((opp, i) => `
### ${i + 1}. ${opp.opportunity}
- Current: $${opp.current_cost.toFixed(2)}
- Optimized: $${opp.optimized_cost.toFixed(2)}
- **Savings: $${opp.savings.toFixed(2)} (${opp.savings_percent}%)**
`).join('\n');

    const projectedSavings = opportunities.reduce((sum, opp) => sum + opp.savings, 0);
    const projectedCost = Math.max(0, total_cost - projectedSavings);
    const annualSavings = projectedSavings * 104; // ~2 sessions/week * 52 weeks

    const markdown = `# Session Report — ${new Date(start_time).toISOString().split('T')[0]}

## Summary
- **Duration:** ${durationHours} hours (${durationMinutes} minutes)
- **Total tokens:** ${total_tokens.toLocaleString()}K
- **Total cost:** $${total_cost.toFixed(2)}
- **Budget used:** ${budgetUsedPercent}%
- **Efficiency:** $${efficiency}/token

## Cost Breakdown by Model
| Model | Tokens | Cost | % |
|-------|--------|------|---|
${modelTable}
| **Total** | **${total_tokens.toLocaleString()}** | **$${total_cost.toFixed(2)}** | **100%** |

## Cost Breakdown by Task
| Task | Model | Tokens | Cost | Efficiency |
|------|-------|--------|------|------------|
${taskTable}

## Efficiency Ranking
${taskEfficiency.map((task, i) => {
  const eff = task.efficiency > 0 ? `$${task.efficiency.toFixed(2)}/K` : 'N/A';
  const quality = task.efficiency < 0.003 ? 'EXCELLENT' : task.efficiency < 0.004 ? 'GOOD' : 'NEEDS IMPROVEMENT';
  return `${i + 1}. **${task.name}** — $${(task.cost_usd || 0).toFixed(2)}/deliverable (${quality} - ${eff})`;
}).join('\n')}

## Top Optimization Opportunities

${opportunitiesSection}

## Trend Analysis
**Current session:** $${total_cost.toFixed(2)} (baseline)
- ${tasks.length} tasks, ${total_tokens.toLocaleString()}K tokens
- Avg: $${(total_cost / (tasks.length || 1)).toFixed(2)}/task, $${efficiency}/token

**Projected optimized:** $${projectedCost.toFixed(2)} (${Math.round((projectedSavings / total_cost) * 100)}% savings)
- With all ${opportunities.length} optimizations above
- Maintains same output quality

**Annual potential savings:** $${annualSavings.toFixed(2)}+
- Assuming 2 sessions/week
- $${total_cost.toFixed(2)} baseline → $${projectedCost.toFixed(2)} optimized
- Savings: $${projectedSavings.toFixed(2)}/session × 104 sessions = $${annualSavings.toFixed(2)}/year

## Recommendations for Next Session
1. **Route routine coordination to Haiku** (not Sonnet)
2. **Use selective impact analysis** (not full GitNexus audits)
3. **Batch small 5K-10K token tasks** across 2-3 sessions
4. **Pre-compute task specs** using templates
5. **Add clarifying context** to DreamLord prompts

## Actionable Next Steps
- [ ] Implement selective GitNexus analysis
- [ ] Move orchestration routing to Haiku
- [ ] Create task spec templates
- [ ] Review session 2 report for trend validation
- [ ] Set budget alert at 60% usage

## Session Metadata
- Session ID: ${session_id}
- Start: ${start_time}
- End: ${end_time}
- Report generated: ${new Date().toISOString()}
- Report path: ~/.claude/memory/.sessions/

---

*Report generated by Token Dashboard Session Reporter*
`;

    return markdown;
  }

  updateSessionHistory(sessionData) {
    const historyPath = path.join(this.sessionsDir, 'session-history.json');
    let history = { sessions: [], cumulative: { total_sessions: 0, total_tokens: 0, total_cost: 0, avg_session_cost: 0, avg_efficiency: 0 } };

    if (fs.existsSync(historyPath)) {
      try {
        history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
      } catch (e) {
        console.warn('[SessionReporter] Failed to load session history:', e.message);
      }
    }

    // Add new session
    history.sessions.push(sessionData);

    // Update cumulative stats
    const total = history.sessions.reduce((sum, s) => ({
      tokens: sum.tokens + (s.total_tokens || 0),
      cost: sum.cost + (s.total_cost || 0),
    }), { tokens: 0, cost: 0 });

    history.cumulative = {
      total_sessions: history.sessions.length,
      total_tokens: total.tokens,
      total_cost: total.cost,
      avg_session_cost: total.cost / history.sessions.length,
      avg_efficiency: total.cost / (total.tokens || 1),
    };

    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf-8');
  }
}

export default SessionReporter;
