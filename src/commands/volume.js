const chalk = require('chalk');
const ora = require('ora');
const Docker = require('dockerode');
const { log, ORANGE } = require('../utils/logger');
const { formatBytes } = require('../utils/helpers');

class VolumeManager {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  async create(name, opts = {}) {
    const spinner = ora({ text: `Creating volume: ${name}`, color: 'yellow' }).start();
    try {
      const volume = await this.docker.createVolume({
        Name: name,
        Driver: opts.driver || 'local',
        Labels: { 'meatloaf.volume': 'true' },
        DriverOpts: opts.driverOpts || {}
      });
      spinner.succeed(chalk.green(`Volume created: ${name}`));
      const info = await volume.inspect();
      log.json({ success: true, name, driver: info.Driver, mountpoint: info.Mountpoint });
      return info;
    } catch (err) {
      spinner.fail(chalk.red(`Failed: ${err.message}`));
      throw err;
    }
  }

  async list() {
    const result = await this.docker.listVolumes({
      filters: { label: ['meatloaf.volume=true'] }
    });
    const volumes = result.Volumes || [];
    
    if (volumes.length === 0) {
      log.info(chalk.gray('No Meatloaf volumes. Showing all volumes:'));
      const all = await this.docker.listVolumes();
      const allVols = all.Volumes || [];
      log.nl();
      log.banner('  💾 All Volumes\n');
      const rows = allVols.map(v => [v.Name.substring(0, 20), v.Driver, v.Mountpoint?.substring(0, 40) || '-']);
      log.table(rows, ['Name', 'Driver', 'Mountpoint']);
    } else {
      log.nl();
      log.banner('  💾 Meatloaf Volumes\n');
      const rows = volumes.map(v => [v.Name, v.Driver, v.Mountpoint?.substring(0, 40) || '-']);
      log.table(rows, ['Name', 'Driver', 'Mountpoint']);
    }
    log.json({ success: true, volumes });
  }

  async remove(name) {
    const spinner = ora({ text: `Removing volume: ${name}`, color: 'yellow' }).start();
    try {
      await this.docker.getVolume(name).remove();
      spinner.succeed(chalk.green(`Volume removed: ${name}`));
      log.json({ success: true, name, message: `Volume ${name} removed` });
    } catch (err) {
      spinner.fail(chalk.red(`Failed: ${err.message}`));
      throw err;
    }
  }

  async inspectVolume(name) {
    const info = await this.docker.getVolume(name).inspect();
    log.nl();
    log.banner(`  🔍 Volume: ${name}\n`);
    const rows = [
      ['Name', info.Name],
      ['Driver', info.Driver],
      ['Mountpoint', info.Mountpoint],
      ['Created', info.CreatedAt],
      ['Labels', JSON.stringify(info.Labels || {})]
    ];
    log.table(rows.map(([k, v]) => [chalk.hex(ORANGE).bold(k), String(v)]), ['Property', 'Value']);
    log.json({ success: true, volume: info });
  }

  async prune() {
    const spinner = ora({ text: 'Pruning unused volumes...', color: 'yellow' }).start();
    try {
      const result = await this.docker.pruneVolumes();
      const reclaimed = result.VolumesDeleted?.length || 0;
      spinner.succeed(chalk.green(`Pruned ${reclaimed} volume(s)`));
      log.json({ success: true, pruned: reclaimed, spaceReclaimed: result.SpaceReclaimed });
    } catch (err) {
      spinner.fail(chalk.red(`Failed: ${err.message}`));
      throw err;
    }
  }
}

module.exports = VolumeManager;
