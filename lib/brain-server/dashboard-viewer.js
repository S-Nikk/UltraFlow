import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class DashboardViewer {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
  }

  /**
   * View current dashboard state - fetch and parse HTML
   * @returns {Object} Dashboard summary
   */
  async viewDashboard() {
    try {
      const response = await fetch(`${this.baseUrl}/api/summary`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      return {
        status: 'ok',
        current_cost: parseFloat(data.total_cost),
        current_tokens: data.total_tokens,
        budget_remaining: parseFloat(data.budget_remaining),
        budget_percent: parseFloat(data.budget_used_percent),
        efficiency: parseFloat(data.efficiency),
        task_count: data.task_count,
        timestamp: data.timestamp,
      };
    } catch (e) {
      return {
        status: 'error',
        error: e.message,
        message: 'Dashboard server not running. Start with: npm run token-dashboard',
      };
    }
  }

  /**
   * Get dashboard data from API
   * @returns {Object} Summary data
   */
  async getDashboardData() {
    try {
      const response = await fetch(`${this.baseUrl}/api/summary`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (e) {
      return { error: e.message };
    }
  }

  /**
   * Get all tasks with costs
   * @returns {Array} Tasks sorted by cost (highest first)
   */
  async getTaskCosts() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tasks`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const tasks = await response.json();

      return tasks.map(task => ({
        name: task.name,
        model: task.model,
        tokens: task.tokens,
        cost: parseFloat(task.cost),
        efficiency: parseFloat(task.efficiency),
        status: task.status,
      }));
    } catch (e) {
      return [{ error: e.message }];
    }
  }

  /**
   * Get optimization opportunities
   * @returns {Array} Opportunities sorted by savings (highest first)
   */
  async getOptimizationAlerts() {
    try {
      const response = await fetch(`${this.baseUrl}/api/opportunities`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const opportunities = await response.json();

      return opportunities.map(opp => ({
        opportunity: opp.opportunity,
        current_cost: parseFloat(opp.current_cost),
        optimized_cost: parseFloat(opp.optimized_cost),
        savings: parseFloat(opp.savings),
        savings_percent: parseInt(opp.savings_percent),
      }));
    } catch (e) {
      return [{ error: e.message }];
    }
  }

  /**
   * Generate a snapshot of dashboard state as JSON
   * @returns {Object} Complete dashboard snapshot
   */
  async generateSnapshot() {
    try {
      const [summary, tasks, opportunities] = await Promise.all([
        this.getDashboardData(),
        this.getTaskCosts(),
        this.getOptimizationAlerts(),
      ]);

      return {
        timestamp: new Date().toISOString(),
        summary,
        tasks,
        opportunities,
      };
    } catch (e) {
      return { error: e.message };
    }
  }
}

export default DashboardViewer;
