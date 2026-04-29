const chalk = require('chalk');
const ora = require('ora');
const Docker = require('dockerode');
const { log, ORANGE } = require('../utils/logger');
const { generateId, formatBytes } = require('../utils/helpers');

class NetworkManager {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  async create(name, opts = {}) {
    const spinner = ora({ text: `Creating network: ${name}`, color: 'yellow' }).start();
    try {
      const network = await this.docker.createNetwork({
        Name: name,
        Driver: opts.driver || 'bridge',
        Internal: opts.internal || false,
        Labels: { 'meatloaf.network': 'true' },
        IPAM: opts.subnet ? {
          Config: [{ Subnet: opts.subnet, Gateway: opts.gateway }]
        } : undefined
      });
      spinner.succeed(chalk.green(`Network created: ${name}`));
      const info = await network.inspect();
      log.json({ success: true, networkId: info.Id.substring(0, 12), name, driver: opts.driver || 'bridge' });
      return info;
    } catch (err) {
      spinner.fail(chalk.red(`Failed: ${err.message}`));
      throw err;
    }
  }

  async list() {
    const networks = await this.docker.listNetworks({
      filters: { label: ['meatloaf.network=true'] }
    });
    if (networks.length === 0) {
      const all = await this.docker.listNetworks();
      log.nl();
      log.banner('  🌐 All Networks\n');
      const rows = all.map(n => [n.Id.substring(0, 12), n.Name, n.Driver, n.Scope]);
      log.table(rows, ['ID', 'Name', 'Driver', 'Scope']);
    } else {
      log.nl();
      log.banner('  🌐 Meatloaf Networks\n');
      const rows = networks.map(n => [n.Id.substring(0, 12), n.Name, n.Driver, n.Scope]);
      log.table(rows, ['ID', 'Name', 'Driver', 'Scope']);
    }
    log.json({ success: true, networks });
  }

  async remove(name) {
    const spinner = ora({ text: `Removing network: ${name}`, color: 'yellow' }).start();
    try {
      const networks = await this.docker.listNetworks({ filters: { name: [name] } });
      if (networks.length === 0) throw new Error(`Network not found: ${name}`);
      await this.docker.getNetwork(networks[0].Id).remove();
      spinner.succeed(chalk.green(`Network removed: ${name}`));
      log.json({ success: true, name, message: `Network ${name} removed` });
    } catch (err) {
      spinner.fail(chalk.red(`Failed: ${err.message}`));
      throw err;
    }
  }

  async connect(networkName, sandboxId) {
    const spinner = ora({ text: `Connecting ${sandboxId} to ${networkName}`, color: 'yellow' }).start();
    try {
      const networks = await this.docker.listNetworks({ filters: { name: [networkName] } });
      if (networks.length === 0) throw new Error(`Network not found: ${networkName}`);
      const network = this.docker.getNetwork(networks[0].Id);
      const { getSandboxMeta } = require('../utils/config');
      const meta = getSandboxMeta(sandboxId);
      if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);
      await network.connect({ Container: meta.containerId });
      spinner.succeed(chalk.green(`Connected ${sandboxId} to ${networkName}`));
      log.json({ success: true, sandboxId, network: networkName });
    } catch (err) {
      spinner.fail(chalk.red(`Failed: ${err.message}`));
      throw err;
    }
  }

  async disconnect(networkName, sandboxId) {
    const spinner = ora({ text: `Disconnecting ${sandboxId} from ${networkName}`, color: 'yellow' }).start();
    try {
      const networks = await this.docker.listNetworks({ filters: { name: [networkName] } });
      if (networks.length === 0) throw new Error(`Network not found: ${networkName}`);
      const network = this.docker.getNetwork(networks[0].Id);
      const { getSandboxMeta } = require('../utils/config');
      const meta = getSandboxMeta(sandboxId);
      if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);
      await network.disconnect({ Container: meta.containerId });
      spinner.succeed(chalk.green(`Disconnected ${sandboxId} from ${networkName}`));
      log.json({ success: true, sandboxId, network: networkName });
    } catch (err) {
      spinner.fail(chalk.red(`Failed: ${err.message}`));
      throw err;
    }
  }

  async inspectNetwork(name) {
    const networks = await this.docker.listNetworks({ filters: { name: [name] } });
    if (networks.length === 0) throw new Error(`Network not found: ${name}`);
    const info = await this.docker.getNetwork(networks[0].Id).inspect();
    log.nl();
    log.banner(`  🔍 Network: ${name}\n`);
    const rows = [
      ['ID', info.Id?.substring(0, 12)],
      ['Name', info.Name],
      ['Driver', info.Driver],
      ['Scope', info.Scope],
      ['Internal', info.Internal ? 'Yes' : 'No'],
      ['Containers', Object.keys(info.Containers || {}).length]
    ];
    log.table(rows.map(([k, v]) => [chalk.hex(ORANGE).bold(k), String(v)]), ['Property', 'Value']);
    if (info.Containers && Object.keys(info.Containers).length > 0) {
      log.nl();
      log.banner('  📦 Connected Containers\n');
      const cRows = Object.entries(info.Containers).map(([id, c]) => [
        id.substring(0, 12), c.Name, c.IPv4Address || '-'
      ]);
      log.table(cRows, ['Container ID', 'Name', 'IP']);
    }
    log.json({ success: true, network: info });
  }
}

module.exports = NetworkManager;
