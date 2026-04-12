import { Command } from 'commander';
import pc from 'picocolors';
import { lyra, create, getMiddlewareStatus } from '../../lyra/index.js';

const command = new Command('lyra')
  .description('Optimize prompts using Lyra, the Master Prompt Optimization Specialist')
  .argument('<prompt>', 'The prompt to optimize')
  .option('-m, --mode <mode>', 'Optimization mode: basic, detail, auto', 'basic')
  .option('-p, --platform <platform>', 'Target platform: claude, chatgpt, gemini, opencode, codex, generic', 'generic')
  .option('-a, --analyze', 'Only analyze the prompt, do not optimize')
  .option('-v, --versions', 'Generate versions for all platforms')
  .option('--status', 'Show Lyra middleware status')
  .action(async (prompt, opts) => {
    try {
      // Handle status flag
      if (opts.status) {
        const status = getMiddlewareStatus();
        console.log(pc.cyan('\n📊 Lyra Middleware Status:\n'));
        console.log(`   Initialized: ${status.initialized ? pc.green('✓') : pc.red('✗')}`);
        console.log(`   Auto-optimize: ${status.autoOptimizeEnabled ? pc.green('Enabled') : pc.red('Disabled')}`);
        console.log(`   Platform: ${status.platform}`);
        console.log();
        return;
      }

      // Handle analyze flag
      if (opts.analyze) {
        const optimizer = create({ mode: opts.mode, platform: opts.platform });
        const analysis = optimizer.analyze(prompt);
        
        console.log(pc.cyan('\n🔍 Lyra Analysis:\n'));
        console.log(pc.bold('Original Prompt:'));
        console.log(`   ${analysis.original}\n`);
        console.log(pc.bold('Diagnosis:'));
        console.log(`   Complexity: ${analysis.diagnosis.complexity}`);
        console.log(`   Request Type: ${analysis.diagnosis.requestType}`);
        console.log(`   Specificity: ${(analysis.diagnosis.specificity * 100).toFixed(0)}%`);
        console.log(`   Completeness: ${(analysis.diagnosis.completeness * 100).toFixed(0)}%`);
        console.log(`   Context Level: ${(analysis.diagnosis.contextLevel * 100).toFixed(0)}%`);
        
        if (analysis.diagnosis.ambiguities.length > 0) {
          console.log(chalk.yellow('\n   Ambiguities detected:'));
          analysis.diagnosis.ambiguities.forEach(a => console.log(`     - ${a}`));
        }
        
        if (analysis.diagnosis.missing.length > 0) {
          console.log(chalk.yellow('\n   Missing information:'));
          analysis.diagnosis.missing.forEach(m => console.log(`     - ${m}`));
        }
        
        console.log(pc.bold('\nQuality Gates:'));
        const allPassed = Object.values(analysis.qualityGates).every(v => v);
        for (const [gate, passed] of Object.entries(analysis.qualityGates)) {
          console.log(`   ${passed ? pc.green('✓') : pc.red('✗')} ${gate}`);
        }
        
        console.log();
        return;
      }

      // Handle versions flag
      if (opts.versions) {
        const optimizer = create({ mode: 'detail', platform: opts.platform });
        const versions = optimizer.getVersions(prompt);
        
        console.log(pc.cyan('\n🌐 Multi-Platform Versions:\n'));
        for (const [platform, optimized] of Object.entries(versions)) {
          console.log(pc.bold(`\n${platform.toUpperCase()}:`));
          console.log(optimized);
        }
        console.log();
        return;
      }

      // Normal optimization
      const result = await lyra(prompt, {
        mode: opts.mode,
        platform: opts.platform,
      });

        console.log(pc.cyan('\n✨ Lyra Optimized Prompt:\n'));
      console.log(result.optimized);
      
      console.log(pc.bold('\n📋 Details:'));
      console.log(`   Mode: ${result.mode}`);
      console.log(`   Platform: ${result.platform}`);
      console.log(`   Techniques: ${result.techniquesUsed.join(', ')}`);
      
      if (result.improvements.length > 0) {
        console.log(pc.bold('\n🔧 Improvements:'));
        result.improvements.forEach(i => console.log(`   • ${i}`));
      }
      
      if (result.proTips.length > 0) {
        console.log(pc.bold('\n💡 Pro Tips:'));
        result.proTips.forEach(t => console.log(`   • ${t}`));
      }
      
      console.log();
    } catch (error) {
      console.error(pc.red('Error:'), error.message);
      process.exit(1);
    }
  });

export default command;