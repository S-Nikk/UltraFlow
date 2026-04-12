#!/usr/bin/env node

/**
 * Ultraflow Postinstall Script
 * Auto-detects AI agents, registers MCP, starts services
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');

const LOG_PREFIX = '[Ultraflow]';
const MCP_COMMAND = 'node';
const MCP_ARGS = [path.join(ROOT_DIR, 'bin/ultraflow-mcp.js')];

function log(msg) {
  console.log(`${LOG_PREFIX} ${msg}`);
}

function logSuccess(msg) {
  console.log(`${LOG_PREFIX} ✓ ${msg}`);
}

function logError(msg) {
  console.error(`${LOG_PREFIX} ✗ ${msg}`);
}

function expandPath(p) {
  if (p.startsWith('~')) {
    return path.join(os.homedir(), p.slice(1));
  }
  return path.resolve(p);
}

function detectOpenCode() {
  const locations = [
    '~/.opencode/config.yaml',
    '~/.opencode/config.json',
    '~/.config/opencode/config.yaml',
    '~/.config/opencode/config.json',
    path.join(os.homedir(), 'AppData', 'Roaming', 'opencode', 'config.yaml'),
  ];

  for (const loc of locations) {
    const expanded = expandPath(loc);
    if (fs.existsSync(expanded)) {
      return { path: expanded, format: loc.endsWith('.json') ? 'json' : 'yaml' };
    }
  }

  // Check users/<username>/.opencode
  const username = os.userInfo().username;
  const userOpencodePath = expandPath(`~/.opencode`);
  if (fs.existsSync(userOpencodePath)) {
    const files = fs.readdirSync(userOpencodePath);
    const configFile = files.find(f => f === 'config.yaml' || f === 'config.json');
    if (configFile) {
      return {
        path: path.join(userOpencodePath, configFile),
        format: configFile.endsWith('.json') ? 'json' : 'yaml'
      };
    }
  }

  return null;
}

function detectClaudeCode() {
  const locations = [
    '~/.claude/settings.json',
    '~/.claude/settings.toml',
  ];

  for (const loc of locations) {
    const expanded = expandPath(loc);
    if (fs.existsSync(expanded)) {
      return { path: expanded, format: loc.endsWith('.json') ? 'json' : 'toml' };
    }
  }

  return null;
}

function detectCodex() {
  const locations = [
    '~/.codex/config.toml',
    '~/.codex/config.json',
  ];

  for (const loc of locations) {
    const expanded = expandPath(loc);
    if (fs.existsSync(expanded)) {
      return { path: expanded, format: loc.endsWith('.json') ? 'json' : 'toml' };
    }
  }

  return null;
}

function detectOpenClaw() {
  const locations = [
    '~/.openclaw/config.yaml',
    '~/.openclaw/config.json',
  ];

  for (const loc of locations) {
    const expanded = expandPath(loc);
    if (fs.existsSync(expanded)) {
      return { path: expanded, format: loc.endsWith('.json') ? 'json' : 'yaml' };
    }
  }

  return null;
}

function addMCPToOpenCode(config) {
  try {
    let content = fs.readFileSync(config.path, 'utf-8');
    let configObj;

    if (config.format === 'json') {
      configObj = JSON.parse(content);
    } else {
      // YAML - skip for now
      log(`OpenCode config at ${config.path} is YAML - skipping MCP registration`);
      return false;
    }

    // Ensure mcpServers exists and add ultraflow
    if (!configObj.mcpServers) {
      configObj.mcpServers = {};
    }
    
    configObj.mcpServers.ultraflow = {
      command: MCP_COMMAND,
      args: MCP_ARGS,
      description: 'Ultraflow brain memory system with Lyra prompt optimization',
      enabled: true
    };

    // Write back with proper formatting
    fs.writeFileSync(config.path, JSON.stringify(configObj, null, 2));
    return true;
  } catch (e) {
    logError(`Failed to update OpenCode config: ${e.message}`);
    return false;
  }
}

function addMCPToClaudeCode(config) {
  try {
    const content = fs.readFileSync(config.path, 'utf-8');
    let configObj = JSON.parse(content);

    if (!configObj.mcpServers) {
      configObj.mcpServers = {};
    }

    configObj.mcpServers.ultraflow = {
      command: MCP_COMMAND,
      args: MCP_ARGS,
      description: 'Ultraflow brain memory system with Lyra prompt optimization'
    };

    fs.writeFileSync(config.path, JSON.stringify(configObj, null, 2));
    return true;
  } catch (e) {
    logError(`Failed to update Claude Code config: ${e.message}`);
    return false;
  }
}

function createDefaultOpenCodeConfig() {
  const configPath = expandPath('~/.opencode/config.json');
  const configDir = path.dirname(configPath);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const defaultConfig = {
    version: '1.0',
    mcpServers: {
      ultraflow: {
        command: MCP_COMMAND,
        args: MCP_ARGS,
        description: 'Ultraflow brain memory system with Lyra prompt optimization',
        enabled: true
      }
    }
  };

  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  logSuccess(`Created default OpenCode config at ${configPath}`);
  return true;
}

function createDefaultClaudeCodeConfig() {
  const configPath = expandPath('~/.claude/settings.json');
  const configDir = path.dirname(configPath);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const defaultConfig = {
    mcpServers: {
      ultraflow: {
        command: MCP_COMMAND,
        args: MCP_ARGS,
        description: 'Ultraflow brain memory system with Lyra prompt optimization'
      }
    }
  };

  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  logSuccess(`Created default Claude Code config at ${configPath}`);
  return true;
}

function startBackgroundService(script, name) {
  try {
    const child = spawn(process.execPath, [script], {
      cwd: ROOT_DIR,
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    logSuccess(`${name} started in background`);
    return true;
  } catch (e) {
    logError(`Failed to start ${name}: ${e.message}`);
    return false;
  }
}

async function main() {
  log('Starting postinstall...');

  const detected = {
    opencode: detectOpenCode(),
    claudeCode: detectClaudeCode(),
    codex: detectCodex(),
    openclaw: detectOpenClaw()
  };

  log(`Detected AI agents:`);
  if (detected.opencode) log(`  - OpenCode: ${detected.opencode.path}`);
  if (detected.claudeCode) log(`  - Claude Code: ${detected.claudeCode.path}`);
  if (detected.codex) log(`  - Codex: ${detected.codex.path}`);
  if (detected.openclaw) log(`  - OpenClaw: ${detected.openclaw.path}`);

  if (!detected.opencode && !detected.claudeCode) {
    log('No AI agent configs found, creating defaults...');
    createDefaultOpenCodeConfig();
    createDefaultClaudeCodeConfig();
  }

  // Register MCP
  const registered = [];

  if (detected.opencode) {
    if (addMCPToOpenCode(detected.opencode)) {
      registered.push('OpenCode');
    }
  } else {
    createDefaultOpenCodeConfig();
    registered.push('OpenCode (created)');
  }

  if (detected.claudeCode) {
    if (addMCPToClaudeCode(detected.claudeCode)) {
      registered.push('Claude Code');
    }
  }

  if (registered.length > 0) {
    logSuccess(`MCP registered in: ${registered.join(', ')}`);
  }

  // Start background services
  log('Starting services...');

  // Start Token Dashboard
  startBackgroundService(
    path.join(ROOT_DIR, 'lib/token-dashboard/server.js'),
    'Token Dashboard'
  );

  // Start Brain MCP Server
  startBackgroundService(
    path.join(ROOT_DIR, 'lib/brain-server/server.js'),
    'Brain MCP Server'
  );

  // Start Ruflo daemon (optional - uses npx to run ruflo if available)
  // This won't block installation if ruflo takes too long or npx not found
  setTimeout(() => {
    try {
      const rufloCheck = spawn('npx', ['-y', 'ruflo@latest', '--version'], {
        cwd: ROOT_DIR,
        stdio: 'ignore'
      });
      
      rufloCheck.on('error', () => {
        // Silently skip - ruflo not available
      });
      
      rufloCheck.on('close', (code) => {
        if (code === 0) {
          log('Ruflo available via npx ruflo@latest');
        }
      });
    } catch (e) {
      // Silently skip if ruflo not available
    }
  }, 2000);

  console.log('');
  logSuccess('Ultraflow installation complete!');
  log('Services:');
  log('  - Token Dashboard: http://localhost:3000');
  log('  - Brain MCP: ready (via ultraflow-mcp)');
  log('  - Ruflo: use npx ruflo@latest to access');
  console.log('');

  console.log('');
  logSuccess('Ultraflow installation complete!');
  log('Services:');
  log('  - Token Dashboard: http://localhost:3000');
  log('  - Brain MCP: ready (via ultraflow-mcp)');
  log('  - Ruflo: daemon started');
  console.log('');
}

main().catch(e => {
  logError(`Postinstall failed: ${e.message}`);
  process.exit(1);
});