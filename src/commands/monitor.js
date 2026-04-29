const chalk = require('chalk');
const { log, ORANGE } = require('../utils/logger');

class MonitorDashboard {
  constructor() {
    this.running = false;
    this.interval = null;
  }

  async start(opts = {}) {
    const refreshRate = parseInt(opts.interval) || 3000;
    const Docker = require('dockerode');
    const docker = new Docker({ socketPath: '/var/run/docker.sock' });
    
    this.running = true;
    
    const render = async () => {
      try {
        // Clear screen
        process.stdout.write('\x1B[2J\x1B[0f');
        
        // Header
        console.log(chalk.hex('#FF6B35').bold(`
  ███╗   ███╗███████╗ █████╗ ████████╗██╗      ██████╗  █████╗ ███████╗
  ████╗ ████║██╔════╝██╔══██╗╚══██╔══╝██║     ██╔═══██╗██╔══██╗██╔════╝
  ██╔████╔██║█████╗  ███████║   ██║   ██║     ██║   ██║███████║█████╗  
  ██║╚██╔╝██║██╔══╝  ██╔══██║   ██║   ██║     ██║   ██║██╔══██║██╔══╝  
  ██║ ╚═╝ ██║███████╗██║  ██║   ██║   ███████╗╚██████╔╝██║  ██║██║     
  ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝     `));
        console.log(chalk.gray('  LIVE DASHBOARD'.padStart(60)));
        console.log(chalk.gray(`  ${new Date().toISOString()} | Refresh: ${refreshRate / 1000}s`));
        console.log(chalk.hex('#FF6B35')('─'.repeat(70)));

        // System info
        const info = await docker.info();
        console.log(chalk.hex('#FF6B35').bold('\n  🖥️  SYSTEM'));
        console.log(`  Docker: ${info.ServerVersion} | Containers: ${info.Containers} | Images: ${info.Images}`);
        console.log(`  CPUs: ${info.NCPU} | Memory: ${(info.MemTotal / 1024 / 1024 / 1024).toFixed(1)}GB | OS: ${info.OperatingSystem}`);

        // Containers
        const containers = await docker.listContainers({ all: true });
        console.log(chalk.hex('#FF6B35').bold('\n  📦 CONTAINERS'));
        
        if (containers.length === 0) {
          console.log(chalk.gray('  No containers'));
        } else {
          const header = '  ' + 'ID'.padEnd(14) + 'Name'.padEnd(25) + 'Status'.padEnd(12) + 'Image'.padEnd(25) + 'Ports';
          console.log(chalk.gray(header));
          console.log(chalk.gray('  ' + '─'.repeat(80)));
          
          for (const c of containers) {
            const id = c.Id.substring(0, 12);
            const name = (c.Names[0] || '').replace('/', '').substring(0, 23);
            const status = c.State;
            const image = (c.Image || '').substring(0, 23);
            const ports = c.Ports?.map(p => `${p.PublicPort}:${p.PrivatePort}`).join(',') || '-';
            
            const statusColor = status === 'running' ? chalk.green : status === 'exited' ? chalk.red : chalk.yellow;
            console.log(`  ${id.padEnd(14)}${name.padEnd(25)}${statusColor(status.padEnd(12))}${image.padEnd(25)}${ports}`);
          }
        }

        // Running container stats
        const running = containers.filter(c => c.State === 'running');
        if (running.length > 0) {
          console.log(chalk.hex('#FF6B35').bold('\n  📊 RESOURCE USAGE'));
          
          for (const c of running.slice(0, 5)) {
            try {
              const container = docker.getContainer(c.Id);
              const stats = await container.stats({ stream: false });
              const memUsage = stats.memory_stats.usage || 0;
              const memLimit = stats.memory_stats.limit || 1;
              const memPct = ((memUsage / memLimit) * 100).toFixed(1);
              const cpuDelta = stats.cpu_stats.cpu_usage?.total_usage - (stats.precpu_stats.cpu_usage?.total_usage || 0);
              const sysDelta = stats.cpu_stats.system_cpu_usage - (stats.precpu_stats.system_cpu_usage || 0);
              const cpuPct = sysDelta > 0 ? ((cpuDelta / sysDelta) * 100).toFixed(1) : '0.0';
              
              const name = (c.Names[0] || '').replace('/', '').substring(0, 15);
              const cpuBar = this._bar(parseFloat(cpuPct), 100, 15);
              const memBar = this._bar(parseFloat(memPct), 100, 15);
              
              console.log(`  ${name.padEnd(16)}CPU: ${cpuBar} ${cpuPct.padStart(5)}%  MEM: ${memBar} ${memPct.padStart(5)}%`);
            } catch (e) {
              // Skip
            }
          }
        }

        // Images
        const images = await docker.listImages();
        console.log(chalk.hex('#FF6B35').bold('\n  🖼️  IMAGES'));
        console.log(`  Total: ${images.length} | Total Size: ${(images.reduce((a, i) => a + (i.Size || 0), 0) / 1024 / 1024).toFixed(1)}MB`);

        console.log(chalk.hex('#FF6B35')('\n' + '─'.repeat(70)));
        console.log(chalk.gray('  Press Ctrl+C to exit'));
      } catch (err) {
        console.log(chalk.red(`  Error: ${err.message}`));
      }
    };

    await render();
    this.interval = setInterval(render, refreshRate);

    process.on('SIGINT', () => {
      clearInterval(this.interval);
      console.log('\n  Dashboard stopped');
      process.exit(0);
    });

    await new Promise(() => {});
  }

  _bar(value, max, width) {
    const filled = Math.round((value / max) * width);
    const empty = width - filled;
    const color = value > 80 ? chalk.red : value > 60 ? chalk.yellow : chalk.green;
    return color('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  }
}

module.exports = MonitorDashboard;
