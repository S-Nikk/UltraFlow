import { Command } from 'commander';
import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';

const __dirname = dirname(fileURLToPath(import.meta.url));

const command = new Command('start')
  .description('Start Brain MCP server')
  .action(() => {
    const serverPath = join(__dirname, '../../brain-server/server.js');

    console.log(chalk.cyan('🧠 Starting Brain MCP server...'));

    const server = fork(serverPath, [], {
      stdio: 'inherit'
    });

    process.on('SIGINT', () => {
      console.log(chalk.yellow('\nShutting down Brain server...'));
      server.kill();
      process.exit(0);
    });
  });

export default command;
