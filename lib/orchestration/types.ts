/**
 * Orchestration Type Definitions
 *
 * Shared types for parent/child orchestration communication
 */

export type AgentType = 'haiku' | 'sonnet' | 'opus';
export type MessageType = 'task' | 'result' | 'metrics' | 'error' | 'heartbeat' | 'log';
export type ChildStatus = 'idle' | 'running' | 'completed' | 'failed' | 'terminated';

/**
 * Message Types
 */
export interface Message {
  id: string;
  type: MessageType;
  timestamp: number;
  taskId: string;
  payload: any;
}

export interface TaskMessage extends Message {
  type: 'task';
  payload: {
    prompt: string;
    model?: AgentType;
    timeout?: number;
    metadata?: Record<string, any>;
  };
}

export interface ResultMessage extends Message {
  type: 'result';
  payload: {
    output: string;
    success: boolean;
    tokensUsed: number;
    durationMs: number;
  };
}

export interface MetricsMessage extends Message {
  type: 'metrics';
  payload: ExecutionMetrics;
}

export interface ErrorMessage extends Message {
  type: 'error';
  payload: {
    message: string;
    code: string;
    recoverable: boolean;
  };
}

export interface HeartbeatMessage extends Message {
  type: 'heartbeat';
  payload: {
    status: ChildStatus;
    memoryMb: number;
    uptime: number;
  };
}

export interface LogMessage extends Message {
  type: 'log';
  payload: {
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    context?: Record<string, any>;
  };
}

/**
 * Child Process Types
 */
export interface ChildProcess {
  pid: number;
  taskId: string;
  status: ChildStatus;
  startTime: number;
  lastHeartbeat: number;
  tokensUsed: number;
  exitCode?: number;
}

export interface ChildStatus {
  taskId: string;
  pid: number;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'terminated';
  progress: number; // 0-100
  currentTask?: string;
  tokensUsed: number;
  durationMs: number;
  error?: string;
}

/**
 * Metrics Types
 */
export interface ExecutionMetrics {
  taskId: string;
  startTime: number;
  endTime?: number;
  durationMs: number;
  tokensUsed: number;
  modelUsed: AgentType;
  success: boolean;
  errorCode?: string;
}

export interface ResourceMetrics {
  timestamp: number;
  cpuPercent: number;
  memoryMb: number;
  childCount: number;
}

export interface OrchestratorMetrics {
  timestamp: number;
  activeChildren: number;
  totalTasksCompleted: number;
  totalTokensUsed: number;
  averageLatencyMs: number;
  agentPool: {
    haiku: PoolStatus;
    sonnet: PoolStatus;
    opus: PoolStatus;
  };
  children: ChildStatus[];
  errors: number;
}

export interface PoolStatus {
  available: number;
  busy: number;
  queued: number;
}

/**
 * Agent Types
 */
export interface Agent {
  id: string;
  type: AgentType;
  available: boolean;
  currentTaskId?: string;
  tokensUsedThisSession: number;
}

export interface PoolStatus {
  available: number;
  busy: number;
  queued: number;
}

export interface Task {
  id: string;
  prompt: string;
  model: AgentType;
  priority: number; // 0-10, higher = more important
  timeout: number; // milliseconds
  metadata?: Record<string, any>;
  createdAt: number;
  startedAt?: number;
}

/**
 * Configuration Types
 */
export interface OrchestratorConfig {
  enabled: boolean;
  messageBrokerPort: number;
  messageBrokerHost: string;
  haiku: PoolConfig;
  sonnet: PoolConfig;
  opus: PoolConfig;
  child: ChildConfig;
  metrics: MetricsConfig;
  logging: LoggingConfig;
}

export interface PoolConfig {
  size: number;
  timeout: number;
}

export interface ChildConfig {
  spawnEnabled: boolean;
  timeout: number;
  heartbeatInterval: number;
  maxRetries: number;
}

export interface MetricsConfig {
  enabled: boolean;
  storage: 'memory' | 'redis' | 'sqlite';
  retentionHours: number;
  flushIntervalMs: number;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  file?: string;
  maxSize: number;
  maxFiles: number;
}

/**
 * Nested Mode Types
 */
export interface NestedModeContext {
  parentPid: number;
  taskId: string;
  sessionId: string;
  messageBrokerPort: number;
  messageBrokerHost: string;
}

export interface NestedModeConfig {
  enabled: boolean;
  parentPid?: number;
  taskId?: string;
  sessionId?: string;
  heartbeatInterval: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
}
