const chalk = require('chalk');
const Docker = require('dockerode');
const { log, ORANGE } = require('../utils/logger');
const { getSandboxMeta } = require('../utils/config');

class ProcessManager {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  async list(sandboxId, opts = {}) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    
    const psCmd = opts.all 
      ? 'ps aux 2>/dev/null || ps -ef 2>/dev/null || ps'
      : 'ps aux 2>/dev/null | head -20 || ps -ef 2>/dev/null | head -20 || ps';
    
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', psCmd],
      AttachStdout: true,
      AttachStderr: true
    });

    const stream = await exec.start({ Detach: false });
    const output = await new Promise((resolve) => {
      let data = '';
      stream.on('data', (chunk) => data += chunk.toString());
      stream.on('end', () => resolve(data));
    });

    log.nl();
    log.banner(`  🔄 Processes in ${sandboxId}:\n`);
    log.plain(output);
    log.json({ success: true, sandboxId, processes: output.trim() });
  }

  async kill(sandboxId, pid, opts = {}) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const signal = opts.signal || 'SIGTERM';
    
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', `kill -${signal} ${pid}`],
      AttachStdout: true,
      AttachStderr: true
    });

    const stream = await exec.start({ Detach: false });
    const output = await new Promise((resolve) => {
      let data = '';
      stream.on('data', (chunk) => data += chunk.toString());
      stream.on('end', () => resolve(data));
    });

    log.success(`Sent ${signal} to PID ${pid} in ${sandboxId}`);
    log.json({ success: true, sandboxId, pid, signal });
  }

  async top(sandboxId) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const topData = await container.top();
    
    log.nl();
    log.banner(`  🔝 Top processes in ${sandboxId}:\n`);
    log.plain(topData.Titles?.join('\t'));
    log.plain('─'.repeat(80));
    for (const proc of topData.Processes || []) {
      log.plain(proc.join('\t'));
    }
    log.json({ success: true, sandboxId, top: topData });
  }

  async tree(sandboxId) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', 'which pstree > /dev/null 2>&1 && pstree -p || (which ps > /dev/null 2>&1 && ps -ef --forest || ps -ef)'],
      AttachStdout: true,
      AttachStderr: true
    });

    const stream = await exec.start({ Detach: false });
    const output = await new Promise((resolve) => {
      let data = '';
      stream.on('data', (chunk) => data += chunk.toString());
      stream.on('end', () => resolve(data));
    });

    log.nl();
    log.banner(`  🌳 Process tree in ${sandboxId}:\n`);
    log.plain(output);
    log.json({ success: true, sandboxId, tree: output.trim() });
  }
}

module.exports = ProcessManager;
