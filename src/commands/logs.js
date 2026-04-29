const chalk = require('chalk');
const DockerManager = require('../lib/docker');
const { log, ORANGE } = require('../utils/logger');
const { getSandboxMeta } = require('../utils/config');

class LogsCommands {
  constructor() {
    this.docker = new DockerManager();
  }

  async init() {
    await this.docker.init();
  }

  async get(sandboxId, opts) {
    try {
      const stream = await this.docker.getContainerLogs(sandboxId, {
        tail: opts.tail ? parseInt(opts.tail) : 100,
        timestamps: opts.timestamps || false,
        since: opts.since
      });

      log.nl();
      log.banner(`  📋 Logs: ${sandboxId}\n`);
      
      const output = stream.toString();
      log.plain(output);
      
      log.nl();
      log.json({
        success: true,
        sandboxId,
        lines: output.split('\n').filter(Boolean).length,
        logs: output
      });
      
      return output;
    } catch (err) {
      log.error(`Failed to get logs: ${err.message}`);
      throw err;
    }
  }

  async follow(sandboxId, opts) {
    log.nl();
    log.banner(`  📋 Following logs: ${sandboxId}`);
    log.info(chalk.gray('Press Ctrl+C to stop\n'));
    
    try {
      const stream = await this.docker.streamLogs(sandboxId, (data) => {
        process.stdout.write(data);
      });
      
      // Handle Ctrl+C
      process.on('SIGINT', () => {
        stream.destroy();
        log.nl();
        log.info('Stopped following logs');
        process.exit(0);
      });
      
      // Keep process alive
      await new Promise(() => {});
    } catch (err) {
      log.error(`Failed to follow logs: ${err.message}`);
      throw err;
    }
  }

  async stats(sandboxId) {
    try {
      const stats = await this.docker.getContainerStats(sandboxId);
      
      log.nl();
      log.banner(`  📊 Stats: ${sandboxId}\n`);
      
      const rows = [
        ['CPU Usage', `${(stats.cpu.cpu_usage?.usage / stats.cpu.system_cpu_usage * 100).toFixed(2)}%`],
        ['Memory Usage', `${stats.memory.percent}%`],
        ['Memory Limit', formatBytes(stats.memory.limit)],
        ['Memory Used', formatBytes(stats.memory.usage)]
      ];

      log.table(rows.map(([k, v]) => [chalk.hex(ORANGE).bold(k), v]), ['Metric', 'Value']);
      
      log.nl();
      log.json({
        success: true,
        sandboxId,
        stats: {
          cpu: stats.cpu,
          memory: stats.memory,
          network: stats.network
        }
      });
      
      return stats;
    } catch (err) {
      log.error(`Failed to get stats: ${err.message}`);
      throw err;
    }
  }
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = LogsCommands;
