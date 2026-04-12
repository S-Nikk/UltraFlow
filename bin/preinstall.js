const { execSync } = require('child_process');
const chalk = require('chalk');

console.log(chalk.cyan('⚡ ultraflow preinstall: Installing gitnexus globally...'));

try {
  execSync('npm install -g gitnexus@latest', {
    stdio: 'inherit',
    env: { ...process.env, NPM_CONFIG_LOGLEVEL: 'error' }
  });
  console.log(chalk.green('✓ gitnexus installed globally'));
} catch (error) {
  console.log(chalk.yellow('⚠ gitnexus installation skipped'));
}

console.log(chalk.green('✓ Preinstall complete (ruflo will use npx fallback)'));
console.log(chalk.gray('  Ruflo: using npx ruflo (fallback mode)'));