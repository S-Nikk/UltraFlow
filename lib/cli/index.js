import { program, createCommand } from 'commander';
import { spawn } from 'child_process';
import pc from 'picocolors';
import initCmd from './commands/init.js';
import startCmd from './commands/start.js';
import stopCmd from './commands/stop.js';
import statusCmd from './commands/status.js';
import promptCmd from './commands/prompt.js';
import lyraCmd from './commands/lyra.js';
import registerCmd from './commands/register.js';

export function createCLI() {
  // Intercept before parsing to handle ruflo specially
  const originalParse = program.parse.bind(program);
  program.parse = function(argv) {
    const args = argv || process.argv;
    const rufloIdx = args.findIndex(a => a === 'ruflo');
    
    if (rufloIdx >= 0 && args.length > rufloIdx + 1) {
      // Has ruflo command with args - handle it directly
      const rufloArgs = args.slice(rufloIdx + 1);
      console.log(pc.cyan(`[Ultraflow] Running: npx ruflo ${rufloArgs.join(' ')}`));
      
      const child = spawn('npx', ['ruflo', ...rufloArgs], {
        stdio: 'inherit',
        shell: true
      });
      
      child.on('close', (code) => {
        process.exit(code || 0);
      });
      return Promise.resolve();
    }
    
    return originalParse(argv);
  };

  program
    .name('ultraflow')
    .description('Brain memory system for AI coding agents')
    .version('1.2.0');

  program.addCommand(initCmd);
  program.addCommand(startCmd);
  program.addCommand(stopCmd);
  program.addCommand(statusCmd);
  program.addCommand(promptCmd);
  program.addCommand(lyraCmd);
  program.addCommand(registerCmd);
  
  // Add ruflo placeholder (never actually executed due to parse override)
  program.addCommand(createCommand('ruflo')
    .description('Ruflo agent orchestration - Enterprise AI multi-agent swarms'));

  return program;
}