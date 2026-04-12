import chalk from 'chalk';
import { spawn } from 'child_process';

export default {
  name: 'ruflo',
  description: 'Ruflo agent orchestration - Enterprise AI multi-agent swarms',
  
  async run() {
    // Find ruflo position in argv
    const argvIdx = process.argv.findIndex(a => a === 'ruflo');
    if (argvIdx === -1) {
      console.log(chalk.yellow('ruflo command not found'));
      return;
    }
    
    // Get all args after 'ruflo'
    const rufloArgs = process.argv.slice(argvIdx + 1);
    
    // If empty, show help
    if (rufloArgs.length === 0) {
      rufloArgs.push('--help');
    }
    
    console.log(chalk.cyan(`[Ultraflow] Running: npx ruflo ${rufloArgs.join(' ')}`));

    const child = spawn('npx', ['ruflo', ...rufloArgs], {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      process.exit(code || 0);
    });
  }
};