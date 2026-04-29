const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const Docker = require('dockerode');
const { log, ORANGE } = require('../utils/logger');
const { getSandboxMeta } = require('../utils/config');

class SyncManager {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  async up(sandboxId, localPath, opts = {}) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const containerPath = opts.dest || '/workspace';
    const exclude = opts.exclude || ['node_modules', '.git', '*.log', '__pycache__', '.env'];
    
    log.banner(`  ⬆️  Sync UP: ${localPath} → ${sandboxId}:${containerPath}\n`);

    if (!fs.existsSync(localPath)) throw new Error(`Path not found: ${localPath}`);

    const files = this._getFiles(localPath, '', exclude);
    let synced = 0;
    let skipped = 0;

    const container = this.docker.getContainer(meta.containerId);

    for (const file of files) {
      const fullPath = path.join(localPath, file);
      const destPath = `${containerPath}/${file}`;
      
      try {
        const content = fs.readFileSync(fullPath);
        const base64 = content.toString('base64');
        
        const exec = await container.exec({
          Cmd: ['/bin/sh', '-c', `mkdir -p $(dirname ${destPath}) && echo '${base64}' | base64 -d > ${destPath}`],
          AttachStdout: true, AttachStderr: true
        });
        await exec.start({ Detach: false });
        synced++;
        log.debug(`Synced: ${file}`);
      } catch (err) {
        skipped++;
        log.warn(`Skipped ${file}: ${err.message}`);
      }
    }

    log.nl();
    log.success(`Synced ${synced} file(s), skipped ${skipped}`);
    log.json({ success: true, sandboxId, synced, skipped, total: files.length, dest: containerPath });
  }

  async down(sandboxId, containerPath, opts = {}) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const localPath = opts.dest || './synced';
    if (!fs.existsSync(localPath)) fs.mkdirSync(localPath, { recursive: true });

    log.banner(`  ⬇️  Sync DOWN: ${sandboxId}:${containerPath} → ${localPath}\n`);

    const container = this.docker.getContainer(meta.containerId);
    
    // Get file list
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', `find ${containerPath} -type f 2>/dev/null`],
      AttachStdout: true, AttachStderr: true
    });
    const stream = await exec.start({ Detach: false });
    const output = await new Promise((resolve) => {
      let data = '';
      stream.on('data', (chunk) => data += chunk.toString());
      stream.on('end', () => resolve(data));
    });

    const files = output.split('\n').filter(Boolean);
    let synced = 0;

    for (const file of files) {
      const relativePath = file.replace(containerPath, '').replace(/^\//, '');
      const localFilePath = path.join(localPath, relativePath);
      const dir = path.dirname(localFilePath);
      
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      try {
        const catExec = await container.exec({
          Cmd: ['/bin/sh', '-c', `cat ${file}`],
          AttachStdout: true, AttachStderr: true
        });
        const catStream = await catExec.start({ Detach: false });
        const content = await new Promise((resolve) => {
          let data = '';
          catStream.on('data', (chunk) => data += chunk.toString());
          catStream.on('end', () => resolve(data));
        });
        
        fs.writeFileSync(localFilePath, content);
        synced++;
      } catch (err) {
        log.warn(`Failed: ${relativePath}`);
      }
    }

    log.success(`Downloaded ${synced} file(s) to ${localPath}`);
    log.json({ success: true, sandboxId, synced, dest: localPath });
  }

  async watch(sandboxId, localPath, opts = {}) {
    log.banner(`  👁️  Live Sync: ${localPath} ↔ ${sandboxId}\n`);
    log.info(chalk.gray('Press Ctrl+C to stop\n'));

    const debounce = parseInt(opts.debounce) || 500;
    let timeout = null;

    const handleChange = async (eventType, filename) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(async () => {
        if (!filename) return;
        const fullPath = path.join(localPath, filename);
        if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) return;

        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        log.step(`[${timestamp}] Syncing: ${filename}`);
        
        try {
          const meta = getSandboxMeta(sandboxId);
          if (!meta) return;
          const container = this.docker.getContainer(meta.containerId);
          const content = fs.readFileSync(fullPath).toString('base64');
          const dest = `/workspace/${filename}`;
          
          const exec = await container.exec({
            Cmd: ['/bin/sh', '-c', `echo '${content}' | base64 -d > ${dest}`],
            AttachStdout: true, AttachStderr: true
          });
          await exec.start({ Detach: false });
          log.success(`Synced: ${filename}`);
        } catch (err) {
          log.error(`Sync failed: ${err.message}`);
        }
      }, debounce);
    };

    fs.watch(localPath, { recursive: true }, handleChange);

    process.on('SIGINT', () => {
      log.info('\nLive sync stopped');
      process.exit(0);
    });

    await new Promise(() => {});
  }

  _getFiles(basePath, relativePath, exclude) {
    const fullPath = path.join(basePath, relativePath);
    const entries = fs.readdirSync(fullPath, { withFileTypes: true });
    let files = [];

    for (const entry of entries) {
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      
      if (exclude.some(ex => {
        if (ex.includes('*')) {
          const pattern = ex.replace('*', '');
          return entry.name.endsWith(pattern);
        }
        return entry.name === ex || entry.name.startsWith(ex);
      })) continue;

      if (entry.isDirectory()) {
        files = files.concat(this._getFiles(basePath, relPath, exclude));
      } else {
        files.push(relPath);
      }
    }

    return files;
  }
}

module.exports = SyncManager;
