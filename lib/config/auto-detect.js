/**
 * Agent Auto-Detection
 * Detects which AI coding agent the user is using.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Detect which AI coding agents are present in the project
 * @returns {Object} Detection results
 */
export function detectAgents() {
  const cwd = process.cwd();
  const results = {
    detected: [],
    possible: [],
    recommended: null,
  };

  const checks = [
    { id: 'claude-code', paths: ['.claude/settings.json', '.claude/memory'], name: 'Claude Code' },
    { id: 'opencode', paths: ['.opencode/config.yaml', '.opencode/config.yml'], name: 'OpenCode' },
    { id: 'codex', paths: ['.codex/config.toml', 'AGENTS.md', '.agents/config.toml'], name: 'Codex' },
    { id: 'openclaw', paths: ['.openclaw/manifest.json', '.openclaw/config.json'], name: 'OpenClaw' },
  ];

  for (const check of checks) {
    const found = check.paths.some(p => fs.existsSync(path.join(cwd, p)));
    if (found) {
      results.detected.push({ id: check.id, name: check.name });
    }
  }

  // If multiple detected, recommend based on what's most likely
  if (results.detected.length > 1) {
    // Priority: Claude Code > OpenCode > Codex > OpenClaw
    const priority = ['claude-code', 'opencode', 'codex', 'openclaw'];
    const found = results.detected.find(a => priority.includes(a.id));
    results.recommended = found?.id || results.detected[0].id;
  } else if (results.detected.length === 1) {
    results.recommended = results.detected[0].id;
  } else {
    // None detected - user is using AI, just don't know which yet
    // Default to all (generate configs for all)
    results.recommended = 'all';
  }

  return results;
}

/**
 * Ask user which agent to use (for CLI prompts)
 * @param {Array} detected - Array of detected agents
 * @returns {string} Selected agent ID
 */
export function promptAgentSelection(detected) {
  // This returns a prompt message - actual prompting done by CLI
  if (detected.length === 0) {
    return 'No specific AI agent detected. Will generate configs for all supported agents.';
  }
  
  if (detected.length === 1) {
    return `Detected ${detected[0].name}. Using that agent's configuration.`;
  }
  
  return `Multiple agents detected: ${detected.map(a => a.name).join(', ')}. Please select which to prioritize.`;
}

/**
 * Get detected agent's config directory
 * @param {string} agentId - Agent ID
 * @returns {string} Path to agent's config
 */
export function getAgentConfigPath(agentId) {
  const cwd = process.cwd();
  
  const paths = {
    'claude-code': '.claude',
    'opencode': '.opencode',
    'codex': '.codex',
    'openclaw': '.openclaw',
  };
  
  return path.join(cwd, paths[agentId] || '.claude');
}

/**
 * Check if agent config exists
 * @param {string} agentId - Agent ID
 * @returns {boolean} True if exists
 */
export function agentConfigExists(agentId) {
  const configPath = getAgentConfigPath(agentId);
  return fs.existsSync(configPath);
}

export default { detectAgents, promptAgentSelection, getAgentConfigPath, agentConfigExists };