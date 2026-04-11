import { Command } from 'commander';
import inquirer from 'inquirer';
import { detectAI } from '../utils/ai-detector.js';
import { buildPrompt } from '../utils/prompt-builder.js';
import claudeCodeConfig from '../generators/claude-code-config.js';
import codexConfig from '../generators/codex-config.js';
import opencodeConfig from '../generators/opencode-config.js';
import opencawConfig from '../generators/openclaw-config.js';

const command = new Command('init')
  .description('Interactive setup wizard for Ultraflow')
  .action(async () => {
    try {
      // Ask: Which AI are you using?
      const { aiSystems } = await inquirer.prompt([{
        type: 'checkbox',
        name: 'aiSystems',
        message: 'Which AI systems are you using?',
        choices: ['Claude Code', 'Codex', 'OpenCode', 'OpenClaw'],
        validate: (answer) => answer.length > 0 ? true : 'Please select at least one AI system'
      }]);

      // Ask: Which features?
      const { features } = await inquirer.prompt([{
        type: 'checkbox',
        name: 'features',
        message: 'Which features do you want?',
        choices: ['Brain memory', 'OpenCode delegation', 'Claude Flow orchestration', 'All'],
        validate: (answer) => answer.length > 0 ? true : 'Please select at least one feature'
      }]);

      // Generate configs per selection
      const config = { aiSystems, features };

      if (aiSystems.includes('Claude Code')) {
        await claudeCodeConfig.generate(config);
      }
      if (aiSystems.includes('Codex')) {
        await codexConfig.generate(config);
      }
      if (aiSystems.includes('OpenCode')) {
        await opencodeConfig.generate(config);
      }
      if (aiSystems.includes('OpenClaw')) {
        await opencawConfig.generate(config);
      }

      // Output success message + toolset prompt
      const prompt = buildPrompt(config);
      console.log('\n✅ Activation successful!\n');
      console.log('Copy this prompt to your AI:\n');
      console.log(prompt);
    } catch (error) {
      console.error('Error during initialization:', error.message);
      process.exit(1);
    }
  });

export default command;
