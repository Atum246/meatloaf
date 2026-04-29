const chalk = require('chalk');
const Docker = require('dockerode');
const { log, ORANGE } = require('../utils/logger');
const { getSandboxMeta } = require('../utils/config');

class CronManager {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  async add(sandboxId, name, schedule, command, opts = {}) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const cronLine = `${schedule} ${command}`;
    const escaped = cronLine.replace(/'/g, "'\\''");
    
    // Add to crontab
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', `(crontab -l 2>/dev/null; echo '${escaped}') | crontab -`],
      AttachStdout: true, AttachStderr: true
    });
    await exec.start({ Detach: false });

    log.success(`Cron job "${name}" added: ${schedule} → ${command}`);
    log.json({ success: true, sandboxId, name, schedule, command });
  }

  async list(sandboxId) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', 'crontab -l 2>/dev/null || echo "No crontab"'],
      AttachStdout: true, AttachStderr: true
    });
    const stream = await exec.start({ Detach: false });
    const output = await new Promise((resolve) => {
      let data = '';
      stream.on('data', (chunk) => data += chunk.toString());
      stream.on('end', () => resolve(data));
    });

    log.nl();
    log.banner(`  ⏰ Cron Jobs: ${sandboxId}\n`);
    log.plain(output);
    log.json({ success: true, sandboxId, crontab: output.trim() });
  }

  async remove(sandboxId, pattern) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', `crontab -l 2>/dev/null | grep -v '${pattern}' | crontab -`],
      AttachStdout: true, AttachStderr: true
    });
    await exec.start({ Detach: false });

    log.success(`Removed cron jobs matching "${pattern}"`);
    log.json({ success: true, sandboxId, pattern });
  }

  async clear(sandboxId) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', 'crontab -r 2>/dev/null; echo "Crontab cleared"'],
      AttachStdout: true, AttachStderr: true
    });
    await exec.start({ Detach: false });

    log.success('All cron jobs cleared');
    log.json({ success: true, sandboxId });
  }
}

module.exports = CronManager;
