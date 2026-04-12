/**
 * Ultraflow - Brain Memory System for AI Coding Agents
 * 
 * Exports key modules for programmatic use
 */

export { default as DEFAULTS } from './config/defaults.js';
export { detectAgents, promptAgentSelection } from './config/auto-detect.js';
export { loadConfig, saveConfig, getMergedConfig } from './config/user-config.js';

export { VaultManager } from './brain-server/vault-manager.js';
export { BrainNexus } from './brain-server/brain-nexus.js';
export { BrainSwarm } from './brain-server/brain-swarm.js';

// Re-export for CLI usage
export const CLI_COMMANDS = {
  init: './cli/commands/init.js',
  start: './cli/commands/start.js',
  status: './cli/commands/status.js',
};

export default {
  name: 'ultraflow',
  version: '1.1.0',
  description: 'Brain memory system for AI coding agents',
};