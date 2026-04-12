import { Command } from 'commander';
import pc from 'picocolors';
import { getRunningServices, stopService } from '../../config/service-manager.js';

const command = new Command('stop')
  .description('Stop all or specific Ultraflow services')
  .argument('[service]', 'Service to stop: brain, dashboard, mcp, or all (default: all)', 'all')
  .action(async (service) => {
    const running = await getRunningServices();
    
    if (running.length === 0) {
      console.log(pc.yellow('No services are currently running.'));
      return;
    }
    
    console.log(pc.cyan('🛑 Stopping services...\n'));
    
    const servicesToStop = service === 'all' 
      ? running 
      : running.filter(s => s.name === service);
    
    if (servicesToStop.length === 0) {
      console.log(pc.yellow(`No "${service}" service is currently running.`));
      return;
    }
    
    for (const svc of servicesToStop) {
      const stopped = await stopService(svc.name);
      if (stopped) {
        console.log(pc.green(`✓ Stopped ${svc.name}`));
      } else {
        console.log(pc.red(`✗ Failed to stop ${svc.name}`));
      }
    }
  });

export default command;