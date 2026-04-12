import fs from 'fs';
import path from 'path';
import { CostTracker } from './cost-tracker.js';

export class ConversationTracker {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.turnsPath = path.join(dataDir, 'conversation-turns.json');
    this.costTracker = new CostTracker(null);
  }

  logTurn(userPrompt, inputTokens, outputTokens, model, timestamp = new Date().toISOString()) {
    try {
      // Load existing turns
      let data = this.loadTurns();

      // Calculate turn number
      const turnNumber = data.turns.length > 0
        ? Math.max(...data.turns.map(t => t.turn || 0)) + 1
        : 1;

      // Calculate cost
      const cost = this.calculateCost(inputTokens, outputTokens, model);

      // Truncate user prompt for display
      const userPromptDisplay = userPrompt.length > 50
        ? userPrompt.substring(0, 50) + '...'
        : userPrompt;

      // Create turn entry
      const turn = {
        turn: turnNumber,
        timestamp,
        user_prompt: userPromptDisplay,
        user_prompt_full: userPrompt,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        cost: parseFloat(cost.toFixed(4)),
        model,
      };

      // Add to turns array
      data.turns.push(turn);

      // Keep last 500 turns
      if (data.turns.length > 500) {
        data.turns = data.turns.slice(-500);
      }

      // Write back
      this.saveTurns(data);

      console.log(`[ConversationTracker] Logged turn ${turnNumber} (${model}, ${inputTokens}in/${outputTokens}out)`);
      return turn;
    } catch (e) {
      console.error('[ConversationTracker] Error logging turn:', e.message);
      return null;
    }
  }

  getTurns() {
    const data = this.loadTurns();
    // Return in reverse order (latest first)
    return data.turns.reverse();
  }

  loadTurns() {
    try {
      if (fs.existsSync(this.turnsPath)) {
        const content = fs.readFileSync(this.turnsPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (e) {
      console.error('[ConversationTracker] Error loading turns:', e.message);
    }
    return { turns: [] };
  }

  saveTurns(data) {
    try {
      // Ensure directory exists
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(this.turnsPath, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('[ConversationTracker] Error saving turns:', e.message);
    }
  }

  calculateCost(inputTokens, outputTokens, model) {
    const tier = this.costTracker.pricingTiers[model] || this.costTracker.pricingTiers['Haiku'];
    if (!tier) return 0;
    return (inputTokens / 1000000 * tier.input) + (outputTokens / 1000000 * tier.output);
  }

  getTurnsSummary() {
    const turns = this.getTurns();
    if (turns.length === 0) {
      return {
        total_turns: 0,
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_tokens: 0,
        total_cost: 0,
        models: {},
      };
    }

    const summary = {
      total_turns: turns.length,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_tokens: 0,
      total_cost: 0,
      models: {},
    };

    turns.forEach(turn => {
      summary.total_input_tokens += turn.input_tokens || 0;
      summary.total_output_tokens += turn.output_tokens || 0;
      summary.total_tokens += turn.total_tokens || 0;
      summary.total_cost += turn.cost || 0;

      if (!summary.models[turn.model]) {
        summary.models[turn.model] = {
          count: 0,
          total_tokens: 0,
          total_cost: 0,
        };
      }
      summary.models[turn.model].count++;
      summary.models[turn.model].total_tokens += turn.total_tokens || 0;
      summary.models[turn.model].total_cost += turn.cost || 0;
    });

    summary.total_cost = parseFloat(summary.total_cost.toFixed(2));
    Object.keys(summary.models).forEach(model => {
      summary.models[model].total_cost = parseFloat(summary.models[model].total_cost.toFixed(2));
    });

    return summary;
  }
}
