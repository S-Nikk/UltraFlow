/**
 * Orchestration Metrics REST API
 *
 * Provides REST endpoints for dashboard to fetch real-time orchestration metrics.
 */

import { Router, Request, Response } from 'express';
import { RufloCoordinator } from '../orchestration/ruflo-coordinator';
import { AgentPool } from '../orchestration/agent-pool';
import { MetricsCollector } from '../orchestration/metrics-collector';

export interface MetricsServices {
  coordinator: RufloCoordinator;
  agentPool: AgentPool;
  metricsCollector: MetricsCollector;
}

export function createMetricsRouter(services: MetricsServices): Router {
  const router = Router();

  /**
   * GET /api/orchestration/metrics
   * Returns current snapshot of orchestration metrics
   */
  router.get('/metrics', (req: Request, res: Response) => {
    try {
      const coordinatorMetrics = services.coordinator.getMetrics();
      const poolStatus = services.agentPool.getStatus();
      const collectorSummary = services.metricsCollector.getSummary();

      const response = {
        timestamp: new Date().toISOString(),
        activeChildren: coordinatorMetrics.activeChildren,
        totalTokens: collectorSummary.totalTokens,
        totalTasks: collectorSummary.totalTasks,
        successfulTasks: collectorSummary.successfulTasks,
        failedTasks: collectorSummary.failedTasks,
        averageLatency: collectorSummary.averageLatency,
        agentPool: {
          haiku: poolStatus.haiku,
          sonnet: poolStatus.sonnet,
          opus: poolStatus.opus,
          queuedTasks: poolStatus.queuedTasks
        },
        children: coordinatorMetrics.children
      };

      res.json(response);
    } catch (error) {
      console.error(`[API] /metrics error: ${error}`);
      res.status(500).json({ error: String(error) });
    }
  });

  /**
   * GET /api/orchestration/children
   * Returns list of active child processes
   */
  router.get('/children', (req: Request, res: Response) => {
    try {
      const children = services.coordinator.getActiveChildren();
      res.json({ children, count: children.length });
    } catch (error) {
      console.error(`[API] /children error: ${error}`);
      res.status(500).json({ error: String(error) });
    }
  });

  /**
   * GET /api/orchestration/children/:taskId
   * Returns status of specific child process
   */
  router.get('/children/:taskId', (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      const status = services.coordinator.getChildStatus(taskId);

      if (!status) {
        return res.status(404).json({ error: `Child ${taskId} not found` });
      }

      res.json(status);
    } catch (error) {
      console.error(`[API] /children/:taskId error: ${error}`);
      res.status(500).json({ error: String(error) });
    }
  });

  /**
   * GET /api/orchestration/agents
   * Returns agent pool status
   */
  router.get('/agents', (req: Request, res: Response) => {
    try {
      const poolStatus = services.agentPool.getStatus();
      res.json(poolStatus);
    } catch (error) {
      console.error(`[API] /agents error: ${error}`);
      res.status(500).json({ error: String(error) });
    }
  });

  /**
   * GET /api/orchestration/history
   * Returns historical metrics
   */
  router.get('/history', (req: Request, res: Response) => {
    try {
      const { range = '24h', limit = 100 } = req.query;

      // Parse time range
      let startTime: number | undefined;
      if (typeof range === 'string') {
        const match = range.match(/^(\d+)([smhd])$/);
        if (match) {
          const [, value, unit] = match;
          const ms = parseInt(value, 10);
          const multipliers: Record<string, number> = {
            s: 1000,
            m: 60 * 1000,
            h: 60 * 60 * 1000,
            d: 24 * 60 * 60 * 1000
          };
          startTime = Date.now() - ms * multipliers[unit];
        }
      }

      const metrics = services.metricsCollector.getMetrics(startTime);

      // Limit results
      const limitNum = parseInt(String(limit), 10) || 100;
      const limitedExecution = metrics.execution.slice(-limitNum);

      res.json({
        range,
        limit: limitNum,
        execution: limitedExecution,
        summary: metrics.summary
      });
    } catch (error) {
      console.error(`[API] /history error: ${error}`);
      res.status(500).json({ error: String(error) });
    }
  });

  /**
   * GET /api/orchestration/errors
   * Returns error metrics
   */
  router.get('/errors', (req: Request, res: Response) => {
    try {
      const { range = '24h' } = req.query;

      const metrics = services.metricsCollector.getMetrics();
      const errors = metrics.execution.filter((m) => !m.success);

      res.json({
        totalErrors: errors.length,
        errorRate: (errors.length / metrics.execution.length) * 100 || 0,
        errors: errors.map((e) => ({
          taskId: e.taskId,
          errorCode: e.errorCode,
          timestamp: new Date(e.startTime).toISOString()
        }))
      });
    } catch (error) {
      console.error(`[API] /errors error: ${error}`);
      res.status(500).json({ error: String(error) });
    }
  });

  /**
   * POST /api/orchestration/terminate/:taskId
   * Terminate child process
   */
  router.post('/terminate/:taskId', async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      const { signal = 'SIGTERM' } = req.body;

      await services.coordinator.terminateChild(taskId, signal);

      res.json({ taskId, signal, status: 'terminated' });
    } catch (error) {
      console.error(`[API] /terminate/:taskId error: ${error}`);
      res.status(500).json({ error: String(error) });
    }
  });

  /**
   * GET /api/orchestration/stats
   * Returns broker and system statistics
   */
  router.get('/stats', (req: Request, res: Response) => {
    try {
      const children = services.coordinator.getActiveChildren();
      const poolStatus = services.agentPool.getStatus();
      const collectorSummary = services.metricsCollector.getSummary();

      res.json({
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        children: {
          active: children.length,
          totalTokens: children.reduce((sum, c) => sum + c.tokensUsed, 0)
        },
        agents: poolStatus,
        metrics: collectorSummary
      });
    } catch (error) {
      console.error(`[API] /stats error: ${error}`);
      res.status(500).json({ error: String(error) });
    }
  });

  return router;
}
