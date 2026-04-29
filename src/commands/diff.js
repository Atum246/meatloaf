const chalk = require('chalk');
const Docker = require('dockerode');
const { log, ORANGE } = require('../utils/logger');
const { getSandboxMeta } = require('../utils/config');

class DiffEngine {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  async files(sandboxId, file1, file2) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', `diff -u ${file1} ${file2} 2>/dev/null || true`],
      AttachStdout: true, AttachStderr: true
    });
    const stream = await exec.start({ Detach: false });
    const output = await new Promise((resolve) => {
      let data = '';
      stream.on('data', (chunk) => data += chunk.toString());
      stream.on('end', () => resolve(data));
    });

    log.nl();
    log.banner(`  🔀 Diff: ${file1} ↔ ${file2}\n`);
    
    if (!output.trim()) {
      log.success('Files are identical');
    } else {
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) log.plain(chalk.green(line));
        else if (line.startsWith('-') && !line.startsWith('---')) log.plain(chalk.red(line));
        else if (line.startsWith('@@')) log.plain(chalk.cyan(line));
        else log.plain(line);
      }
    }

    log.json({ success: true, sandboxId, file1, file2, diff: output.trim(), identical: !output.trim() });
  }

  async sandboxes(id1, id2, opts = {}) {
    const comparePath = opts.path || '/workspace';
    
    log.nl();
    log.banner(`  🔀 Sandbox Diff: ${id1} ↔ ${id2}\n`);

    const getContent = async (sbId, filePath) => {
      const meta = getSandboxMeta(sbId);
      if (!meta) return null;
      const container = this.docker.getContainer(meta.containerId);
      const exec = await container.exec({
        Cmd: ['/bin/sh', '-c', `cat ${filePath} 2>/dev/null`],
        AttachStdout: true, AttachStderr: true
      });
      const stream = await exec.start({ Detach: false });
      return new Promise((resolve) => {
        let data = '';
        stream.on('data', (chunk) => data += chunk.toString());
        stream.on('end', () => resolve(data));
      });
    };

    const getList = async (sbId) => {
      const meta = getSandboxMeta(sbId);
      if (!meta) return [];
      const container = this.docker.getContainer(meta.containerId);
      const exec = await container.exec({
        Cmd: ['/bin/sh', '-c', `find ${comparePath} -type f 2>/dev/null | sort`],
        AttachStdout: true, AttachStderr: true
      });
      const stream = await exec.start({ Detach: false });
      return new Promise((resolve) => {
        let data = '';
        stream.on('data', (chunk) => data += chunk.toString());
        stream.on('end', () => resolve(data.split('\n').filter(Boolean)));
      });
    };

    const files1 = await getList(id1);
    const files2 = await getList(id2);
    
    const onlyIn1 = files1.filter(f => !files2.includes(f));
    const onlyIn2 = files2.filter(f => !files1.includes(f));
    const common = files1.filter(f => files2.includes(f));

    let changed = 0;
    let same = 0;
    for (const f of common) {
      const c1 = await getContent(id1, f);
      const c2 = await getContent(id2, f);
      if (c1 !== c2) changed++;
      else same++;
    }

    if (onlyIn1.length) { log.error(`Only in ${id1}: ${onlyIn1.join(', ')}`); }
    if (onlyIn2.length) { log.success(`Only in ${id2}: ${onlyIn2.join(', ')}`); }
    log.warn(`Changed: ${changed} file(s)`);
    log.info(`Same: ${same} file(s)`);

    log.json({ success: true, onlyIn1, onlyIn2, changed, same, total: common.length });
  }

  async inspect(sandboxId) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    
    // Get filesystem changes
    const changes = await container.changes();
    
    log.nl();
    log.banner(`  🔍 Changes in ${sandboxId}:\n`);
    
    if (!changes || changes.length === 0) {
      log.info(chalk.gray('No filesystem changes detected'));
    } else {
      const rows = changes.slice(0, 50).map(c => {
        const type = c.Kind === 0 ? chalk.green('Added') : c.Kind === 1 ? chalk.yellow('Modified') : chalk.red('Deleted');
        return [type, c.Path];
      });
      log.table(rows, ['Type', 'Path']);
      if (changes.length > 50) log.info(chalk.gray(`... and ${changes.length - 50} more`));
    }

    log.json({ success: true, sandboxId, changes: changes || [], count: changes?.length || 0 });
  }
}

module.exports = DiffEngine;
