import { Command } from 'commander';
import { renderTemplate } from '../utils/template-engine.js';

const command = new Command('prompt')
  .description('Output toolset activation prompt')
  .action(async () => {
    try {
      const prompt = await renderTemplate('toolset-prompt.txt');
      console.log(prompt);
    } catch (error) {
      console.error('Error rendering prompt:', error.message);
      process.exit(1);
    }
  });

export default command;
