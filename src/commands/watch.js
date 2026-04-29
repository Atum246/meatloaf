const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const Docker = require('dockerode');
const { log, ORANGE } = require('../utils/logger');
const { getSandboxMeta } = require('../utils/config');

class WatchManager {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
    this.watchers = new Map();
  }

  async start(sandboxId, opts = {}) {
    const watchPath = opts.path || '.';
    const pattern = opts.pattern || '**/*';
    const debounce = parseInt(opts.debounce) || 1000;
    const command = opts.exec;

    log.nl();
    log.banner(`  👁️  Watch Mode: ${sandboxId}`);
    log.table([
      ['Watch Path', watchPath],
      ['Pattern', pattern],
      ['Debounce', debounce + 'ms'],
      ['On Change', command || 'auto-sync']
    ].map(([k, v]) => [chalk.hex(ORANGE).bold(k), v]), ['Setting', 'Value']);
    log.nl();
    log.info(chalk.gray('Press Ctrl+C to stop\n'));

    let lastRun = 0;
    let timeout = null;

    const handleChange = async (eventType, filename) => {
      const now = Date.now();
      if (now - lastRun < debounce) return;
      if (timeout) clearTimeout(timeout);
      
      timeout = setTimeout(async () => {
        lastRun = Date.now();
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        log.step(chalk.hex(ORANGE)(`[${timestamp}] Change detected: ${filename || 'unknown'}`));

        if (command) {
          try {
            const meta = getSandboxMeta(sandboxId);
            if (!meta) { log.error('Sandbox not found'); return; }
            const container = this.docker.getContainer(meta.containerId);
            const exec = await container.exec({
              Cmd: ['/bin/sh', '-c', command],
              AttachStdout: true, AttachStderr: true
            });
            const stream = await exec.start({ Detach: false });
            const output = await new Promise((resolve) => {
              let data = '';
              stream.on('data', (chunk) => data += chunk.toString());
              stream.on('end', () => resolve(data));
            });
            if (output.trim()) log.plain(output.trim());
            log.success('Command executed');
          } catch (err) {
            log.error(`Command failed: ${err.message}`);
          }
        } else {
          // Auto-sync: upload changed file
          try {
            await this._syncFile(sandboxId, filename, watchPath);
            log.success(`Synced: ${filename}`);
          } catch (err) {
            log.error(`Sync failed: ${err.message}`);
          }
        }
      }, debounce);
    };

    // Use fs.watch as fallback (no chokidar dependency)
    const watcher = fs.watch(watchPath, { recursive: true }, handleChange);
    this.watchers.set(sandboxId, watcher);

    process.on('SIGINT', () => {
      watcher.close();
      log.nl();
      log.info('Watch mode stopped');
      process.exit(0);
    });

    await new Promise(() => {});
  }

  async _syncFile(sandboxId, filename, basePath) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) return;
    
    const fullPath = path.join(basePath, filename);
    if (!fs.existsSync(fullPath)) return;
    if (fs.statSync(fullPath).isDirectory()) return;

    const container = this.docker.getContainer(meta.containerId);
    const content = fs.readFileSync(fullPath);
    const base64 = content.toString('base64');
    const destPath = `/workspace/${filename}`;

    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', `echo '${base64}' | base64 -d > ${destPath}`],
      AttachStdout: true, AttachStderr: true
    });
    await exec.start({ Detach: false });
  }

  stop(sandboxId) {
    const watcher = this.watchers.get(sandboxId);
    if (watcher) {
      watcher.close();
      this.watchers.delete(sandboxId);
      log.success(`Watch stopped for ${sandboxId}`);
    }
  }
}

module.exports = WatchManager;
