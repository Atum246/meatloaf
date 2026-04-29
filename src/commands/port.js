const chalk = require('chalk');
const { log, ORANGE } = require('../utils/logger');
const net = require('net');

class PortManager {
  async scan(host = 'localhost', opts = {}) {
    const startPort = parseInt(opts.start) || 1;
    const endPort = parseInt(opts.end) || 1024;
    const timeout = parseInt(opts.timeout) || 200;

    log.nl();
    log.banner(`  🔌 Port Scan: ${host} (${startPort}-${endPort})\n`);

    const openPorts = [];
    const batchSize = 50;

    for (let port = startPort; port <= endPort; port += batchSize) {
      const batch = [];
      for (let p = port; p < Math.min(port + batchSize, endPort + 1); p++) {
        batch.push(this.checkPort(host, p, timeout));
      }
      const results = await Promise.allSettled(batch);
      for (let i = 0; i < results.length; i++) {
        if (results[i].status === 'fulfilled' && results[i].value) {
          openPorts.push(port + i);
        }
      }
    }

    if (openPorts.length === 0) {
      log.info(chalk.gray(`No open ports found in range ${startPort}-${endPort}`));
    } else {
      log.nl();
      const rows = openPorts.map(p => [p.toString(), this.getServiceName(p), chalk.green('OPEN')]);
      log.table(rows, ['Port', 'Service', 'Status']);
    }

    log.nl();
    log.json({ success: true, host, range: `${startPort}-${endPort}`, openPorts, count: openPorts.length });
    return openPorts;
  }

  async check(host, port) {
    const isOpen = await this.checkPort(host, port, 3000);
    if (isOpen) {
      log.success(`Port ${port} is OPEN on ${host}`);
    } else {
      log.error(`Port ${port} is CLOSED on ${host}`);
    }
    log.json({ success: true, host, port, open: isOpen });
    return isOpen;
  }

  async checkPort(host, port, timeout = 200) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      socket.connect(port, host);
    });
  }

  async findAvailable(startPort = 3000, count = 1) {
    const ports = [];
    let port = startPort;
    while (ports.length < count && port < 65535) {
      const isOpen = await this.checkPort('localhost', port, 100);
      if (!isOpen) ports.push(port);
      port++;
    }
    log.json({ success: true, availablePorts: ports });
    return ports;
  }

  async map(sandboxId, opts = {}) {
    const Docker = require('dockerode');
    const docker = new Docker({ socketPath: '/var/run/docker.sock' });
    const { getSandboxMeta } = require('../utils/config');
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = docker.getContainer(meta.containerId);
    const info = await container.inspect();
    const ports = info.NetworkSettings.Ports || {};

    log.nl();
    log.banner(`  🔌 Port Mapping: ${sandboxId}\n`);
    
    const rows = Object.entries(ports).map(([containerPort, bindings]) => {
      const hostPorts = bindings?.map(b => `${b.HostIp || '0.0.0.0'}:${b.HostPort}`).join(', ') || 'not bound';
      return [containerPort, hostPorts];
    });

    if (rows.length === 0) {
      log.info(chalk.gray('No port mappings'));
    } else {
      log.table(rows, ['Container Port', 'Host Binding']);
    }

    log.json({ success: true, sandboxId, ports });
  }

  getServiceName(port) {
    const services = {
      20: 'FTP Data', 21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP',
      53: 'DNS', 80: 'HTTP', 110: 'POP3', 143: 'IMAP', 443: 'HTTPS',
      993: 'IMAPS', 995: 'POP3S', 3000: 'Node/Dev', 3306: 'MySQL',
      4200: 'Angular', 5000: 'Flask', 5432: 'PostgreSQL', 6379: 'Redis',
      8000: 'Django', 8080: 'HTTP Alt', 8443: 'HTTPS Alt', 9090: 'Prometheus',
      27017: 'MongoDB', 5173: 'Vite', 5174: 'Vite Alt'
    };
    return services[port] || 'Unknown';
  }
}

module.exports = PortManager;
