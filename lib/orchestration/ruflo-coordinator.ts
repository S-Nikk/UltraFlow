/**
 * Ruflo Coordinator - Child Process Management
 *
 * Spawns, tracks, and manages child Ruflo processes.
 * Handles lifecycle events, cleanup, and failure recovery.
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { ChildProcess as ChildProcessType, ChildStatus, OrchestratorMetrics } from './types';
import * as path from 'path';
import * as uuid from 'crypto';

export interface CoordinatorConfig {
  rufloPath: string;
  maxChildren: number;
  timeout: number;
  heartbeatInterval: number;
  maxRetries: number;
  messageBrokerPort: number;
  messageBrokerHost: string;
}

export class RufloCoordinator extends EventEmitter {
  private children: Map<string, ChildProcessType & { process: ChildProcess }> = new Map();
  private config: CoordinatorConfig;
  private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map();
  private consecutiveFailures: Map<string, number> = new Map();

  constructor(config: CoordinatorConfig) {
    super();
    this.config = config;
  }

  /**
   * Spawn child Ruflo process
   */
  async spawnChild(taskId: string, metadata: Record<string, any> = {}): Promise<ChildProcessType> {
    if (this.children.size >= this.config.maxChildren) {
      throw new Error(
        `[RufloCoordinator] Max children (${this.config.maxChildren}) reached`
      );
    }

    console.log(`[RufloCoordinator] Spawning child for task ${taskId}`);

    const childSessionId = uuid.randomUUID();
    const env = {
      ...process.env,
      RUFLO_PARENT_PID: process.pid.toString(),
      RUFLO_TASK_ID: taskId,
      RUFLO_SESSION_ID: childSessionId,
      RUFLO_MESSAGE_BROKER_PORT: this.config.messageBrokerPort.toString(),
      RUFLO_MESSAGE_BROKER_HOST: this.config.messageBrokerHost,
      RUFLO_NESTED_MODE: 'true',
      ...metadata
    };

    return new Promise((resolve, reject) => {
      try {
        const childProcess = spawn('node', [
          path.join(this.config.rufloPath, 'bin', 'ruflo.js'),
          'nested'
        ], {
          env,
          detached: false,
          stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });

        const child: ChildProcessType & { process: ChildProcess } = {
          pid: childProcess.pid!,
          taskId,
          status: 'running',
          startTime: Date.now(),
          lastHeartbeat: Date.now(),
          tokensUsed: 0,
          process: childProcess
        };

        this.children.set(taskId, child);
        this.consecutiveFailures.set(taskId, 0);

        // Setup message handler
        childProcess.on('message', (msg) => {
          this.handleChildMessage(taskId, msg);
        });

        // Setup error handler
        childProcess.on('error', (error) => {
          console.error(`[RufloCoordinator] Child ${taskId} error: ${error}`);
          this.emit('child-error', { taskId, error });
        });

        // Setup exit handler
        childProcess.on('close', (code, signal) => {
          this.handleChildExit(taskId, code, signal);
        });

        // Setup timeout
        const timeoutId = setTimeout(() => {
          this.terminateChild(taskId, 'SIGKILL').catch((error) => {
            console.error(`[RufloCoordinator] Failed to kill timed-out child ${taskId}: ${error}`);
          });
        }, this.config.timeout);

        // Setup heartbeat
        this.setupHeartbeat(taskId);

        console.log(`[RufloCoordinator] Child spawned for task ${taskId} (PID: ${child.pid})`);
        this.emit('child-spawned', child);

        resolve(child);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle message from child process
   */
  private handleChildMessage(taskId: string, message: any): void {
    const child = this.children.get(taskId);

    if (!child) {
      console.warn(`[RufloCoordinator] Received message from unknown child ${taskId}`);
      return;
    }

    const { type, payload } = message;

    switch (type) {
      case 'heartbeat':
        child.lastHeartbeat = Date.now();
        child.status = payload.status || 'running';
        this.emit('child-heartbeat', { taskId, ...payload });
        break;

      case 'metrics':
        child.tokensUsed = payload.tokensUsed || 0;
        this.emit('child-metrics', { taskId, ...payload });
        break;

      case 'log':
        this.emit('child-log', { taskId, ...payload });
        break;

      case 'progress':
        this.emit('child-progress', { taskId, ...payload });
        break;

      default:
        console.log(`[RufloCoordinator] Unknown message type: ${type}`);
    }
  }

  /**
   * Handle child process exit
   */
  private handleChildExit(taskId: string, code: number | null, signal: string | null): void {
    const child = this.children.get(taskId);

    if (!child) {
      return;
    }

    child.status = code === 0 ? 'completed' : 'failed';
    child.exitCode = code || undefined;

    console.log(`[RufloCoordinator] Child ${taskId} exited with code ${code} signal ${signal}`);

    // Clean up heartbeat
    const heartbeatId = this.heartbeatTimers.get(taskId);
    if (heartbeatId) {
      clearInterval(heartbeatId);
      this.heartbeatTimers.delete(taskId);
    }

    // Emit event
    this.emit('child-exit', { taskId, code, signal, child });

    // Track failures
    if (code !== 0) {
      const failures = (this.consecutiveFailures.get(taskId) || 0) + 1;
      this.consecutiveFailures.set(taskId, failures);

      if (failures >= this.config.maxRetries) {
        console.error(`[RufloCoordinator] Child ${taskId} exceeded max retries`);
        this.children.delete(taskId);
      }
    } else {
      this.consecutiveFailures.set(taskId, 0);
    }
  }

  /**
   * Setup heartbeat monitoring
   */
  private setupHeartbeat(taskId: string): void {
    const heartbeatId = setInterval(() => {
      const child = this.children.get(taskId);

      if (!child) {
        clearInterval(heartbeatId);
        return;
      }

      const timeSinceLastHeartbeat = Date.now() - child.lastHeartbeat;

      if (timeSinceLastHeartbeat > this.config.heartbeatInterval * 2) {
        console.warn(
          `[RufloCoordinator] Child ${taskId} missed heartbeat (${timeSinceLastHeartbeat}ms)`
        );
        this.emit('child-heartbeat-missed', { taskId });
      }
    }, this.config.heartbeatInterval);

    this.heartbeatTimers.set(taskId, heartbeatId);
  }

  /**
   * Terminate child process
   */
  async terminateChild(taskId: string, signal: string = 'SIGTERM'): Promise<void> {
    const child = this.children.get(taskId);

    if (!child) {
      console.warn(`[RufloCoordinator] Unknown child ${taskId}`);
      return;
    }

    return new Promise((resolve) => {
      console.log(`[RufloCoordinator] Terminating child ${taskId} with ${signal}`);

      child.process.kill(signal);

      // Fallback to SIGKILL after 5 seconds
      const timeoutId = setTimeout(() => {
        if (!child.process.killed) {
          console.log(`[RufloCoordinator] Force killing child ${taskId}`);
          child.process.kill('SIGKILL');
        }
      }, 5000);

      child.process.on('exit', () => {
        clearTimeout(timeoutId);
        resolve();
      });
    });
  }

  /**
   * Get child status
   */
  getChildStatus(taskId: string): ChildStatus | null {
    const child = this.children.get(taskId);

    if (!child) {
      return null;
    }

    return {
      taskId,
      pid: child.pid,
      status: child.status,
      progress: 0, // TODO: Track progress from child messages
      tokensUsed: child.tokensUsed,
      durationMs: Date.now() - child.startTime,
      error: child.status === 'failed' ? 'Process failed' : undefined
    };
  }

  /**
   * Get all active children
   */
  getActiveChildren(): ChildStatus[] {
    return Array.from(this.children.values())
      .filter((child) => child.status !== 'terminated' && child.status !== 'completed')
      .map((child) => ({
        taskId: child.taskId,
        pid: child.pid,
        status: child.status,
        progress: 0,
        tokensUsed: child.tokensUsed,
        durationMs: Date.now() - child.startTime
      }));
  }

  /**
   * Get aggregated metrics from all children
   */
  getMetrics(): OrchestratorMetrics {
    const children = this.getActiveChildren();
    const completedChildren = Array.from(this.children.values()).filter(
      (child) => child.status === 'completed'
    );

    return {
      timestamp: Date.now(),
      activeChildren: children.length,
      totalTasksCompleted: completedChildren.length,
      totalTokensUsed: Array.from(this.children.values()).reduce(
        (sum, child) => sum + child.tokensUsed,
        0
      ),
      averageLatencyMs: 0, // TODO: Calculate from completed tasks
      agentPool: {
        haiku: { available: 0, busy: 0, queued: 0 },
        sonnet: { available: 0, busy: 0, queued: 0 },
        opus: { available: 0, busy: 0, queued: 0 }
      },
      children,
      errors: Array.from(this.children.values()).filter((child) => child.status === 'failed')
        .length
    };
  }

  /**
   * Cleanup all children
   */
  async cleanup(): Promise<void> {
    console.log('[RufloCoordinator] Cleaning up all children...');

    const terminatePromises = Array.from(this.children.keys()).map((taskId) =>
      this.terminateChild(taskId)
    );

    await Promise.all(terminatePromises);

    // Clear timers
    this.heartbeatTimers.forEach((timeoutId) => clearInterval(timeoutId));
    this.heartbeatTimers.clear();

    this.children.clear();
    console.log('[RufloCoordinator] Cleanup complete');
  }
}

/**
 * Create coordinator with default configuration
 */
export function createCoordinator(config: Partial<CoordinatorConfig> = {}): RufloCoordinator {
  const defaultConfig: CoordinatorConfig = {
    rufloPath: process.env.RUFLO_PATH || '/c/Users/ecoec/AI/ruflo',
    maxChildren: 10,
    timeout: 600000, // 10 minutes
    heartbeatInterval: 30000, // 30 seconds
    maxRetries: 3,
    messageBrokerPort: 3333,
    messageBrokerHost: 'localhost',
    ...config
  };

  return new RufloCoordinator(defaultConfig);
}
