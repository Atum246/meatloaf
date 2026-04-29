const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs');
const Docker = require('dockerode');
const { log, ORANGE } = require('../utils/logger');
const { getSandboxMeta, saveSandboxMeta, SNAPSHOTS_DIR } = require('../utils/config');

class SnapshotManager {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  async commit(sandboxId, opts = {}) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const tag = opts.tag || `meatloaf-snapshot:${sandboxId}-${Date.now()}`;
    const spinner = ora({ text: `Creating snapshot: ${tag}`, color: 'yellow' }).start();

    try {
      const container = this.docker.getContainer(meta.containerId);
      const result = await container.commit({
        tag,
        comment: opts.message || `Snapshot of ${sandboxId}`,
        author: 'Meatloaf v1.0.0',
        pause: opts.pause !== false
      });

      spinner.succeed(chalk.green(`Snapshot created: ${tag}`));
      log.json({
        success: true,
        sandboxId,
        imageTag: tag,
        message: `Snapshot saved as ${tag}`
      });
      return { tag };
    } catch (err) {
      spinner.fail(chalk.red(`Snapshot failed: ${err.message}`));
      throw err;
    }
  }

  async restore(imageTag, opts = {}) {
    const spinner = ora({ text: `Restoring from snapshot: ${imageTag}`, color: 'yellow' }).start();
    try {
      const DockerManager = require('../lib/docker');
      const manager = new DockerManager();
      const result = await manager.createSandbox({
        image: imageTag,
        ports: opts.ports,
        env: opts.env,
        workdir: opts.workdir
      });
      await manager.startSandbox(result.id);
      spinner.succeed(chalk.green(`Restored sandbox: ${result.id}`));
      log.json({ success: true, sandboxId: result.id, from: imageTag, message: `Restored from snapshot ${imageTag}` });
      return result;
    } catch (err) {
      spinner.fail(chalk.red(`Restore failed: ${err.message}`));
      throw err;
    }
  }

  async listSnapshots() {
    const images = await this.docker.listImages({
      filters: { reference: ['meatloaf-snapshot:*'] }
    });

    log.nl();
    log.banner('  📸 Snapshots\n');
    if (images.length === 0) {
      log.info(chalk.gray('No snapshots found. Create one with: meatloaf snapshot <sandbox-id>'));
      return;
    }
    const rows = images.map(img => {
      const tags = img.RepoTags || ['<none>'];
      const size = (img.Size / 1024 / 1024).toFixed(2) + ' MB';
      const created = new Date(img.Created * 1000).toISOString().split('T')[0];
      return [img.Id.substring(7, 19), tags.join(', '), size, created];
    });
    log.table(rows, ['ID', 'Tag', 'Size', 'Created']);
    log.json({ success: true, snapshots: images });
  }

  async export(sandboxId, outputPath) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const spinner = ora({ text: `Exporting sandbox ${sandboxId}...`, color: 'yellow' }).start();
    try {
      const container = this.docker.getContainer(meta.containerId);
      const stream = await container.export();
      const outPath = outputPath || `${sandboxId}-export.tar`;
      const writeStream = fs.createWriteStream(outPath);
      
      await new Promise((resolve, reject) => {
        stream.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
        stream.on('error', reject);
      });

      const stats = fs.statSync(outPath);
      spinner.succeed(chalk.green(`Exported: ${outPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`));
      log.json({ success: true, sandboxId, path: outPath, size: stats.size });
    } catch (err) {
      spinner.fail(chalk.red(`Export failed: ${err.message}`));
      throw err;
    }
  }

  async import(tarPath, opts = {}) {
    const spinner = ora({ text: `Importing: ${tarPath}`, color: 'yellow' }).start();
    try {
      const stream = fs.createReadStream(tarPath);
      const image = await this.docker.importImage(stream, {
        tag: opts.tag || 'meatloaf-import:latest'
      });
      spinner.succeed(chalk.green(`Imported as: ${opts.tag || 'meatloaf-import:latest'}`));
      log.json({ success: true, path: tarPath, tag: opts.tag || 'meatloaf-import:latest' });
    } catch (err) {
      spinner.fail(chalk.red(`Import failed: ${err.message}`));
      throw err;
    }
  }
}

module.exports = SnapshotManager;
