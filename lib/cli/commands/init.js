import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { detectAgents } from '../../config/auto-detect.js';
import { saveConfig } from '../../config/user-config.js';
import { getMergedConfig } from '../../config/user-config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const command = new Command('init')
  .description('Initialize Ultraflow for your AI coding agent')
  .option('-a, --agent <type>', 'AI agent type: claude-code, opencode, codex, openclaw, all')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .action(async (opts) => {
    try {
      // Detect agents
      const detection = detectAgents();
      
      let selectedAgent = opts.agent || null;

      // If no agent specified and multiple detected, ask user
      if (!selectedAgent && !opts.yes) {
        if (detection.detected.length > 1) {
          const answer = await inquirer.prompt([{
            type: 'list',
            name: 'agent',
            message: 'Which AI coding agent are you primarily using?',
            choices: [
              ...detection.detected.map(a => ({ name: a.name, value: a.id })),
              { name: 'All agents (generate configs for all)', value: 'all' }
            ]
          }]);
          selectedAgent = answer.agent;
        } else if (detection.detected.length === 1) {
          selectedAgent = detection.detected[0].id;
        } else {
          // No agent detected - use all
          selectedAgent = 'all';
        }
      }

      // If still no agent, default to all
      if (!selectedAgent) {
        selectedAgent = 'all';
      }

      console.log(chalk.cyan(`\n📦 Initializing Ultraflow for: ${selectedAgent}\n`));

      // Generate configs for selected agent(s)
      const agentsToConfig = selectedAgent === 'all' 
        ? ['claude-code', 'opencode', 'codex', 'openclaw']
        : [selectedAgent];

      for (const agent of agentsToConfig) {
        await generateAgentConfig(agent);
      }

      // Save user config
      const config = {
        version: '1.1.0',
        agent: selectedAgent,
        dashboard: {
          port: 3000,
          autoStart: true,
          autoOpenBrowser: false
        },
        memory: {
          path: '.claude/memory'
        }
      };
      saveConfig(config);

      console.log(chalk.green('\n✅ Ultraflow initialized successfully!'));
      console.log(chalk.cyan('\n📋 What was configured:'));
      console.log(`   - Agent: ${selectedAgent}`);
      console.log(`   - Dashboard port: 3000 (configurable)`);
      console.log(`   - Memory path: .claude/memory`);
      console.log(chalk.cyan('\n🚀 Next steps:'));
      console.log('   npx ultraflow start          # Start all services');
      console.log('   npx ultraflow start dashboard # Start just the dashboard');
      console.log('   npx ultraflow status         # Check status\n');

    } catch (error) {
      console.error('Error during initialization:', error.message);
      process.exit(1);
    }
  });

async function generateAgentConfig(agent) {
  const cwd = process.cwd();
  
  switch (agent) {
    case 'claude-code':
      return generateClaudeCodeConfig(cwd);
    case 'opencode':
      return generateOpenCodeConfig(cwd);
    case 'codex':
      return generateCodexConfig(cwd);
    case 'openclaw':
      return generateOpenClawConfig(cwd);
    default:
      console.log(chalk.yellow(`⚠️  Unknown agent: ${agent}`));
  }
}

function generateClaudeCodeConfig(cwd) {
  const configDir = path.join(cwd, '.claude');
  const settingsPath = path.join(configDir, 'settings.json');
  
  // Create .claude directory if needed
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  // Find ultraflow path (use npm package path or local)
  const ultraflowPath = findUltraflowPath();
  
  const settings = {
    mcpServers: {
      "ultraflow-brain": {
        command: "node",
        args: [path.join(ultraflowPath, 'lib/brain-server/server.js')],
        env: {
          BRAIN_MEMORY_PATH: ".claude/memory",
          DASHBOARD_URL: "http://localhost:3000"
        }
      }
    },
    hooks: {
      SessionStart: {
        command: "node",
        args: [path.join(ultraflowPath, 'hooks/claude-code/SessionStart.js')],
        description: "Auto-load context and start dashboard"
      },
      SessionEnd: {
        command: "node",
        args: [path.join(ultraflowPath, 'hooks/claude-code/SessionEnd.js')],
        description: "Save checkpoint and cleanup"
      },
      PostToolUse: {
        command: "node",
        args: [path.join(ultraflowPath, 'hooks/claude-code/PostToolUse.js')],
        description: "Log agent usage"
      }
    }
  };
  
  // Merge with existing settings if any
  let existingSettings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      existingSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    } catch (e) {
      // Start fresh
    }
  }
  
  const merged = { ...existingSettings, ...settings };
  
  // Ensure mcpServers and hooks are merged, not replaced
  if (existingSettings.mcpServers) {
    merged.mcpServers = { ...existingSettings.mcpServers, ...settings.mcpServers };
  }
  if (existingSettings.hooks) {
    merged.hooks = { ...existingSettings.hooks, ...settings.hooks };
  }
  
  fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2));
  console.log(chalk.green('  ✅ Generated .claude/settings.json'));
}

function generateOpenCodeConfig(cwd) {
  const configDir = path.join(cwd, '.opencode');
  const configPath = path.join(configDir, 'config.yaml');
  
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  const ultraflowPath = findUltraflowPath();
  
  const config = `version: 1.0
integration: ultraflow

# Brain memory integration
memory:
  enabled: true
  type: brain-vault
  path: .claude/memory
  auto_index: true

# Token Dashboard
token_dashboard:
  enabled: true
  port: 3000
  auto_start: true
  url: http://localhost:3000

# MCP Server
mcp:
  ultraflow-brain:
    enabled: true
    server_path: ${ultraflowPath.replace(/\\/g, '/')}/lib/brain-server/server.js
    memory_path: .claude/memory

# All 17 tools enabled by default
tools:
  - search_memories
  - get_memory
  - list_memories
  - refresh_index
  - save_memory
  - checkpoint
  - load_context
  - generateCheckpoint
  - adjustThreshold
  - loadCheckpoint
  - view_dashboard
  - get_token_summary
  - get_task_list
  - get_optimization_alerts
  - generate_session_report
  - get_agent_usage_log
  - log_agent_dispatch
  - get_agent_usage_summary

features:
  - Brain memory
  - Token dashboard
`;
  
  fs.writeFileSync(configPath, config);
  console.log(chalk.green('  ✅ Generated .opencode/config.yaml'));
}

function generateCodexConfig(cwd) {
  const agentsPath = path.join(cwd, 'AGENTS.md');
  
  const content = `# Ultraflow - Brain Agent for Codex

Generated by Ultraflow for Codex integration.

## Brain Memory Agent

**Name:** ultraflow-brain
**Role:** Manages long-term project memory, context, checkpoints, and token tracking

### Capabilities

**Memory:**
- search_memories(query) - Search brain vault
- get_memory(name) - Retrieve specific memory
- list_memories(type) - List all memories
- save_memory(name, content, type, description) - Save new memory
- refresh_index() - Update memory index

**Context:**
- checkpoint(summary, next_steps, tags) - Save context before /clear
- load_context(query, depth) - Load context after /clear

**Dashboard:**
- view_dashboard() - View token dashboard
- get_token_summary() - Get token summary
- get_task_list() - Get task list
- get_optimization_alerts() - Get optimization alerts

**Agent Usage:**
- get_agent_usage_log() - Get usage log
- log_agent_dispatch(agent_id, model, description, tokens) - Log dispatch
- get_agent_usage_summary() - Get usage summary

## Token Dashboard

The dashboard is available at: **http://localhost:3000**

## Setup

Add to your Codex config:

\`\`\`toml
[[mcp.servers]]
name = "ultraflow"
command = "node"
args = ["path/to/ultraflow/lib/brain-server/server.js"]
\`\`\`

---

*Ultraflow 1.1.0*
`;
  
  fs.writeFileSync(agentsPath, content);
  console.log(chalk.green('  ✅ Generated AGENTS.md'));
}

function generateOpenClawConfig(cwd) {
  const configDir = path.join(cwd, '.openclaw');
  const manifestPath = path.join(configDir, 'ultraflow-manifest.json');
  
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  const ultraflowPath = findUltraflowPath();
  
  const manifest = {
    name: "Ultraflow Integration",
    version: "1.1.0",
    description: "Brain memory system for AI coding agents",
    type: "integration",
    components: {
      brain: {
        type: "mcp-server",
        enabled: true,
        path: `${ultraflowPath}/lib/brain-server/server.js`,
        tools: [
          "search_memories", "get_memory", "list_memories", "refresh_index",
          "save_memory", "checkpoint", "load_context", "generateCheckpoint",
          "loadCheckpoint", "adjustThreshold", "view_dashboard", "get_token_summary",
          "get_task_list", "get_optimization_alerts", "generate_session_report",
          "get_agent_usage_log", "log_agent_dispatch", "get_agent_usage_summary"
        ]
      },
      "token-dashboard": {
        type: "service",
        enabled: true,
        port: 3000,
        auto_start: true
      }
    },
    configuration: {
      memory_path: ".claude/memory",
      dashboard_url: "http://localhost:3000",
      context_threshold: 2000
    }
  };
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(chalk.green('  ✅ Generated .openclaw/ultraflow-manifest.json'));
}

function findUltraflowPath() {
  // Try to find the ultraflow package
  const cwd = process.cwd();
  
  // Check if we're in the ultraflow package itself
  const packagePath = path.join(cwd, 'package.json');
  if (fs.existsSync(packagePath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      if (pkg.name === 'ultraflow') {
        return cwd;
      }
    } catch (e) {}
  }
  
  // Check for node_modules/ultraflow
  const nodeModulesPath = path.join(cwd, 'node_modules', 'ultraflow');
  if (fs.existsSync(path.join(nodeModulesPath, 'package.json'))) {
    return nodeModulesPath;
  }
  
  // Default to relative path from project root
  // This assumes ultraflow is installed in the project's node_modules
  return './node_modules/ultraflow';
}

export default command;