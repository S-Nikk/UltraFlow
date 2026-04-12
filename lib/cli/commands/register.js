import { Command } from 'commander';
import pc from 'picocolors';
import os from 'os';
import fs from 'fs';
import path from 'path';

function expandPath(p) {
  if (p.startsWith('~')) {
    return path.join(os.homedir(), p.slice(1));
  }
  return path.resolve(p);
}

const command = new Command('register')
  .description('Register Ultraflow MCP with AI coding agents')
  .option('-g, --global', 'Register in global config (all projects)')
  .option('-o, --opencode', 'Register with OpenCode only')
  .option('-c, --claude', 'Register with Claude Code only')
  .action(async (opts) => {
    const MCP_COMMAND = 'node';
    const MCP_ARGS = [process.argv[1].replace(/[^/\\]+$/, 'ultraflow-mcp.js')];
    const registered = [];

    // Register with OpenCode
    if (opts.opencode || (!opts.claude)) {
      const locations = [
        '~/.opencode/config.json',
        '~/.config/opencode/config.json',
      ];

      let opencodeConfig = null;
      for (const loc of locations) {
        const expanded = expandPath(loc);
        if (fs.existsSync(expanded)) {
          opencodeConfig = expanded;
          break;
        }
      }

      if (opencodeConfig) {
        try {
          const config = JSON.parse(fs.readFileSync(opencodeConfig, 'utf-8'));
          if (!config.mcpServers) config.mcpServers = {};
          config.mcpServers.ultraflow = {
            command: MCP_COMMAND,
            args: MCP_ARGS,
            description: 'Ultraflow brain memory system',
            enabled: true
          };
          fs.writeFileSync(opencodeConfig, JSON.stringify(config, null, 2));
          registered.push(`OpenCode (${opencodeConfig})`);
        } catch (e) {
          console.error(pc.red(`Failed to update OpenCode: ${e.message}`));
        }
      } else {
        // Create default
        const defaultPath = expandPath('~/.opencode/config.json');
        fs.mkdirSync(path.dirname(defaultPath), { recursive: true });
        const defaultConfig = {
          version: '1.0',
          mcpServers: {
            ultraflow: {
              command: MCP_COMMAND,
              args: MCP_ARGS,
              description: 'Ultraflow brain memory system',
              enabled: true
            }
          }
        };
        fs.writeFileSync(defaultPath, JSON.stringify(defaultConfig, null, 2));
        registered.push(`OpenCode (created: ${defaultPath})`);
      }
    }

    // Register with Claude Code
    if (opts.claude || (!opts.opencode)) {
      const claudePath = expandPath('~/.claude/settings.json');

      if (fs.existsSync(claudePath)) {
        try {
          const config = JSON.parse(fs.readFileSync(claudePath, 'utf-8'));
          if (!config.mcpServers) config.mcpServers = {};
          config.mcpServers.ultraflow = {
            command: MCP_COMMAND,
            args: MCP_ARGS,
            description: 'Ultraflow brain memory system'
          };
          fs.writeFileSync(claudePath, JSON.stringify(config, null, 2));
          registered.push(`Claude Code (${claudePath})`);
        } catch (e) {
          console.error(pc.red(`Failed to update Claude Code: ${e.message}`));
        }
      } else {
        fs.mkdirSync(path.dirname(claudePath), { recursive: true });
        const defaultConfig = {
          mcpServers: {
            ultraflow: {
              command: MCP_COMMAND,
              args: MCP_ARGS,
              description: 'Ultraflow brain memory system'
            }
          }
        };
        fs.writeFileSync(claudePath, JSON.stringify(defaultConfig, null, 2));
        registered.push(`Claude Code (created: ${claudePath})`);
      }
    }

    if (registered.length > 0) {
      console.log(pc.green('\n✓ MCP registered in:'));
      registered.forEach(r => console.log(`  - ${r}`));
      console.log('\nRun ' + pc.cyan('npx ultraflow start') + ' to start services\n');
    } else {
      console.log(chalk.yellow('\n⚠ No agents found to register with\n'));
    }
  });

export default command;