import { Command } from 'commander';
import { fork, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pc from 'picocolors';
import fs from 'fs';
import { saveServicePID } from '../../config/service-manager.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '../../..');

const command = new Command('start')
  .description('Start Ultraflow services')
  .argument('[service]', 'Service to start: brain, dashboard, mcp, or all (default: all)', 'all')
  .option('-d, --detach', 'Start in background (detached)')
  .action(async (service, opts) => {
    const config = await import('../../config/user-config.js').then(m => m.getMergedConfig());
    const dashboardPort = config.dashboard?.port || 3000;
    
    let brainServer = null;
    let dashboardServer = null;
    let mcpServer = null;

    const startBrain = () => {
      console.log(pc.cyan('🧠 Starting Brain MCP server...'));
      const brainPath = join(ROOT_DIR, 'lib/brain-server/server.js');
      brainServer = fork(brainPath, [], {
        stdio: 'inherit',
        env: { ...process.env, DASHBOARD_URL: `http://localhost:${dashboardPort}` }
      });
      saveServicePID('brain', brainServer.pid);
    };

    const startDashboard = () => {
      const dashboardPath = join(ROOT_DIR, 'lib/token-dashboard/server.js');
      
      if (!fs.existsSync(dashboardPath)) {
        console.log(pc.red('❌ Token dashboard not found at:'), dashboardPath);
        return;
      }
      
      console.log(pc.cyan(`📊 Starting Token Dashboard on port ${dashboardPort}...`));
      dashboardServer = spawn('node', [dashboardPath], {
        stdio: 'inherit',
        env: { ...process.env, PORT: dashboardPort.toString() }
      });
      saveServicePID('dashboard', dashboardServer.pid);
    };

    const startMCP = () => {
      console.log(pc.cyan('🔌 Starting MCP server...'));
      const mcpPath = join(ROOT_DIR, 'bin/ultraflow-mcp.js');
      mcpServer = fork(mcpPath, [], {
        stdio: 'inherit'
      });
      saveServicePID('mcp', mcpServer.pid);
    };

    // Start requested services
    if (service === 'all' || service === undefined) {
      startDashboard();
      setTimeout(() => startBrain(), 500);
      setTimeout(() => startMCP(), 1000);
    } else if (service === 'brain') {
      startBrain();
    } else if (service === 'dashboard') {
      startDashboard();
    } else if (service === 'mcp') {
      startMCP();
    } else {
      console.log(pc.red('Unknown service:'), service);
      console.log('Valid services: brain, dashboard, mcp, all');
      process.exit(1);
    }

    // Handle shutdown
    const shutdown = () => {
      console.log(pc.yellow('\nShutting down...'));
      if (brainServer) brainServer.kill();
      if (dashboardServer) dashboardServer.kill();
      if (mcpServer) mcpServer.kill();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });

export default command;