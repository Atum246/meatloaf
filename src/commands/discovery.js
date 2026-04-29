const chalk = require('chalk');
const Docker = require('dockerode');
const { log, ORANGE } = require('../utils/logger');
const { getSandboxMeta } = require('../utils/config');

class ServiceDiscovery {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  async resolve(serviceName, opts = {}) {
    const network = opts.network || 'bridge';
    
    try {
      const { execSync } = require('child_process');
      const ip = execSync(`getent hosts ${serviceName} 2>/dev/null || nslookup ${serviceName} 2>/dev/null | grep Address | tail -1`, { encoding: 'utf8', timeout: 5000 }).trim();
      
      if (ip) {
        log.success(`Resolved ${serviceName} → ${ip}`);
        log.json({ success: true, service: serviceName, ip });
        return ip;
      }
    } catch {}

    // Try Docker DNS
    try {
      const networks = await this.docker.listNetworks({ filters: { name: [network] } });
      if (networks.length > 0) {
        const info = await this.docker.getNetwork(networks[0].Id).inspect();
        for (const [id, c] of Object.entries(info.Containers || {})) {
          if (c.Name === serviceName) {
            log.success(`Found ${serviceName} → ${c.IPv4Address}`);
            log.json({ success: true, service: serviceName, ip: c.IPv4Address, network });
            return c.IPv4Address;
          }
        }
      }
    } catch {}

    log.error(`Could not resolve: ${serviceName}`);
    log.json({ success: false, service: serviceName });
    return null;
  }

  async lookup(sandboxId, opts = {}) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const info = await container.inspect();
    
    log.nl();
    log.banner(`  🔍 Service Discovery: ${sandboxId}\n`);
    
    const networks = info.NetworkSettings.Networks || {};
    const rows = [];
    
    for (const [name, net] of Object.entries(networks)) {
      rows.push([name, net.IPAddress || '-', net.Gateway || '-', net.MacAddress || '-']);
    }
    
    log.table(rows, ['Network', 'IP', 'Gateway', 'MAC']);
    
    // DNS info
    const dns = info.HostConfig?.Dns || [];
    const searchDomains = info.HostConfig?.DnsSearch || [];
    
    if (dns.length) log.info(`DNS Servers: ${dns.join(', ')}`);
    if (searchDomains.length) log.info(`Search Domains: ${searchDomains.join(', ')}`);
    
    log.json({ success: true, sandboxId, networks, dns, searchDomains });
  }

  async register(serviceName, sandboxId, opts = {}) {
    // Register by adding to a shared network with alias
    const network = opts.network || 'meatloaf-services';
    const Docker = require('dockerode');
    
    log.step(`Registering ${serviceName} on network ${network}...`);
    
    try {
      // Create network if not exists
      try {
        await this.docker.createNetwork({ Name: network, Labels: { 'meatloaf.services': 'true' } });
      } catch (e) { /* exists */ }

      const networks = await this.docker.listNetworks({ filters: { name: [network] } });
      const meta = getSandboxMeta(sandboxId);
      if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

      const dockerNetwork = this.docker.getNetwork(networks[0].Id);
      await dockerNetwork.connect({
        Container: meta.containerId,
        EndpointConfig: { Aliases: [serviceName] }
      });

      log.success(`Registered ${serviceName} → ${sandboxId}`);
      log.json({ success: true, serviceName, sandboxId, network });
    } catch (err) {
      log.error(`Registration failed: ${err.message}`);
    }
  }

  async discover(opts = {}) {
    const network = opts.network || 'meatloaf-services';
    
    try {
      const networks = await this.docker.listNetworks({ filters: { name: [network] } });
      if (networks.length === 0) {
        log.info(chalk.gray(`No services network "${network}" found`));
        return;
      }

      const info = await this.docker.getNetwork(networks[0].Id).inspect();
      const containers = info.Containers || {};

      log.nl();
      log.banner('  🌐 Discovered Services\n');
      
      const rows = Object.entries(containers).map(([id, c]) => [
        id.substring(0, 12),
        c.Name || '-',
        c.IPv4Address || '-',
        (c.IPv6Address || '-').substring(0, 20)
      ]);
      log.table(rows, ['Container', 'Name', 'IPv4', 'IPv6']);
      log.json({ success: true, network, services: containers });
    } catch (err) {
      log.error(`Discovery failed: ${err.message}`);
    }
  }
}

module.exports = ServiceDiscovery;
