import { Command } from 'commander';
import chalk from 'chalk';
import http from 'http';
import { loadConfig, configExists } from '../../config/user-config.js';

const command = new Command('status')
  .description('Check active components')
  .action(async () => {
    console.log(chalk.bold('\n🔍 Ultraflow Status:\n'));

    // Check for user config
    let agent = 'auto';
    if (configExists()) {
      const config = loadConfig();
      agent = config.agent || 'auto';
    }
    console.log(`📋 Configured agent: ${chalk.cyan(agent)}`);

    // Check dashboard
    const dashboardStatus = await checkDashboard();
    if (dashboardStatus.running) {
      console.log(`✅ Token Dashboard: ${chalk.green('running')} at ${chalk.cyan(dashboardStatus.url)}`);
      console.log(`   - Total tokens: ${dashboardStatus.tokens || 'N/A'}`);
      console.log(`   - Total cost: ${dashboardStatus.cost || 'N/A'}`);
    } else {
      console.log(`❌ Token Dashboard: ${chalk.red('not running')}`);
      console.log(`   Run: ${chalk.cyan('npx ultraflow start dashboard')}`);
    }

    // Check config file
    console.log('\n📁 Config file:');
    if (configExists()) {
      console.log(`   ${chalk.green('✓')} .ultraflow/config.json exists`);
    } else {
      console.log(`   ${chalk.yellow('⚠')} Not configured yet`);
      console.log(`   Run: ${chalk.cyan('npx ultraflow init')}`);
    }

    // Show MCP info
    console.log('\n🔌 MCP Server:');
    console.log(`   Path: ${chalk.gray('lib/brain-server/server.js')}`);
    console.log(`   Tools: ${chalk.cyan('17 available')}`);

    console.log('\n🚀 Commands:');
    console.log(`   npx ultraflow start        # Start all services`);
    console.log(`   npx ultraflow start dashboard  # Just dashboard`);
    console.log(`   npx ultraflow init        # Initialize for agent\n`);

    process.exit(0);
  });

function checkDashboard() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3000/api/summary', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({
            running: true,
            url: 'http://localhost:3000',
            tokens: json.total_tokens || 'N/A',
            cost: json.total_cost ? `$${json.total_cost}` : 'N/A'
          });
        } catch (e) {
          resolve({ running: true, url: 'http://localhost:3000' });
        }
      });
    });
    req.on('error', () => resolve({ running: false }));
    req.setTimeout(2000, () => resolve({ running: false }));
  });
}

export default command;