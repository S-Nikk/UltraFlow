/**
 * Package-Level Defaults
 * These values are always optimal and work out of the box.
 * User can override via init wizard or config file.
 */

export const DEFAULTS = {
  // Agent configuration
  agent: {
    type: 'auto', // 'auto', 'claude-code', 'opencode', 'codex', 'openclaw'
    detectMultiple: 'ask', // 'ask', 'first', 'all'
  },

  // Token Dashboard
  dashboard: {
    port: 3000,
    autoStart: true,
    autoOpenBrowser: false,
    showDataOnly: true, // Only show real data, not sample
  },

  // Brain Server (MCP)
  brain: {
    enableAllTools: true,
    autoIndex: true,
    threshold: 2000,
    minThreshold: 1000,
    maxThreshold: 5000,
    autoCheckpoint: true,
    compression: 'auto', // 'auto', 'opencode', 'basic'
    opencodeRequired: true, // Must make OpenCode available
  },

  // Memory
  memory: {
    path: '.claude/memory',
    maxConsciousTokens: 3000,
    unloadThreshold: 0.3,
    indexingLevels: ['token_frequency', 'relevancy_score', 'recency', 'access_count'],
  },

  // Hooks
  hooks: {
    autoProvision: true,
    SessionStart: true,
    SessionEnd: true,
    PostToolUse: true,
  },

  // OpenCode
  opencode: {
    findInPath: true,
    findInNpmGlobal: true,
    autoInstall: true,
    installCommand: 'npm install -g opencode-ai',
  },

  // Lyra (Prompt Optimization)
  lyra: {
    enabled: true,
    mode: 'auto', // 'basic', 'detail', 'auto'
    autoOptimize: true, // Optimize all prompts automatically
    platforms: {
      searchQueries: 'generic',
      memoryContext: 'claude',
      checkpointSummaries: 'generic',
      toolPrompts: 'auto', // auto-detect based on tool type
    },
    levels: {
      package: true, // Package-level always on
      user: true, // User-level automation
      orchestration: {
        mcpTools: true,
        brainServer: true,
        tokenDashboard: true,
        agentHooks: true,
      },
    },
  },
};

export default DEFAULTS;