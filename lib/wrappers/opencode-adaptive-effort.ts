/**
 * OpenCode Adaptive Effort Selector
 *
 * Automatically selects effort level (1-5) based on:
 * - Task complexity
 * - Model capabilities
 * - Speed requirements
 * - Quality requirements
 */

export type EffortLevel = 1 | 2 | 3 | 4 | 5;

export interface TaskProfile {
  category: string; // simple-utility, api-client, refactoring, etc.
  complexity: 'simple' | 'moderate' | 'complex' | 'very-complex';
  lines_of_code?: number;
  files_involved?: number;
  requires_tests?: boolean;
  requires_documentation?: boolean;
  performance_critical?: boolean;
  security_critical?: boolean;
}

export interface EffortConfig {
  model: string;
  effort: EffortLevel;
  timeout_ms: number;
  rationale: string;
}

/**
 * Adaptive Effort Selector
 *
 * Effort Levels:
 * 1 = Quick (100ms, minimal tokens) - best for simple utilities
 * 2 = Standard (200ms, moderate tokens) - APIs, tests
 * 3 = Balanced (300ms, good quality) - refactoring, moderate complexity
 * 4 = Deep (400ms, high quality) - complex tasks, production code
 * 5 = Thorough (500ms, maximum quality) - security, performance-critical
 */
export class AdaptiveEffortSelector {
  /**
   * Select effort level based on task profile and model
   */
  selectEffort(task: TaskProfile, model: string): EffortConfig {
    const baseEffort = this.calculateBaseEffort(task);
    const adjustedEffort = this.adjustForModel(baseEffort, model);
    const timeout = this.timeoutForEffort(adjustedEffort);

    return {
      model,
      effort: adjustedEffort,
      timeout_ms: timeout,
      rationale: this.generateRationale(task, adjustedEffort, model)
    };
  }

  /**
   * Calculate base effort from task characteristics
   */
  private calculateBaseEffort(task: TaskProfile): EffortLevel {
    let effort: EffortLevel = 2; // Default

    // Complexity mapping
    if (task.complexity === 'simple') {
      effort = 1;
    } else if (task.complexity === 'moderate') {
      effort = 2;
    } else if (task.complexity === 'complex') {
      effort = 3;
    } else if (task.complexity === 'very-complex') {
      effort = 4;
    }

    // Adjust for lines of code
    if (task.lines_of_code) {
      if (task.lines_of_code > 500) effort = Math.min(5, (effort + 1) as EffortLevel);
      if (task.lines_of_code > 1000) effort = Math.min(5, (effort + 1) as EffortLevel);
    }

    // Adjust for multi-file coordination
    if (task.files_involved && task.files_involved > 3) {
      effort = Math.min(5, (effort + 1) as EffortLevel);
    }

    // Boost for critical requirements
    if (task.security_critical) {
      effort = Math.min(5, (effort + 2) as EffortLevel);
    }
    if (task.performance_critical) {
      effort = Math.min(5, (effort + 1) as EffortLevel);
    }

    // Boost if tests required
    if (task.requires_tests) {
      effort = Math.max(effort, 2 as EffortLevel);
    }

    // Boost if documentation required
    if (task.requires_documentation) {
      effort = Math.max(effort, 2 as EffortLevel);
    }

    return effort;
  }

  /**
   * Adjust effort based on model capability
   */
  private adjustForModel(effort: EffortLevel, model: string): EffortLevel {
    // Some models may not support all effort levels effectively
    if (model.includes('qwen') || model.includes('minimax')) {
      // Lighter models: cap at effort 3
      return Math.min(3, effort) as EffortLevel;
    }

    if (model.includes('nemotron') || model.includes('big-pickle')) {
      // Heavy models: all efforts supported
      return effort;
    }

    // GPT-5-Nano: balanced cap at 4
    return Math.min(4, effort) as EffortLevel;
  }

  /**
   * Calculate timeout based on effort level
   */
  private timeoutForEffort(effort: EffortLevel): number {
    const timeouts: Record<EffortLevel, number> = {
      1: 100,
      2: 200,
      3: 300,
      4: 400,
      5: 500
    };
    return timeouts[effort];
  }

  /**
   * Generate human-readable rationale
   */
  private generateRationale(task: TaskProfile, effort: EffortLevel, model: string): string {
    const reasons: string[] = [];

    reasons.push(`Complexity: ${task.complexity}`);

    if (task.lines_of_code) {
      reasons.push(`Size: ${task.lines_of_code} LOC`);
    }

    if (task.security_critical) {
      reasons.push('Security-critical');
    }

    if (task.performance_critical) {
      reasons.push('Performance-critical');
    }

    if (task.requires_tests) {
      reasons.push('Tests required');
    }

    return `Effort ${effort}/5: ${reasons.join(', ')}`;
  }

  /**
   * Get optimal model + effort combination for task
   */
  getOptimalConfig(task: TaskProfile): { model: string; effort: EffortLevel; config: EffortConfig } {
    const models = ['qwen3.6-plus-free', 'minimax-m2.5-free', 'nemotron-3-super-free', 'big-pickle', 'gpt-5-nano'];

    let bestConfig: EffortConfig | null = null;
    let bestModel = '';
    let bestScore = -Infinity;

    for (const model of models) {
      const config = this.selectEffort(task, model);

      // Score based on effort appropriateness and model fit
      let score = config.effort;

      // Bonus for right model for task type
      if (task.category === 'simple-utility' && (model.includes('qwen') || model.includes('minimax'))) {
        score += 5;
      }

      if (task.category === 'api-client' && model.includes('nemotron')) {
        score += 3;
      }

      if (task.security_critical && (model.includes('nemotron') || model.includes('big-pickle'))) {
        score += 5;
      }

      if (score > bestScore) {
        bestScore = score;
        bestConfig = config;
        bestModel = model;
      }
    }

    return {
      model: bestModel,
      effort: bestConfig?.effort || 2,
      config: bestConfig || { model: 'qwen3.6-plus-free', effort: 2, timeout_ms: 200, rationale: 'Default' }
    };
  }

  /**
   * Batch select efforts for multiple tasks
   */
  batchSelect(tasks: TaskProfile[], model: string): EffortConfig[] {
    return tasks.map(task => this.selectEffort(task, model));
  }

  /**
   * Get effort stats for dashboard
   */
  getEffortStats(tasks: TaskProfile[]): {
    avgEffort: number;
    effortDistribution: Record<EffortLevel, number>;
    estimatedTotalTime: number;
  } {
    const efforts = tasks.map(t => this.calculateBaseEffort(t));

    const distribution: Record<EffortLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const e of efforts) {
      distribution[e]++;
    }

    const avgEffort = efforts.reduce((a, b) => a + b, 0) / efforts.length;
    const estimatedTotalTime = efforts.reduce((sum, e) => sum + this.timeoutForEffort(e), 0);

    return {
      avgEffort,
      effortDistribution: distribution,
      estimatedTotalTime
    };
  }
}

/**
 * Quick helper to determine effort for common patterns
 */
export const quickEffort = {
  /**
   * Effort for simple utility functions
   */
  simpleUtility: (): EffortConfig => ({
    model: 'qwen3.6-plus-free',
    effort: 1,
    timeout_ms: 100,
    rationale: 'Simple utility: fast execution'
  }),

  /**
   * Effort for API clients
   */
  apiClient: (): EffortConfig => ({
    model: 'nemotron-3-super-free',
    effort: 3,
    timeout_ms: 300,
    rationale: 'API client: balanced quality and performance'
  }),

  /**
   * Effort for tests
   */
  testGeneration: (): EffortConfig => ({
    model: 'qwen3.6-plus-free',
    effort: 2,
    timeout_ms: 200,
    rationale: 'Test generation: standard effort'
  }),

  /**
   * Effort for refactoring
   */
  refactoring: (): EffortConfig => ({
    model: 'nemotron-3-super-free',
    effort: 4,
    timeout_ms: 400,
    rationale: 'Refactoring: deep analysis'
  }),

  /**
   * Effort for security-critical code
   */
  securityCritical: (): EffortConfig => ({
    model: 'big-pickle',
    effort: 5,
    timeout_ms: 500,
    rationale: 'Security-critical: maximum effort'
  }),

  /**
   * Effort for performance optimization
   */
  performanceOptimization: (): EffortConfig => ({
    model: 'nemotron-3-super-free',
    effort: 4,
    timeout_ms: 400,
    rationale: 'Performance optimization: analytical depth'
  })
};

// Export singleton
export default new AdaptiveEffortSelector();
