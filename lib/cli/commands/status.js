import { Command } from 'commander';
import chalk from 'chalk';
import { detectAI } from '../utils/ai-detector.js';

const command = new Command('status')
  .description('Check active components')
  .action(async () => {
    try {
      const status = await detectAI();

      console.log(chalk.bold('🔍 Ultraflow Component Status:\n'));
      console.log(`${status.claudeFlow ? '✓' : '✗'} Claude Flow CLI`);
      console.log(`${status.opencode ? '✓' : '✗'} OpenCode`);
      console.log(`${status.brain ? '✓' : '✗'} Brain Memory`);

      if (!status.claudeFlow || !status.opencode) {
        console.log(chalk.yellow('\n⚠️  Some optional components are missing.'));
        console.log('Install with: npm install @claude-flow/cli opencode-ai');
      }
    } catch (error) {
      console.error('Error checking status:', error.message);
      process.exit(1);
    }
  });

export default command;
