/**
 * Orchestration Module - Main Entry Point
 *
 * Exports all orchestration components and utilities for two-layer AI system.
 */

export * from './types';
export { MessageBroker, createMessageBroker, BrokerConfig } from './message-broker';
export { RufloCoordinator, createCoordinator, CoordinatorConfig } from './ruflo-coordinator';
export { AgentPool, createAgentPool, AgentPoolConfig } from './agent-pool';
export { MetricsCollector, createMetricsCollector, CollectorConfig } from './metrics-collector';

import { MessageBroker, createMessageBroker, BrokerConfig } from './message-broker';
import { RufloCoordinator, createCoordinator, CoordinatorConfig } from './ruflo-coordinator';
import { AgentPool, createAgentPool, AgentPoolConfig } from './agent-pool';
import { MetricsCollector, createMetricsCollector, CollectorConfig } from './metrics-collector';
import { OrchestratorConfig } from './types';

/**
 * Orchestration System - Complete implementation
 */
export class Orchestrator {
  public messageBroker: MessageBroker;
  public coordinator: RufloCoordinator;
  public agentPool: AgentPool;
  public metricsCollector: MetricsCollector;
  private config: OrchestratorConfig;

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.messageBroker = new MessageBroker({
      port: config.messageBrokerPort,
      host: config.messageBrokerHost,
      messageQueueSize: 1000,
      connectionTimeout: 5000
    });
    this.coordinator = new RufloCoordinator({
      rufloPath: config.child.spawnEnabled ? process.env.RUFLO_PATH || '/c/Users/ecoec/AI/ruflo' : '',
      maxChildren: 10,
      timeout: config.child.timeout,
      heartbeatInterval: config.child.heartbeatInterval,
      maxRetries: config.child.maxRetries,
      messageBrokerPort: config.messageBrokerPort,
      messageBrokerHost: config.messageBrokerHost
    });
    this.agentPool = new AgentPool({
      haiku: config.haiku.size,
      sonnet: config.sonnet.size,
      opus: config.opus.size,
      queueTimeoutMs: 300000
    });
    this.metricsCollector = new MetricsCollector({
      retentionHours: config.metrics.retentionHours,
      flushIntervalMs: config.metrics.flushIntervalMs,
      maxMetricsPerType: 10000
    });
  }

  /**
   * Initialize orchestrator
   */
  async initialize(): Promise<void> {
    console.log('[Orchestrator] Initializing...');

    if (this.config.enabled) {
      await this.messageBroker.connect();
      console.log('[Orchestrator] Message broker started');

      // Setup message routing
      this.messageBroker.receive((message, clientId) => {
        this.metricsCollector.trackExecution({
          taskId: message.taskId,
          startTime: message.timestamp,
          durationMs: Date.now() - message.timestamp,
          tokensUsed: 0,
          modelUsed: 'haiku',
          success: true
        });
      });

      console.log('[Orchestrator] Initialized');
    } else {
      console.log('[Orchestrator] Orchestration disabled');
    }
  }

  /**
   * Shutdown orchestrator
   */
  async shutdown(): Promise<void> {
    console.log('[Orchestrator] Shutting down...');
    await this.coordinator.cleanup();
    await this.messageBroker.close();
    this.metricsCollector.cleanup();
    console.log('[Orchestrator] Shutdown complete');
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      enabled: this.config.enabled,
      messageBroker: this.messageBroker.getStats(),
      coordinator: {
        activeChildren: this.coordinator.getActiveChildren().length
      },
      agentPool: this.agentPool.getStatus(),
      metrics: this.metricsCollector.getSummary()
    };
  }
}

/**
 * Create orchestrator from environment variables
 */
export function createOrchestrator(): Orchestrator {
  const config: OrchestratorConfig = {
    enabled: process.env.ORCHESTRATION_ENABLED !== 'false',
    messageBrokerPort: parseInt(process.env.MESSAGE_BROKER_PORT || '3333', 10),
    messageBrokerHost: process.env.MESSAGE_BROKER_HOST || 'localhost',
    haiku: {
      size: parseInt(process.env.HAIKU_POOL_SIZE || '4', 10),
      timeout: 300000
    },
    sonnet: {
      size: parseInt(process.env.SONNET_POOL_SIZE || '2', 10),
      timeout: 600000
    },
    opus: {
      size: parseInt(process.env.OPUS_POOL_SIZE || '1', 10),
      timeout: 900000
    },
    child: {
      spawnEnabled: process.env.CHILD_SPAWN_ENABLED !== 'false',
      timeout: parseInt(process.env.CHILD_TIMEOUT_MS || '600000', 10),
      heartbeatInterval: parseInt(process.env.CHILD_HEARTBEAT_INTERVAL || '30000', 10),
      maxRetries: parseInt(process.env.CHILD_MAX_RETRIES || '3', 10)
    },
    metrics: {
      enabled: process.env.METRICS_ENABLED !== 'false',
      storage: (process.env.METRICS_STORAGE as any) || 'memory',
      retentionHours: parseInt(process.env.METRICS_RETENTION_HOURS || '24', 10),
      flushIntervalMs: parseInt(process.env.METRICS_FLUSH_INTERVAL_MS || '60000', 10)
    },
    logging: {
      level: (process.env.LOG_LEVEL as any) || 'info',
      file: process.env.ORCHESTRATION_LOG_FILE,
      maxSize: parseInt(process.env.LOG_MAX_SIZE || '10485760', 10),
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '10', 10)
    }
  };

  return new Orchestrator(config);
}
