const chalk = require('chalk');
const ora = require('ora');
const DockerManager = require('../lib/docker');
const { log, ORANGE } = require('../utils/logger');
const { statusEmoji, formatDuration } = require('../utils/helpers');
const { loadConfig, getSandboxMeta, listSandboxMetas } = require('../utils/config');

class SandboxCommands {
  constructor() {
    this.docker = new DockerManager();
  }

  async init() {
    await this.docker.init();
  }

  async create(opts) {
    const spinner = ora({ text: 'Creating sandbox...', color: 'yellow' }).start();
    
    try {
      const result = await this.docker.createSandbox({
        image: opts.image,
        ports: opts.port,
        env: opts.env,
        volumes: opts.volume,
        workdir: opts.workdir,
        memory: opts.memory ? parseInt(opts.memory) * 1024 * 1024 : undefined,
        cpu: opts.cpu ? parseInt(opts.cpu) * 100000 : undefined
      });
      
      spinner.succeed(chalk.green(`Sandbox created: ${chalk.bold(result.id)}`));
      
      // Auto-start unless --no-start
      if (opts.start !== false) {
        const startSpinner = ora({ text: 'Starting sandbox...', color: 'yellow' }).start();
        await this.docker.startSandbox(result.id);
        startSpinner.succeed(chalk.green('Sandbox started'));
      }

      log.nl();
      log.json({
        success: true,
        sandboxId: result.id,
        containerId: result.containerId,
        name: result.name,
        image: opts.image || loadConfig().defaultImage,
        ports: opts.port || [],
        message: `Sandbox ${result.id} is ready 🎉`
      });
      
      return result;
    } catch (err) {
      spinner.fail(chalk.red(`Failed to create sandbox: ${err.message}`));
      throw err;
    }
  }

  async destroy(sandboxId, opts) {
    const spinner = ora({ text: `Destroying sandbox ${sandboxId}...`, color: 'yellow' }).start();
    
    try {
      await this.docker.destroySandbox(sandboxId);
      spinner.succeed(chalk.green(`Sandbox ${sandboxId} destroyed`));
      
      log.json({
        success: true,
        sandboxId,
        message: `Sandbox ${sandboxId} destroyed and cleaned up 🧹`
      });
    } catch (err) {
      spinner.fail(chalk.red(`Failed to destroy sandbox: ${err.message}`));
      throw err;
    }
  }

  async list() {
    try {
      const containers = await this.docker.listSandboxes();
      const metas = listSandboxMetas();
      
      if (containers.length === 0) {
        log.info(chalk.gray('No sandboxes running. Create one with: meatloaf create'));
        return;
      }

      log.nl();
      log.banner('  🥩 Active Sandboxes\n');
      
      const rows = containers.map(c => {
        const meta = metas.find(m => m.containerId === c.containerId) || {};
        return [
          meta.id || c.labels['meatloaf.id'] || 'unknown',
          statusEmoji(c.status) + ' ' + c.status,
          c.image,
          c.ports?.map(p => `${p.PublicPort}:${p.PrivatePort}`).join(', ') || '-',
          c.name || '-'
        ];
      });

      log.table(rows, ['ID', 'Status', 'Image', 'Ports', 'Name']);
      log.nl();
      
      log.json({
        success: true,
        count: containers.length,
        sandboxes: containers.map(c => ({
          id: c.labels['meatloaf.id'],
          status: c.status,
          image: c.image,
          ports: c.ports,
          name: c.name
        }))
      });
    } catch (err) {
      log.error(`Failed to list sandboxes: ${err.message}`);
      throw err;
    }
  }

  async inspect(sandboxId) {
    try {
      const info = await this.docker.inspectSandbox(sandboxId);
      
      log.nl();
      log.banner(`  🔍 Sandbox: ${sandboxId}\n`);
      
      const rows = [
        ['ID', info.id],
        ['Container', info.containerId?.substring(0, 12)],
        ['Image', info.image],
        ['Status', statusEmoji(info.container?.state) + ' ' + info.container?.state],
        ['Running', info.container?.running ? '✅ Yes' : '❌ No'],
        ['Ports', info.ports?.join(', ') || '-'],
        ['Created', new Date(info.createdAt).toISOString()],
        ['Started', info.container?.startedAt || '-'],
        ['Networks', info.container?.networks?.join(', ') || '-']
      ];

      log.table(rows.map(([k, v]) => [chalk.hex(ORANGE).bold(k), v]), ['Property', 'Value']);
      log.nl();
      
      log.json({ success: true, sandbox: info });
    } catch (err) {
      log.error(`Failed to inspect sandbox: ${err.message}`);
      throw err;
    }
  }

  async stop(sandboxId) {
    const spinner = ora({ text: `Stopping sandbox ${sandboxId}...`, color: 'yellow' }).start();
    
    try {
      await this.docker.stopSandbox(sandboxId);
      spinner.succeed(chalk.green(`Sandbox ${sandboxId} stopped`));
      
      log.json({
        success: true,
        sandboxId,
        message: `Sandbox ${sandboxId} stopped ⏹️`
      });
    } catch (err) {
      spinner.fail(chalk.red(`Failed to stop sandbox: ${err.message}`));
      throw err;
    }
  }

  async start(sandboxId) {
    const spinner = ora({ text: `Starting sandbox ${sandboxId}...`, color: 'yellow' }).start();
    
    try {
      await this.docker.startSandbox(sandboxId);
      spinner.succeed(chalk.green(`Sandbox ${sandboxId} started`));
      
      log.json({
        success: true,
        sandboxId,
        message: `Sandbox ${sandboxId} started 🟢`
      });
    } catch (err) {
      spinner.fail(chalk.red(`Failed to start sandbox: ${err.message}`));
      throw err;
    }
  }

  async cleanup() {
    const spinner = ora({ text: 'Cleaning up orphaned sandboxes...', color: 'yellow' }).start();
    
    try {
      const cleaned = await this.docker.cleanupOrphans();
      if (cleaned > 0) {
        spinner.succeed(chalk.green(`Cleaned up ${cleaned} orphaned sandbox(es)`));
      } else {
        spinner.succeed(chalk.green('No orphaned sandboxes found'));
      }
      
      log.json({
        success: true,
        cleaned,
        message: `Cleaned up ${cleaned} orphaned sandbox(es) 🧹`
      });
    } catch (err) {
      spinner.fail(chalk.red(`Cleanup failed: ${err.message}`));
      throw err;
    }
  }
}

module.exports = SandboxCommands;
