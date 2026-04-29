const chalk = require('chalk');
const Docker = require('dockerode');
const { log, ORANGE } = require('../utils/logger');
const { getSandboxMeta } = require('../utils/config');

class FileSystemManager {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  async ls(sandboxId, dirPath = '/workspace', opts = {}) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const flag = opts.all ? '-la' : '-l';
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', `ls ${flag} ${dirPath}`],
      AttachStdout: true, AttachStderr: true
    });
    const stream = await exec.start({ Detach: false });
    const output = await new Promise((resolve) => {
      let data = '';
      stream.on('data', (chunk) => data += chunk.toString());
      stream.on('end', () => resolve(data));
    });

    log.nl();
    log.banner(`  📁 ${dirPath}:\n`);
    log.plain(output);
    log.json({ success: true, sandboxId, path: dirPath, listing: output.trim() });
  }

  async cat(sandboxId, filePath) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', `cat ${filePath}`],
      AttachStdout: true, AttachStderr: true
    });
    const stream = await exec.start({ Detach: false });
    const output = await new Promise((resolve) => {
      let data = '';
      stream.on('data', (chunk) => data += chunk.toString());
      stream.on('end', () => resolve(data));
    });

    log.nl();
    log.banner(`  📄 ${filePath}:\n`);
    log.plain(output);
    log.json({ success: true, sandboxId, path: filePath, content: output.trim() });
  }

  async find(sandboxId, pattern, opts = {}) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const searchPath = opts.path || '/workspace';
    const type = opts.type ? `-type ${opts.type}` : '';
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', `find ${searchPath} ${type} -name "${pattern}" 2>/dev/null`],
      AttachStdout: true, AttachStderr: true
    });
    const stream = await exec.start({ Detach: false });
    const output = await new Promise((resolve) => {
      let data = '';
      stream.on('data', (chunk) => data += chunk.toString());
      stream.on('end', () => resolve(data));
    });

    log.nl();
    log.banner(`  🔍 Find: ${pattern} in ${searchPath}\n`);
    log.plain(output);
    log.json({ success: true, sandboxId, pattern, results: output.trim().split('\n').filter(Boolean) });
  }

  async write(sandboxId, filePath, content) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const escaped = content.replace(/'/g, "'\\''");
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', `cat > ${filePath} << 'MEATLOAF_EOF'\n${content}\nMEATLOAF_EOF`],
      AttachStdout: true, AttachStderr: true
    });
    const stream = await exec.start({ Detach: false });
    await new Promise((resolve) => {
      stream.on('end', resolve);
      setTimeout(resolve, 2000);
    });

    log.success(`Written to ${filePath}`);
    log.json({ success: true, sandboxId, path: filePath, bytes: content.length });
  }

  async mkdir(sandboxId, dirPath, opts = {}) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const flag = opts.parents ? '-p' : '';
    const exec = await container.exec({
      Cmd: ['/bin/sh', `-c`, `mkdir ${flag} ${dirPath}`],
      AttachStdout: true, AttachStderr: true
    });
    const stream = await exec.start({ Detach: false });
    await new Promise((resolve) => {
      stream.on('end', resolve);
      setTimeout(resolve, 1000);
    });

    log.success(`Directory created: ${dirPath}`);
    log.json({ success: true, sandboxId, path: dirPath });
  }

  async rm(sandboxId, filePath, opts = {}) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const flags = opts.recursive ? '-rf' : '-f';
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', `rm ${flags} ${filePath}`],
      AttachStdout: true, AttachStderr: true
    });
    const stream = await exec.start({ Detach: false });
    await new Promise((resolve) => {
      stream.on('end', resolve);
      setTimeout(resolve, 1000);
    });

    log.success(`Removed: ${filePath}`);
    log.json({ success: true, sandboxId, path: filePath });
  }

  async du(sandboxId, dirPath = '/workspace') {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', `du -sh ${dirPath}/* 2>/dev/null | sort -rh | head -20`],
      AttachStdout: true, AttachStderr: true
    });
    const stream = await exec.start({ Detach: false });
    const output = await new Promise((resolve) => {
      let data = '';
      stream.on('data', (chunk) => data += chunk.toString());
      stream.on('end', () => resolve(data));
    });

    log.nl();
    log.banner(`  💾 Disk usage in ${dirPath}:\n`);
    log.plain(output);
    log.json({ success: true, sandboxId, path: dirPath, usage: output.trim() });
  }

  async wc(sandboxId, filePath) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', `wc -l -w -c ${filePath}`],
      AttachStdout: true, AttachStderr: true
    });
    const stream = await exec.start({ Detach: false });
    const output = await new Promise((resolve) => {
      let data = '';
      stream.on('data', (chunk) => data += chunk.toString());
      stream.on('end', () => resolve(data));
    });

    log.plain(output.trim());
    log.json({ success: true, sandboxId, path: filePath, stats: output.trim() });
  }

  async grep(sandboxId, pattern, opts = {}) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const searchPath = opts.path || '/workspace';
    const flags = opts.recursive ? '-r' : '';
    const lineNums = opts.lineNumbers ? 'n' : '';
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', `grep -${flags}${lineNums} "${pattern}" ${searchPath} 2>/dev/null | head -50`],
      AttachStdout: true, AttachStderr: true
    });
    const stream = await exec.start({ Detach: false });
    const output = await new Promise((resolve) => {
      let data = '';
      stream.on('data', (chunk) => data += chunk.toString());
      stream.on('end', () => resolve(data));
    });

    log.nl();
    log.banner(`  🔎 Grep: "${pattern}" in ${searchPath}\n`);
    log.plain(output);
    log.json({ success: true, sandboxId, pattern, results: output.trim().split('\n').filter(Boolean) });
  }
}

module.exports = FileSystemManager;
