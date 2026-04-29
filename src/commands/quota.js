const chalk = require('chalk');
const Docker = require('dockerode');
const { log, ORANGE } = require('../utils/logger');
const { getSandboxMeta } = require('../utils/config');
const { formatBytes } = require('../utils/helpers');

class ResourceQuota {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  async set(sandboxId, opts = {}) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const updateOpts = {};

    if (opts.memory) {
      updateOpts.Memory = parseInt(opts.memory) * 1024 * 1024; // MB to bytes
    }
    if (opts.cpu) {
      updateOpts.CpuQuota = parseInt(opts.cpu) * 100000;
    }
    if (opts.memorySwap) {
      updateOpts.MemorySwap = parseInt(opts.memorySwap) * 1024 * 1024;
    }

    await container.update(updateOpts);

    log.nl();
    log.banner(`  📊 Resource Quota Updated: ${sandboxId}\n`);
    const rows = [];
    if (opts.memory) rows.push(['Memory Limit', `${opts.memory} MB`]);
    if (opts.cpu) rows.push(['CPU Quota', `${opts.cpu} cores`]);
    if (opts.memorySwap) rows.push(['Memory+Swap', `${opts.memorySwap} MB`]);
    log.table(rows.map(([k, v]) => [chalk.hex(ORANGE).bold(k), v]), ['Resource', 'Limit']);

    log.json({ success: true, sandboxId, quotas: updateOpts });
  }

  async get(sandboxId) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const info = await container.inspect();
    const hc = info.HostConfig;

    log.nl();
    log.banner(`  📊 Resource Quotas: ${sandboxId}\n`);
    const rows = [
      ['Memory Limit', hc.Memory ? formatBytes(hc.Memory) : 'Unlimited'],
      ['Memory+Swap', hc.MemorySwap ? formatBytes(hc.MemorySwap) : 'Unlimited'],
      ['CPU Quota', hc.CpuQuota ? `${(hc.CpuQuota / 100000).toFixed(1)} cores` : 'Unlimited'],
      ['CPU Period', hc.CpuPeriod ? `${hc.CpuPeriod}μs` : 'Default'],
      ['PID Limit', hc.PidsLimit || 'Unlimited'],
      ['IO Bandwidth', hc.BlkioDeviceWriteBps?.[0]?.Rate || 'Unlimited']
    ];
    log.table(rows.map(([k, v]) => [chalk.hex(ORANGE).bold(k), String(v)]), ['Resource', 'Current Limit']);
    log.json({ success: true, sandboxId, quotas: { memory: hc.Memory, cpu: hc.CpuQuota } });
  }

  async limits() {
    const DockerInfo = await this.docker.info();
    
    log.nl();
    log.banner('  📊 System Resource Limits\n');
    const rows = [
      ['Total CPUs', (DockerInfo.NCPU || 0).toString()],
      ['Total Memory', formatBytes(DockerInfo.MemTotal || 0)],
      ['Storage Driver', DockerInfo.Driver || '-'],
      ['Docker Root Dir', DockerInfo.DockerRootDir || '-'],
      ['Max Open Files', DockerInfo.NFd?.toString() || '-'],
      ['Containers', (DockerInfo.Containers || 0).toString()],
      ['Running', (DockerInfo.ContainersRunning || 0).toString()],
      ['Images', (DockerInfo.Images || 0).toString()]
    ];
    log.table(rows.map(([k, v]) => [chalk.hex(ORANGE).bold(k), v]), ['Resource', 'Value']);
    log.json({ success: true, limits: DockerInfo });
  }
}

module.exports = ResourceQuota;
