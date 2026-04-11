import { program } from 'commander';
import initCmd from './commands/init.js';
import startCmd from './commands/start.js';
import statusCmd from './commands/status.js';
import promptCmd from './commands/prompt.js';

export function createCLI() {
  program
    .name('ultraflow')
    .description('Integrated AI toolset: Brain memory + OpenCode + Claude Flow')
    .version('1.0.0');

  program.addCommand(initCmd);
  program.addCommand(startCmd);
  program.addCommand(statusCmd);
  program.addCommand(promptCmd);

  return program;
}
