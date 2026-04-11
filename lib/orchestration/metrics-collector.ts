/**
 * Metrics Collector - Performance & Resource Tracking
 *
 * Tracks execution metrics, resource usage, and performance statistics
 * for orchestration monitoring and optimization.
 */

import { EventEmitter } from 'events';
import { ExecutionMetrics, ResourceMetrics, OrchestratorMetrics } from './types';

export interface CollectorConfig {
  retentionHours: number;
  flushIntervalMs: number;
  maxMetricsPerType: number;
}

export class MetricsCollector extends EventEmitter {
  private executionMetrics: ExecutionMetrics[] = [];
  private resourceMetrics: ResourceMetrics[] = [];
  private config: CollectorConfig;
  private flushTimer?: NodeJS.Timeout;

  constructor(config: Partial<CollectorConfig> = {}) {
    super();
    this.config = {
      retentionHours: 24,
      flushIntervalMs: 60000, // 1 minute
      maxMetricsPerType: 10000,
      ...config
    };

    this.startAutoFlush();
  }

  /**
   * Track task execution
   */
  trackExecution(metrics: ExecutionMetrics): void {
    this.executionMetrics.push({
      ...metrics,
      endTime: metrics.endTime || Date.now()
    });

    if (this.executionMetrics.length > this.config.maxMetricsPerType) {
      this.executionMetrics.shift();
    }

    this.emit('execution-tracked', metrics);
  }

  /**
   * Track resource usage
   */
  trackResource(metrics: ResourceMetrics): void {
    this.resourceMetrics.push(metrics);

    if (this.resourceMetrics.length > this.config.maxMetricsPerType) {
      this.resourceMetrics.shift();
    }

    this.emit('resource-tracked', metrics);
  }

  /**
   * Get metrics for time range
   */
  getMetrics(startTime?: number, endTime?: number): {
    execution: ExecutionMetrics[];
    resource: ResourceMetrics[];
    summary: {
      totalTasks: number;
      successfulTasks: number;
      failedTasks: number;
      totalTokens: number;
      averageLatency: number;
      peakMemory: number;
      averageCpu: number;
    };
  } {
    const now = Date.now();
    const start = startTime || now - this.config.retentionHours * 60 * 60 * 1000;
    const end = endTime || now;

    // Filter by time range
    const execInRange = this.executionMetrics.filter(
      (m) => (m.startTime >= start) && ((m.endTime || m.startTime) <= end)
    );
    const resourceInRange = this.resourceMetrics.filter((m) => m.timestamp >= start && m.timestamp <= end);

    // Calculate summary
    const summary = {
      totalTasks: execInRange.length,
      successfulTasks: execInRange.filter((m) => m.success).length,
      failedTasks: execInRange.filter((m) => !m.success).length,
      totalTokens: execInRange.reduce((sum, m) => sum + m.tokensUsed, 0),
      averageLatency:
        execInRange.length > 0
          ? execInRange.reduce((sum, m) => sum + m.durationMs, 0) / execInRange.length
          : 0,
      peakMemory: resourceInRange.length > 0 ? Math.max(...resourceInRange.map((m) => m.memoryMb)) : 0,
      averageCpu:
        resourceInRange.length > 0
          ? resourceInRange.reduce((sum, m) => sum + m.cpuPercent, 0) / resourceInRange.length
          : 0
    };

    return {
      execution: execInRange,
      resource: resourceInRange,
      summary
    };
  }

  /**
   * Get current summary
   */
  getSummary(): {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    totalTokens: number;
    averageLatency: number;
  } {
    const { summary } = this.getMetrics();
    return {
      totalTasks: summary.totalTasks,
      successfulTasks: summary.successfulTasks,
      failedTasks: summary.failedTasks,
      totalTokens: summary.totalTokens,
      averageLatency: summary.averageLatency
    };
  }

  /**
   * Get metrics for specific task
   */
  getTaskMetrics(taskId: string): ExecutionMetrics | null {
    return this.executionMetrics.find((m) => m.taskId === taskId) || null;
  }

  /**
   * Get top N slowest tasks
   */
  getSlowestTasks(n: number = 10): ExecutionMetrics[] {
    return [...this.executionMetrics]
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, n);
  }

  /**
   * Get top N most expensive tasks (token usage)
   */
  getMostExpensiveTasks(n: number = 10): ExecutionMetrics[] {
    return [...this.executionMetrics]
      .sort((a, b) => b.tokensUsed - a.tokensUsed)
      .slice(0, n);
  }

  /**
   * Get error rate over time
   */
  getErrorRate(intervalMs: number = 3600000): { timestamp: number; errorRate: number }[] {
    const now = Date.now();
    const results: { timestamp: number; errorRate: number }[] = [];

    for (let i = 0; i < 24; i++) {
      const end = now - i * intervalMs;
      const start = end - intervalMs;

      const tasksInInterval = this.executionMetrics.filter(
        (m) => m.startTime >= start && m.startTime <= end
      );

      const errorCount = tasksInInterval.filter((m) => !m.success).length;
      const errorRate = tasksInInterval.length > 0 ? (errorCount / tasksInInterval.length) * 100 : 0;

      results.push({ timestamp: end, errorRate });
    }

    return results.reverse();
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    const { execution, resource, summary } = this.getMetrics();

    if (format === 'json') {
      return JSON.stringify({ execution, resource, summary }, null, 2);
    }

    // CSV format
    const headers = [
      'taskId',
      'success',
      'durationMs',
      'tokensUsed',
      'timestamp'
    ];
    const rows = execution.map((m) => [
      m.taskId,
      m.success ? 'true' : 'false',
      m.durationMs,
      m.tokensUsed,
      new Date(m.startTime).toISOString()
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    return csv;
  }

  /**
   * Start auto-flush timer
   */
  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushIntervalMs);
  }

  /**
   * Flush metrics to storage/persistence
   */
  private flush(): void {
    const { summary } = this.getMetrics();

    // Log summary periodically
    if (summary.totalTasks > 0) {
      console.log(`[MetricsCollector] Tasks: ${summary.totalTasks} | Tokens: ${summary.totalTokens} | ` +
        `Success: ${summary.successfulTasks}/${summary.totalTasks} | ` +
        `Avg Latency: ${summary.averageLatency.toFixed(0)}ms`);
    }

    this.emit('flushed', summary);
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.executionMetrics = [];
    this.resourceMetrics = [];
    console.log('[MetricsCollector] Reset');
    this.emit('reset');
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.reset();
  }
}

/**
 * Create collector with default configuration
 */
export function createMetricsCollector(config: Partial<CollectorConfig> = {}): MetricsCollector {
  return new MetricsCollector(config);
}
