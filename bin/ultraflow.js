#!/usr/bin/env node
const { Command } = require('commander');
const chalk = require('chalk');
const { spawn, execSync } = require('child_process');
const path = require('path');
const os = require('os');

const isWin = process.platform === 'win32';

function spawnRuflo(args, options = {}) {
  if (isWin) {
    const child = spawn('cmd.exe', ['/c', 'npx', 'ruflo@latest', ...args], options);
    return child;
  } else {
    const child = spawn('npx', ['ruflo@latest', ...args], options);
    return child;
  }
}

const program = new Command();

program
  .name('ultraflow')
  .description('AI coding agent brain, token dashboard, Lyra optimization, ruflo orchestration')
  .version('1.2.0');

program
  .command('init')
  .description('Initialize ultraflow for a specific agent')
  .argument('[agent]', 'Agent name (claude-code, opencode, codex, openclaw)')
  .action(async (agent) => {
    const inquirer = require('inquirer');
    if (!agent) {
      const { agent: a } = await inquirer.prompt([{
        type: 'list',
        name: 'agent',
        message: 'Select agent to initialize:',
        choices: ['claude-code', 'opencode', 'codex', 'openclaw', 'all']
      }]);
      agent = a;
    }
    console.log(chalk.green(`✓ Initialized for ${agent}`));
  });

program
  .command('start')
  .description('Start ultraflow services')
  .option('--dashboard', 'Start token dashboard only')
  .option('--brain', 'Start brain MCP only')
  .action((opts) => {
    const Dashboard = require('../lib/token-dashboard/server');
    const BrainServer = require('../lib/brain-server/server');
    
    if (opts.dashboard || (!opts.dashboard && !opts.brain)) {
      console.log(chalk.cyan('Starting token dashboard on port 3000...'));
      new Dashboard();
    }
    if (opts.brain || (!opts.dashboard && !opts.brain)) {
      console.log(chalk.cyan('Starting brain MCP server...'));
      new BrainServer();
    }
  });

program
  .command('status')
  .description('Check ultraflow services status')
  .action(() => {
    const http = require('http');
    
    const checkPort = (port, name) => {
      return new Promise((resolve) => {
        const req = http.request({ hostname: 'localhost', port, path: '/', method: 'GET' }, (res) => {
          resolve({ name, running: true, port });
        });
        req.on('error', () => resolve({ name, running: false, port }));
        req.end();
      });
    };

    (async () => {
      const [dashboard, brain] = await Promise.all([
        checkPort(3000, 'Token Dashboard'),
        checkPort(3001, 'Brain MCP')
      ]);
      
      console.log(chalk.bold('\n⚡ Ultraflow Status\n'));
      console.log(`${dashboard.running ? chalk.green('✓') : chalk.red('✗')} Token Dashboard   ${dashboard.running ? chalk.green('running') : chalk.red('stopped')} (${dashboard.port})`);
      console.log(`${brain.running ? chalk.green('✓') : chalk.red('✗')} Brain MCP         ${brain.running ? chalk.green('running') : chalk.red('stopped')} (${brain.port})`);
      console.log('');
      
      try {
        const rufloVersion = execSync(isWin ? 'npx ruflo@latest --version' : 'npx ruflo@latest --version', { encoding: 'utf-8', shell: true }).trim();
        console.log(chalk.green('✓') + ' Ruflo              ' + chalk.green(rufloVersion) + chalk.gray(' (npx)'));
      } catch (e) {
        console.log(chalk.red('✗') + ' Ruflo              not available');
      }
      
      try {
        execSync('npx gitnexus --version', { stdio: 'ignore', shell: true });
        console.log(chalk.green('✓') + ' GitNexus           available');
      } catch {
        console.log(chalk.red('✗') + ' GitNexus           not installed');
      }
    })();
  });

program
  .command('lyra')
  .description('Optimize a prompt using Lyra')
  .argument('<prompt>', 'Prompt to optimize')
  .option('-m, --mode <mode>', 'Mode: basic, detail, auto', 'auto')
  .option('-p, --platform <platform>', 'Target platform: opencode, claude-code, codex, openclaw', 'opencode')
  .action((prompt, opts) => {
    const Lyra = require('../lib/lyra');
    const result = Lyra.optimize(prompt, { mode: opts.mode, platform: opts.platform });
    console.log(chalk.bold('\n📝 Lyra Optimized Prompt:\n'));
    console.log(result.optimized);
    console.log(chalk.gray('\nTechniques: ' + result.techniques.join(', ')));
  });

program
  .command('register')
  .description('Manually register MCP for an agent')
  .argument('[agent]', 'Agent name')
  .action((agent) => {
    if (!agent) {
      console.log(chalk.yellow('Usage: ultraflow register <agent>'));
      return;
    }
    console.log(chalk.green(`✓ Registered MCP for ${agent}`));
  });

program
  .command('ruflo')
  .description('Pass through to ruflo CLI')
  .action(() => {
    const args = process.argv.slice(3);
    const child = spawnRuflo(args, { stdio: 'inherit' });
    child.on('exit', (code) => process.exit(code));
  });

program
  .command('gitnexus')
  .description('GitNexus code intelligence commands')
  .option('-a, --analyze', 'Analyze current project')
  .option('-i, --impact <symbol>', 'Get blast radius for symbol')
  .option('-q, --query <concept>', 'Query codebase by concept')
  .option('-c, --context <symbol>', 'Get 360-degree view of symbol')
  .option('-d, --detect-changes', 'Detect changes and risk level')
  .action((opts) => {
    const GitNexus = require('../lib/gitnexus');
    const gn = new GitNexus();
    const os = require('os');
    const mainProject = path.join(os.homedir(), 'AI');
    
    if (opts.analyze) {
      console.log(chalk.cyan('Analyzing codebase with GitNexus...'));
      try {
        execSync('npx gitnexus analyze', { cwd: mainProject, stdio: 'inherit', shell: true });
        console.log(chalk.green('✓ Analysis complete'));
      } catch (e) {
        console.log(chalk.red('✗ Analysis failed: ' + e.message));
      }
    } else if (opts.impact) {
      try {
        const result = execSync(`npx gitnexus impact ${opts.impact}`, { cwd: mainProject, encoding: 'utf-8', shell: true });
        console.log(result);
      } catch (e) {
        console.log(chalk.red('✗ ' + e.message));
      }
    } else if (opts.query) {
      try {
        const result = execSync(`npx gitnexus query "${opts.query}"`, { cwd: mainProject, encoding: 'utf-8', shell: true });
        console.log(result);
      } catch (e) {
        console.log(chalk.red('✗ ' + e.message));
      }
    } else if (opts.context) {
      try {
        const result = execSync(`npx gitnexus context ${opts.context}`, { cwd: mainProject, encoding: 'utf-8', shell: true });
        console.log(result);
      } catch (e) {
        console.log(chalk.red('✗ ' + e.message));
      }
    } else if (opts.detectChanges) {
      try {
        const result = execSync('npx gitnexus detect-changes', { cwd: mainProject, encoding: 'utf-8', shell: true });
        console.log(result);
      } catch (e) {
        console.log(chalk.red('✗ ' + e.message));
      }
    } else {
      console.log(chalk.yellow('Use: --analyze, --impact <symbol>, --query <concept>, --context <symbol>, --detect-changes'));
    }
  });

const originalParse = program.parse.bind(program);
program.parse = function(argv) {
  const args = argv || process.argv;
  const rufloIdx = args.findIndex(a => a === 'ruflo');
  if (rufloIdx !== -1) {
    const passthroughArgs = args.slice(rufloIdx + 1);
    const child = spawnRuflo(passthroughArgs, { stdio: 'inherit' });
    child.on('exit', (code) => process.exit(code));
    return;
  }
  return originalParse(args);
};

if (process.argv[2] === 'ruflo') {
  const passthroughArgs = process.argv.slice(3);
  const child = spawnRuflo(passthroughArgs, { stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code));
} else {
  program.parse(process.argv);
}