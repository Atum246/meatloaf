const chalk = require('chalk');
const Docker = require('dockerode');
const { log, ORANGE } = require('../utils/logger');
const { getSandboxMeta } = require('../utils/config');

class GitManager {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  async clone(sandboxId, repo, opts = {}) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const dest = opts.dest || '/workspace/' + repo.split('/').pop().replace('.git', '');
    const branch = opts.branch ? `-b ${opts.branch}` : '';
    const depth = opts.shallow ? '--depth 1' : '';
    
    log.step(`Cloning ${repo}...`);
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', `git clone ${branch} ${depth} ${repo} ${dest} 2>&1`],
      AttachStdout: true, AttachStderr: true
    });
    const stream = await exec.start({ Detach: false });
    const output = await new Promise((resolve) => {
      let data = '';
      stream.on('data', (chunk) => data += chunk.toString());
      stream.on('end', () => resolve(data));
    });

    log.plain(output);
    log.success(`Cloned to ${dest}`);
    log.json({ success: true, sandboxId, repo, dest, branch: opts.branch || 'default' });
  }

  async status(sandboxId, opts = {}) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const workdir = opts.path || '/workspace';
    
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', `cd ${workdir} && git status && echo "---BRANCH---" && git branch -a && echo "---LOG---" && git log --oneline -5 2>/dev/null || echo "Not a git repo"`],
      AttachStdout: true, AttachStderr: true
    });
    const stream = await exec.start({ Detach: false });
    const output = await new Promise((resolve) => {
      let data = '';
      stream.on('data', (chunk) => data += chunk.toString());
      stream.on('end', () => resolve(data));
    });

    log.nl();
    log.banner(`  📁 Git Status: ${sandboxId}\n`);
    log.plain(output);
    log.json({ success: true, sandboxId, status: output.trim() });
  }

  async commit(sandboxId, message, opts = {}) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const workdir = opts.path || '/workspace';
    
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', `cd ${workdir} && git add -A && git commit -m "${message}" 2>&1`],
      AttachStdout: true, AttachStderr: true
    });
    const stream = await exec.start({ Detach: false });
    const output = await new Promise((resolve) => {
      let data = '';
      stream.on('data', (chunk) => data += chunk.toString());
      stream.on('end', () => resolve(data));
    });

    log.plain(output);
    log.success(`Committed: "${message}"`);
    log.json({ success: true, sandboxId, message });
  }

  async push(sandboxId, opts = {}) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const workdir = opts.path || '/workspace';
    const remote = opts.remote || 'origin';
    const branch = opts.branch || 'main';
    
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', `cd ${workdir} && git push ${remote} ${branch} 2>&1`],
      AttachStdout: true, AttachStderr: true
    });
    const stream = await exec.start({ Detach: false });
    const output = await new Promise((resolve) => {
      let data = '';
      stream.on('data', (chunk) => data += chunk.toString());
      stream.on('end', () => resolve(data));
    });

    log.plain(output);
    log.success(`Pushed to ${remote}/${branch}`);
    log.json({ success: true, sandboxId, remote, branch });
  }

  async diff(sandboxId, opts = {}) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const workdir = opts.path || '/workspace';
    
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', `cd ${workdir} && git diff ${opts.staged ? '--cached' : ''} 2>/dev/null`],
      AttachStdout: true, AttachStderr: true
    });
    const stream = await exec.start({ Detach: false });
    const output = await new Promise((resolve) => {
      let data = '';
      stream.on('data', (chunk) => data += chunk.toString());
      stream.on('end', () => resolve(data));
    });

    log.nl();
    log.banner('  📝 Git Diff\n');
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) log.plain(chalk.green(line));
      else if (line.startsWith('-') && !line.startsWith('---')) log.plain(chalk.red(line));
      else if (line.startsWith('@@')) log.plain(chalk.cyan(line));
      else log.plain(line);
    }
    log.json({ success: true, sandboxId, diff: output.trim() });
  }

  async log(sandboxId, opts = {}) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const workdir = opts.path || '/workspace';
    const count = opts.count || 20;
    
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', `cd ${workdir} && git log --oneline --graph -${count} 2>/dev/null`],
      AttachStdout: true, AttachStderr: true
    });
    const stream = await exec.start({ Detach: false });
    const output = await new Promise((resolve) => {
      let data = '';
      stream.on('data', (chunk) => data += chunk.toString());
      stream.on('end', () => resolve(data));
    });

    log.nl();
    log.banner('  📜 Git Log\n');
    log.plain(output);
    log.json({ success: true, sandboxId, log: output.trim() });
  }
}

module.exports = GitManager;
