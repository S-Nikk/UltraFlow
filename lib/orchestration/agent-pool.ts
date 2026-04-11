/**
 * Agent Pool Manager
 *
 * Manages allocation of agents (Haiku, Sonnet, Opus) across concurrent tasks.
 * Prevents over-allocation, handles queuing, and tracks utilization.
 */

import { EventEmitter } from 'events';
import { Agent, AgentType, Task, PoolStatus } from './types';
import * as uuid from 'crypto';

export interface AgentPoolConfig {
  haiku: number;
  sonnet: number;
  opus: number;
  queueTimeoutMs: number;
}

export class AgentPool extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private taskQueue: Task[] = [];
  private config: AgentPoolConfig;

  constructor(config: AgentPoolConfig) {
    super();
    this.config = config;
    this.initializeAgents();
  }

  /**
   * Initialize agent pool
   */
  private initializeAgents(): void {
    // Create Haiku agents
    for (let i = 0; i < this.config.haiku; i++) {
      this.createAgent('haiku');
    }

    // Create Sonnet agents
    for (let i = 0; i < this.config.sonnet; i++) {
      this.createAgent('sonnet');
    }

    // Create Opus agents
    for (let i = 0; i < this.config.opus; i++) {
      this.createAgent('opus');
    }

    console.log(
      `[AgentPool] Initialized: ${this.config.haiku} Haiku, ${this.config.sonnet} Sonnet, ${this.config.opus} Opus`
    );
  }

  /**
   * Create agent instance
   */
  private createAgent(type: AgentType): Agent {
    const agent: Agent = {
      id: this.generateAgentId(type),
      type,
      available: true,
      tokensUsedThisSession: 0
    };

    this.agents.set(agent.id, agent);
    return agent;
  }

  /**
   * Allocate agent for task (may return null if none available)
   */
  allocateAgent(type: AgentType): Agent | null {
    const availableAgent = Array.from(this.agents.values()).find(
      (agent) => agent.type === type && agent.available
    );

    if (availableAgent) {
      availableAgent.available = false;
      console.log(`[AgentPool] Allocated ${type} agent ${availableAgent.id}`);
      this.emit('agent-allocated', availableAgent);
      return availableAgent;
    }

    console.log(`[AgentPool] No available ${type} agents`);
    return null;
  }

  /**
   * Queue task if no agent available
   */
  async queueTask(task: Task): Promise<Agent> {
    return new Promise((resolve, reject) => {
      const agent = this.allocateAgent(task.model);

      if (agent) {
        resolve(agent);
        return;
      }

      // Queue task
      this.taskQueue.push(task);
      console.log(`[AgentPool] Queued ${task.model} task ${task.id} (queue size: ${this.taskQueue.length})`);

      // Set timeout
      const timeoutId = setTimeout(() => {
        this.taskQueue = this.taskQueue.filter((t) => t.id !== task.id);
        reject(new Error(`Task ${task.id} exceeded queue timeout`));
      }, this.config.queueTimeoutMs);

      // Wait for agent allocation
      const checkAgent = () => {
        const allocated = this.allocateAgent(task.model);
        if (allocated) {
          clearTimeout(timeoutId);
          resolve(allocated);
        } else {
          setImmediate(checkAgent);
        }
      };

      checkAgent();
    });
  }

  /**
   * Release agent back to pool
   */
  releaseAgent(agentId: string, tokensUsed: number): void {
    const agent = this.agents.get(agentId);

    if (!agent) {
      console.warn(`[AgentPool] Unknown agent ${agentId}`);
      return;
    }

    agent.available = true;
    agent.currentTaskId = undefined;
    agent.tokensUsedThisSession += tokensUsed;

    console.log(`[AgentPool] Released ${agent.type} agent ${agentId}`);
    this.emit('agent-released', agent);

    // Process queued tasks
    this.processQueue();
  }

  /**
   * Process queued tasks
   */
  private processQueue(): void {
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue[0];
      const agent = this.allocateAgent(task.model);

      if (agent) {
        this.taskQueue.shift();
        this.emit('task-dequeued', { task, agent });
        agent.currentTaskId = task.id;
      } else {
        break;
      }
    }
  }

  /**
   * Get pool status
   */
  getStatus(): {
    haiku: PoolStatus;
    sonnet: PoolStatus;
    opus: PoolStatus;
    queuedTasks: number;
  } {
    const getPoolStatus = (type: AgentType): PoolStatus => {
      const agents = Array.from(this.agents.values()).filter((a) => a.type === type);
      return {
        available: agents.filter((a) => a.available).length,
        busy: agents.filter((a) => !a.available).length,
        queued: this.taskQueue.filter((t) => t.model === type).length
      };
    };

    return {
      haiku: getPoolStatus('haiku'),
      sonnet: getPoolStatus('sonnet'),
      opus: getPoolStatus('opus'),
      queuedTasks: this.taskQueue.length
    };
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents of type
   */
  getAgents(type: AgentType): Agent[] {
    return Array.from(this.agents.values()).filter((a) => a.type === type);
  }

  /**
   * Cancel queued task
   */
  cancelTask(taskId: string): void {
    this.taskQueue = this.taskQueue.filter((t) => t.id !== taskId);
    console.log(`[AgentPool] Cancelled task ${taskId}`);
    this.emit('task-cancelled', taskId);
  }

  /**
   * Reset pool
   */
  reset(): void {
    this.taskQueue = [];
    Array.from(this.agents.values()).forEach((agent) => {
      agent.available = true;
      agent.currentTaskId = undefined;
    });
    console.log('[AgentPool] Reset');
  }

  /**
   * Get total tokens used
   */
  getTotalTokens(): number {
    return Array.from(this.agents.values()).reduce((sum, agent) => sum + agent.tokensUsedThisSession, 0);
  }

  /**
   * Generate unique agent ID
   */
  private generateAgentId(type: AgentType): string {
    return `agent-${type}-${uuid.randomUUID().substring(0, 8)}`;
  }
}

/**
 * Create agent pool with default configuration
 */
export function createAgentPool(config: Partial<AgentPoolConfig> = {}): AgentPool {
  const defaultConfig: AgentPoolConfig = {
    haiku: 4,
    sonnet: 2,
    opus: 1,
    queueTimeoutMs: 300000, // 5 minutes
    ...config
  };

  return new AgentPool(defaultConfig);
}
