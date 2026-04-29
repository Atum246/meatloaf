const chalk = require('chalk');
const ora = require('ora');
const Docker = require('dockerode');
const { log, ORANGE } = require('../utils/logger');
const { formatBytes } = require('../utils/helpers');

class ImageManager {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  async list(opts = {}) {
    const filters = {};
    if (opts.meatloaf) filters.label = ['meatloaf.sandbox=true'];
    
    const images = await this.docker.listImages({ filters });
    
    log.nl();
    log.banner('  🖼️  Docker Images\n');
    const rows = images.map(img => {
      const tags = img.RepoTags || ['<none>:<none>'];
      const size = formatBytes(img.Size);
      const created = new Date(img.Created * 1000).toISOString().split('T')[0];
      return [img.Id.substring(7, 19), tags.join(', '), size, created];
    });
    log.table(rows, ['ID', 'Tags', 'Size', 'Created']);
    log.json({ success: true, count: images.length, images });
  }

  async pull(image) {
    const spinner = ora({ text: `Pulling image: ${image}`, color: 'yellow' }).start();
    try {
      const stream = await this.docker.pull(image);
      await new Promise((resolve, reject) => {
        this.docker.modem.followProgress(stream, (err, output) => {
          if (err) reject(err);
          else resolve(output);
        }, () => {});
      });
      spinner.succeed(chalk.green(`Image pulled: ${image}`));
      log.json({ success: true, image, message: `Image ${image} pulled successfully` });
    } catch (err) {
      spinner.fail(chalk.red(`Failed: ${err.message}`));
      throw err;
    }
  }

  async remove(image, opts = {}) {
    const spinner = ora({ text: `Removing image: ${image}`, color: 'yellow' }).start();
    try {
      await this.docker.getImage(image).remove({ force: opts.force || false });
      spinner.succeed(chalk.green(`Image removed: ${image}`));
      log.json({ success: true, image, message: `Image ${image} removed` });
    } catch (err) {
      spinner.fail(chalk.red(`Failed: ${err.message}`));
      throw err;
    }
  }

  async build(dockerfile, tag, opts = {}) {
    const spinner = ora({ text: `Building image: ${tag}`, color: 'yellow' }).start();
    try {
      const context = opts.context || '.';
      const stream = await this.docker.buildImage(
        { context, src: [dockerfile] },
        { t: tag, buildargs: opts.buildArgs || {} }
      );
      
      spinner.stop();
      log.banner(`  🔨 Building: ${tag}\n`);
      
      await new Promise((resolve, reject) => {
        this.docker.modem.followProgress(stream, (err, output) => {
          if (err) reject(err);
          else resolve(output);
        }, (event) => {
          if (event.stream) process.stdout.write(chalk.gray(event.stream));
        });
      });
      
      log.nl();
      log.success(chalk.green(`Image built: ${tag}`));
      log.json({ success: true, tag, message: `Image ${tag} built successfully` });
    } catch (err) {
      spinner.fail(chalk.red(`Build failed: ${err.message}`));
      throw err;
    }
  }

  async inspectImage(image) {
    const info = await this.docker.getImage(image).inspect();
    log.nl();
    log.banner(`  🔍 Image: ${image}\n`);
    const rows = [
      ['ID', info.Id?.substring(7, 19)],
      ['Tags', (info.RepoTags || []).join(', ')],
      ['Size', formatBytes(info.Size)],
      ['Created', info.Created],
      ['Architecture', info.Architecture],
      ['OS', info.Os],
      ['Layers', info.RootFS?.Layers?.length || 0]
    ];
    log.table(rows.map(([k, v]) => [chalk.hex(ORANGE).bold(k), String(v)]), ['Property', 'Value']);
    log.json({ success: true, image: info });
  }

  async prune() {
    const spinner = ora({ text: 'Pruning unused images...', color: 'yellow' }).start();
    try {
      const result = await this.docker.pruneImages();
      const reclaimed = result.ImagesDeleted?.length || 0;
      spinner.succeed(chalk.green(`Pruned ${reclaimed} image(s)`));
      log.json({ success: true, pruned: reclaimed, spaceReclaimed: result.SpaceReclaimed });
    } catch (err) {
      spinner.fail(chalk.red(`Failed: ${err.message}`));
      throw err;
    }
  }

  async tag(source, target) {
    const spinner = ora({ text: `Tagging ${source} → ${target}`, color: 'yellow' }).start();
    try {
      await this.docker.getImage(source).tag({ repo: target });
      spinner.succeed(chalk.green(`Tagged: ${source} → ${target}`));
      log.json({ success: true, source, target });
    } catch (err) {
      spinner.fail(chalk.red(`Failed: ${err.message}`));
      throw err;
    }
  }

  async history(image) {
    const history = await this.docker.getImage(image).history();
    log.nl();
    log.banner(`  📜 History: ${image}\n`);
    const rows = history.map(h => [
      (h.Id || '<missing>').substring(0, 19),
      h.CreatedBy?.substring(0, 50) || '-',
      formatBytes(h.Size)
    ]);
    log.table(rows, ['ID', 'CreatedBy', 'Size']);
    log.json({ success: true, history });
  }
}

module.exports = ImageManager;
