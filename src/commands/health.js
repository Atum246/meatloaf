const chalk = require('chalk');
const Docker = require('dockerode');
const { log, ORANGE } = require('../utils/logger');
const { getSandboxMeta } = require('../utils/config');
const { statusEmoji, formatBytes, formatDuration } = require('../utils/helpers');

class HealthChecker {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
    this.checks = new Map();
  }

  async check(sandboxId, opts = {}) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const info = await container.inspect();
    
    const port = opts.port || 3000;
    const path = opts.path || '/health';
    
    log.nl();
    log.banner(`  🏥 Health Check: ${sandboxId}\n`);
    
    const results = {
      sandbox: sandboxId,
      container: {
        status: info.State.Status,
        running: info.State.Running,
        startedAt: info.State.StartedAt,
        restartCount: info.RestartCount
      },
      checks: []
    };

    // Container status
    const containerOk = info.State.Running;
    results.checks.push({
      name: 'Container Running',
      status: containerOk ? 'pass' : 'fail',
      value: info.State.Status
    });

    // Memory check
    try {
      const stats = await container.stats({ stream: false });
      const memUsage = stats.memory_stats.usage || 0;
      const memLimit = stats.memory_stats.limit || 1;
      const memPct = ((memUsage / memLimit) * 100).toFixed(2);
      results.checks.push({
        name: 'Memory Usage',
        status: parseFloat(memPct) < 90 ? 'pass' : 'warn',
        value: `${memPct}% (${formatBytes(memUsage)} / ${formatBytes(memLimit)})`
      });

      // CPU check
      const cpuDelta = stats.cpu_stats.cpu_usage?.total_usage - (stats.precpu_stats.cpu_usage?.total_usage || 0);
      const sysDelta = stats.cpu_stats.system_cpu_usage - (stats.precpu_stats.system_cpu_usage || 0);
      const cpuPct = sysDelta > 0 ? ((cpuDelta / sysDelta) * 100).toFixed(2) : '0';
      results.checks.push({
        name: 'CPU Usage',
        status: parseFloat(cpuPct) < 80 ? 'pass' : 'warn',
        value: `${cpuPct}%`
      });
    } catch (e) {
      results.checks.push({ name: 'Resource Stats', status: 'skip', value: 'Unavailable' });
    }

    // HTTP endpoint check
    try {
      const axios = require('axios');
      const start = Date.now();
      const response = await axios.get(`http://localhost:${port}${path}`, { timeout: 5000, validateStatus: () => true });
      const latency = Date.now() - start;
      results.checks.push({
        name: `HTTP Endpoint (:${port}${path})`,
        status: response.status >= 200 && response.status < 400 ? 'pass' : 'fail',
        value: `Status ${response.status} | ${latency}ms`
      });
    } catch (e) {
      results.checks.push({
        name: `HTTP Endpoint (:${port}${path})`,
        status: 'fail',
        value: e.message
      });
    }

    // Disk check
    try {
      const exec = await container.exec({
        Cmd: ['/bin/sh', '-c', 'df -h / | tail -1'],
        AttachStdout: true, AttachStderr: true
      });
      const stream = await exec.start({ Detach: false });
      const diskOutput = await new Promise((resolve) => {
        let data = '';
        stream.on('data', (chunk) => data += chunk.toString());
        stream.on('end', () => resolve(data));
      });
      const parts = diskOutput.trim().split(/\s+/);
      const usedPct = parts[4] || 'unknown';
      results.checks.push({
        name: 'Disk Usage',
        status: parseInt(usedPct) < 90 ? 'pass' : 'warn',
        value: `${usedPct} used`
      });
    } catch (e) {
      results.checks.push({ name: 'Disk Usage', status: 'skip', value: 'Unavailable' });
    }

    // Display results
    const statusColor = { pass: 'green', fail: 'red', warn: 'yellow', skip: 'gray' };
    const statusIcon = { pass: '✅', fail: '❌', warn: '⚠️', skip: '⏭️' };
    
    const rows = results.checks.map(c => [
      statusIcon[c.status],
      c.name,
      chalk[statusColor[c.status]](c.value)
    ]);
    log.table(rows, ['', 'Check', 'Result']);

    const allPass = results.checks.every(c => c.status === 'pass' || c.status === 'skip');
    log.nl();
    if (allPass) {
      log.success(chalk.green('All health checks passed! 💪'));
    } else {
      log.warn(chalk.yellow('Some health checks failed or have warnings'));
    }

    log.json({ success: true, ...results });
    return results;
  }

  async watch(sandboxId, opts = {}) {
    const interval = parseInt(opts.interval) || 10000;
    log.banner(`  👁️  Watching health: ${sandboxId} (every ${interval / 1000}s)`);
    log.info(chalk.gray('Press Ctrl+C to stop\n'));

    const checkLoop = async () => {
      try {
        await this.check(sandboxId, opts);
        log.nl();
      } catch (e) {
        log.error(`Check failed: ${e.message}`);
      }
    };

    await checkLoop();
    const timer = setInterval(checkLoop, interval);

    process.on('SIGINT', () => {
      clearInterval(timer);
      log.info('\nStopped watching');
      process.exit(0);
    });

    await new Promise(() => {});
  }

  async system() {
    log.nl();
    log.banner('  🖥️  System Health\n');

    const info = await this.docker.info();
    const rows = [
      ['Docker Version', info.ServerVersion || '-'],
      ['Containers', `${info.Containers} (Running: ${info.ContainersRunning}, Stopped: ${info.ContainersStopped})`],
      ['Images', (info.Images || 0).toString()],
      ['Storage Driver', info.Driver || '-'],
      ['OS', info.OperatingSystem || '-'],
      ['Architecture', info.Architecture || '-'],
      ['CPUs', (info.NCPU || 0).toString()],
      ['Total Memory', formatBytes(info.MemTotal || 0)],
      ['Kernel Version', info.KernelVersion || '-']
    ];

    log.table(rows.map(([k, v]) => [chalk.hex(ORANGE).bold(k), v]), ['Property', 'Value']);
    log.json({ success: true, system: info });
  }
}

module.exports = HealthChecker;
